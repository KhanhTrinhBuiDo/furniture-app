import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  image: { type: String, default: "" },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Represents the author (Admin)
  published_date: { type: Date, default: Date.now },
  // ─── Bổ sung so với tài liệu schema gốc (đánh dấu rõ) ──────────────────────
  // Bảng mô tả "articles" gốc không có các field dưới đây. blog.js (route
  // hiện có) và BlogPage.jsx (frontend) đã xây dựng quanh slug/tags/excerpt/
  // trạng thái xuất bản/lượt xem — nếu bỏ đi sẽ mất tính năng lọc theo tag,
  // route theo slug, và ẩn/hiện bài viết. Có thể xoá nếu chấp nhận rút gọn
  // tính năng blog xuống đúng 5 field gốc.
  slug: { type: String, unique: true, sparse: true, lowercase: true },
  excerpt: { type: String, default: "" },
  tags: [{ type: String }],
  category: { type: String, default: "Ý tưởng nội thất" },
  is_published: { type: Boolean, default: true },
  view_count: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

articleSchema.pre("save", function (next) {
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

const Article = mongoose.models.Article || mongoose.model("Article", articleSchema);
export default Article;