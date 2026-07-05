import express from "express";
import TradeInRequest from "../models/TradeInRequest.js";
import Voucher from "../models/Voucher.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import { uploadMultiple, handleUploadError } from "../middleware/upload-cloudinary.js";

const router = express.Router();

function genVoucherCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "TRADEIN-";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
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

        const request = await TradeInRequest.create({
            user: req.user._id,
            productName,
            category: category.toUpperCase(),
            description: description || "",
            condition,
            images,
            contactPhone,
            contactAddress: contactAddress || "",
            status: "pending",
            statusHistory: [{ status: "pending", note: "Khách hàng gửi yêu cầu thu cũ đổi mới" }],
        });

        res.status(201).json({ success: true, request });
    } catch (err) {
        console.error("Create trade-in error:", err.message);
        if (err.name === "ValidationError") {
            const msg = Object.values(err.errors)[0]?.message;
            return res.status(400).json({ message: msg });
        }
        res.status(500).json({ message: err.message || "Lỗi máy chủ" });
    }
});

// ─── GET /api/tradein/my — Danh sách yêu cầu của user hiện tại ───────────────
router.get("/my", protect, async (req, res) => {
    try {
        const requests = await TradeInRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── POST /api/tradein/:id/cancel — Khách huỷ yêu cầu (chỉ khi còn pending) ──
router.post("/:id/cancel", protect, async (req, res) => {
    try {
        const request = await TradeInRequest.findOne({ _id: req.params.id, user: req.user._id });
        if (!request) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
        if (request.status !== "pending") return res.status(400).json({ message: "Không thể huỷ ở trạng thái này" });

        request.status = "cancelled";
        request.statusHistory.push({ status: "cancelled", note: "Khách hàng huỷ yêu cầu", updatedBy: req.user._id });
        await request.save();

        res.json({ success: true, request });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN / STAFF
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/tradein — Admin: danh sách tất cả yêu cầu ──────────────────────
router.get("/", protect, requireAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [requests, total] = await Promise.all([
            TradeInRequest.find(filter)
                .populate("user", "fullName email phone")
                .sort({ createdAt: -1 })
                .skip(skip).limit(Number(limit)),
            TradeInRequest.countDocuments(filter),
        ]);

        res.json({ success: true, requests, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── PUT /api/tradein/:id/appraise — Admin định giá + gửi voucher ────────────
router.put("/:id/appraise", protect, requireAdmin, async (req, res) => {
    try {
        const { appraisedValue, adminNote, voucherValidDays = 90, minOrderMultiplier = 1 } = req.body;

        if (!appraisedValue || Number(appraisedValue) <= 0) {
            return res.status(400).json({ message: "Vui lòng nhập giá trị định giá hợp lệ" });
        }

        const request = await TradeInRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
        if (!["pending", "appraised"].includes(request.status)) {
            return res.status(400).json({ message: "Yêu cầu này đã được xử lý" });
        }

        const value = Number(appraisedValue);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + Number(voucherValidDays));

        const voucher = await Voucher.create({
            code: genVoucherCode(),
            description: `Ưu đãi thu cũ đổi mới — "${request.productName}"`,
            type: "fixed",
            value,
            minOrderValue: value * Number(minOrderMultiplier),
            usageLimit: 1,
            startDate: new Date(),
            endDate,
            isActive: true,
        });

        request.appraisedValue = value;
        request.adminNote = adminNote || "";
        request.voucher = voucher._id;
        request.voucherCode = voucher.code;
        request.status = "voucher_sent";
        request.statusHistory.push({
            status: "voucher_sent",
            note: `Định giá ${value.toLocaleString("vi-VN")}₫ — Voucher: ${voucher.code}`,
            updatedBy: req.user._id,
        });
        await request.save();

        // TODO: gửi email thông báo voucher cho khách (có thể tái sử dụng emailUtils.js)

        res.json({ success: true, request, voucher });
    } catch (err) {
        console.error("Appraise trade-in error:", err.message);
        res.status(500).json({ message: err.message || "Lỗi máy chủ" });
    }
});

// ─── PUT /api/tradein/:id/reject — Admin từ chối yêu cầu ─────────────────────
router.put("/:id/reject", protect, requireAdmin, async (req, res) => {
    try {
        const { adminNote } = req.body;
        const request = await TradeInRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
        if (request.status !== "pending") return res.status(400).json({ message: "Yêu cầu này đã được xử lý" });

        request.status = "rejected";
        request.adminNote = adminNote || "";
        request.statusHistory.push({ status: "rejected", note: adminNote || "", updatedBy: req.user._id });
        await request.save();

        res.json({ success: true, request });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

export default router;