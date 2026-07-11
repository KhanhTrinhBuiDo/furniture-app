import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  recipient_name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address_line: { type: String, required: true, trim: true },
  ward: { type: String, required: true },
  district: { type: String, required: true },
  province: { type: String, required: true },
  is_default: { type: Boolean, default: false }
});

const wishlistSchema = new mongoose.Schema({
  item_type: { type: String, required: true, enum: ['Product', 'Scene'] },
  item_id: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'wishlist.item_type' },
  added_at: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password_hash: { type: String, default: null },
  role: { type: String, required: true, enum: ["User", "Admin"], default: "User" },
  google_id: { type: String, unique: true, sparse: true },
  refresh_token: { type: String, default: null },
  addresses: [addressSchema],
  style_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Style' }],
  wishlist: [wishlistSchema],
  // ─── Bổ sung so với tài liệu schema gốc (đánh dấu rõ) ──────────────────────
  // Cả 2 field dưới đây KHÔNG có trong bảng mô tả collection "users" ban đầu,
  // nhưng được thêm vì frontend (Navbar/Footer/ProfilePage/AdminUsers) đã xây
  // dựng sẵn quanh 2 tính năng này (ảnh đại diện + khoá/mở tài khoản). Có thể
  // xoá an toàn nếu không cần — không ảnh hưởng field nào khác.
  avatar: { type: String, default: "" },
  is_active: { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;