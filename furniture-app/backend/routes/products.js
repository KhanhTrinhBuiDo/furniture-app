import express from "express";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Style from "../models/Style.js";
import AuditLog from "../models/AuditLog.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import { uploadMultiple, handleUploadError, deleteCloudinaryImage } from "../middleware/upload-cloudinary.js";

const router = express.Router();

function extractCloudinaryPublicId(url) {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
    return match ? match[1] : null;
}

// ─── Category/Style giờ là collection riêng (không còn string tự do) ────────
// Tìm theo tên (không phân biệt hoa/thường); nếu chưa có thì tự tạo mới.
// GHI CHÚ: đây là hạ tầng CẦN THIẾT để products.js hoạt động được với schema
// mới — tài liệu 9 route gốc không có sẵn route quản lý categories/styles
// riêng, nên phải xử lý tại đây theo kiểu "find or create" để admin không bị
// chặn luồng thêm sản phẩm.
async function resolveCategoryId(name) {
    if (!name) return null;
    const trimmed = String(name).trim();
    let cat = await Category.findOne({ name: { $regex: `^${trimmed}$`, $options: "i" } });
    if (!cat) cat = await Category.create({ name: trimmed });
    return cat._id;
}

async function resolveStyleIds(names) {
    if (!names) return [];
    const list = Array.isArray(names) ? names : [names];
    const ids = [];
    for (const raw of list) {
        const trimmed = String(raw).trim();
        if (!trimmed) continue;
        let style = await Style.findOne({ name: { $regex: `^${trimmed}$`, $options: "i" } });
        if (!style) style = await Style.create({ name: trimmed });
        ids.push(style._id);
    }
    return ids;
}

