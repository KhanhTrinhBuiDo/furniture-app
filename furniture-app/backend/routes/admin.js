import express from "express";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Voucher from "../models/Voucher.js";
import Transaction from "../models/Transaction.js";
import { sanitizeUser } from "../utils/userSerializer.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, requireAdmin);

// Đơn được xem là "đã thanh toán" nếu không còn ở Pending/Cancelled — vì
// finalizeOrderOnPaymentSuccess() (payment.js) chỉ đẩy status đi tiếp khi
// Transaction thành công. Order model mới không còn field paymentStatus
// riêng để lọc trực tiếp.
const PAID_STATUS_FILTER = { status: { $nin: ["Pending", "Cancelled"] } };

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
    try {
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startPrevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endPrevM = new Date(now.getFullYear(), now.getMonth(), 0);
        const start30 = new Date(now); start30.setDate(now.getDate() - 30);

        const [
            totalUsers, newUsersThisMonth,
            totalProducts, activeProducts,
            totalOrders, ordersThisMonth, ordersPrevMonth, pendingOrders,
            revenueThis, revenuePrev,
            topProductsAgg, revenueByDay, ordersByStatus,
        ] = await Promise.all([
            User.countDocuments({ role: "User" }),
            User.countDocuments({ role: "User", created_at: { $gte: startMonth } }),
            Product.countDocuments(),
            Product.countDocuments({ is_active: true }),
            Order.countDocuments(),
            Order.countDocuments({ created_at: { $gte: startMonth } }),
            Order.countDocuments({ created_at: { $gte: startPrevM, $lte: endPrevM } }),
            Order.countDocuments({ status: "Pending" }),
            Order.aggregate([
                { $match: { created_at: { $gte: startMonth }, ...PAID_STATUS_FILTER } },
                { $group: { _id: null, total: { $sum: "$total_amount" } } },
            ]),
            Order.aggregate([
                { $match: { created_at: { $gte: startPrevM, $lte: endPrevM }, ...PAID_STATUS_FILTER } },
                { $group: { _id: null, total: { $sum: "$total_amount" } } },
            ]),
            // "Sản phẩm bán chạy" — Product không còn field `sold`, phải tính
            // từ số lượng bán trong các đơn đã thanh toán.
            Order.aggregate([
                { $match: PAID_STATUS_FILTER },
                { $unwind: "$items" },
                { $group: { _id: "$items.product_id", sold: { $sum: "$items.quantity" } } },
                { $sort: { sold: -1 } },
                { $limit: 5 },
                { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
                { $unwind: "$product" },
            ]),
            Order.aggregate([
                { $match: { created_at: { $gte: start30 }, ...PAID_STATUS_FILTER } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } }, revenue: { $sum: "$total_amount" }, orders: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        ]);

        const revThis = revenueThis[0]?.total || 0;
        const revPrev = revenuePrev[0]?.total || 0;
        const revGrowth = revPrev === 0 ? 100 : Math.round(((revThis - revPrev) / revPrev) * 100);
        const ordGrowth = ordersPrevMonth === 0 ? 100 : Math.round(((ordersThisMonth - ordersPrevMonth) / ordersPrevMonth) * 100);

        const topProducts = topProductsAgg.map(t => ({
            _id: t.product._id,
            name: t.product.name,
            img: t.product.image,
            price: t.product.price,
            sold: t.sold,
        }));

        res.json({
            success: true,
            stats: {
                users: { total: totalUsers, newThisMonth: newUsersThisMonth },
                products: { total: totalProducts, active: activeProducts },
                orders: { total: totalOrders, thisMonth: ordersThisMonth, pending: pendingOrders, growth: ordGrowth },
                revenue: { thisMonth: revThis, prevMonth: revPrev, growth: revGrowth },
            },
            topProducts,
            revenueByDay,
            ordersByStatus: ordersByStatus.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
        });
    } catch (err) {
        console.error("Dashboard error:", err.message);
        res.status(500).json({ message: "Lỗi máy chủ: " + err.message });
    }
});

