import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  thumbnail_image: { type: String, default: "" },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, // Nullable for root categories
  is_active: { type: Boolean, default: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
export default Category;
