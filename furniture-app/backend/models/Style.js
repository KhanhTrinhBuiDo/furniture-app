import mongoose from "mongoose";

const styleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: "" }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Style = mongoose.models.Style || mongoose.model("Style", styleSchema);
export default Style;
