import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    productId: { type: mongoose.Schema.Types.Mixed },
    name: { type: String, required: true },
    img: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    ward: { type: String, default: "" },
    district: { type: String, required: true },
    city: { type: String, required: true },
    notes: { type: String, default: "" },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
    status: { type: String, required: true },
    note: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const orderSchema = new mongoose.Schema(
    {
        orderCode: { type: String, unique: true, required: true, index: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        items: [orderItemSchema],
        shippingAddress: shippingAddressSchema,
        subtotal: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        shippingFee: { type: Number, default: 0 },
        total: { type: Number, required: true },
        voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
        voucherCode: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "confirmed", "shipping", "completed", "cancelled"],
            default: "pending",
            index: true,
        },
        statusHistory: [statusHistorySchema],
        paymentMethod: { type: String, enum: ["vnpay", "cod"], default: "vnpay" },
        paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
        transactionNo: { type: String, default: "" },
        paidAt: { type: Date, default: null },
        cancelReason: { type: String, default: "" },
        cancelledBy: { type: String, default: null },
    },
    { timestamps: true }
);

orderSchema.methods.canCancel = function () {
    return ["pending", "confirmed"].includes(this.status);
};

// Guard chống duplicate model
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;