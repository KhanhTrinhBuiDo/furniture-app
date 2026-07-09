import mongoose from "mongoose";

const warrantySchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// App-level constraint: Prevent creating 2 warranties for the same product in the same order
warrantySchema.index({ order_id: 1, product_id: 1 }, { unique: true });

const Warranty = mongoose.models.Warranty || mongoose.model("Warranty", warrantySchema);
export default Warranty;