import mongoose from "mongoose";

const serviceTicketLogSchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: "" },
  changed_at: { type: Date, default: Date.now }
}, { _id: false });

const serviceTicketSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  type: { type: String, required: true, enum: ['Cleaning', 'TradeIn', 'Repair'] },
  images: [{ type: String }],
  
  // Type-specific nullable fields
  appointment_date: { type: Date, default: null }, // Mainly for Cleaning/Repair
  valuation_price: { type: Number, default: null }, // Only for TradeIn
  error_description: { type: String, default: null }, // Mainly for Repair
  
  status: { type: String, required: true, default: "Submitted" },
  rejection_note: { type: String, default: null },
  log: [serviceTicketLogSchema]
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

serviceTicketSchema.index({ type: 1, status: 1 }); // For fast filtering on Admin Dashboard

const ServiceTicket = mongoose.models.ServiceTicket || mongoose.model("ServiceTicket", serviceTicketSchema);
export default ServiceTicket;
