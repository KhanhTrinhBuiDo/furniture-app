import express from "express";
import Product from "../models/Product.js";
import AuditLog from "../models/AuditLog.js";
import { protect, requireAdmin, optionalAuth } from "../middleware/authMiddleware.js";
import { uploadMultiple, handleUploadError, deleteCloudinaryImage } from "../middleware/upload-cloudinary.js";

const router = express.Router();

// ─── Helper: trích public_id từ URL Cloudinary để xoá ảnh khi cần ───────────
function extractCloudinaryPublicId(url) {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
    return match ? match[1] : null;
}

// ─── GET /api/products ────────────────────────────────────────────────────────
// Public — FR-06, FR-07
router.get("/", async (req, res) => {
    try {
        const {
            q,
            category,
            minPrice,
            maxPrice,
            style,
            sort = "createdAt_desc",
            page = 1,
            limit = 12,
            featured,
        } = req.query;

        const filter = { isActive: true };

        // Text search — NFR-09
        if (q?.trim()) {
            filter.$text = { $search: q.trim() };
        }
        if (category) filter.category = category.toUpperCase();
        if (style) filter.style = { $regex: style, $options: "i" };
        if (featured === "true") filter.isFeatured = true;

        // Price range
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const sortMap = {
            price_asc: { price: 1 },
            price_desc: { price: -1 },
            newest: { createdAt: -1 },
            createdAt_desc: { createdAt: -1 },
            best_selling: { sold: -1 },
            rating: { rating: -1 },
        };
        const sortObj = sortMap[sort] || { createdAt: -1 };

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(filter).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
            Product.countDocuments(filter),
        ]);

        res.json({
            success: true,
            products,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── GET /api/products/categories ────────────────────────────────────────────
router.get("/categories", async (_req, res) => {
    try {
        const cats = await Product.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        res.json({ success: true, categories: cats.map(c => ({ name: c._id, count: c.count })) });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findOne({
            $or: [
                ...(req.params.id.match(/^[a-f\d]{24}$/i) ? [{ _id: req.params.id }] : []),
                { slug: req.params.id },
            ],
            isActive: true,
        });
        if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });

        const related = await Product.find({
            category: product.category,
            isActive: true,
            _id: { $ne: product._id },
        }).limit(4).lean();

        res.json({ success: true, product, related });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — FR-08
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Admin: GET /api/products/admin/all — bao gồm sản phẩm ẩn ───────────────
router.get("/admin/all", protect, requireAdmin, async (req, res) => {
    try {
        const { q, category, isActive, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (q?.trim()) filter.$text = { $search: q.trim() };
        if (category) filter.category = category.toUpperCase();
        if (isActive !== undefined) filter.isActive = isActive === "true";

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            Product.countDocuments(filter),
        ]);
        res.json({ success: true, products, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
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

            // Parse JSON fields nếu gửi dạng form-data string
            if (typeof body.specifications === "string") {
                try { body.specifications = JSON.parse(body.specifications); } catch { body.specifications = []; }
            }
            if (typeof body.tags === "string") {
                try { body.tags = JSON.parse(body.tags); } catch { body.tags = body.tags.split(",").map(t => t.trim()); }
            }

            // Xử lý ảnh upload — Cloudinary trả về URL đầy đủ trong f.path
            // (f.filename chỉ là public_id nội bộ, KHÔNG dùng để build local path)
            const uploadedImages = req.files?.map(f => f.path) || [];
            // Nếu có URL ảnh từ body (link ngoài) thì ghép vào
            const bodyImages = body.images
                ? (Array.isArray(body.images) ? body.images : [body.images]).filter(Boolean)
                : [];

            body.images = [...uploadedImages, ...bodyImages];

            if (!body.images.length && !body.img) {
                return res.status(400).json({ message: "Cần ít nhất 1 ảnh sản phẩm" });
            }

            // Numeric fields
            if (body.price) body.price = Number(body.price);
            if (body.salePrice) body.salePrice = Number(body.salePrice) || null;
            if (body.stock) body.stock = Number(body.stock) || 0;

            const product = await Product.create(body);

            // Audit log — NFR-17
            await AuditLog.log({
                user: req.user._id,
                action: "CREATE",
                entity: "Product",
                entityId: product._id,
                after: product.toObject(),
                ip: req.ip,
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
            const body = { ...req.body };

            // Parse JSON fields
            if (typeof body.specifications === "string") {
                try { body.specifications = JSON.parse(body.specifications); } catch { body.specifications = []; }
            }
            if (typeof body.tags === "string") {
                try { body.tags = JSON.parse(body.tags); } catch { body.tags = body.tags.split(",").map(t => t.trim()); }
            }

            // Ảnh mới upload — Cloudinary trả về URL đầy đủ trong f.path
            const newImages = req.files?.map(f => f.path) || [];

            // Ảnh giữ lại (gửi từ frontend)
            const keepImages = body.images
                ? (Array.isArray(body.images) ? body.images : [body.images]).filter(Boolean)
                : product.images;

            // Ảnh bị xoá — xoá trên Cloudinary (best-effort, không chặn flow chính nếu lỗi)
            const removedImages = product.images.filter(img => !keepImages.includes(img));
            for (const img of removedImages) {
                const publicId = extractCloudinaryPublicId(img);
                if (publicId) {
                    deleteCloudinaryImage(publicId).catch(err =>
                        console.warn("Không thể xoá ảnh Cloudinary:", publicId, err.message)
                    );
                }
            }

            body.images = [...keepImages, ...newImages];

            // Numeric
            if (body.price !== undefined) body.price = Number(body.price);
            if (body.salePrice !== undefined) body.salePrice = body.salePrice ? Number(body.salePrice) : null;
            if (body.stock !== undefined) body.stock = Number(body.stock);

            // Boolean flags
            ["isActive", "isFeatured", "isNewProduct"].forEach(key => {
                if (body[key] !== undefined) body[key] = body[key] === "true" || body[key] === true;
            });

            const updated = await Product.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });

            await AuditLog.log({
                user: req.user._id,
                action: "UPDATE",
                entity: "Product",
                entityId: product._id,
                before,
                after: updated.toObject(),
                ip: req.ip,
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

        // Soft delete — chỉ ẩn, không xoá khỏi DB
        product.isActive = false;
        await product.save();

        await AuditLog.log({
            user: req.user._id,
            action: "DELETE",
            entity: "Product",
            entityId: product._id,
            before: { isActive: true },
            after: { isActive: false },
            ip: req.ip,
            note: `Ẩn sản phẩm: ${product.name}`,
        });

        res.json({ success: true, message: "Đã ẩn sản phẩm" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Admin: POST /api/products/:id/restore — Khôi phục sản phẩm ──────────────
router.post("/:id/restore", protect, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        );
        if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });
        res.json({ success: true, message: "Đã khôi phục sản phẩm", product });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Admin: PATCH /api/products/:id/stock — Cập nhật tồn kho ─────────────────
router.patch("/:id/stock", protect, requireAdmin, async (req, res) => {
    try {
        const { stock, note } = req.body;
        if (stock === undefined || Number(stock) < 0) {
            return res.status(400).json({ message: "Số lượng tồn kho không hợp lệ" });
        }

        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });

        const before = { stock: product.stock };
        product.stock = Number(stock);
        await product.save();

        await AuditLog.log({
            user: req.user._id,
            action: "UPDATE",
            entity: "Product",
            entityId: product._id,
            before,
            after: { stock: product.stock },
            ip: req.ip,
            note: note || `Cập nhật tồn kho: ${before.stock} → ${product.stock}`,
        });

        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;