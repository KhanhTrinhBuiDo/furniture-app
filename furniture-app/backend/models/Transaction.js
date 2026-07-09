import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  method: { type: String, required: true, enum: ['VNPay', 'MoMo', 'COD'] },
  status: { type: String, required: true, enum: ['Pending', 'Success', 'Failed', 'Expired'] },
  response_data: { type: Object, default: {} },
  gateway_transaction_id: { type: String, sparse: true, unique: true },
  hmac_signature: { type: String, default: null }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

transactionSchema.index({ status: 1, created_at: 1 }); // For timeout sweep jobs

const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
export default Transaction;
