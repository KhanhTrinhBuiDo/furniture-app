import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product_name_snapshot: { type: String, required: true },
  unit_price_snapshot: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const orderStatusLogSchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: "" },
  changed_at: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  delivery_address_snapshot: { type: String, required: true },
  total_amount: { type: Number, required: true, min: 0 },
  status: { type: String, required: true, default: "Pending" },
  cancel_reason: { type: String, default: "" },
  status_log: [orderStatusLogSchema],
  tracking_token: { type: String, required: true, unique: true },
  voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', default: null },
  discount_amount: { type: Number, default: 0 }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for performance (as designed)
orderSchema.index({ status: 1, created_at: 1 }); // For timeout sweep jobs

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;