import express from "express";
import Order from "../models/Order.js";
import {
  createVNPayPaymentUrl,
  verifyVNPayResponse,
  parseVNPayResponse,
} from "../utils/vnpay.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── DEMO MODE ───────────────────────────────────────────────────────────
// Đặt false để dùng lại luồng VNPay thật (redirect sang cổng thanh toán,
// chờ webhook xác nhận). Khi true: đơn hàng được đánh dấu "paid" ngay lập
// tức trên chính Order thật trong MongoDB — dùng để test các luồng sau
// thanh toán (warranty, cleaning, order status,...) mà không cần tài khoản
// VNPay sandbox thật.
const DEMO_AUTO_SUCCESS = true;

// ─── POST /api/payment/create-payment ────────────────────────────────────
// Nhận orderId của một Order THẬT đã được tạo qua POST /api/orders,
// khởi tạo thanh toán cho đúng đơn hàng đó (không tự tạo bản ghi tạm nữa).
router.post("/create-payment", protect, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Thiếu orderId" });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }
    if (order.paymentStatus === "paid") {
      return res.status(400).json({ error: "Đơn hàng đã được thanh toán" });
    }

    if (DEMO_AUTO_SUCCESS) {
      order.paymentStatus = "paid";
      order.transactionNo = `DEMO${Date.now()}`;
      order.paidAt = new Date();
      if (order.status === "pending") {
        order.status = "confirmed";
        order.statusHistory.push({
          status: "confirmed",
          note: "[DEMO] Thanh toán VNPay tự động thành công",
        });
      }
      await order.save();

      const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:3000";
      const paymentUrl = `${frontendUrl}/?vnp_TxnRef=${encodeURIComponent(order.orderCode)}&vnp_ResponseCode=00`;

      return res.json({
        success: true,
        paymentUrl,
        orderCode: order.orderCode,
        demo: true,
      });
    }

    // ─── Luồng VNPay thật (giữ nguyên, dùng khi tắt DEMO_AUTO_SUCCESS) ──
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    const paymentUrl = createVNPayPaymentUrl({
      amount: order.total,
      orderCode: order.orderCode,
      orderDescription: `Thanh toán đơn hàng ${order.orderCode}`,
      returnUrl: process.env.VNPAY_RETURN_URL,
      ipAddress,
      tmnCode: process.env.VNPAY_TMNCODE,
      hashSecret: process.env.VNPAY_HASHSECRET,
      vnpayUrl: process.env.VNPAY_URL,
    });

    res.json({ success: true, paymentUrl, orderCode: order.orderCode });
  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// ─── GET /api/payment/webhook — Callback thật từ VNPay ───────────────────
// NFR-10: bắt buộc xác minh chữ ký (verifyVNPayResponse) TRƯỚC khi cập nhật
// trạng thái thanh toán. Endpoint này công khai (VNPay gọi server-to-server,
// không có cookie đăng nhập) nhưng được bảo vệ bằng xác thực chữ ký HMAC.
router.get("/webhook", async (req, res) => {
  try {
    const vnpParams = { ...req.query };

    const isValid = verifyVNPayResponse(vnpParams, process.env.VNPAY_HASHSECRET);
    if (!isValid) {
      return res.status(400).json({ RspCode: "97", Message: "Invalid signature" });
    }

    const orderCode = vnpParams.vnp_TxnRef;
    const responseData = parseVNPayResponse(vnpParams);

    const order = await Order.findOne({ orderCode });
    if (order) {
      if (responseData.isSuccess) {
        order.paymentStatus = "paid";
        order.transactionNo = responseData.transactionNo;
        order.paidAt = new Date();
        if (order.status === "pending") {
          order.status = "confirmed";
          order.statusHistory.push({ status: "confirmed", note: "Thanh toán VNPay thành công" });
        }
      } else {
        order.paymentStatus = "failed";
      }
      await order.save();
    }

    res.json({ RspCode: "00", Message: "Confirm received" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.json({ RspCode: "99", Message: "Error processing webhook" });
  }
});

// ─── GET /api/payment/status/:orderCode ──────────────────────────────────
// Chỉ chủ đơn hàng mới xem được trạng thái thanh toán của chính mình.
router.get("/status/:orderCode", protect, async (req, res) => {
  try {
    const order = await Order.findOne({ orderCode: req.params.orderCode, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const status =
      order.paymentStatus === "paid" ? "completed" :
        order.paymentStatus === "failed" ? "failed" : "pending";

    res.json({
      success: true,
      orderCode: order.orderCode,
      status,
      amount: order.total,
      message:
        status === "completed" ? "Thanh toán thành công" :
          status === "failed" ? "Thanh toán thất bại" : "Đang chờ thanh toán",
      transactionNo: order.transactionNo,
      payDate: order.paidAt,
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
});

export default router;