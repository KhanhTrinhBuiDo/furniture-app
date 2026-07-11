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

// ─── Category/Style là collection riêng — tìm theo tên, tự tạo nếu chưa có ───
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

// ─── Serialize sản phẩm cho client — GIỮ NGUYÊN tên field cũ ─────────────────
// (img, images[], salePrice, stock, sold, isFeatured, isNewProduct, category,
// style, tags, specifications) để ProductCard.jsx / AdminProducts.jsx /
// ProductDetailPage.jsx / HomePage.jsx không cần sửa. Field không có dữ liệu
// thật (rating, reviewCount) trả về 0 — UI vốn đã ẩn phần liên quan khi = 0.
function serializeProduct(p) {
    const o = typeof p.toObject === "function" ? p.toObject() : p;
    const category = o.category_id && typeof o.category_id === "object" ? o.category_id.name : undefined;
    const styles = Array.isArray(o.style_ids) ? o.style_ids.filter(s => typeof s === "object").map(s => s.name) : [];
    const allImages = (o.images?.length ? o.images : [o.image]).filter(Boolean);
    const available = Math.max(0, (o.actual_stock || 0) - (o.locked_stock || 0));

    return {
        _id: o._id,
        id: o._id,
        name: o.name,
        price: o.price,
        salePrice: o.sale_price ?? null,
        description: o.description || "",
        img: allImages[0] || "",
        images: allImages,
        category,
        categoryId: o.category_id?._id || o.category_id,
        style: styles.join(", "),
        styles,
        styleIds: o.style_ids,
        stock: available,
        actualStock: o.actual_stock,
        lockedStock: o.locked_stock,
        sold: o.sold || 0,
        rating: 0,        // không có hệ thống đánh giá trong schema mới
        reviewCount: 0,
        isNew: !!o.is_new,
        isFeatured: !!o.is_featured,
        tags: o.tags || [],
        specifications: o.specifications || [],
        isActive: o.is_active,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
    };
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
router.get("/", async (req, res) => {
    try {
        const { q, category, style, minPrice, maxPrice, sort = "createdAt_desc", page = 1, limit = 12, featured } = req.query;

        const filter = { is_active: true };

        if (q?.trim()) {
            const re = { $regex: q.trim(), $options: "i" };
            filter.$or = [{ name: re }, { description: re }];
        }
        if (category) {
            const cat = await Category.findOne({ name: { $regex: `^${category}$`, $options: "i" } });
            filter.category_id = cat ? cat._id : null;
        }
        if (style) {
            const st = await Style.findOne({ name: { $regex: `^${style}$`, $options: "i" } });
            filter.style_ids = st ? st._id : null;
        }
        if (featured === "true") filter.is_featured = true;
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
            best_selling: { sold: -1 },
        };
        const sortObj = sortMap[sort] || { created_at: -1 };

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate("category_id", "name")
                .populate("style_ids", "name")
                .sort(sortObj).skip(skip).limit(Number(limit)),
            Product.countDocuments(filter),
        ]);

        res.json({
            success: true,
            products: products.map(serializeProduct),
            pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── GET /api/products/categories ─────────────────────────────────────────────
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
            categories: agg.filter(c => c.category).map(c => ({ name: c.category.name, count: c.count })),
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
        }).limit(4).populate("category_id", "name");

        res.json({
            success: true,
            product: serializeProduct(product),
            related: related.map(serializeProduct),
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

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
                .sort({ created_at: -1 }).skip(skip).limit(Number(limit)),
            Product.countDocuments(filter),
        ]);
        res.json({
            success: true,
            products: products.map(serializeProduct),
            pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── Admin: POST /api/products — Thêm sản phẩm ───────────────────────────────
router.post("/",
    protect, requireAdmin,
    uploadMultiple,
    handleUploadError,
    async (req, res) => {
        try {
            const body = { ...req.body };

            if (typeof body.specifications === "string") {
                try { body.specifications = JSON.parse(body.specifications); } catch { body.specifications = []; }
            }
            if (typeof body.tags === "string") {
                try { body.tags = JSON.parse(body.tags); } catch { body.tags = body.tags.split(",").map(t => t.trim()).filter(Boolean); }
            }

            const uploadedImages = req.files?.map(f => f.path) || [];
            const bodyImages = body.images
                ? (Array.isArray(body.images) ? body.images : [body.images]).filter(Boolean)
                : [];
            const images = [...uploadedImages, ...bodyImages];
            if (!images.length) return res.status(400).json({ message: "Cần ít nhất 1 ảnh sản phẩm" });

            const category_id = await resolveCategoryId(body.category);
            if (!category_id) return res.status(400).json({ message: "Vui lòng chọn danh mục" });
            const style_ids = await resolveStyleIds(body.styles || body.style);

            const product = await Product.create({
                name: body.name,
                price: Number(body.price),
                sale_price: body.salePrice ? Number(body.salePrice) : null,
                description: body.description || "",
                image: images[0],
                images,
                actual_stock: Number(body.actual_stock ?? body.stock ?? 0),
                locked_stock: 0,
                category_id,
                style_ids,
                is_active: body.isActive !== undefined ? (body.isActive === "true" || body.isActive === true) : true,
                is_featured: body.isFeatured === "true" || body.isFeatured === true,
                is_new: body.isNewProduct === "true" || body.isNewProduct === true,
                tags: body.tags || [],
                specifications: body.specifications || [],
            });

            await AuditLog.log({
                user: req.user._id, action: "CREATE", entity: "Product",
                entityId: product._id, after: product.toObject(), ip: req.ip,
                note: `Thêm sản phẩm mới: ${product.name}`,
            });

            const populated = await product.populate([{ path: "category_id", select: "name" }, { path: "style_ids", select: "name" }]);
            res.status(201).json({ success: true, product: serializeProduct(populated) });
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
            const body = { ...req.body };

            if (typeof body.specifications === "string") {
                try { body.specifications = JSON.parse(body.specifications); } catch { body.specifications = []; }
            }
            if (typeof body.tags === "string") {
                try { body.tags = JSON.parse(body.tags); } catch { body.tags = body.tags.split(",").map(t => t.trim()).filter(Boolean); }
            }

            const update = {};
            if (body.name !== undefined) update.name = body.name;
            if (body.description !== undefined) update.description = body.description;
            if (body.price !== undefined) update.price = Number(body.price);
            if (body.salePrice !== undefined) update.sale_price = body.salePrice ? Number(body.salePrice) : null;
            if (body.actual_stock !== undefined || body.stock !== undefined) {
                update.actual_stock = Number(body.actual_stock ?? body.stock);
            }
            if (body.isActive !== undefined) update.is_active = body.isActive === "true" || body.isActive === true;
            if (body.isFeatured !== undefined) update.is_featured = body.isFeatured === "true" || body.isFeatured === true;
            if (body.isNewProduct !== undefined) update.is_new = body.isNewProduct === "true" || body.isNewProduct === true;
            if (body.tags !== undefined) update.tags = body.tags;
            if (body.specifications !== undefined) update.specifications = body.specifications;
            if (body.category !== undefined) update.category_id = await resolveCategoryId(body.category);
            if (body.styles !== undefined || body.style !== undefined) {
                update.style_ids = await resolveStyleIds(body.styles || body.style);
            }

            // Ảnh: gộp ảnh giữ lại (frontend gửi lại danh sách ảnh muốn giữ trong
            // body.images) + ảnh mới upload. Ảnh bị loại bỏ sẽ xoá trên Cloudinary.
            const newImages = req.files?.map(f => f.path) || [];
            const keepImages = body.images !== undefined
                ? (Array.isArray(body.images) ? body.images : [body.images]).filter(Boolean)
                : product.images;
            const removedImages = (product.images || []).filter(img => !keepImages.includes(img));
            for (const img of removedImages) {
                const publicId = extractCloudinaryPublicId(img);
                if (publicId) deleteCloudinaryImage(publicId).catch(e => console.warn("Xoá ảnh Cloudinary lỗi:", e.message));
            }
            const finalImages = [...keepImages, ...newImages];
            if (finalImages.length) {
                update.images = finalImages;
                update.image = finalImages[0];
            }

            const updated = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
                .populate("category_id", "name").populate("style_ids", "name");

            await AuditLog.log({
                user: req.user._id, action: "UPDATE", entity: "Product",
                entityId: product._id, before, after: updated.toObject(), ip: req.ip,
                note: `Cập nhật sản phẩm: ${updated.name}`,
            });

            res.json({ success: true, product: serializeProduct(updated) });
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

router.post("/:id/restore", protect, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { is_active: true }, { new: true });
        if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });
        res.json({ success: true, message: "Đã khôi phục sản phẩm", product: serializeProduct(product) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

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

        res.json({ success: true, product: serializeProduct(product) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;