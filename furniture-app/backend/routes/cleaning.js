import express from "express";
import ServiceTicket from "../models/ServiceTicket.js";
import Order from "../models/Order.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import { pushLog } from "../utils/serviceTicketHelpers.js";

const router = express.Router();

// GHI CHÚ QUAN TRỌNG: model CleaningRequest cũ hỗ trợ 1 phiếu đăng ký chứa
// NHIỀU sản phẩm (items[]). ServiceTicket mới chỉ có product_id SỐ ÍT (đúng
// theo tài liệu schema) — vì vậy khi khách chọn nhiều sản phẩm để vệ sinh
// trong 1 lần đăng ký, hệ thống sẽ tạo NHIỀU ServiceTicket (mỗi sản phẩm 1
// phiếu), cùng chung order_id. Hệ quả: "GET /my" giờ trả về danh sách phẳng,
// mỗi dòng là 1 sản phẩm — thay vì 1 dòng gộp nhiều sản phẩm như bản cũ.
// address/phone/notes không còn field riêng trên ServiceTicket → được ghi
// vào log[0].note lúc tạo phiếu (không mất thông tin, chỉ đổi chỗ lưu).

const STATUS_FLOW = {
    Submitted: ["Confirmed", "Cancelled"],
    Confirmed: ["InProgress", "Cancelled"],
    InProgress: ["Completed"],
};

// ─── GET /api/cleaning/eligible-orders ────────────────────────────────────────
router.get("/eligible-orders", protect, async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user._id, status: "Completed" })
            .sort({ created_at: -1 })
            .populate("items.product_id", "name image")
            .select("tracking_token items created_at")
            .lean();

        const shaped = orders.map(o => ({
            orderCode: o.tracking_token,
            createdAt: o.created_at,
            items: o.items.map(i => ({
                productId: i.product_id?._id || i.product_id,
                name: i.product_name_snapshot,
                img: i.product_id?.image || "",
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

        const contextNote = `Địa chỉ: ${address} · SĐT: ${phone}${notes ? ` · Ghi chú: ${notes}` : ""}`;

        const tickets = await ServiceTicket.insertMany(
            selected.map(item => ({
                user_id: req.user._id,
                order_id: order._id,
                product_id: item.productId,
                type: "Cleaning",
                appointment_date: preferredDate,
                status: "Submitted",
                log: [{ status: "Submitted", note: `Khách đăng ký vệ sinh. ${contextNote}` }],
            }))
        );

        res.status(201).json({ success: true, request: tickets[0], requests: tickets });
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
            .populate("product_id", "name image")
            .populate("order_id", "tracking_token");
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── POST /api/cleaning/:id/cancel — Khách huỷ đăng ký ───────────────────────
router.post("/:id/cancel", protect, async (req, res) => {
    try {
        const ticket = await ServiceTicket.findOne({ _id: req.params.id, user_id: req.user._id, type: "Cleaning" });
        if (!ticket) return res.status(404).json({ message: "Không tìm thấy đăng ký" });
        if (!["Submitted", "Confirmed"].includes(ticket.status)) {
            return res.status(400).json({ message: "Không thể huỷ ở trạng thái này" });
        }

        pushLog(ticket, "Cancelled", "Khách hàng huỷ đăng ký");
        await ticket.save();

        res.json({ success: true, request: ticket });
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
                .populate("product_id", "name image")
                .populate("order_id", "tracking_token")
                .sort({ created_at: -1 })
                .skip(skip).limit(Number(limit)),
            ServiceTicket.countDocuments(filter),
        ]);

        res.json({ success: true, requests, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
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

        if (scheduledDate) ticket.appointment_date = scheduledDate;
        pushLog(ticket, status, adminNote || "");
        await ticket.save();

        res.json({ success: true, request: ticket });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

export default router;