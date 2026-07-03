import express from "express";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Voucher from "../models/Voucher.js";
import { protect, requireAdmin, requireStaff } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, requireStaff);

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
            topProducts, revenueByDay, ordersByStatus,
        ] = await Promise.all([
            User.countDocuments({ role: "user" }),
            User.countDocuments({ role: "user", createdAt: { $gte: startMonth } }),
            Product.countDocuments(),
            Product.countDocuments({ isActive: true }),
            Order.countDocuments(),
            Order.countDocuments({ createdAt: { $gte: startMonth } }),
            Order.countDocuments({ createdAt: { $gte: startPrevM, $lte: endPrevM } }),
            Order.countDocuments({ status: "pending" }),
            Order.aggregate([
                { $match: { createdAt: { $gte: startMonth }, paymentStatus: "paid" } },
                { $group: { _id: null, total: { $sum: "$total" } } },
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: startPrevM, $lte: endPrevM }, paymentStatus: "paid" } },
                { $group: { _id: null, total: { $sum: "$total" } } },
            ]),
            Product.find({ isActive: true }).sort({ sold: -1 }).limit(5)
                .select("name img category price sold").lean(),
            Order.aggregate([
                { $match: { createdAt: { $gte: start30 }, paymentStatus: "paid" } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        ]);

        const revThis = revenueThis[0]?.total || 0;
        const revPrev = revenuePrev[0]?.total || 0;
        const revGrowth = revPrev === 0 ? 100 : Math.round(((revThis - revPrev) / revPrev) * 100);
        const ordGrowth = ordersPrevMonth === 0 ? 100 : Math.round(((ordersThisMonth - ordersPrevMonth) / ordersPrevMonth) * 100);

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
router.get("/users", requireAdmin, async (req, res) => {
    try {
        const { q, page = 1, limit = 20, role } = req.query;
        const filter = {};
        if (q) filter.$or = [{ fullName: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
        if (role) filter.role = role;
        const skip = (Number(page) - 1) * Number(limit);
        const [users, total] = await Promise.all([
            User.find(filter).select("-password -resetOTP -resetOTPExpires").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            User.countDocuments(filter),
        ]);
        res.json({ success: true, users, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/users/:id", requireAdmin, async (req, res) => {
    try {
        const { isActive, role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { isActive, role }, { new: true }).select("-password");
        if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
        res.json({ success: true, user });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString())
            return res.status(400).json({ message: "Không thể xóa chính mình" });
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Đã xóa người dùng" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Vouchers ─────────────────────────────────────────────────────────────────
router.get("/vouchers", async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ createdAt: -1 });
        res.json({ success: true, vouchers });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/vouchers", requireAdmin, async (req, res) => {
    try {
        const v = await Voucher.create(req.body);
        res.status(201).json({ success: true, voucher: v });
    } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put("/vouchers/:id", requireAdmin, async (req, res) => {
    try {
        const v = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!v) return res.status(404).json({ message: "Không tìm thấy voucher" });
        res.json({ success: true, voucher: v });
    } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete("/vouchers/:id", requireAdmin, async (req, res) => {
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
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }
        const orders = await Order.find(filter).populate("user", "fullName email").sort({ createdAt: -1 }).lean();
        const rows = orders.map(o => ({
            orderCode: o.orderCode,
            customerName: o.shippingAddress?.fullName || o.user?.fullName || "",
            email: o.shippingAddress?.email || o.user?.email || "",
            phone: o.shippingAddress?.phone || "",
            city: o.shippingAddress?.city || "",
            items: o.items.length,
            subtotal: o.subtotal,
            discount: o.discount,
            shippingFee: o.shippingFee,
            total: o.total,
            status: o.status,
            paymentStatus: o.paymentStatus,
            paymentMethod: o.paymentMethod,
            createdAt: new Date(o.createdAt).toLocaleString("vi-VN"),
        }));
        const headers = ["orderCode", "customerName", "email", "phone", "city", "items", "subtotal", "discount", "shippingFee", "total", "status", "paymentStatus", "paymentMethod", "createdAt"];
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="orders_${Date.now()}.csv"`);
        res.send("\uFEFF" + toCSV(rows, headers));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/export/products", async (req, res) => {
    try {
        const products = await Product.find().sort({ category: 1, name: 1 }).lean();
        const rows = products.map(p => ({
            name: p.name, category: p.category, price: p.price,
            salePrice: p.salePrice || "", stock: p.stock, sold: p.sold,
            isActive: p.isActive ? "Có" : "Không",
            createdAt: new Date(p.createdAt).toLocaleString("vi-VN"),
        }));
        const headers = ["name", "category", "price", "salePrice", "stock", "sold", "isActive", "createdAt"];
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="products_${Date.now()}.csv"`);
        res.send("\uFEFF" + toCSV(rows, headers));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/export/users", requireAdmin, async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
        const rows = users.map(u => ({
            fullName: u.fullName, email: u.email, phone: u.phone || "",
            role: u.role, authProvider: u.authProvider,
            isActive: u.isActive ? "Có" : "Không",
            createdAt: new Date(u.createdAt).toLocaleString("vi-VN"),
        }));
        const headers = ["fullName", "email", "phone", "role", "authProvider", "isActive", "createdAt"];
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="users_${Date.now()}.csv"`);
        res.send("\uFEFF" + toCSV(rows, headers));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;