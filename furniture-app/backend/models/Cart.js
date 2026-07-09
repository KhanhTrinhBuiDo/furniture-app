import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // Enforces 1-1 relationship
  items: [cartItemSchema]
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
export default Cart;
