/**
 * AMORE HOME — Script thêm sản phẩm test vào Database
 *
 * Khác với seed.js cũ: script này dùng để TEST hệ thống thật,
 * sản phẩm sẽ có đầy đủ _id MongoDB hợp lệ, specifications, stock...
 * giống hệt khi Admin thêm qua Admin Panel (FR-08).
 *
 * Chạy: node scripts/add-products.js
 * Yêu cầu: MONGODB_URI trong .env
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/amore-home";

console.log("🔌 Connecting to MongoDB...");
await mongoose.connect(MONGODB_URI);
console.log("✅ Connected:", MONGODB_URI.replace(/:([^@]+)@/, ":***@"));

// ─── Schema inline (khớp với backend/models/Product.js) ─────────────────────
const specSchema = new mongoose.Schema({
    key: { type: String, required: true },
    value: { type: String, required: true },
}, { _id: false });

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    salePrice: { type: Number, default: null },
    category: { type: String, required: true },
    images: [String],
    img: { type: String, default: "" },
    stock: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    tags: [String],
    specifications: [specSchema],
    style: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isNewProduct: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
}, { timestamps: true, suppressReservedKeysWarning: true });

productSchema.index({ name: "text", description: "text", tags: "text" });

productSchema.pre("save", function (next) {
    if (this.isModified("name") && !this.slug) {
        const base = this.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/gi, "d")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim().replace(/\s+/g, "-");
        this.slug = `${base}-${this._id.toString().slice(-6)}`;
    }
    if (this.images?.length && !this.img) this.img = this.images[0];
    next();
});

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

// ─── Helper: tạo slug trước (cho insertMany không trigger pre-save) ─────────
function toSlug(str, suffix) {
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim().replace(/\s+/g, "-") + `-${suffix}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// DỮ LIỆU SẢN PHẨM TEST — Amore Home
// ═══════════════════════════════════════════════════════════════════════════
const PRODUCTS = [

    // ── LIVING ROOM ──────────────────────────────────────────────────────────
    {
        name: "Sofa Sylvester Văng Cao Cấp",
        price: 12500000, salePrice: 10900000,
        category: "LIVING ROOM", style: "Hiện đại",
        stock: 15, sold: 32, isFeatured: true, isNewProduct: false,
        description: "Sofa văng 3 chỗ thiết kế hiện đại, khung gỗ sồi tự nhiên kết hợp đệm foam cao cấp tạo cảm giác êm ái. Vải bọc chống thấm, dễ vệ sinh, phù hợp cho phòng khách sang trọng.",
        img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
        tags: ["sofa", "phong khach", "hien dai", "vai"],
        specifications: [
            { key: "Kích thước", value: "210 x 90 x 85 cm" },
            { key: "Chất liệu khung", value: "Gỗ sồi tự nhiên" },
            { key: "Chất liệu bọc", value: "Vải polyester chống thấm" },
            { key: "Tải trọng tối đa", value: "300 kg" },
            { key: "Xuất xứ", value: "Việt Nam" },
        ],
    },
    {
        name: "Bàn Trà Mặt Đá Marble",
        price: 4200000, salePrice: null,
        category: "LIVING ROOM", style: "Hiện đại",
        stock: 20, sold: 18, isFeatured: false, isNewProduct: true,
        description: "Bàn trà mặt đá marble tự nhiên, chân kim loại mạ vàng sang trọng. Thiết kế tối giản phù hợp không gian phòng khách hiện đại.",
        img: "https://images.unsplash.com/photo-1532372320572-cda25653dcf1?w=800",
        tags: ["ban tra", "marble", "phong khach"],
        specifications: [
            { key: "Kích thước", value: "120 x 60 x 40 cm" },
            { key: "Mặt bàn", value: "Đá marble tự nhiên" },
            { key: "Chân bàn", value: "Kim loại mạ vàng" },
        ],
    },
    {
        name: "Ghế Bành Armchair Bọc Nhung",
        price: 5800000, salePrice: 4900000,
        category: "LIVING ROOM", style: "Cổ điển",
        stock: 12, sold: 14, isFeatured: false, isNewProduct: false,
        description: "Ghế bành bọc vải nhung cao cấp màu xanh ngọc, chân gỗ óc chó. Mang lại điểm nhấn sang trọng cho góc thư giãn.",
        img: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800",
        tags: ["ghe banh", "nhung", "phong khach"],
        specifications: [
            { key: "Kích thước", value: "75 x 80 x 95 cm" },
            { key: "Chất liệu", value: "Vải nhung + gỗ óc chó" },
        ],
    },
    {
        name: "Kệ TV Gỗ Sồi 1m8",
        price: 6500000, salePrice: null,
        category: "LIVING ROOM", style: "Tối giản",
        stock: 9, sold: 7, isFeatured: false, isNewProduct: false,
        description: "Kệ TV gỗ sồi tự nhiên, 3 ngăn kéo tiện dụng, thiết kế tối giản hiện đại.",
        img: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800",
        tags: ["ke tivi", "go soi", "toi gian"],
        specifications: [
            { key: "Kích thước", value: "180 x 40 x 45 cm" },
            { key: "Chất liệu", value: "Gỗ sồi tự nhiên" },
        ],
    },

    // ── KITCHEN ───────────────────────────────────────────────────────────────
    {
        name: "Đảo Bếp Granite Cao Cấp",
        price: 18500000, salePrice: 16900000,
        category: "KITCHEN", style: "Hiện đại",
        stock: 5, sold: 5, isFeatured: true, isNewProduct: false,
        description: "Đảo bếp với mặt đá granite nguyên khối chống trầy xước, khung gỗ công nghiệp phủ melamine cao cấp. Tích hợp ngăn lưu trữ đa năng.",
        img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
        tags: ["dao bep", "granite", "bep"],
        specifications: [
            { key: "Kích thước", value: "150 x 80 x 90 cm" },
            { key: "Mặt bàn", value: "Đá granite nguyên khối" },
        ],
    },
    {
        name: "Bộ Bàn Ăn 6 Ghế Gỗ Sồi",
        price: 14500000, salePrice: null,
        category: "KITCHEN", style: "Hiện đại",
        stock: 8, sold: 11, isFeatured: true, isNewProduct: true,
        description: "Bộ bàn ăn 6 ghế gỗ sồi nguyên khối, thiết kế chắc chắn bền bỉ, phù hợp gia đình từ 4-6 người.",
        img: "https://images.unsplash.com/photo-1537737711114-ec537f8f4242?w=800",
        tags: ["ban an", "go soi", "bo ban ghe"],
        specifications: [
            { key: "Kích thước bàn", value: "180 x 90 x 75 cm" },
            { key: "Số lượng ghế", value: "6 ghế" },
            { key: "Chất liệu", value: "Gỗ sồi nguyên khối" },
        ],
    },
    {
        name: "Bộ Ghế Bar Chân Cao",
        price: 3200000, salePrice: 2800000,
        category: "KITCHEN", style: "Hiện đại",
        stock: 18, sold: 8, isFeatured: false, isNewProduct: true,
        description: "Bộ 2 ghế bar chân thép sơn tĩnh điện, đệm da PU cao cấp, phong cách công nghiệp hiện đại.",
        img: "https://images.unsplash.com/photo-1559928459-5a1f35d86a8f?w=800",
        tags: ["ghe bar", "bep", "cong nghiep"],
        specifications: [
            { key: "Chiều cao", value: "75 cm" },
            { key: "Chất liệu", value: "Da PU + thép sơn tĩnh điện" },
        ],
    },

    // ── BEDROOM ───────────────────────────────────────────────────────────────
    {
        name: "Giường Ngủ Levia Bọc Da Queen",
        price: 9500000, salePrice: 8200000,
        category: "BEDROOM", style: "Hiện đại",
        stock: 10, sold: 19, isFeatured: true, isNewProduct: false,
        description: "Khung giường Queen bọc da PU cao cấp, đầu giường bo cong êm ái. Khung gỗ công nghiệp chắc chắn, chịu lực tốt.",
        img: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800",
        tags: ["giuong", "phong ngu", "da"],
        specifications: [
            { key: "Kích thước", value: "Queen 160x200 cm" },
            { key: "Chất liệu", value: "Da PU + khung gỗ công nghiệp" },
            { key: "Tải trọng", value: "250 kg" },
        ],
    },
    {
        name: "Tủ Đầu Giường 2 Ngăn",
        price: 2100000, salePrice: null,
        category: "BEDROOM", style: "Tối giản",
        stock: 30, sold: 25, isFeatured: false, isNewProduct: false,
        description: "Tủ đầu giường gỗ thông tự nhiên, 2 ngăn kéo tiện dụng, thiết kế tối giản phù hợp mọi không gian.",
        img: "https://images.unsplash.com/photo-1550620881-c3e73ef0365e?w=800",
        tags: ["tu dau giuong", "phong ngu"],
        specifications: [
            { key: "Kích thước", value: "45 x 40 x 55 cm" },
            { key: "Chất liệu", value: "Gỗ thông tự nhiên" },
        ],
    },
    {
        name: "Tủ Quần Áo 4 Cánh Cao Cấp",
        price: 13800000, salePrice: null,
        category: "BEDROOM", style: "Hiện đại",
        stock: 6, sold: 8, isFeatured: true, isNewProduct: false,
        description: "Tủ quần áo 4 cánh gỗ MDF phủ melamine chống ẩm, hệ thống ngăn kéo và thanh treo tối ưu không gian.",
        img: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800",
        tags: ["tu quan ao", "phong ngu"],
        specifications: [
            { key: "Kích thước", value: "200 x 60 x 220 cm" },
            { key: "Chất liệu", value: "MDF phủ Melamine chống ẩm" },
        ],
    },
    {
        name: "Giường King Size Platform",
        price: 16800000, salePrice: 14500000,
        category: "BEDROOM", style: "Hiện đại",
        stock: 4, sold: 3, isFeatured: true, isNewProduct: true,
        description: "Giường King Size thiết kế platform thấp hiện đại, gỗ óc chó cao cấp, mang phong cách tối giản tinh tế.",
        img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=800",
        tags: ["giuong king", "phong ngu", "luxury"],
        specifications: [
            { key: "Kích thước", value: "King 180x200 cm" },
            { key: "Chất liệu", value: "Gỗ óc chó cao cấp" },
        ],
    },

    // ── BATHROOM ──────────────────────────────────────────────────────────────
    {
        name: "Tủ Lavabo Treo Tường Đá Marble",
        price: 7800000, salePrice: null,
        category: "BATHROOM", style: "Hiện đại",
        stock: 8, sold: 6, isFeatured: false, isNewProduct: true,
        description: "Tủ lavabo treo tường mặt đá marble trắng vân xám sang trọng, chống thấm nước hiệu quả.",
        img: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800",
        tags: ["lavabo", "phong tam", "marble"],
        specifications: [
            { key: "Kích thước", value: "80 x 45 x 55 cm" },
            { key: "Mặt bàn", value: "Đá marble" },
        ],
    },
    {
        name: "Tủ Gương Phòng Tắm Đèn LED",
        price: 4600000, salePrice: 3900000,
        category: "BATHROOM", style: "Hiện đại",
        stock: 15, sold: 12, isFeatured: false, isNewProduct: false,
        description: "Tủ gương tích hợp đèn LED viền, chống sương mù, ngăn lưu trữ mỹ phẩm tiện lợi.",
        img: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800",
        tags: ["tu guong", "phong tam", "den led"],
        specifications: [
            { key: "Kích thước", value: "60 x 80 cm" },
            { key: "Đèn", value: "LED viền chống sương mù" },
        ],
    },

    // ── DECORATION ────────────────────────────────────────────────────────────
    {
        name: "Bộ Tranh Canvas Scandinavian",
        price: 1850000, salePrice: 1500000,
        category: "DECORATION", style: "Scandinavian",
        stock: 50, sold: 45, isFeatured: false, isNewProduct: false,
        description: "Bộ 3 tranh canvas phong cách Scandinavian, tông màu trung tính, dễ phối với mọi không gian.",
        img: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800",
        tags: ["tranh", "trang tri", "scandinavian"],
        specifications: [
            { key: "Số lượng", value: "Bộ 3 tranh" },
            { key: "Chất liệu", value: "Canvas in UV" },
        ],
    },
    {
        name: "Bình Gốm Sứ Thủ Công",
        price: 950000, salePrice: null,
        category: "DECORATION", style: "Đông Dương",
        stock: 35, sold: 28, isFeatured: false, isNewProduct: true,
        description: "Bình gốm sứ thủ công màu be tự nhiên, hoạ tiết tối giản, phù hợp trang trí kệ sách hoặc bàn trà.",
        img: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800",
        tags: ["binh hoa", "gom su", "trang tri"],
        specifications: [
            { key: "Chiều cao", value: "35 cm" },
            { key: "Chất liệu", value: "Gốm sứ thủ công" },
        ],
    },
    {
        name: "Đèn Bàn Nordic Linen",
        price: 1250000, salePrice: 980000,
        category: "DECORATION", style: "Scandinavian",
        stock: 25, sold: 20, isFeatured: true, isNewProduct: false,
        description: "Đèn bàn phong cách Bắc Âu, chóa vải linen kem, ánh sáng ấm áp dịu mắt.",
        img: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800",
        tags: ["den ban", "nordic", "trang tri"],
        specifications: [
            { key: "Chiều cao", value: "45 cm" },
            { key: "Chóa đèn", value: "Vải linen" },
        ],
    },

    // ── DINING ROOM ───────────────────────────────────────────────────────────
    {
        name: "Bộ Bàn Ăn Mở Rộng 8 Người",
        price: 22500000, salePrice: 19800000,
        category: "DINING ROOM", style: "Hiện đại",
        stock: 3, sold: 4, isFeatured: true, isNewProduct: true,
        description: "Bộ bàn ăn mở rộng từ 6 đến 8 người, gỗ sồi Mỹ nhập khẩu, phù hợp gia đình lớn hoặc tiếp khách.",
        img: "https://images.unsplash.com/photo-1537737711114-ec537f8f4242?w=800",
        tags: ["bo ban an", "go soi", "phong an"],
        specifications: [
            { key: "Kích thước (mở rộng)", value: "180-220 x 95 cm" },
            { key: "Chất liệu", value: "Gỗ sồi Mỹ nhập khẩu" },
            { key: "Số ghế kèm theo", value: "8 ghế" },
        ],
    },
    {
        name: "Ghế Ăn Bọc Nhung Chân Gỗ",
        price: 1680000, salePrice: null,
        category: "DINING ROOM", style: "Cổ điển",
        stock: 24, sold: 36, isFeatured: false, isNewProduct: false,
        description: "Ghế ăn bọc vải nhung sang trọng, chân gỗ sồi tự nhiên chắc chắn, thiết kế tinh tế.",
        img: "https://images.unsplash.com/photo-1559928459-5a1f35d86a8f?w=800",
        tags: ["ghe an", "nhung", "phong an"],
        specifications: [
            { key: "Kích thước", value: "45 x 50 x 90 cm" },
            { key: "Chất liệu", value: "Vải nhung + gỗ sồi" },
        ],
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// SEED LOGIC
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n📦 Đang thêm sản phẩm test vào database...\n");

const existing = await Product.countDocuments();
if (existing > 0) {
    console.log(`⚠️  Database đã có ${existing} sản phẩm.`);
    console.log("   Script này sẽ THÊM sản phẩm mới (không xoá sản phẩm cũ).");
    console.log("   Nếu muốn xoá hết và thêm lại, chạy: node scripts/clear-products.js\n");
}

let created = 0, skipped = 0;

for (const p of PRODUCTS) {
    // Tránh trùng tên (test nhiều lần không bị duplicate)
    const dup = await Product.findOne({ name: p.name });
    if (dup) {
        console.log(`   ⏭  Bỏ qua (đã tồn tại): ${p.name}`);
        skipped++;
        continue;
    }

    const doc = await Product.create({
        ...p,
        images: [p.img],
        isActive: true,
    });
    console.log(`   ✅ ${doc.name}  →  _id: ${doc._id}`);
    created++;
}

console.log("\n" + "═".repeat(60));
console.log(`✅ HOÀN TẤT — Đã thêm ${created} sản phẩm mới (bỏ qua ${skipped} trùng)`);
console.log("═".repeat(60));

// ─── Thống kê theo danh mục ───────────────────────────────────────────────
const stats = await Product.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
]);

console.log("\n📊 Thống kê sản phẩm theo danh mục:");
stats.forEach(s => console.log(`   ${s._id.padEnd(15)} : ${s.count} sản phẩm`));

const total = await Product.countDocuments();
console.log(`\n   TỔNG CỘNG       : ${total} sản phẩm trong database\n`);

console.log("🌐 Kiểm tra tại: http://localhost:3000/shop");
console.log("🔌 Hoặc API: http://localhost:5000/api/products\n");

await mongoose.disconnect();
process.exit(0);