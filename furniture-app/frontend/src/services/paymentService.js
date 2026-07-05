// ─── Base URL ─────────────────────────────────────────────────────────────────
// Vite injects VITE_* env vars at build time.
// Set VITE_API_URL in .env.local for local dev, or in Vercel/host env for prod.
// Default falls back to localhost so existing local setup still works.
const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/payment`;

// ─── CREATE PAYMENT (cho đơn hàng THẬT đã tạo qua orderService.createOrder) ───
export async function createPayment({ orderId }) {
  const response = await fetch(`${API_URL}/create-payment`, {
    method: "POST",
    credentials: "include", // bắt buộc — route yêu cầu đăng nhập để xác thực chủ đơn hàng
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create payment");
  }

  return response.json();
}

// ─── CHECK PAYMENT STATUS ─────────────────────────────────────────────────────
export async function checkPaymentStatus(orderCode) {
  const response = await fetch(`${API_URL}/status/${encodeURIComponent(orderCode)}`, {
    credentials: "include", // bắt buộc — route yêu cầu đăng nhập để xác thực chủ đơn hàng
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to check payment status");
  }

  return response.json();
}

// ─── FORMAT CURRENCY (VND) ────────────────────────────────────────────────────
export function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

// ─── GENERATE ORDER CODE ──────────────────────────────────────────────────────
// Giữ lại để tương thích ngược — orders.js phía backend đã TỰ SINH orderCode
// nếu không được truyền lên, nên hàm này không còn bắt buộc phải dùng, nhưng
// vẫn export để không phá vỡ các chỗ khác (VD: CartPage.jsx) đang import nó.
export function generateOrderCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `FNR${timestamp}${random}`;
}