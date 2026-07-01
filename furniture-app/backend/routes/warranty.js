import express from "express";
import Warranty from "../models/Warranty.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { protect, requireStaff } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Tạo warranty sau khi đơn hàng hoàn tất ──────────────────────────────────
// Gọi nội bộ từ orders.js khi status → "completed"
export async function createWarrantiesForOrder(orderId) {
    try {
        const order = await Order.findById(orderId).populate("items.product");
        if (!order) return;

        const warrantyMonths = 12; // mặc định — có thể lấy từ Product.warrantyMonths sau

        for (const item of order.items) {
            if (!item.product) continue;

            // Tránh tạo duplicate
            const exists = await Warranty.findOne({ order: order._id, product: item.product._id });
            if (exists) continue;

            const events = Warranty.buildTimeline(order.paidAt || order.createdAt, warrantyMonths);

            await Warranty.create({
                user: order.user,
                order: order._id,
                product: item.product._id,
                orderCode: order.orderCode,
                productName: item.name,
                productImg: item.img || "",
                purchasePrice: item.price,
                warrantyMonths,
                purchasedAt: order.paidAt || order.createdAt,
                warrantyStartAt: order.paidAt || order.createdAt,
                warrantyEndAt: (() => {
                    const d = new Date(order.paidAt || order.createdAt);
                    d.setMonth(d.getMonth() + warrantyMonths);
                    return d;
                })(),
                events,
            });
        }
        console.log(`✅ Warranty created for order ${order.orderCode}`);
    } catch (err) {
        console.error("Create warranty error:", err.message);
    }
}

// ─── GET /api/warranty/my — Timeline bảo hành của user ───────────────────────
router.get("/my", protect, async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { user: req.user._id };
        if (status) filter.status = status;

        const warranties = await Warranty.find(filter)
            .sort({ warrantyEndAt: 1 })
            .populate("product", "name img category")
            .lean();

        // Cập nhật status dựa trên thời gian hiện tại
        const now = new Date();
        const updated = warranties.map(w => {
            const daysLeft = Math.ceil((new Date(w.warrantyEndAt) - now) / (1000 * 60 * 60 * 24));
            return {
                ...w,
                daysLeft,
                status: daysLeft <= 0 ? "expired" : daysLeft <= 30 ? "expiring_soon" : "active",
                progressPercent: Math.max(0, Math.min(100,
                    (daysLeft / w.warrantyMonths / 30.5) * 100
                )),
            };
        });

        res.json({ success: true, warranties: updated });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── GET /api/warranty/my/:id — Chi tiết 1 warranty ─────────────────────────
router.get("/my/:id", protect, async (req, res) => {
    try {
        const warranty = await Warranty.findOne({ _id: req.params.id, user: req.user._id })
            .populate("product", "name img category description")
            .populate("order", "orderCode status createdAt");

        if (!warranty) return res.status(404).json({ message: "Không tìm thấy thông tin bảo hành" });

        const now = new Date();
        const daysLeft = Math.ceil((new Date(warranty.warrantyEndAt) - now) / (1000 * 60 * 60 * 24));

        res.json({
            success: true,
            warranty: {
                ...warranty.toObject(),
                daysLeft,
                status: daysLeft <= 0 ? "expired" : daysLeft <= 30 ? "expiring_soon" : "active",
            },
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── Admin: GET /api/warranty — Tất cả warranties ────────────────────────────
router.get("/", protect, requireStaff, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [warranties, total] = await Promise.all([
            Warranty.find(filter)
                .populate("user", "fullName email")
                .populate("product", "name category")
                .sort({ createdAt: -1 })
                .skip(skip).limit(Number(limit)),
            Warranty.countDocuments(filter),
        ]);

        res.json({ success: true, warranties, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── Admin: POST /api/warranty/send-reminders — Gửi nhắc nhở thủ công ────────
router.post("/send-reminders", protect, requireStaff, async (req, res) => {
    try {
        const now = new Date();
        const sent = [];

        // Tìm tất cả events đến hạn chưa gửi
        const warranties = await Warranty.find({ status: { $ne: "expired" } });

        for (const w of warranties) {
            for (const ev of w.events) {
                if (!ev.isSent && new Date(ev.scheduledAt) <= now) {
                    // TODO: Gửi email (emailUtils.sendWarrantyReminder)
                    console.log(`📧 [WARRANTY] ${ev.title} → user ${w.user}`);
                    ev.isSent = true;
                    ev.sentAt = now;
                    sent.push({ warrantyId: w._id, event: ev.title });
                }
            }
            await w.save();
        }

        res.json({ success: true, sent: sent.length, events: sent });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;