// ─── Users ────────────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
    try {
        const { q, page = 1, limit = 20, role } = req.query;
        const filter = {};
        if (q) filter.$or = [{ full_name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
        if (role) filter.role = role;
        const skip = (Number(page) - 1) * Number(limit);
        const [users, total] = await Promise.all([
            User.find(filter).select("-password_hash -refresh_token").sort({ created_at: -1 }).skip(skip).limit(Number(limit)),
            User.countDocuments(filter),
        ]);
        res.json({
            success: true,
            users: users.map(sanitizeUser),
            pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/users/:id", async (req, res) => {
    try {
        // Chấp nhận cả tên field cũ (isActive) lẫn mới (is_active) để đỡ phải
        // sửa AdminUsers.jsx ngay lập tức.
        const update = {};
        if (req.body.role !== undefined) update.role = req.body.role;
        if (req.body.isActive !== undefined) update.is_active = req.body.isActive;
        if (req.body.is_active !== undefined) update.is_active = req.body.is_active;

        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
        res.json({ success: true, user: sanitizeUser(user) });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/users/:id", async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString())
            return res.status(400).json({ message: "Không thể xóa chính mình" });
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Đã xóa người dùng" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Vouchers ─────────────────────────────────────────────────────────────────
// GHI CHÚ: Voucher model mới dùng discount_type (PERCENTAGE/FIXED_AMOUNT) +
// conditions (object tự do: { percent, maxDiscount, amount, minOrderValue })
// thay vì các field phẳng type/value/minOrderValue/isActive như bản cũ.
// normalizeVoucherBody() chấp nhận CẢ HAI kiểu tên field trong lúc frontend
// (AdminVouchers.jsx) chưa được cập nhật theo model mới.
function normalizeVoucherBody(body) {
    const out = {};
    if (body.code) out.code = body.code;
    if (body.expiry_date || body.endDate) out.expiry_date = body.expiry_date || body.endDate;
    if (body.usage_limit || body.usageLimit) out.usage_limit = Number(body.usage_limit || body.usageLimit);

    const discountType = body.discount_type || (body.type === "percent" ? "PERCENTAGE" : body.type === "fixed" ? "FIXED_AMOUNT" : body.discount_type);
    if (discountType) out.discount_type = discountType;

    if (body.conditions) {
        out.conditions = body.conditions;
    } else {
        const conditions = {};
        if (body.percent !== undefined) conditions.percent = Number(body.percent);
        if (body.value !== undefined && discountType === "PERCENTAGE") conditions.percent = Number(body.value);
        if (body.value !== undefined && discountType === "FIXED_AMOUNT") conditions.amount = Number(body.value);
        if (body.amount !== undefined) conditions.amount = Number(body.amount);
        if (body.maxDiscount !== undefined) conditions.maxDiscount = Number(body.maxDiscount);
        if (body.minOrderValue !== undefined) conditions.minOrderValue = Number(body.minOrderValue);
        if (Object.keys(conditions).length) out.conditions = conditions;
    }
    return out;
}

router.get("/vouchers", async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ created_at: -1 });
        res.json({ success: true, vouchers });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/vouchers", async (req, res) => {
    try {
        const v = await Voucher.create(normalizeVoucherBody(req.body));
        res.status(201).json({ success: true, voucher: v });
    } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put("/vouchers/:id", async (req, res) => {
    try {
        const v = await Voucher.findByIdAndUpdate(req.params.id, normalizeVoucherBody(req.body), { new: true, runValidators: true });
        if (!v) return res.status(404).json({ message: "Không tìm thấy voucher" });
        res.json({ success: true, voucher: v });
    } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete("/vouchers/:id", async (req, res) => {
    try {
        await Voucher.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Đã xóa voucher" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── CSV Export ───────────────────────────────────────────────────────────────
function toCSV(rows, headers) {
    const esc = (v) => {
        const s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
        headers.join(","),
        ...rows.map(r => headers.map(h => esc(r[h])).join(",")),
    ].join("\n");
}

router.get("/export/orders", async (req, res) => {
    try {
        const { from, to, status } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (from || to) {
            filter.created_at = {};
            if (from) filter.created_at.$gte = new Date(from);
            if (to) filter.created_at.$lte = new Date(to);
        }
        const orders = await Order.find(filter).populate("user_id", "full_name email").sort({ created_at: -1 }).lean();

        // Trạng thái thanh toán không còn nằm trên Order — lấy Transaction mới nhất/đơn
        const txByOrder = new Map();
        const txs = await Transaction.find({ order_id: { $in: orders.map(o => o._id) } }).sort({ created_at: -1 }).lean();
        for (const t of txs) {
            const key = String(t.order_id);
            if (!txByOrder.has(key)) txByOrder.set(key, t);
        }

        const rows = orders.map(o => {
            const tx = txByOrder.get(String(o._id));
            return {
                trackingToken: o.tracking_token,
                customerName: o.user_id?.full_name || "",
                email: o.user_id?.email || "",
                deliveryAddress: o.delivery_address_snapshot,
                items: o.items.length,
                totalAmount: o.total_amount,
                discountAmount: o.discount_amount,
                status: o.status,
                paymentMethod: tx?.method || "",
                paymentStatus: tx?.status || "",
                createdAt: new Date(o.created_at).toLocaleString("vi-VN"),
            };
        });
        const headers = ["trackingToken", "customerName", "email", "deliveryAddress", "items", "totalAmount", "discountAmount", "status", "paymentMethod", "paymentStatus", "createdAt"];
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="orders_${Date.now()}.csv"`);
        res.send("\uFEFF" + toCSV(rows, headers));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/export/products", async (req, res) => {
    try {
        const products = await Product.find().populate("category_id", "name").sort({ name: 1 }).lean();
        const rows = products.map(p => ({
            name: p.name,
            category: p.category_id?.name || "",
            price: p.price,
            actualStock: p.actual_stock,
            lockedStock: p.locked_stock,
            isActive: p.is_active ? "Có" : "Không",
            createdAt: new Date(p.created_at).toLocaleString("vi-VN"),
        }));
        const headers = ["name", "category", "price", "actualStock", "lockedStock", "isActive", "createdAt"];
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="products_${Date.now()}.csv"`);
        res.send("\uFEFF" + toCSV(rows, headers));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/export/users", async (req, res) => {
    try {
        const users = await User.find().select("-password_hash -refresh_token").sort({ created_at: -1 }).lean();
        const rows = users.map(u => ({
            fullName: u.full_name, email: u.email, phone: u.phone || "",
            role: u.role, authProvider: u.google_id ? "google" : "local",
            isActive: u.is_active !== false ? "Có" : "Không",
            createdAt: new Date(u.created_at).toLocaleString("vi-VN"),
        }));
        const headers = ["fullName", "email", "phone", "role", "authProvider", "isActive", "createdAt"];
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="users_${Date.now()}.csv"`);
        res.send("\uFEFF" + toCSV(rows, headers));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;