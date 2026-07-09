import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discount_type: { type: String, required: true, enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
  conditions: { type: Object, default: {} },
  usage_limit: { type: Number, required: true, min: 1 },
  used_count: { type: Number, default: 0, min: 0 },
  locked_count: { type: Number, default: 0, min: 0 },
  expiry_date: { type: Date, required: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Voucher = mongoose.models.Voucher || mongoose.model("Voucher", voucherSchema);
export default Voucher;