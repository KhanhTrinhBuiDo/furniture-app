import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true },
        description: { type: String, default: "" },
        type: { type: String, enum: ["percent", "fixed"], required: true },
        value: { type: Number, required: true, min: 0 },
        maxDiscount: { type: Number, default: null },
        minOrderValue: { type: Number, default: 0 },
        usageLimit: { type: Number, default: null },
        usedCount: { type: Number, default: 0 },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

voucherSchema.methods.calcDiscount = function (total) {
    if (this.type === "percent") {
        const raw = Math.floor(total * this.value / 100);
        return this.maxDiscount ? Math.min(raw, this.maxDiscount) : raw;
    }
    return Math.min(this.value, total);
};

voucherSchema.methods.isValid = function (total) {
    const now = new Date();
    if (!this.isActive) return { ok: false, msg: "Voucher không còn hiệu lực" };
    if (now < this.startDate) return { ok: false, msg: "Voucher chưa đến ngày áp dụng" };
    if (now > this.endDate) return { ok: false, msg: "Voucher đã hết hạn" };
    if (this.usageLimit && this.usedCount >= this.usageLimit)
        return { ok: false, msg: "Voucher đã hết lượt sử dụng" };
    if (total < this.minOrderValue) return { ok: false, msg: `Đơn hàng tối thiểu ${this.minOrderValue.toLocaleString()}₫` };
    return { ok: true };
};

const Voucher = mongoose.models.Voucher || mongoose.model("Voucher", voucherSchema);
export default Voucher;