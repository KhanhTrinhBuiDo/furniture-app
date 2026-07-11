import express from "express";
import ServiceTicket from "../models/ServiceTicket.js";
import Voucher from "../models/Voucher.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import { uploadMultiple, handleUploadError } from "../middleware/upload-cloudinary.js";
import { genVoucherCode, pushLog, packMeta, unpackMeta } from "../utils/serviceTicketHelpers.js";

const router = express.Router();

// GHI CHÚ QUAN TRỌNG: TradeInRequest cũ có các field productName/category/
// condition/description/contactPhone/contactAddress riêng. ServiceTicket
// (model chung mới) không có — chỉ có product_id (không bắt buộc với TradeIn,
// vì món đồ cũ của khách thường không thuộc catalog Amore Home) và
// error_description (text tự do). Toàn bộ field structured được đóng gói
// JSON vào error_description (packMeta/unpackMeta) rồi giải mã lại khi trả
// response — TradeInPage.jsx/AdminTradeIn.jsx đọc y hệt như cũ, không cần sửa.

function serialize(t) {
    const o = typeof t.toObject === "function" ? t.toObject() : t;
    const meta = unpackMeta(o.error_description);
    return {
        _id: o._id,
        user: (o.user_id && typeof o.user_id === "object")
            ? { _id: o.user_id._id, fullName: o.user_id.full_name, email: o.user_id.email, phone: o.user_id.phone }
            : o.user_id,
        productName: meta.productName || "",
        category: meta.category || "",
        condition: meta.condition || "",
        description: meta.description || "",
        contactPhone: meta.contactPhone || "",
        contactAddress: meta.contactAddress || "",
        images: o.images || [],
        status: o.status,
        appraisedValue: o.valuation_price,
        adminNote: meta.adminNote || o.rejection_note || "",
        voucherCode: (o.voucher_id && typeof o.voucher_id === "object") ? o.voucher_id.code : undefined,
        createdAt: o.created_at,
    };
}

// ─── POST /api/tradein — Khách gửi yêu cầu thu cũ đổi mới (kèm ảnh) ──────────
router.post("/", protect, uploadMultiple, handleUploadError, async (req, res) => {
    try {
        const { productName, category, description, condition, contactPhone, contactAddress } = req.body;

        if (!productName || !category || !condition || !contactPhone) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc" });
        }

        const images = req.files?.map(f => f.path) || [];
        if (!images.length) {
            return res.status(400).json({ message: "Vui lòng gửi ít nhất 1 ảnh sản phẩm cũ" });
        }

        const meta = packMeta({
            productName,
            category: category.toUpperCase(),
            description: description || "",
            condition,
            contactPhone,
            contactAddress: contactAddress || "",
        });

        const ticket = await ServiceTicket.create({
            user_id: req.user._id,
            type: "TradeIn",
            images,
            error_description: meta,
            status: "pending",
            log: [{ status: "pending", note: "Khách hàng gửi yêu cầu thu cũ đổi mới" }],
        });

        res.status(201).json({ success: true, request: serialize(ticket) });
    } catch (err) {
        console.error("Create trade-in error:", err.message);
        res.status(500).json({ message: err.message || "Lỗi máy chủ" });
    }
});

// ─── GET /api/tradein/my ──────────────────────────────────────────────────────
router.get("/my", protect, async (req, res) => {
    try {
        const requests = await ServiceTicket.find({ user_id: req.user._id, type: "TradeIn" })
            .sort({ created_at: -1 })
            .populate("voucher_id", "code");
        res.json({ success: true, requests: requests.map(serialize) });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── POST /api/tradein/:id/cancel ─────────────────────────────────────────────
router.post("/:id/cancel", protect, async (req, res) => {
    try {
        const ticket = await ServiceTicket.findOne({ _id: req.params.id, user_id: req.user._id, type: "TradeIn" });
        if (!ticket) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
        if (ticket.status !== "pending") return res.status(400).json({ message: "Không thể huỷ ở trạng thái này" });

        pushLog(ticket, "cancelled", "Khách hàng huỷ yêu cầu");
        await ticket.save();

        res.json({ success: true, request: serialize(ticket) });
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
        const filter = { type: "TradeIn" };
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [requests, total] = await Promise.all([
            ServiceTicket.find(filter)
                .populate("user_id", "full_name email phone")
                .populate("voucher_id", "code")
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

// ─── PUT /api/tradein/:id/appraise — Admin định giá + gửi voucher ────────────
router.put("/:id/appraise", protect, requireAdmin, async (req, res) => {
    try {
        const { appraisedValue, adminNote, voucherValidDays = 90 } = req.body;

        if (!appraisedValue || Number(appraisedValue) <= 0) {
            return res.status(400).json({ message: "Vui lòng nhập giá trị định giá hợp lệ" });
        }

        const ticket = await ServiceTicket.findOne({ _id: req.params.id, type: "TradeIn" });
        if (!ticket) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
        if (ticket.status !== "pending") {
            return res.status(400).json({ message: "Yêu cầu này đã được xử lý" });
        }

        const value = Number(appraisedValue);
        const expiry_date = new Date();
        expiry_date.setDate(expiry_date.getDate() + Number(voucherValidDays));
        const meta = unpackMeta(ticket.error_description);

        const voucher = await Voucher.create({
            code: genVoucherCode(),
            description: `Ưu đãi thu cũ đổi mới — "${meta.productName || ""}"`,
            discount_type: "FIXED_AMOUNT",
            conditions: { amount: value },
            usage_limit: 1,
            expiry_date,
        });

        ticket.valuation_price = value;
        ticket.voucher_id = voucher._id;
        if (adminNote !== undefined) {
            meta.adminNote = adminNote;
            ticket.error_description = packMeta(meta);
        }
        pushLog(ticket, "voucher_sent", `Định giá ${value.toLocaleString("vi-VN")}₫ — Voucher: ${voucher.code}`);
        await ticket.save();

        res.json({ success: true, request: serialize(ticket), voucher });
    } catch (err) {
        console.error("Appraise trade-in error:", err.message);
        res.status(500).json({ message: err.message || "Lỗi máy chủ" });
    }
});

// ─── PUT /api/tradein/:id/reject ──────────────────────────────────────────────
router.put("/:id/reject", protect, requireAdmin, async (req, res) => {
    try {
        const { adminNote } = req.body;
        const ticket = await ServiceTicket.findOne({ _id: req.params.id, type: "TradeIn" });
        if (!ticket) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
        if (ticket.status !== "pending") return res.status(400).json({ message: "Yêu cầu này đã được xử lý" });

        ticket.rejection_note = adminNote || "";
        pushLog(ticket, "rejected", adminNote || "");
        await ticket.save();

        res.json({ success: true, request: serialize(ticket) });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

export default router;