import express from "express";
import CleaningRequest from "../models/CleaningRequest.js";
import Order from "../models/Order.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── GET /api/cleaning/eligible-orders ────────────────────────────────────────
// Đơn hàng đã "completed" của user hiện tại — để chọn khi đăng ký vệ sinh
router.get("/eligible-orders", protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id, status: "completed" })
            .sort({ createdAt: -1 })
            .select("orderCode items createdAt")
            .lean();
        res.json({ success: true, orders });
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

        const order = await Order.findOne({ orderCode, user: req.user._id });
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        if (order.status !== "completed") {
            return res.status(400).json({ message: "Chỉ áp dụng cho đơn hàng đã giao thành công" });
        }

        const validNames = new Set(order.items.map(i => i.name));
        const selectedItems = items.filter(i => validNames.has(i.name));
        if (!selectedItems.length) {
            return res.status(400).json({ message: "Sản phẩm chọn không thuộc đơn hàng này" });
        }

        const request = await CleaningRequest.create({
            user: req.user._id,
            order: order._id,
            orderCode,
            items: selectedItems,
            preferredDate,
            address,
            phone,
            notes: notes || "",
            status: "pending",
            statusHistory: [{ status: "pending", note: "Khách hàng đăng ký vệ sinh" }],
        });

        res.status(201).json({ success: true, request });
    } catch (err) {
        console.error("Create cleaning request error:", err.message);
        res.status(500).json({ message: err.message || "Lỗi máy chủ" });
    }
});

// ─── GET /api/cleaning/my — Danh sách đăng ký của user hiện tại ──────────────
router.get("/my", protect, async (req, res) => {
    try {
        const requests = await CleaningRequest.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── POST /api/cleaning/:id/cancel — Khách huỷ đăng ký ───────────────────────
router.post("/:id/cancel", protect, async (req, res) => {
    try {
        const request = await CleaningRequest.findOne({ _id: req.params.id, user: req.user._id });
        if (!request) return res.status(404).json({ message: "Không tìm thấy đăng ký" });
        if (!request.canCancel()) return res.status(400).json({ message: "Không thể huỷ ở trạng thái này" });

        request.status = "cancelled";
        request.statusHistory.push({ status: "cancelled", note: "Khách hàng huỷ đăng ký", updatedBy: req.user._id });
        await request.save();

        res.json({ success: true, request });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN / STAFF
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/cleaning — Admin: danh sách tất cả đăng ký ─────────────────────
router.get("/", protect, requireAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [requests, total] = await Promise.all([
            CleaningRequest.find(filter)
                .populate("user", "fullName email phone")
                .sort({ createdAt: -1 })
                .skip(skip).limit(Number(limit)),
            CleaningRequest.countDocuments(filter),
        ]);

        res.json({ success: true, requests, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── PUT /api/cleaning/:id/status — Admin xác nhận lịch hẹn / cập nhật trạng thái ─
router.put("/:id/status", protect, requireAdmin, async (req, res) => {
    try {
        const { status, scheduledDate, adminNote } = req.body;
        const validFlow = {
            pending: ["confirmed", "cancelled"],
            confirmed: ["in_progress", "cancelled"],
            in_progress: ["completed"],
        };

        const request = await CleaningRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Không tìm thấy đăng ký" });

        if (!(validFlow[request.status] || []).includes(status)) {
            return res.status(400).json({ message: `Không thể chuyển từ "${request.status}" sang "${status}"` });
        }

        request.status = status;
        if (scheduledDate) request.scheduledDate = scheduledDate;
        if (adminNote !== undefined) request.adminNote = adminNote;
        request.statusHistory.push({ status, note: adminNote || "", updatedBy: req.user._id });

        await request.save();
        res.json({ success: true, request });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

export default router;