import express from "express";
import {
  createVNPayPaymentUrl,
  verifyVNPayResponse,
  parseVNPayResponse,
} from "../utils/vnpay.js";

const router = express.Router();

// ─── In-Memory Order Storage (for demo) ────────────────────────────────
// In production, use database
const orders = new Map();

// ─── DEMO MODE ───────────────────────────────────────────────────────────
// Đặt false để dùng lại luồng VNPay thật (redirect sang cổng thanh toán).
// Khi true: mọi đơn hàng tự động được đánh dấu "completed" ngay khi tạo,
// không gọi VNPay thật — dùng để test các luồng sau thanh toán (warranty,
// order status, email,...) mà không cần tài khoản VNPay sandbox thật.
const DEMO_AUTO_SUCCESS = true;

// ─── CREATE PAYMENT URL ─────────────────────────────────────────────────
router.post("/create-payment", (req, res) => {
  try {
    const { amount, orderCode, orderDescription, customerInfo } = req.body;

    // Validate input
    if (!amount || !orderCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (DEMO_AUTO_SUCCESS) {
      // ─── Demo: bỏ qua VNPay, đánh dấu thành công ngay ───────────────
      orders.set(orderCode, {
        amount,
        orderDescription,
        customerInfo,
        createdAt: new Date(),
        status: "completed",
        transactionNo: `DEMO${Date.now()}`,
        payDate: formatDateVN(new Date()),
      });

      const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:3000";
      // Trỏ thẳng về trang PaymentReturn của frontend, giả lập tham số
      // mà VNPay thật sẽ gửi kèm khi redirect về (vnp_TxnRef, vnp_ResponseCode).
      const paymentUrl = `${frontendUrl}/?vnp_TxnRef=${encodeURIComponent(orderCode)}&vnp_ResponseCode=00&vnp_Amount=${amount * 100}`;

      return res.json({
        success: true,
        paymentUrl,
        orderCode,
        demo: true,
      });
    }

    // ─── Luồng VNPay thật (giữ nguyên, dùng khi tắt DEMO_AUTO_SUCCESS) ──
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    const paymentUrl = createVNPayPaymentUrl({
      amount,
      orderCode,
      orderDescription: orderDescription || "Thanh toán đơn hàng",
      returnUrl: process.env.VNPAY_RETURN_URL,
      ipAddress,
      tmnCode: process.env.VNPAY_TMNCODE,
      hashSecret: process.env.VNPAY_HASHSECRET,
      vnpayUrl: process.env.VNPAY_URL,
    });

    orders.set(orderCode, {
      amount,
      orderDescription,
      customerInfo,
      createdAt: new Date(),
      status: "pending",
    });

    res.json({
      success: true,
      paymentUrl,
      orderCode,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// ─── PAYMENT CALLBACK/WEBHOOK ──────────────────────────────────────────
// (Không dùng khi DEMO_AUTO_SUCCESS = true, giữ nguyên cho VNPay thật)
router.get("/webhook", (req, res) => {
  try {
    const vnpParams = req.query;

    const isValid = verifyVNPayResponse(
      vnpParams,
      process.env.VNPAY_HASHSECRET
    );

    if (!isValid) {
      return res.status(400).json({
        RspCode: "97",
        Message: "Invalid signature",
      });
    }

    const orderCode = vnpParams.vnp_TxnRef;
    const responseData = parseVNPayResponse(vnpParams);

    if (orders.has(orderCode)) {
      const order = orders.get(orderCode);
      order.status = responseData.isSuccess ? "completed" : "failed";
      order.transactionNo = responseData.transactionNo;
      order.payDate = responseData.payDate;
      orders.set(orderCode, order);
    }

    res.json({
      RspCode: "00",
      Message: "Confirm received",
    });
  } catch (error) {
    console.error("Webhook error:", error);
    res.json({
      RspCode: "99",
      Message: "Error processing webhook",
    });
  }
});

// ─── CHECK PAYMENT STATUS ──────────────────────────────────────────────
router.get("/status/:orderCode", (req, res) => {
  try {
    const { orderCode } = req.params;

    if (!orders.has(orderCode)) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders.get(orderCode);

    res.json({
      success: true,
      orderCode,
      status: order.status,
      amount: order.amount,
      message:
        order.status === "completed"
          ? "Thanh toán thành công"
          : order.status === "failed"
            ? "Thanh toán thất bại"
            : "Đang chờ thanh toán",
      transactionNo: order.transactionNo,
      payDate: order.payDate,
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
});

// ─── GET ALL ORDERS (Admin) ────────────────────────────────────────────
router.get("/orders", (req, res) => {
  try {
    const ordersList = Array.from(orders.entries()).map(([code, data]) => ({
      orderCode: code,
      ...data,
    }));

    res.json({
      success: true,
      total: ordersList.length,
      orders: ordersList,
    });
  } catch (error) {
    console.error("Orders fetch error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ─── Helper ─────────────────────────────────────────────────────────────
function formatDateVN(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}${h}${mi}${s}`;
}

export default router;