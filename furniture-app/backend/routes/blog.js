import express from "express";
import mongoose from "mongoose";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

// ─── Inline Blog schema (nhỏ gọn, không cần file model riêng) ────────────────
const blogSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    tags: [{ type: String }],
    category: { type: String, default: "Ý tưởng nội thất" },
    author: { type: String, default: "Amore Home Team" },
    isPublished: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
}, { timestamps: true });

blogSchema.pre("save", function (next) {
    if (this.isModified("title") && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            + "-" + this._id.toString().slice(-4);
    }
    next();
});

const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

const router = express.Router();

// ─── GET /api/blog ────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const { q, tag, page = 1, limit = 9 } = req.query;
        const filter = { isPublished: true };
        if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { excerpt: { $regex: q, $options: "i" } }];
        if (tag) filter.tags = tag;

        const skip = (Number(page) - 1) * Number(limit);
        const [posts, total] = await Promise.all([
            Blog.find(filter).select("-content").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
            Blog.countDocuments(filter),
        ]);
        res.json({ success: true, posts, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── GET /api/blog/:slug ──────────────────────────────────────────────────────
router.get("/:slug", async (req, res) => {
    try {
        const post = await Blog.findOne({ slug: req.params.slug, isPublished: true });
        if (!post) return res.status(404).json({ message: "Bài viết không tồn tại" });
        post.viewCount += 1;
        await post.save();

        const related = await Blog.find({ tags: { $in: post.tags }, _id: { $ne: post._id }, isPublished: true })
            .select("-content").limit(3).lean();
        res.json({ success: true, post, related });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────
router.post("/", protect, requireAdmin, async (req, res) => {
    try {
        const post = await Blog.create(req.body);
        res.status(201).json({ success: true, post });
    } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", protect, requireAdmin, async (req, res) => {
    try {
        const post = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });
        res.json({ success: true, post });
    } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", protect, requireAdmin, async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Đã xóa bài viết" });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── Seed mẫu ─────────────────────────────────────────────────────────────────
router.post("/seed", protect, requireAdmin, async (req, res) => {
    try {
        const count = await Blog.countDocuments();
        if (count > 0) return res.json({ message: `Đã có ${count} bài viết` });

        const sample = [
            { title: "5 Ý tưởng trang trí phòng khách theo phong cách Tropical", excerpt: "Khám phá cách mang hơi thở nhiệt đới vào không gian sống của bạn với những gợi ý nội thất độc đáo.", coverImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800", tags: ["tropical", "living room", "design"], category: "Ý tưởng nội thất" },
            { title: "Matcha Concept — Xu hướng nội thất xanh lá năm 2024", excerpt: "Màu xanh matcha đang trở thành lựa chọn hàng đầu cho các không gian hiện đại và bình yên.", coverImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=800", tags: ["matcha", "green", "trend"], category: "Xu hướng" },
            { title: "Cách chọn bàn ăn phù hợp với diện tích phòng bếp", excerpt: "Hướng dẫn chi tiết giúp bạn tìm được chiếc bàn ăn hoàn hảo cho mọi kích thước không gian.", coverImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800", tags: ["kitchen", "dining", "tips"], category: "Hướng dẫn" },
            { title: "Phòng ngủ tối giản — Bí quyết tạo không gian nghỉ ngơi lý tưởng", excerpt: "Minimalism không chỉ là phong cách, đây là cách sống giúp bạn cảm thấy thư thái và cân bằng hơn.", coverImage: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800", tags: ["bedroom", "minimal", "lifestyle"], category: "Ý tưởng nội thất" },
            { title: "Top 10 cây nội thất giúp thanh lọc không khí cho nhà bạn", excerpt: "Kết hợp cây xanh vào không gian sống không chỉ trang trí mà còn mang lại lợi ích sức khỏe.", coverImage: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800", tags: ["plants", "decor", "health"], category: "Mẹo hay" },
            { title: "Giải pháp lưu trữ thông minh cho căn hộ nhỏ", excerpt: "Những ý tưởng sáng tạo giúp tối ưu không gian và tạo sự gọn gàng cho mọi góc nhà.", coverImage: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800", tags: ["storage", "small space", "tips"], category: "Hướng dẫn" },
        ];

        await Blog.insertMany(sample);
        res.json({ success: true, message: `Đã seed ${sample.length} bài viết` });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;