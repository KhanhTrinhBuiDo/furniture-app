import express from "express";
import ServiceTicket from "../models/ServiceTicket.js";
import Voucher from "../models/Voucher.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import { uploadMultiple, handleUploadError } from "../middleware/upload-cloudinary.js";
import { genVoucherCode, pushLog } from "../utils/serviceTicketHelpers.js";

const router = express.Router();

// GHI CHÚ QUAN TRỌNG: TradeInRequest cũ có các field productName/category/
// condition/contactPhone/contactAddress/description riêng. ServiceTicket
// (model chung mới) không có các field này — chỉ có product_id (ref catalog,
// KHÔNG bắt buộc với TradeIn vì món đồ cũ của khách có thể không thuộc catalog
// Amore Home) và error_description (text tự do). Toàn bộ thông tin mô tả được
// dồn vào error_description (mô tả sản phẩm) + log[0].note (liên hệ). Xem
// thêm ghi chú trong models/ServiceTicket.js về việc nới lỏng product_id/order_id.

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

        const CONDITION_LABELS = { like_new: "Như mới", good: "Tốt", fair: "Khá", poor: "Cũ, có hư hỏng" };
        const errorDescription = `${productName} — Danh mục: ${category.toUpperCase()} — Tình trạng: ${CONDITION_LABELS[condition] || condition}.${description ? " " + description : ""}`;
        const contactNote = `SĐT: ${contactPhone}${contactAddress ? ` · Địa chỉ: ${contactAddress}` : ""}`;

        const ticket = await ServiceTicket.create({
            user_id: req.user._id,
            type: "TradeIn",
            images,
            error_description: errorDescription,
            status: "Submitted",
            log: [{ status: "Submitted", note: `Khách gửi yêu cầu thu cũ đổi mới. ${contactNote}` }],
        });

        res.status(201).json({ success: true, request: ticket });
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
            .populate("voucher_id", "code discount_type conditions expiry_date");
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── POST /api/tradein/:id/cancel ─────────────────────────────────────────────
router.post("/:id/cancel", protect, async (req, res) => {
    try {
        const ticket = await ServiceTicket.findOne({ _id: req.params.id, user_id: req.user._id, type: "TradeIn" });
        if (!ticket) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
        if (ticket.status !== "Submitted") return res.status(400).json({ message: "Không thể huỷ ở trạng thái này" });

        pushLog(ticket, "Cancelled", "Khách hàng huỷ yêu cầu");
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

        res.json({ success: true, requests, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
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
        if (!["Submitted"].includes(ticket.status)) {
            return res.status(400).json({ message: "Yêu cầu này đã được xử lý" });
        }

        const value = Number(appraisedValue);
        const expiry_date = new Date();
        expiry_date.setDate(expiry_date.getDate() + Number(voucherValidDays));

        const voucher = await Voucher.create({
            code: genVoucherCode(),
            discount_type: "FIXED_AMOUNT",
            conditions: { amount: value },
            usage_limit: 1,
            expiry_date,
        });

        ticket.valuation_price = value;
        ticket.voucher_id = voucher._id;
        pushLog(ticket, "VoucherSent", `${adminNote ? adminNote + " — " : ""}Định giá ${value.toLocaleString("vi-VN")}₫ — Voucher: ${voucher.code}`);
        await ticket.save();

        res.json({ success: true, request: ticket, voucher });
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
        if (ticket.status !== "Submitted") return res.status(400).json({ message: "Yêu cầu này đã được xử lý" });

        ticket.rejection_note = adminNote || "";
        pushLog(ticket, "Rejected", adminNote || "");
        await ticket.save();

        res.json({ success: true, request: ticket });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

export default router;