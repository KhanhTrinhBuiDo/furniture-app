import mongoose from "mongoose";

// ─── Warranty Event ──────────────────────────────────────────────────────────
const warrantyEventSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["warranty_start", "warranty_reminder", "warranty_expire",
            "loyalty_reward", "maintenance_due", "promotion"],
        required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    scheduledAt: { type: Date, required: true },
    sentAt: { type: Date, default: null },
    isSent: { type: Boolean, default: false },
}, { _id: false });

// ─── Main Warranty Schema ─────────────────────────────────────────────────────
const warrantySchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        orderCode: { type: String, required: true },

        // Thông tin sản phẩm lúc mua (snapshot — không đổi dù SP thay đổi)
        productName: { type: String, required: true },
        productImg: { type: String, default: "" },
        purchasePrice: { type: Number, required: true },

        // Bảo hành
        warrantyMonths: { type: Number, default: 12 },   // 12 tháng mặc định
        purchasedAt: { type: Date, required: true },
        warrantyStartAt: { type: Date, required: true },
        warrantyEndAt: { type: Date, required: true },

        // Trạng thái
        status: {
            type: String,
            enum: ["active", "expiring_soon", "expired"],
            default: "active",
            index: true,
        },

        // Timeline sự kiện nhắc nhở
        events: [warrantyEventSchema],

        // Ghi chú bảo hành
        notes: { type: String, default: "" },
    },
    { timestamps: true }
);

// ─── Helper: tạo timeline events mặc định ────────────────────────────────────
warrantySchema.statics.buildTimeline = function (purchasedAt, warrantyMonths = 12) {
    const start = new Date(purchasedAt);
    const end = new Date(purchasedAt);
    end.setMonth(end.getMonth() + warrantyMonths);

    const remind30 = new Date(end);
    remind30.setDate(remind30.getDate() - 30);

    const remind7 = new Date(end);
    remind7.setDate(remind7.getDate() - 7);

    const loyalty3m = new Date(purchasedAt);
    loyalty3m.setMonth(loyalty3m.getMonth() + 3);

    const loyalty6m = new Date(purchasedAt);
    loyalty6m.setMonth(loyalty6m.getMonth() + 6);

    return [
        {
            type: "warranty_start",
            title: "Bảo hành bắt đầu",
            description: `Sản phẩm của bạn được bảo hành ${warrantyMonths} tháng kể từ ngày mua.`,
            scheduledAt: start,
        },
        {
            type: "loyalty_reward",
            title: "Ưu đãi khách hàng thân thiết — 3 tháng",
            description: "Cảm ơn bạn đã tin tưởng Amore Home! Nhận voucher giảm 10% cho đơn hàng tiếp theo.",
            scheduledAt: loyalty3m,
        },
        {
            type: "maintenance_due",
            title: "Nhắc nhở bảo dưỡng định kỳ",
            description: "Đã 6 tháng kể từ khi mua. Hãy kiểm tra và bảo dưỡng sản phẩm để đảm bảo chất lượng.",
            scheduledAt: loyalty6m,
        },
        {
            type: "warranty_reminder",
            title: "Bảo hành sắp hết hạn — còn 30 ngày",
            description: "Bảo hành sản phẩm sẽ hết hạn sau 30 ngày. Liên hệ ngay nếu cần hỗ trợ.",
            scheduledAt: remind30,
        },
        {
            type: "warranty_reminder",
            title: "Bảo hành sắp hết hạn — còn 7 ngày",
            description: "Chỉ còn 7 ngày bảo hành! Kiểm tra sản phẩm và liên hệ nếu có vấn đề.",
            scheduledAt: remind7,
        },
        {
            type: "warranty_expire",
            title: "Bảo hành đã kết thúc",
            description: "Bảo hành sản phẩm đã hết hạn. Liên hệ Amore Home để được hỗ trợ dịch vụ sau bán hàng.",
            scheduledAt: end,
        },
    ];
};

// ─── Auto-update status ───────────────────────────────────────────────────────
warrantySchema.pre("save", function (next) {
    const now = new Date();
    const daysLeft = Math.ceil((this.warrantyEndAt - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) this.status = "expired";
    else if (daysLeft <= 30) this.status = "expiring_soon";
    else this.status = "active";
    next();
});

export default mongoose.models.Warranty || mongoose.model("Warranty", warrantySchema);