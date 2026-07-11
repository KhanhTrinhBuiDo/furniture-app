import express from "express";
import Warranty from "../models/Warranty.js";
import Order from "../models/Order.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

const WARRANTY_MONTHS = 12; // mặc định — model mới không có field warrantyMonths/product-specific

// GHI CHÚ QUAN TRỌNG: Warranty model mới (theo tài liệu schema) chỉ có
// order_id/product_id/start_date/end_date — KHÔNG còn events[]/warrantyMonths/
// productName/productImg/purchasePrice như bản cũ. Nghĩa là:
//   - Không còn lưu "timeline" nhắc lịch bảo trì/mốc tri ân (loyalty_reward,
//     maintenance_due...) — WarrantyPage.jsx cũ hiển thị các mốc này sẽ không
//     còn dữ liệu thật, phải bớt tính năng hoặc cần bổ sung lại field.
//   - Tên/ảnh sản phẩm, giá mua không snapshot — phải populate product_id
//     hiện tại (nếu sản phẩm bị xoá/ẩn, populate sẽ null).
// Bên dưới, "daysLeft"/"status" vẫn được TÍNH TOÁN LÚC ĐỌC (không lưu DB),
// giữ đúng tinh thần bản cũ cho phần này.

export async function createWarrantiesForOrder(orderId) {
    try {
        const order = await Order.findById(orderId);
        if (!order) return;

        for (const item of order.items) {
            const exists = await Warranty.findOne({ order_id: order._id, product_id: item.product_id });
            if (exists) continue; // compound unique index (order_id, product_id) cũng chặn ở tầng DB

            const start_date = new Date();
            const end_date = new Date(start_date);
            end_date.setMonth(end_date.getMonth() + WARRANTY_MONTHS);

            await Warranty.create({
                order_id: order._id,
                product_id: item.product_id,
                start_date,
                end_date,
            });
        }
        console.log(`✅ Warranty created for order ${order.tracking_token}`);
    } catch (err) {
        console.error("Create warranty error:", err.message);
    }
}

function withComputed(w) {
    const now = new Date();
    const daysLeft = Math.ceil((new Date(w.end_date) - now) / (1000 * 60 * 60 * 24));
    return {
        ...w,
        daysLeft,
        status: daysLeft <= 0 ? "expired" : daysLeft <= 30 ? "expiring_soon" : "active",
        progressPercent: Math.max(0, Math.min(100, (daysLeft / (WARRANTY_MONTHS * 30.5)) * 100)),
    };
}

// ─── GET /api/warranty/my ─────────────────────────────────────────────────────
router.get("/my", protect, async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user._id }).select("_id").lean();
        const orderIds = orders.map(o => o._id);

        const warranties = await Warranty.find({ order_id: { $in: orderIds } })
            .sort({ end_date: 1 })
            .populate("product_id", "name image")
            .populate("order_id", "tracking_token")
            .lean();

        res.json({ success: true, warranties: warranties.map(withComputed) });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── GET /api/warranty/my/:id ─────────────────────────────────────────────────
router.get("/my/:id", protect, async (req, res) => {
    try {
        const warranty = await Warranty.findById(req.params.id)
            .populate("product_id", "name image description")
            .populate("order_id", "tracking_token status user_id");

        if (!warranty || String(warranty.order_id?.user_id) !== String(req.user._id)) {
            return res.status(404).json({ message: "Không tìm thấy thông tin bảo hành" });
        }

        res.json({ success: true, warranty: withComputed(warranty.toObject()) });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── Admin: GET /api/warranty ─────────────────────────────────────────────────
router.get("/", protect, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [warranties, total] = await Promise.all([
            Warranty.find()
                .populate("product_id", "name")
                .populate("order_id", "tracking_token user_id")
                .sort({ created_at: -1 }).skip(skip).limit(Number(limit)),
            Warranty.countDocuments(),
        ]);
        res.json({
            success: true,
            warranties: warranties.map(w => withComputed(w.toObject())),
            pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

export default router;