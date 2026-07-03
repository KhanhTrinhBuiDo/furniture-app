import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Voucher from "../models/Voucher.js";
import { protect, requireStaff } from "../middleware/authMiddleware.js";

const router = express.Router();

function genOrderCode() {
    return `AMH${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
}

function isMongoId(id) {
    return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod = "vnpay", voucherCode } = req.body;

        if (!items?.length) return res.status(400).json({ message: "Giỏ hàng trống" });
        if (!shippingAddress) return res.status(400).json({ message: "Thiếu địa chỉ giao hàng" });

        // Lookup sản phẩm trong DB (chỉ với ObjectId hợp lệ)
        const mongoIds = items.map(i => String(i.productId)).filter(isMongoId);
        const productMap = new Map();
        if (mongoIds.length > 0) {
            const dbProds = await Product.find({ _id: { $in: mongoIds }, isActive: true }).lean();
            dbProds.forEach(p => productMap.set(p._id.toString(), p));
        }

        const orderItems = [];
        let subtotal = 0;

        for (const item of items) {
            const pid = String(item.productId);
            const dbProd = isMongoId(pid) ? productMap.get(pid) : null;

            if (dbProd && typeof dbProd.stock === "number" && dbProd.stock < item.quantity) {
                return res.status(400).json({ message: `"${dbProd.name}" chỉ còn ${dbProd.stock} trong kho` });
            }

            const unitPrice = dbProd ? (dbProd.salePrice || dbProd.price) : Number(item.price) || 0;
            const sub = unitPrice * Number(item.quantity);
            subtotal += sub;

            orderItems.push({
                ...(dbProd ? { product: dbProd._id } : {}),
                productId: item.productId,
                name: dbProd?.name || item.name || "Sản phẩm",
                img: dbProd?.img || item.img || "",
                price: unitPrice,
                quantity: Number(item.quantity),
                subtotal: sub,
            });
        }

        const shippingFee = subtotal >= 5_000_000 ? 0 : 50_000;

        let discount = 0, voucherDoc = null;
        if (voucherCode?.trim()) {
            voucherDoc = await Voucher.findOne({ code: voucherCode.trim().toUpperCase() });
            if (!voucherDoc) return res.status(400).json({ message: "Mã voucher không tồn tại" });
            const check = voucherDoc.isValid(subtotal);
            if (!check.ok) return res.status(400).json({ message: check.msg });
            discount = voucherDoc.calcDiscount(subtotal);
        }

        const total = Math.max(0, subtotal - discount + shippingFee);

        const order = await Order.create({
            orderCode: req.body.orderCode || genOrderCode(),
            user: req.user._id,
            items: orderItems,
            shippingAddress,
            subtotal, discount, shippingFee, total,
            paymentMethod,
            voucher: voucherDoc?._id || null,
            voucherCode: voucherCode?.trim().toUpperCase() || "",
            status: "pending",
            paymentStatus: "pending",
            statusHistory: [{ status: "pending", note: "Đơn hàng mới tạo" }],
        });

        // Trừ tồn kho
        const bulkOps = orderItems
            .filter(i => i.product)
            .map(i => ({ updateOne: { filter: { _id: i.product }, update: { $inc: { stock: -i.quantity, sold: i.quantity } } } }));
        if (bulkOps.length) await Product.bulkWrite(bulkOps);

        // Tăng usedCount voucher
        if (voucherDoc) await Voucher.findByIdAndUpdate(voucherDoc._id, { $inc: { usedCount: 1 } });

        res.status(201).json({ success: true, order });
    } catch (err) {
        console.error("Create order error:", err.message);
        res.status(500).json({ message: err.message || "Lỗi tạo đơn hàng" });
    }
});

// ─── GET /api/orders/my ───────────────────────────────────────────────────────
router.get("/my", protect, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const filter = { user: req.user._id };
        if (status) filter.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = await Promise.all([
            Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            Order.countDocuments(filter),
        ]);
        res.json({ success: true, orders, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── GET /api/orders/my/:orderCode ───────────────────────────────────────────
router.get("/my/:orderCode", protect, async (req, res) => {
    try {
        const order = await Order.findOne({ orderCode: req.params.orderCode, user: req.user._id });
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        res.json({ success: true, order });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── POST /api/orders/my/:orderCode/cancel ────────────────────────────────────
router.post("/my/:orderCode/cancel", protect, async (req, res) => {
    try {
        const order = await Order.findOne({ orderCode: req.params.orderCode, user: req.user._id });
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        if (!order.canCancel()) return res.status(400).json({ message: "Không thể huỷ đơn ở trạng thái này" });

        order.status = "cancelled";
        order.cancelReason = req.body.reason || "Khách hàng huỷ";
        order.cancelledBy = "user";
        order.statusHistory.push({ status: "cancelled", note: req.body.reason || "Khách hàng huỷ", updatedBy: req.user._id });
        await order.save();

        const bulkOps = order.items
            .filter(i => i.product && isMongoId(String(i.product)))
            .map(i => ({ updateOne: { filter: { _id: i.product }, update: { $inc: { stock: i.quantity, sold: -i.quantity } } } }));
        if (bulkOps.length) await Product.bulkWrite(bulkOps);

        res.json({ success: true, message: "Đã huỷ đơn hàng", order });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── POST /api/orders/validate-voucher ───────────────────────────────────────
router.post("/validate-voucher", protect, async (req, res) => {
    try {
        const { code, orderTotal } = req.body;
        if (!code?.trim()) return res.status(400).json({ message: "Vui lòng nhập mã voucher" });
        const voucher = await Voucher.findOne({ code: code.trim().toUpperCase() });
        if (!voucher) return res.status(404).json({ message: "Mã voucher không tồn tại" });
        const validity = voucher.isValid(Number(orderTotal));
        if (!validity.ok) return res.status(400).json({ message: validity.msg });
        const discount = voucher.calcDiscount(Number(orderTotal));
        res.json({ success: true, discount, voucherCode: voucher.code, description: voucher.description });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── Admin: GET /api/orders ───────────────────────────────────────────────────
router.get("/", protect, requireStaff, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = await Promise.all([
            Order.find(filter).populate("user", "fullName email").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            Order.countDocuments(filter),
        ]);
        res.json({ success: true, orders, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── Admin: PUT /api/orders/:id/status + tạo Warranty khi completed ──────────
router.put("/:id/status", protect, requireStaff, async (req, res) => {
    try {
        const { status, note } = req.body;
        const validFlow = {
            pending: ["confirmed", "cancelled"],
            confirmed: ["shipping", "cancelled"],
            shipping: ["completed"],
        };

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

        if (!(validFlow[order.status] || []).includes(status)) {
            return res.status(400).json({ message: `Không thể chuyển từ "${order.status}" sang "${status}"` });
        }

        order.status = status;
        order.statusHistory.push({ status, note: note || "", updatedBy: req.user._id });

        if (status === "completed") {
            if (order.paymentMethod === "cod") order.paymentStatus = "paid";
            if (!order.paidAt) order.paidAt = new Date();
        }
        await order.save();

        // Tạo warranty tự động khi đơn hoàn tất
        if (status === "completed") {
            try {
                const { createWarrantiesForOrder } = await import("./warranty.js");
                createWarrantiesForOrder(order._id).catch(e => console.error("Warranty:", e.message));
            } catch (e) {
                console.warn("Warranty module not available:", e.message);
            }
        }

        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── Payment sync ─────────────────────────────────────────────────────────────
router.put("/payment-sync", async (req, res) => {
    try {
        const { orderCode, transactionNo, payDate } = req.body;
        const order = await Order.findOne({ orderCode });
        if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });
        order.paymentStatus = "paid";
        order.transactionNo = transactionNo || "";
        order.paidAt = payDate ? new Date(payDate) : new Date();
        if (order.status === "pending") {
            order.status = "confirmed";
            order.statusHistory.push({ status: "confirmed", note: "Thanh toán VNPay thành công" });
        }
        await order.save();
        res.json({ success: true, message: "Đồng bộ thành công" });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── Dev: POST /api/orders/:id/complete-now ───────────────────────────────────
router.post("/:id/complete-now", protect, requireStaff, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        order.status = "completed";
        order.paymentStatus = "paid";
        order.paidAt = order.paidAt || new Date();
        order.statusHistory.push({ status: "completed", note: "[DEV] Hoàn tất nhanh", updatedBy: req.user._id });
        await order.save();
        try {
            const { createWarrantiesForOrder } = await import("./warranty.js");
            await createWarrantiesForOrder(order._id);
        } catch (e) { console.warn("Warranty:", e.message); }
        res.json({ success: true, message: "Đã hoàn tất + tạo warranty", order });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;