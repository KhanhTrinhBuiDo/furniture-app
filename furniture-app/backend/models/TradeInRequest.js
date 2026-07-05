import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema({
    status: { type: String, required: true },
    note: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const tradeInRequestSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        productName: { type: String, required: true, trim: true },
        category: {
            type: String,
            required: true,
            enum: ["LIVING ROOM", "KITCHEN", "BEDROOM", "BATHROOM", "DECORATION", "DINING ROOM"],
        },
        description: { type: String, default: "" },
        condition: {
            type: String,
            enum: ["like_new", "good", "fair", "poor"],
            required: true,
        },
        images: [{ type: String, required: true }],
        contactPhone: { type: String, required: true },
        contactAddress: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "appraised", "voucher_sent", "rejected", "cancelled"],
            default: "pending",
            index: true,
        },
        appraisedValue: { type: Number, default: null },
        adminNote: { type: String, default: "" },
        voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
        voucherCode: { type: String, default: "" },
        statusHistory: [statusHistorySchema],
    },
    { timestamps: true }
);

const TradeInRequest = mongoose.models.TradeInRequest || mongoose.model("TradeInRequest", tradeInRequestSchema);
export default TradeInRequest;