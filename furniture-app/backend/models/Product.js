import mongoose from "mongoose";

const specSchema = new mongoose.Schema({
    key: { type: String, required: true },
    value: { type: String, required: true },
}, { _id: false });

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
        description: { type: String, default: "" },
        price: { type: Number, required: true, min: 0 },
        salePrice: { type: Number, default: null },
        category: { type: String, required: true, enum: ["LIVING ROOM", "KITCHEN", "BEDROOM", "BATHROOM", "DECORATION", "DINING ROOM"], index: true },
        images: [{ type: String }],
        img: { type: String, default: "" },
        stock: { type: Number, default: 0, min: 0 },
        sold: { type: Number, default: 0 },
        tags: [{ type: String, trim: true, lowercase: true }],
        specifications: [specSchema],
        style: { type: String, default: "" },
        isActive: { type: Boolean, default: true, index: true },
        isFeatured: { type: Boolean, default: false },
        isNewProduct: { type: Boolean, default: false },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0 },
    },
    { timestamps: true, suppressReservedKeysWarning: true }
);

productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ price: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ sold: -1 });

productSchema.pre("save", function (next) {
    if ((this.isModified("name") || !this.slug) && this.name) {
        const base = this.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/gi, "d").replace(/[^a-z0-9\s-]/g, "")
            .trim().replace(/\s+/g, "-");
        this.slug = `${base}-${this._id.toString().slice(-6)}`;
    }
    if (this.images?.length > 0 && !this.img) this.img = this.images[0];
    next();
});

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;