// ─── GET /api/products/meta/categories — danh sách category cho dropdown ────
router.get("/meta/categories", async (req, res) => {
    try {
        const categories = await Category.find({ is_active: true }).sort({ name: 1 }).lean();
        res.json({ success: true, categories });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── GET /api/products/meta/styles — danh sách style cho dropdown/filter ────
router.get("/meta/styles", async (req, res) => {
    try {
        const styles = await Style.find().sort({ name: 1 }).lean();
        res.json({ success: true, styles });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── GET /api/products ────────────────────────────────────────────────────────
// Public — danh sách + lọc. "Còn hàng" = actual_stock - locked_stock > 0.
router.get("/", async (req, res) => {
    try {
        const { q, category, style, minPrice, maxPrice, sort = "createdAt_desc", page = 1, limit = 12 } = req.query;

        const filter = { is_active: true };

        if (q?.trim()) {
            const re = { $regex: q.trim(), $options: "i" };
            filter.$or = [{ name: re }, { description: re }];
        }
        if (category) {
            const cat = await Category.findOne({ name: { $regex: `^${category}$`, $options: "i" } });
            filter.category_id = cat ? cat._id : null; // không tìm thấy category → trả về rỗng, không phải "bỏ qua lọc"
        }
        if (style) {
            const st = await Style.findOne({ name: { $regex: `^${style}$`, $options: "i" } });
            filter.style_ids = st ? st._id : null;
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const sortMap = {
            price_asc: { price: 1 },
            price_desc: { price: -1 },
            newest: { created_at: -1 },
            createdAt_desc: { created_at: -1 },
        };
        const sortObj = sortMap[sort] || { created_at: -1 };

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate("category_id", "name")
                .populate("style_ids", "name")
                .sort(sortObj).skip(skip).limit(Number(limit)).lean(),
            Product.countDocuments(filter),
        ]);

        // Đính kèm available_stock tính sẵn để frontend không phải tự trừ
        const withAvailability = products.map(p => ({
            ...p,
            available_stock: Math.max(0, p.actual_stock - p.locked_stock),
        }));

        res.json({
            success: true,
            products: withAvailability,
            pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── GET /api/products/categories ─────────────────────────────────────────────
// Danh mục kèm số lượng sản phẩm đang active — dùng cho MoreProducts.jsx
router.get("/categories", async (_req, res) => {
    try {
        const agg = await Product.aggregate([
            { $match: { is_active: true } },
            { $group: { _id: "$category_id", count: { $sum: 1 } } },
            { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
            { $sort: { "category.name": 1 } },
        ]);
        res.json({
            success: true,
            categories: agg.filter(c => c.category).map(c => ({
                id: c._id,
                name: c.category.name,
                count: c.count,
            })),
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        if (!req.params.id.match(/^[a-f\d]{24}$/i)) {
            return res.status(404).json({ message: "Sản phẩm không tồn tại" });
        }
        const product = await Product.findOne({ _id: req.params.id, is_active: true })
            .populate("category_id", "name")
            .populate("style_ids", "name");
        if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });

        const related = await Product.find({
            category_id: product.category_id,
            is_active: true,
            _id: { $ne: product._id },
        }).limit(4).lean();

        res.json({
            success: true,
            product: { ...product.toObject(), available_stock: Math.max(0, product.actual_stock - product.locked_stock) },
            related,
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Admin: GET /api/products/admin/all — bao gồm sản phẩm ẩn ───────────────
router.get("/admin/all", protect, requireAdmin, async (req, res) => {
    try {
        const { q, category, isActive, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (q?.trim()) {
            const re = { $regex: q.trim(), $options: "i" };
            filter.$or = [{ name: re }, { description: re }];
        }
        if (category) {
            const cat = await Category.findOne({ name: { $regex: `^${category}$`, $options: "i" } });
            filter.category_id = cat ? cat._id : null;
        }
        if (isActive !== undefined) filter.is_active = isActive === "true";

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate("category_id", "name")
                .populate("style_ids", "name")
                .sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
            Product.countDocuments(filter),
        ]);
        res.json({ success: true, products, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── Admin: POST /api/products — Thêm sản phẩm ───────────────────────────────
// GHI CHÚ: Product model mới chỉ có 1 field `image` (số ít), không còn
// `images[]` như bản cũ. Route vẫn nhận uploadMultiple để không phá vỡ form
// admin hiện tại (có thể chọn nhiều ảnh), nhưng CHỈ LƯU ảnh đầu tiên. Nếu cần
// nhiều ảnh/sản phẩm thật sự, cần bổ sung lại field images[] vào model.
router.post("/",
    protect, requireAdmin,
    uploadMultiple,
    handleUploadError,
    async (req, res) => {
        try {
            const body = req.body;

            const uploadedImages = req.files?.map(f => f.path) || [];
            const bodyImage = body.image || (Array.isArray(body.images) ? body.images[0] : body.images);
            const image = uploadedImages[0] || bodyImage || "";
            if (!image) return res.status(400).json({ message: "Cần ít nhất 1 ảnh sản phẩm" });

            const category_id = await resolveCategoryId(body.category);
            if (!category_id) return res.status(400).json({ message: "Vui lòng chọn danh mục" });
            const style_ids = await resolveStyleIds(body.styles || body.style);

            const product = await Product.create({
                name: body.name,
                price: Number(body.price),
                description: body.description || "",
                image,
                actual_stock: Number(body.actual_stock ?? body.stock ?? 0),
                locked_stock: 0,
                category_id,
                style_ids,
                is_active: body.is_active !== undefined ? (body.is_active === "true" || body.is_active === true) : true,
            });

            await AuditLog.log({
                user: req.user._id, action: "CREATE", entity: "Product",
                entityId: product._id, after: product.toObject(), ip: req.ip,
                note: `Thêm sản phẩm mới: ${product.name}`,
            });

            res.status(201).json({ success: true, product });
        } catch (err) {
            console.error("Create product error:", err.message);
            if (err.name === "ValidationError") {
                const msg = Object.values(err.errors)[0]?.message;
                return res.status(400).json({ message: msg });
            }
            res.status(500).json({ message: err.message });
        }
    }
);

// ─── Admin: PUT /api/products/:id — Sửa sản phẩm ────────────────────────────
router.put("/:id",
    protect, requireAdmin,
    uploadMultiple,
    handleUploadError,
    async (req, res) => {
        try {
            const product = await Product.findById(req.params.id);
            if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });

            const before = product.toObject();
            const body = req.body;
            const update = {};

            if (body.name !== undefined) update.name = body.name;
            if (body.description !== undefined) update.description = body.description;
            if (body.price !== undefined) update.price = Number(body.price);
            if (body.actual_stock !== undefined || body.stock !== undefined) {
                update.actual_stock = Number(body.actual_stock ?? body.stock);
            }
            if (body.is_active !== undefined) update.is_active = body.is_active === "true" || body.is_active === true;
            if (body.category !== undefined) update.category_id = await resolveCategoryId(body.category);
            if (body.styles !== undefined || body.style !== undefined) {
                update.style_ids = await resolveStyleIds(body.styles || body.style);
            }

            // Ảnh mới upload (nếu có) — ghi đè ảnh cũ; ảnh cũ bị xoá trên Cloudinary (best-effort)
            const newImages = req.files?.map(f => f.path) || [];
            if (newImages.length) {
                if (product.image) {
                    const publicId = extractCloudinaryPublicId(product.image);
                    if (publicId) deleteCloudinaryImage(publicId).catch(e => console.warn("Xoá ảnh Cloudinary lỗi:", e.message));
                }
                update.image = newImages[0];
            } else if (body.image !== undefined) {
                update.image = body.image;
            }

            const updated = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });

            await AuditLog.log({
                user: req.user._id, action: "UPDATE", entity: "Product",
                entityId: product._id, before, after: updated.toObject(), ip: req.ip,
                note: `Cập nhật sản phẩm: ${updated.name}`,
            });

            res.json({ success: true, product: updated });
        } catch (err) {
            if (err.name === "ValidationError") {
                const msg = Object.values(err.errors)[0]?.message;
                return res.status(400).json({ message: msg });
            }
            res.status(500).json({ message: err.message });
        }
    }
);

// ─── Admin: DELETE /api/products/:id — Xoá mềm (ẩn) ─────────────────────────
router.delete("/:id", protect, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });

        product.is_active = false;
        await product.save();

        await AuditLog.log({
            user: req.user._id, action: "DELETE", entity: "Product",
            entityId: product._id, before: { is_active: true }, after: { is_active: false },
            ip: req.ip, note: `Ẩn sản phẩm: ${product.name}`,
        });

        res.json({ success: true, message: "Đã ẩn sản phẩm" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Admin: POST /api/products/:id/restore ───────────────────────────────────
router.post("/:id/restore", protect, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { is_active: true }, { new: true });
        if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });
        res.json({ success: true, message: "Đã khôi phục sản phẩm", product });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Admin: PATCH /api/products/:id/stock — Nhập thêm hàng vào actual_stock ──
// GHI CHÚ: chỉ chỉnh actual_stock (tồn kho thật). locked_stock được hệ thống
// tự quản lý qua vòng đời đơn hàng (xem utils/stockHelpers.js) — admin không
// nên chỉnh tay locked_stock vì sẽ làm sai lệch số lượng đang giữ chỗ.
router.patch("/:id/stock", protect, requireAdmin, async (req, res) => {
    try {
        const { stock, note } = req.body;
        if (stock === undefined || Number(stock) < 0) {
            return res.status(400).json({ message: "Số lượng tồn kho không hợp lệ" });
        }

        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });

        const before = { actual_stock: product.actual_stock };
        product.actual_stock = Number(stock);
        await product.save();

        await AuditLog.log({
            user: req.user._id, action: "UPDATE", entity: "Product",
            entityId: product._id, before, after: { actual_stock: product.actual_stock },
            ip: req.ip, note: note || `Cập nhật tồn kho: ${before.actual_stock} → ${product.actual_stock}`,
        });

        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;