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
  is_active: { type: Boolean, default: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;