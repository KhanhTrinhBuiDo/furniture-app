import express from "express";
import ServiceTicket from "../models/ServiceTicket.js";
import Order from "../models/Order.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import { pushLog, packMeta, unpackMeta } from "../utils/serviceTicketHelpers.js";

const router = express.Router();

// GHI CHÚ QUAN TRỌNG: model CleaningRequest cũ hỗ trợ 1 phiếu đăng ký chứa
// NHIỀU sản phẩm (items[]). ServiceTicket mới chỉ có product_id SỐ ÍT (đúng
// theo tài liệu schema) — vì vậy khi khách chọn nhiều sản phẩm để vệ sinh
// trong 1 lần đăng ký, hệ thống tạo NHIỀU ServiceTicket (mỗi sản phẩm 1
// phiếu), cùng chung order_id. HỆ QUẢ DUY NHẤT với frontend: "GET /my" trả về
// danh sách phẳng — mỗi dòng là 1 sản phẩm (mỗi dòng "items" chỉ có 1 phần
// tử) thay vì 1 dòng gộp nhiều sản phẩm như trước. Không cần sửa code
// frontend vì nó vốn đã lặp qua items[] bằng .map().
//
// address/phone/notes không có field riêng trên ServiceTicket → được đóng
// gói JSON vào error_description lúc tạo phiếu (packMeta/unpackMeta), KHÔNG
// mất dữ liệu — chỉ đổi chỗ lưu bên trong DB, response trả ra vẫn có đủ field
// address/phone/notes như cũ.

const STATUS_FLOW = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["in_progress", "cancelled"],
    in_progress: ["completed"],
};

function serialize(t) {
    const o = typeof t.toObject === "function" ? t.toObject() : t;
    const meta = unpackMeta(o.error_description);
    return {
        _id: o._id,
        orderCode: (o.order_id && typeof o.order_id === "object") ? o.order_id.tracking_token : undefined,
        user: (o.user_id && typeof o.user_id === "object")
            ? { _id: o.user_id._id, fullName: o.user_id.full_name, email: o.user_id.email, phone: o.user_id.phone }
            : o.user_id,
        items: [{
            productId: o.product_id?._id || o.product_id,
            name: (o.product_id && typeof o.product_id === "object") ? o.product_id.name : meta.productName,
            img: (o.product_id && typeof o.product_id === "object") ? (o.product_id.images?.[0] || o.product_id.image || "") : "",
        }],
        address: meta.address || "",
        phone: meta.phone || "",
        notes: meta.notes || "",
        preferredDate: o.appointment_date,
        scheduledDate: meta.scheduledDate || null,
        status: o.status,
        adminNote: meta.adminNote || "",
        createdAt: o.created_at,
    };
}

// ─── GET /api/cleaning/eligible-orders ────────────────────────────────────────
router.get("/eligible-orders", protect, async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user._id, status: "Completed" })
            .sort({ created_at: -1 })
            .populate("items.product_id", "name image images")
            .select("tracking_token items created_at")
            .lean();

        const shaped = orders.map(o => ({
            orderCode: o.tracking_token,
            createdAt: o.created_at,
            items: o.items.map(i => ({
                productId: i.product_id?._id || i.product_id,
                name: i.product_name_snapshot,
                img: i.product_id?.images?.[0] || i.product_id?.image || "",
            })),
        }));

        res.json({ success: true, orders: shaped });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── POST /api/cleaning — Khách đăng ký vệ sinh miễn phí ─────────────────────
