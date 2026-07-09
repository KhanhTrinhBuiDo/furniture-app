import mongoose from "mongoose";

const sceneProductSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  hotspot_coordinates: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  }
}, { _id: false });

const sceneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  story_description: { type: String, default: "" },
  image_layout: { type: String, required: true },
  is_published: { type: Boolean, default: false },
  products: [sceneProductSchema]
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Scene = mongoose.models.Scene || mongoose.model("Scene", sceneSchema);
export default Scene;
