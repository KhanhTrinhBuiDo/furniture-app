import mongoose from "mongoose";

const serviceTicketLogSchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: "" },
  changed_at: { type: Date, default: Date.now }
}, { _id: false });

const serviceTicketSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // ─── Điều chỉnh so với tài liệu schema gốc (đánh dấu rõ) ───────────────────
  // Bảng mô tả gốc ghi product_id/order_id là required cho MỌI loại ticket.
  // Trên thực tế, ticket loại "TradeIn" (thu cũ đổi mới) mô tả một món đồ nội
  // thất CŨ của khách — có thể không mua từ Amore Home và không liên kết với
  // bất kỳ đơn hàng/sản phẩm nào trong catalog. Bắt buộc 2 field này ở tầng
  // Mongoose sẽ khiến không thể tạo được ticket TradeIn hợp lệ. Đưa validate
  // "bắt buộc theo type" xuống tầng route (routes/tradein.js, routes/cleaning.js)
  // thay vì ép cứng ở schema.
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  type: { type: String, required: true, enum: ['Cleaning', 'TradeIn', 'Repair'] },
  images: [{ type: String }],

  // Type-specific nullable fields
  appointment_date: { type: Date, default: null }, // Mainly for Cleaning/Repair
  valuation_price: { type: Number, default: null }, // Only for TradeIn
  error_description: { type: String, default: null }, // Mainly for Repair

  status: { type: String, required: true, default: "Submitted" },
  rejection_note: { type: String, default: null },
  // ─── Bổ sung so với tài liệu schema gốc (đánh dấu rõ) ──────────────────────
  // Bảng mô tả service_tickets gốc không có field này. Thêm vào để lưu liên
  // kết tới Voucher được cấp khi định giá Thu-cũ-đổi-mới (TradeIn) — nếu
  // không có field này, hệ thống tạo được voucher nhưng không có cách nào
  // tra cứu lại nó gắn với ticket nào. Giữ nullable, không ảnh hưởng type khác.
  voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
  log: [serviceTicketLogSchema]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

serviceTicketSchema.index({ type: 1, status: 1 }); // For fast filtering on Admin Dashboard

const ServiceTicket = mongoose.models.ServiceTicket || mongoose.model("ServiceTicket", serviceTicketSchema);
export default ServiceTicket;