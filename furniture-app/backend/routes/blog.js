import express from "express";
import Article from "../models/Article.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// GHI CHÚ: route này trước đây tự định nghĩa 1 schema "Blog" nội tuyến, không
// dùng model Article đã có trong danh sách 12 collection chính thức. Đã
// chuyển hẳn sang dùng Article (đã bổ sung thêm slug/excerpt/tags/category/
// is_published/view_count — xem ghi chú trong models/Article.js).

function serialize(a) {
    return {
        _id: a._id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        content: a.content,
        coverImage: a.image,
        tags: a.tags || [],
        category: a.category,
        isPublished: a.is_published,
        viewCount: a.view_count,
        userId: a.user_id,
        publishedDate: a.published_date,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
    };
}

// ─── GET /api/blog ────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const { q, tag, page = 1, limit = 9 } = req.query;
        const filter = { is_published: true };
        if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { excerpt: { $regex: q, $options: "i" } }];
        if (tag) filter.tags = tag;

        const skip = (Number(page) - 1) * Number(limit);
        const [posts, total] = await Promise.all([
            Article.find(filter).select("-content").sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
            Article.countDocuments(filter),
        ]);
        res.json({
            success: true,
            posts: posts.map(serialize),
            pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
        });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── GET /api/blog/:slug ──────────────────────────────────────────────────────
router.get("/:slug", async (req, res) => {
    try {
        const post = await Article.findOne({ slug: req.params.slug, is_published: true });
        if (!post) return res.status(404).json({ message: "Bài viết không tồn tại" });
        post.view_count += 1;
        await post.save();

        const related = await Article.find({ tags: { $in: post.tags }, _id: { $ne: post._id }, is_published: true })
            .select("-content").limit(3).lean();
        res.json({ success: true, post: serialize(post), related: related.map(serialize) });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────
router.post("/", protect, requireAdmin, async (req, res) => {
    try {
        const { title, content, coverImage, tags, category, isPublished } = req.body;
        const post = await Article.create({
            title, content,
            image: coverImage || "",
            tags: tags || [],
            category: category || undefined,
            is_published: isPublished !== undefined ? isPublished : true,
            user_id: req.user._id,
        });
        res.status(201).json({ success: true, post: serialize(post) });
    } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", protect, requireAdmin, async (req, res) => {
    try {
        const { title, content, coverImage, tags, category, isPublished } = req.body;
        const update = {};
        if (title !== undefined) update.title = title;
        if (content !== undefined) update.content = content;
        if (coverImage !== undefined) update.image = coverImage;
        if (tags !== undefined) update.tags = tags;
        if (category !== undefined) update.category = category;
        if (isPublished !== undefined) update.is_published = isPublished;

        const post = await Article.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });
        res.json({ success: true, post: serialize(post) });
    } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", protect, requireAdmin, async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Đã xóa bài viết" });
    } catch (err) { res.status(500).json({ message: "Lỗi máy chủ" }); }
});

// ─── Seed mẫu ─────────────────────────────────────────────────────────────────
router.post("/seed", protect, requireAdmin, async (req, res) => {
    try {
        const count = await Article.countDocuments();
        if (count > 0) return res.json({ message: `Đã có ${count} bài viết` });

        const sample = [
            { title: "5 Ý tưởng trang trí phòng khách theo phong cách Tropical", excerpt: "Khám phá cách mang hơi thở nhiệt đới vào không gian sống của bạn với những gợi ý nội thất độc đáo.", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800", tags: ["tropical", "living room", "design"], category: "Ý tưởng nội thất" },
            { title: "Matcha Concept — Xu hướng nội thất xanh lá năm 2024", excerpt: "Màu xanh matcha đang trở thành lựa chọn hàng đầu cho các không gian hiện đại và bình yên.", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=800", tags: ["matcha", "green", "trend"], category: "Xu hướng" },
            { title: "Cách chọn bàn ăn phù hợp với diện tích phòng bếp", excerpt: "Hướng dẫn chi tiết giúp bạn tìm được chiếc bàn ăn hoàn hảo cho mọi kích thước không gian.", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800", tags: ["kitchen", "dining", "tips"], category: "Hướng dẫn" },
            { title: "Phòng ngủ tối giản — Bí quyết tạo không gian nghỉ ngơi lý tưởng", excerpt: "Minimalism không chỉ là phong cách, đây là cách sống giúp bạn cảm thấy thư thái và cân bằng hơn.", image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800", tags: ["bedroom", "minimal", "lifestyle"], category: "Ý tưởng nội thất" },
            { title: "Top 10 cây nội thất giúp thanh lọc không khí cho nhà bạn", excerpt: "Kết hợp cây xanh vào không gian sống không chỉ trang trí mà còn mang lại lợi ích sức khỏe.", image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800", tags: ["plants", "decor", "health"], category: "Mẹo hay" },
            { title: "Giải pháp lưu trữ thông minh cho căn hộ nhỏ", excerpt: "Những ý tưởng sáng tạo giúp tối ưu không gian và tạo sự gọn gàng cho mọi góc nhà.", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800", tags: ["storage", "small space", "tips"], category: "Hướng dẫn" },
        ].map(s => ({ ...s, content: s.excerpt, user_id: req.user._id }));

        await Article.insertMany(sample);
        res.json({ success: true, message: `Đã seed ${sample.length} bài viết` });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;