router.post("/", protect, async (req, res) => {
    try {
        const { orderCode, items, preferredDate, address, phone, notes } = req.body;

        if (!orderCode || !items?.length || !preferredDate || !address || !phone) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc" });
        }

        const order = await Order.findOne({ tracking_token: orderCode, user_id: req.user._id });
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        if (order.status !== "Completed") {
            return res.status(400).json({ message: "Chỉ áp dụng cho đơn hàng đã giao thành công" });
        }

        const validProductIds = new Set(order.items.map(i => String(i.product_id)));
        const selected = items.filter(i => validProductIds.has(String(i.productId)));
        if (!selected.length) {
            return res.status(400).json({ message: "Sản phẩm chọn không thuộc đơn hàng này" });
        }

        const meta = packMeta({ address, phone, notes: notes || "" });

        const tickets = await ServiceTicket.insertMany(
            selected.map(item => ({
                user_id: req.user._id,
                order_id: order._id,
                product_id: item.productId,
                type: "Cleaning",
                appointment_date: preferredDate,
                error_description: meta,
                status: "pending",
                log: [{ status: "pending", note: "Khách hàng đăng ký vệ sinh" }],
            }))
        );

        const populated = await ServiceTicket.find({ _id: { $in: tickets.map(t => t._id) } })
            .populate("product_id", "name image images").populate("order_id", "tracking_token");

        res.status(201).json({ success: true, request: serialize(populated[0]), requests: populated.map(serialize) });
    } catch (err) {
        console.error("Create cleaning request error:", err.message);
        res.status(500).json({ message: err.message || "Lỗi máy chủ" });
    }
});

// ─── GET /api/cleaning/my — Danh sách đăng ký của user hiện tại ──────────────
router.get("/my", protect, async (req, res) => {
    try {
        const requests = await ServiceTicket.find({ user_id: req.user._id, type: "Cleaning" })
            .sort({ created_at: -1 })
            .populate("product_id", "name image images")
            .populate("order_id", "tracking_token");
        res.json({ success: true, requests: requests.map(serialize) });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── POST /api/cleaning/:id/cancel — Khách huỷ đăng ký ───────────────────────
router.post("/:id/cancel", protect, async (req, res) => {
    try {
        const ticket = await ServiceTicket.findOne({ _id: req.params.id, user_id: req.user._id, type: "Cleaning" });
        if (!ticket) return res.status(404).json({ message: "Không tìm thấy đăng ký" });
        if (!["pending", "confirmed"].includes(ticket.status)) {
            return res.status(400).json({ message: "Không thể huỷ ở trạng thái này" });
        }

        pushLog(ticket, "cancelled", "Khách hàng huỷ đăng ký");
        await ticket.save();

        const populated = await ServiceTicket.findById(ticket._id).populate("product_id", "name image images").populate("order_id", "tracking_token");
        res.json({ success: true, request: serialize(populated) });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN / STAFF
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/", protect, requireAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = { type: "Cleaning" };
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [requests, total] = await Promise.all([
            ServiceTicket.find(filter)
                .populate("user_id", "full_name email phone")
                .populate("product_id", "name image images")
                .populate("order_id", "tracking_token")
                .sort({ created_at: -1 })
                .skip(skip).limit(Number(limit)),
            ServiceTicket.countDocuments(filter),
        ]);

        res.json({
            success: true,
            requests: requests.map(serialize),
            pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

router.put("/:id/status", protect, requireAdmin, async (req, res) => {
    try {
        const { status, scheduledDate, adminNote } = req.body;

        const ticket = await ServiceTicket.findOne({ _id: req.params.id, type: "Cleaning" });
        if (!ticket) return res.status(404).json({ message: "Không tìm thấy đăng ký" });

        if (!(STATUS_FLOW[ticket.status] || []).includes(status)) {
            return res.status(400).json({ message: `Không thể chuyển từ "${ticket.status}" sang "${status}"` });
        }

        const meta = unpackMeta(ticket.error_description);
        if (scheduledDate) meta.scheduledDate = scheduledDate;
        if (adminNote !== undefined) meta.adminNote = adminNote;
        ticket.error_description = packMeta(meta);

        pushLog(ticket, status, adminNote || "");
        await ticket.save();

        const populated = await ServiceTicket.findById(ticket._id).populate("product_id", "name image images").populate("order_id", "tracking_token");
        res.json({ success: true, request: serialize(populated) });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

export default router;