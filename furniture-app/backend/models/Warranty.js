import mongoose from "mongoose";

const warrantyEventSchema = new mongoose.Schema({
    type: { type: String, enum: ["warranty_start", "warranty_reminder", "warranty_expire", "loyalty_reward", "maintenance_due", "promotion"], required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    scheduledAt: { type: Date, required: true },
    sentAt: { type: Date, default: null },
    isSent: { type: Boolean, default: false },
}, { _id: false });

const warrantySchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        orderCode: { type: String, required: true },
        productName: { type: String, required: true },
        productImg: { type: String, default: "" },
        purchasePrice: { type: Number, required: true },
        warrantyMonths: { type: Number, default: 12 },
        purchasedAt: { type: Date, required: true },
        warrantyStartAt: { type: Date, required: true },
        warrantyEndAt: { type: Date, required: true },
        status: { type: String, enum: ["active", "expiring_soon", "expired"], default: "active", index: true },
        events: [warrantyEventSchema],
        notes: { type: String, default: "" },
    },
    { timestamps: true }
);

warrantySchema.statics.buildTimeline = function (purchasedAt, warrantyMonths = 12) {
    const start = new Date(purchasedAt);
    const end = new Date(purchasedAt);
    end.setMonth(end.getMonth() + warrantyMonths);

    const remind30 = new Date(end); remind30.setDate(remind30.getDate() - 30);
    const remind7 = new Date(end); remind7.setDate(remind7.getDate() - 7);
    const loy3m = new Date(purchasedAt); loy3m.setMonth(loy3m.getMonth() + 3);
    const loy6m = new Date(purchasedAt); loy6m.setMonth(loy6m.getMonth() + 6);

    return [
        { type: "warranty_start", title: "Bảo hành bắt đầu", description: `Sản phẩm được bảo hành ${warrantyMonths} tháng.`, scheduledAt: start },
        { type: "loyalty_reward", title: "Ưu đãi 3 tháng — Giảm 10%", description: "Cảm ơn bạn! Voucher giảm 10% đơn tiếp theo đã được gửi qua email.", scheduledAt: loy3m },
        { type: "maintenance_due", title: "Nhắc bảo dưỡng định kỳ 6 tháng", description: "Đã 6 tháng sử dụng. Kiểm tra và bảo dưỡng để đảm bảo chất lượng.", scheduledAt: loy6m },
        { type: "warranty_reminder", title: "Bảo hành sắp hết — còn 30 ngày", description: "Bảo hành hết hạn sau 30 ngày. Liên hệ ngay nếu cần hỗ trợ.", scheduledAt: remind30 },
        { type: "warranty_reminder", title: "Bảo hành sắp hết — còn 7 ngày", description: "Chỉ còn 7 ngày! Kiểm tra sản phẩm trước khi bảo hành kết thúc.", scheduledAt: remind7 },
        { type: "warranty_expire", title: "Bảo hành đã kết thúc", description: "Liên hệ Amore Home để được hỗ trợ dịch vụ sau bán hàng.", scheduledAt: end },
    ];
};

warrantySchema.pre("save", function (next) {
    const now = new Date();
    const days = Math.ceil((this.warrantyEndAt - now) / 864e5);
    this.status = days <= 0 ? "expired" : days <= 30 ? "expiring_soon" : "active";
    next();
});

const Warranty = mongoose.models.Warranty || mongoose.model("Warranty", warrantySchema);
export default Warranty;