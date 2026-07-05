import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema({
    status: { type: String, required: true },
    note: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const cleaningItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    name: { type: String, required: true },
    img: { type: String, default: "" },
}, { _id: false });

const cleaningRequestSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
        orderCode: { type: String, required: true },
        items: [cleaningItemSchema],
        preferredDate: { type: Date, required: true },
        scheduledDate: { type: Date, default: null },
        address: { type: String, required: true },
        phone: { type: String, required: true },
        notes: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
            default: "pending",
            index: true,
        },
        adminNote: { type: String, default: "" },
        statusHistory: [statusHistorySchema],
    },
    { timestamps: true }
);

cleaningRequestSchema.methods.canCancel = function () {
    return ["pending", "confirmed"].includes(this.status);
};

const CleaningRequest = mongoose.models.CleaningRequest || mongoose.model("CleaningRequest", cleaningRequestSchema);
export default CleaningRequest;