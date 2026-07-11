import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Voucher from "../models/Voucher.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import { lockStock, releaseStock } from "../utils/stockHelpers.js";
import { checkVoucherValidity, calcVoucherDiscount, lockVoucher, releaseVoucher } from "../utils/voucherHelpers.js";
import { serializeOrder, packAddress, fetchLatestTransactions, STATUS_TO_DB } from "../utils/orderSerializer.js";

const router = express.Router();

function genTrackingToken() {
    return `AMH${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
}

// GHI CHÚ: Order model mới KHÔNG có paymentStatus/paymentMethod/transactionNo
// (nay thuộc collection `transactions`) và status dùng "Pending/Confirmed/..."
// (viết hoa). Toàn bộ phần "dịch" 2 chiều nằm ở utils/orderSerializer.js —
// nhờ vậy CartPage.jsx/PaymentModal.jsx/OrderHistoryPage.jsx/AdminOrders.jsx/
// orderService.js KHÔNG CẦN SỬA GÌ.
const STATUS_FLOW = {
    Pending: ["Confirmed", "Cancelled"],
    Confirmed: ["Shipping", "Cancelled"],
    Shipping: ["Completed"],
};

function canCancel(order) {
    return ["Pending", "Confirmed"].includes(order.status);
}

function populateForResponse(query) {
    return query.populate("items.product_id", "name image images").populate("voucher_id", "code").populate("user_id", "full_name email");
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// Body: { items: [{productId, name, img, price, quantity}], shippingAddress: {...}, paymentMethod, voucherCode }
router.post("/", protect, async (req, res) => {
    try {
        const { items, shippingAddress, voucherCode } = req.body;

        if (!items?.length) return res.status(400).json({ message: "Giỏ hàng trống" });
        if (!shippingAddress) return res.status(400).json({ message: "Thiếu địa chỉ giao hàng" });

        const mongoIds = items.map(i => String(i.productId)).filter(id => /^[a-f\d]{24}$/i.test(id));
        const dbProducts = await Product.find({ _id: { $in: mongoIds }, is_active: true }).lean();
        const productMap = new Map(dbProducts.map(p => [p._id.toString(), p]));

        const orderItems = [];
        let subtotal = 0;
        const stockNeeds = [];

        for (const item of items) {
            const pid = String(item.productId);
            const dbProd = productMap.get(pid);
            if (!dbProd) return res.status(400).json({ message: `Sản phẩm không tồn tại hoặc đã ngừng bán` });

            const available = dbProd.actual_stock - dbProd.locked_stock;
            if (available < item.quantity) {
                return res.status(400).json({ message: `"${dbProd.name}" chỉ còn ${available} sản phẩm có thể đặt` });
            }

            // Giữ đúng logic cũ: ưu tiên giá sale nếu có (sale_price), snapshot lúc đặt hàng
            const unitPrice = dbProd.sale_price || dbProd.price;
            subtotal += unitPrice * Number(item.quantity);

            orderItems.push({
                product_id: dbProd._id,
                product_name_snapshot: dbProd.name,
                unit_price_snapshot: unitPrice,
                quantity: Number(item.quantity),
            });
            stockNeeds.push({ product_id: dbProd._id, quantity: Number(item.quantity) });
        }

        const shippingFee = subtotal >= 5_000_000 ? 0 : 50_000;

        let discount_amount = 0, voucherDoc = null;
        if (voucherCode?.trim()) {
            voucherDoc = await Voucher.findOne({ code: voucherCode.trim().toUpperCase() });
            const check = checkVoucherValidity(voucherDoc, subtotal);
            if (!check.ok) return res.status(400).json({ message: check.msg });
            discount_amount = calcVoucherDiscount(voucherDoc, subtotal);
        }

        const total_amount = Math.max(0, subtotal - discount_amount + shippingFee);

        await lockStock(stockNeeds);
        if (voucherDoc) await lockVoucher(Voucher, voucherDoc._id);

        const order = await Order.create({
            user_id: req.user._id,
            items: orderItems,
            delivery_address_snapshot: packAddress(shippingAddress),
            total_amount,
            status: "Pending",
            status_log: [{ status: "Pending", note: "Đơn hàng mới tạo" }],
            tracking_token: genTrackingToken(),
            voucher_id: voucherDoc?._id || null,
            discount_amount,
        });

        res.status(201).json({ success: true, order: serializeOrder(order, null) });
    } catch (err) {
        console.error("Create order error:", err.message);
        res.status(500).json({ message: err.message || "Lỗi tạo đơn hàng" });
    }
});

// ─── GET /api/orders/my ───────────────────────────────────────────────────────
router.get("/my", protect, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const filter = { user_id: req.user._id };
        if (status) filter.status = STATUS_TO_DB[status] || status;

        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = await Promise.all([
            populateForResponse(Order.find(filter)).sort({ created_at: -1 }).skip(skip).limit(Number(limit)),
            Order.countDocuments(filter),
        ]);

        const txMap = await fetchLatestTransactions(orders.map(o => o._id));
        res.json({
            success: true,
            orders: orders.map(o => serializeOrder(o, txMap.get(String(o._id)))),
            pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── GET /api/orders/my/:orderCode ────────────────────────────────────────────
router.get("/my/:orderCode", protect, async (req, res) => {
    try {
        const order = await populateForResponse(
            Order.findOne({ tracking_token: req.params.orderCode, user_id: req.user._id })
        );
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

        const txMap = await fetchLatestTransactions([order._id]);
        res.json({ success: true, order: serializeOrder(order, txMap.get(String(order._id))) });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── POST /api/orders/my/:orderCode/cancel ────────────────────────────────────
router.post("/my/:orderCode/cancel", protect, async (req, res) => {
    try {
        const order = await Order.findOne({ tracking_token: req.params.orderCode, user_id: req.user._id });
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        if (!canCancel(order)) return res.status(400).json({ message: "Không thể huỷ đơn ở trạng thái này" });

        order.status = "Cancelled";
        order.cancel_reason = req.body.reason || "Khách hàng huỷ";
        order.status_log.push({ status: "Cancelled", note: req.body.reason || "Khách hàng huỷ" });
        await order.save();

        await releaseStock(order.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })));
        if (order.voucher_id) await releaseVoucher(Voucher, order.voucher_id);

        const populated = await populateForResponse(Order.findById(order._id));
        res.json({ success: true, message: "Đã huỷ đơn hàng", order: serializeOrder(populated, null) });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── POST /api/orders/validate-voucher ───────────────────────────────────────
router.post("/validate-voucher", protect, async (req, res) => {
    try {
        const { code, orderTotal } = req.body;
        if (!code?.trim()) return res.status(400).json({ message: "Vui lòng nhập mã voucher" });
        const voucher = await Voucher.findOne({ code: code.trim().toUpperCase() });
        const validity = checkVoucherValidity(voucher, Number(orderTotal));
        if (!validity.ok) return res.status(400).json({ message: validity.msg });
        const discount = calcVoucherDiscount(voucher, Number(orderTotal));
        res.json({ success: true, discount, voucherCode: voucher.code, description: voucher.description || "" });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── Admin: GET /api/orders ───────────────────────────────────────────────────
router.get("/", protect, requireAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = STATUS_TO_DB[status] || status;

        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = await Promise.all([
            populateForResponse(Order.find(filter)).sort({ created_at: -1 }).skip(skip).limit(Number(limit)),
            Order.countDocuments(filter),
        ]);

        const txMap = await fetchLatestTransactions(orders.map(o => o._id));
        res.json({
            success: true,
            orders: orders.map(o => serializeOrder(o, txMap.get(String(o._id)))),
            pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) {
        console.error("GET /api/orders (admin) error:", err);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});
router.put("/:id/status", protect, requireAdmin, async (req, res) => {
    try {
        const { status: clientStatus, note } = req.body;
        const status = STATUS_TO_DB[clientStatus] || clientStatus;

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

        if (!(STATUS_FLOW[order.status] || []).includes(status)) {
            return res.status(400).json({ message: `Không thể chuyển từ "${order.status}" sang "${status}"` });
        }

        order.status = status;
        order.status_log.push({ status, note: note || "" });

        if (status === "Cancelled") {
            await releaseStock(order.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })));
            if (order.voucher_id) await releaseVoucher(Voucher, order.voucher_id);
        }

        await order.save();

        if (status === "Completed") {
            try {
                const { createWarrantiesForOrder } = await import("./warranty.js");
                createWarrantiesForOrder(order._id).catch(e => console.error("Warranty:", e.message));
            } catch (e) {
                console.warn("Warranty module not available:", e.message);
            }
        }

        const populated = await populateForResponse(Order.findById(order._id));
        const txMap = await fetchLatestTransactions([order._id]);
        res.json({ success: true, order: serializeOrder(populated, txMap.get(String(order._id))) });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── Dev: POST /api/orders/:id/complete-now ───────────────────────────────────
router.post("/:id/complete-now", protect, requireAdmin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        order.status = "Completed";
        order.status_log.push({ status: "Completed", note: "[DEV] Hoàn tất nhanh" });
        await order.save();
        try {
            const { createWarrantiesForOrder } = await import("./warranty.js");
            await createWarrantiesForOrder(order._id);
        } catch (e) { console.warn("Warranty:", e.message); }
        const populated = await populateForResponse(Order.findById(order._id));
        res.json({ success: true, message: "Đã hoàn tất + tạo warranty", order: serializeOrder(populated, null) });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;