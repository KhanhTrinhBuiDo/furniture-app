import express from "express";
import Warranty from "../models/Warranty.js";
import Order from "../models/Order.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

const WARRANTY_MONTHS = 12;

// ════════════════════════════════════════════════════════════════════════════
// GHI CHÚ QUAN TRỌNG — ĐÂY LÀ CHỖ DUY NHẤT KHÔNG THỂ "DỊCH" 100% VỀ SHAPE CŨ:
//
// Warranty model mới (theo tài liệu, và tài liệu CÓ GIẢI THÍCH RÕ lý do —
// mục 3.5.3: "hệ thống đánh đổi Referential Integrity tại Collection
// warranties") CHỈ có order_id/product_id/start_date/end_date. Khác với các
// collection khác (User/Product/Article/Voucher/ServiceTicket) mà tôi có thể
// bổ sung field một cách an toàn, Warranty được thiết kế tối giản CÓ CHỦ Ý
// trong tài liệu — nên tôi KHÔNG thêm field vào model này.
//
// Những gì tái tạo được (không cần sửa WarrantyPage.jsx):
//   - productName/productImg  → populate product_id hiện tại (ảnh/tên có thể
//     khác thời điểm mua nếu sản phẩm đã được admin sửa sau đó)
//   - purchasePrice            → tra lại trong order_id.items[] (snapshot giá
//     lúc đặt hàng vẫn còn nguyên trên Order, chỉ là Warranty không lưu riêng)
//   - warrantyMonths           → tính từ chênh lệch end_date - start_date
//   - purchasedAt/warrantyStartAt/warrantyEndAt → alias từ start_date/end_date
//
// Cái DUY NHẤT không tái tạo được: "events[]" (timeline nhắc lịch bảo trì,
// tri ân khách hàng...) — model mới không lưu timeline nào cả. Bên dưới tôi
// TỰ SINH (không lưu DB) một timeline rút gọn chỉ còn 2-3 mốc thật sự có dữ
// liệu (bắt đầu bảo hành / sắp hết hạn / hết hạn), thay vì các mốc
// loyalty_reward, maintenance_due... như bản cũ (vốn cần lưu trữ + hàng đợi
// gửi email riêng mà model mới không hỗ trợ). WarrantyPage.jsx vẫn chạy được
// nguyên vẹn vì các field mỗi event (type/title/description/scheduledAt) vẫn
// đúng cấu trúc — chỉ là SỐ LƯỢNG mốc hiển thị ít hơn trước.
// ════════════════════════════════════════════════════════════════════════════

export async function createWarrantiesForOrder(orderId) {
    try {
        const order = await Order.findById(orderId);
        if (!order) return;

        for (const item of order.items) {
            const exists = await Warranty.findOne({ order_id: order._id, product_id: item.product_id });
            if (exists) continue; // compound unique index cũng chặn ở tầng DB

            const start_date = new Date();
            const end_date = new Date(start_date);
            end_date.setMonth(end_date.getMonth() + WARRANTY_MONTHS);

            await Warranty.create({ order_id: order._id, product_id: item.product_id, start_date, end_date });
        }
        console.log(`✅ Warranty created for order ${order.tracking_token}`);
    } catch (err) {
        console.error("Create warranty error:", err.message);
    }
}

function buildEvents(start_date, end_date) {
    const events = [
        { type: "warranty_start", title: "Bắt đầu bảo hành", description: "Sản phẩm chính thức được bảo hành từ ngày này.", scheduledAt: start_date },
    ];
    const reminderDate = new Date(end_date);
    reminderDate.setDate(reminderDate.getDate() - 30);
    if (reminderDate > start_date) {
        events.push({ type: "warranty_reminder", title: "Sắp hết hạn bảo hành", description: "Còn 30 ngày trước khi hết hạn bảo hành.", scheduledAt: reminderDate });
    }
    events.push({ type: "warranty_expire", title: "Hết hạn bảo hành", description: "Bảo hành kết thúc từ ngày này.", scheduledAt: end_date });
    return events;
}

function serialize(w) {
    const o = typeof w.toObject === "function" ? w.toObject() : w;
    const now = new Date();
    const daysLeft = Math.ceil((new Date(o.end_date) - now) / (1000 * 60 * 60 * 24));
    const warrantyMonths = Math.max(1, Math.round((new Date(o.end_date) - new Date(o.start_date)) / (1000 * 60 * 60 * 24 * 30.5)));

    const order = (o.order_id && typeof o.order_id === "object") ? o.order_id : null;
    const product = (o.product_id && typeof o.product_id === "object") ? o.product_id : null;

    // Giá mua snapshot vẫn nằm nguyên trên Order.items[] — tra lại theo product_id
    let purchasePrice = null;
    if (order?.items) {
        const matched = order.items.find(i => String(i.product_id) === String(product?._id || o.product_id));
        purchasePrice = matched?.unit_price_snapshot ?? null;
    }

    return {
        _id: o._id,
        orderCode: order?.tracking_token,
        productName: product?.name || "",
        productImg: product?.images?.[0] || product?.image || "",
        purchasePrice,
        purchasedAt: o.start_date,
        warrantyStartAt: o.start_date,
        warrantyEndAt: o.end_date,
        warrantyMonths,
        daysLeft,
        status: daysLeft <= 0 ? "expired" : daysLeft <= 30 ? "expiring_soon" : "active",
        progressPercent: Math.max(0, Math.min(100, (daysLeft / (warrantyMonths * 30.5)) * 100)),
        events: buildEvents(o.start_date, o.end_date),
    };
}

// ─── GET /api/warranty/my ─────────────────────────────────────────────────────
router.get("/my", protect, async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user._id }).select("_id items tracking_token").lean();
        const orderIds = orders.map(o => o._id);
        const orderMap = new Map(orders.map(o => [String(o._id), o]));

        const warranties = await Warranty.find({ order_id: { $in: orderIds } })
            .sort({ end_date: 1 })
            .populate("product_id", "name image images")
            .lean();

        const shaped = warranties.map(w => serialize({ ...w, order_id: orderMap.get(String(w.order_id)) || w.order_id }));
        res.json({ success: true, warranties: shaped });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── GET /api/warranty/my/:id ─────────────────────────────────────────────────
router.get("/my/:id", protect, async (req, res) => {
    try {
        const warranty = await Warranty.findById(req.params.id)
            .populate("product_id", "name image images description")
            .populate("order_id", "tracking_token status user_id items");

        if (!warranty || String(warranty.order_id?.user_id) !== String(req.user._id)) {
            return res.status(404).json({ message: "Không tìm thấy thông tin bảo hành" });
        }

        res.json({ success: true, warranty: serialize(warranty) });
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
                .populate("product_id", "name image images")
                .populate("order_id", "tracking_token user_id items")
                .sort({ created_at: -1 }).skip(skip).limit(Number(limit)),
            Warranty.countDocuments(),
        ]);
        res.json({
            success: true,
            warranties: warranties.map(serialize),
            pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

export default router;