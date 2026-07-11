import express from "express";
import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";
import Voucher from "../models/Voucher.js";
import {
  createVNPayPaymentUrl,
  verifyVNPayResponse,
  parseVNPayResponse,
} from "../utils/vnpay.js";
import { protect } from "../middleware/authMiddleware.js";
import { commitStock } from "../utils/stockHelpers.js";
import { commitVoucher } from "../utils/voucherHelpers.js";

const router = express.Router();

// ─── DEMO MODE ────────────────────────────────────────────────────────────
// Đặt false để dùng luồng VNPay thật. Khi true: Transaction được tạo và đánh
// dấu "Success" ngay lập tức để test các luồng phía sau (warranty, order
// status, service tickets...) mà không cần tài khoản VNPay sandbox thật.
const DEMO_AUTO_SUCCESS = true;

// GHI CHÚ QUAN TRỌNG: Order model mới không còn paymentStatus/paymentMethod/
// transactionNo — toàn bộ vòng đời thanh toán giờ nằm ở collection riêng
// `transactions` (method: VNPay/MoMo/COD, status: Pending/Success/Failed/
// Expired). File này là nơi DUY NHẤT được phép gọi commitStock/commitVoucher
// (chốt bán thật) — orders.js chỉ giữ chỗ (lockStock/lockVoucher) lúc tạo đơn.

async function finalizeOrderOnPaymentSuccess(order) {
  order.status = order.status === "Pending" ? "Confirmed" : order.status;
  order.status_log.push({ status: order.status, note: "Thanh toán thành công" });
  await order.save();

  await commitStock(order.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })));
  if (order.voucher_id) await commitVoucher(Voucher, order.voucher_id);
}

// ─── POST /api/payment/create-payment ────────────────────────────────────
router.post("/create-payment", protect, async (req, res) => {
  try {
    const { orderId, method = "VNPay" } = req.body;
    if (!orderId) return res.status(400).json({ error: "Thiếu orderId" });

    const order = await Order.findOne({ _id: orderId, user_id: req.user._id });
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng" });

    const existingSuccess = await Transaction.findOne({ order_id: order._id, status: "Success" });
    if (existingSuccess) return res.status(400).json({ error: "Đơn hàng đã được thanh toán" });

    if (DEMO_AUTO_SUCCESS) {
      const tx = await Transaction.create({
        order_id: order._id,
        method,
        status: "Success",
        gateway_transaction_id: `DEMO${Date.now()}`,
        response_data: { demo: true },
      });

      await finalizeOrderOnPaymentSuccess(order);

      const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:3000";
      const paymentUrl = `${frontendUrl}/?vnp_TxnRef=${encodeURIComponent(order.tracking_token)}&vnp_ResponseCode=00`;

      return res.json({ success: true, paymentUrl, orderCode: order.tracking_token, demo: true });
    }

    // ─── Luồng VNPay thật ──────────────────────────────────────────────────
    await Transaction.create({ order_id: order._id, method, status: "Pending" });

    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    const paymentUrl = createVNPayPaymentUrl({
      amount: order.total_amount,
      orderCode: order.tracking_token,
      orderDescription: `Thanh toán đơn hàng ${order.tracking_token}`,
      returnUrl: process.env.VNPAY_RETURN_URL,
      ipAddress,
      tmnCode: process.env.VNPAY_TMNCODE,
      hashSecret: process.env.VNPAY_HASHSECRET,
      vnpayUrl: process.env.VNPAY_URL,
    });

    res.json({ success: true, paymentUrl, orderCode: order.tracking_token });
  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// ─── GET /api/payment/webhook — Callback thật từ VNPay ───────────────────
router.get("/webhook", async (req, res) => {
  try {
    const vnpParams = { ...req.query };
    const isValid = verifyVNPayResponse(vnpParams, process.env.VNPAY_HASHSECRET);
    if (!isValid) return res.status(400).json({ RspCode: "97", Message: "Invalid signature" });

    const trackingToken = vnpParams.vnp_TxnRef;
    const responseData = parseVNPayResponse(vnpParams);

    const order = await Order.findOne({ tracking_token: trackingToken });
    if (order) {
      const tx = await Transaction.findOneAndUpdate(
        { order_id: order._id, status: "Pending" },
        {
          status: responseData.isSuccess ? "Success" : "Failed",
          gateway_transaction_id: responseData.transactionNo,
          response_data: vnpParams,
          hmac_signature: vnpParams.vnp_SecureHash || null,
        },
        { new: true, sort: { created_at: -1 } }
      );

      if (responseData.isSuccess) {
        await finalizeOrderOnPaymentSuccess(order);
      }
      // Thất bại: KHÔNG release kho/voucher ở đây — khách có thể thử thanh
      // toán lại cho cùng đơn hàng đó. Kho chỉ được nhả khi đơn bị huỷ hẳn
      // (POST /api/orders/my/:orderCode/cancel) hoặc job quét timeout.
    }

    res.json({ RspCode: "00", Message: "Confirm received" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.json({ RspCode: "99", Message: "Error processing webhook" });
  }
});

// ─── GET /api/payment/status/:orderCode ──────────────────────────────────
router.get("/status/:orderCode", protect, async (req, res) => {
  try {
    const order = await Order.findOne({ tracking_token: req.params.orderCode, user_id: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const tx = await Transaction.findOne({ order_id: order._id }).sort({ created_at: -1 });

    const status =
      tx?.status === "Success" ? "completed" :
        tx?.status === "Failed" ? "failed" :
          tx?.status === "Expired" ? "failed" : "pending";

    res.json({
      success: true,
      orderCode: order.tracking_token,
      status,
      amount: order.total_amount,
      message:
        status === "completed" ? "Thanh toán thành công" :
          status === "failed" ? "Thanh toán thất bại" : "Đang chờ thanh toán",
      transactionNo: tx?.gateway_transaction_id,
      payDate: tx?.updated_at,
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
});

export default router;