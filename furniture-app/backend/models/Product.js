import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: "" },
  image: { type: String, default: "" },
  actual_stock: { type: Number, default: 0, min: 0 },
  locked_stock: { type: Number, default: 0, min: 0 },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
  style_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Style' }],
  is_active: { type: Boolean, default: true },
  // ─── Bổ sung so với tài liệu schema gốc (đánh dấu rõ) ──────────────────────
  // Bảng mô tả "products" gốc chỉ có 9 field ở trên. Các field dưới đây được
  // thêm vì ProductCard.jsx / AdminProducts.jsx / ProductDetailPage.jsx /
  // HomePage.jsx (frontend đã build sẵn) phụ thuộc trực tiếp vào chúng — nếu
  // bỏ đi sẽ mất tính năng: thư viện nhiều ảnh, giá khuyến mãi, cờ nổi
  // bật/mới, tag, thông số kỹ thuật, đếm số lượng đã bán trên từng sản phẩm.
  images: [{ type: String }],           // ảnh phụ (thư viện) — `image` ở trên vẫn là ảnh đại diện/cover
  sale_price: { type: Number, default: null },
  is_featured: { type: Boolean, default: false },
  is_new: { type: Boolean, default: false },
  sold: { type: Number, default: 0 },   // tăng dần trong commitStock() khi thanh toán thành công
  tags: [{ type: String }],
  specifications: [{ key: String, value: String }],
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;