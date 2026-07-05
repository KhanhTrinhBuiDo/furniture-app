import { useState } from "react";
import { useStore } from "../../../store/store";
import { validateVoucher, createOrder } from "../services/orderService";
import { createPayment } from "../services/paymentService";
import FadeUp from "../components/FadeUp";

const C = {
  cream: "#FAF7F2", beige: "#F0E8DC", dark: "#1A1A2E",
  wood: "#B8860B", sand: "#D9C9B0", error: "#C0392B", green: "#27AE60",
  brand: "#C9A96E",  // Amore Home gold
};
const FREE_SHIP = 5_000_000;
const SHIP_FEE = 50_000;
const fmt = (n) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

// Kiểm tra id có phải MongoDB ObjectId không
function isMongoId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, navigate, showToast, isLoggedIn } = useStore();

  const [voucherInput, setVoucherInput] = useState("");
  const [voucherData, setVoucherData] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "", email: "", phone: "", address: "",
    city: "", district: "", ward: "", notes: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // ── Phân loại cart ────────────────────────────────────────────────────────
  // Chỉ cho phép checkout sản phẩm có _id MongoDB hợp lệ
  const dbItems = cart.filter(i => isMongoId(String(i._id || "")));
  const mockItems = cart.filter(i => !isMongoId(String(i._id || "")));

  const subtotal = dbItems.reduce((s, i) => s + (i.salePrice || i.price) * i.quantity, 0);
  const discount = voucherData?.discount || 0;
  const shippingFee = subtotal >= FREE_SHIP ? 0 : SHIP_FEE;
  const total = Math.max(0, subtotal - discount + shippingFee);
  const progress = Math.min(100, (subtotal / FREE_SHIP) * 100);

  // ── Voucher ───────────────────────────────────────────────────────────────
  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setVoucherLoading(true);
    setVoucherError("");
    try {
      const data = await validateVoucher(voucherInput.trim(), subtotal);
      setVoucherData(data);
      showToast({ message: `✓ Áp dụng voucher! Giảm ${fmt(data.discount)}`, type: "success" });
    } catch (err) {
      setVoucherError(err.message);
      setVoucherData(null);
    } finally {
      setVoucherLoading(false);
    }
  };

  // ── Validate form ─────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.fullName.trim()) e.fullName = "Vui lòng nhập họ tên";
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Email không hợp lệ";
    if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.phone.replace(/\s/g, ""))) e.phone = "Số điện thoại không hợp lệ";
    if (!formData.address.trim()) e.address = "Vui lòng nhập địa chỉ";
    if (!formData.city.trim()) e.city = "Vui lòng nhập tỉnh/thành phố";
    if (!formData.district.trim()) e.district = "Vui lòng nhập quận/huyện";
    setFormErrors(e);
    return !Object.keys(e).length;
  };

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = async (e) => {
    e?.preventDefault();
    if (!validate()) return;

    if (dbItems.length === 0) {
      showToast({ message: "Không có sản phẩm hợp lệ để thanh toán. Vui lòng thêm sản phẩm từ cửa hàng.", type: "error" });
      return;
    }

    setOrderLoading(true);
    try {
      // ─── 1. Tạo đơn hàng THẬT trong MongoDB ──────────────────────────
      // Trang này luôn được bọc bởi ProtectedRoute (App.jsx) nên isLoggedIn
      // luôn đúng khi tới được đây — không cần nhánh guest checkout.
      const { order } = await createOrder({
        items: dbItems.map(i => ({
          productId: i._id,           // MongoDB ObjectId
          name: i.name,
          img: i.img || "",
          price: i.salePrice || i.price,
          quantity: i.quantity,
        })),
        shippingAddress: formData,
        voucherCode: voucherData?.voucherCode || "",
        paymentMethod: "vnpay",
      });

      // ─── 2. Khởi tạo thanh toán cho đúng đơn hàng vừa tạo ────────────
      const payment = await createPayment({ orderId: order._id });

      if (payment.success && payment.paymentUrl) {
        window.location.href = payment.paymentUrl;
      } else {
        throw new Error("Không thể tạo URL thanh toán");
      }
    } catch (err) {
      showToast({ message: err.message || "Lỗi thanh toán", type: "error" });
      setOrderLoading(false);
    }
  };

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div style={{ background: C.cream, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FadeUp>
          <div style={{ textAlign: "center", padding: 40 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.sand} strokeWidth="1" style={{ marginBottom: 24 }}>
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19.4a2 2 0 001.99-1.61L23 6H6" />
            </svg>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: C.dark, margin: "0 0 12px" }}>Giỏ hàng trống</h2>
            <p style={{ fontSize: 14, color: "#999", marginBottom: 28 }}>Khám phá bộ sưu tập nội thất của Amore Home</p>
            <button onClick={() => navigate("shop")} style={{ background: C.dark, color: "#fff", border: "none", borderRadius: 6, padding: "13px 32px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Mua sắm ngay
            </button>
          </div>
        </FadeUp>
      </div>
    );
  }

  return (
    <div style={{ background: C.cream, minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ background: C.beige, borderBottom: `1px solid ${C.sand}`, padding: "32px 40px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "2rem", fontWeight: 700, color: C.dark, margin: 0 }}>Giỏ hàng</h1>
        <p style={{ fontSize: 13, color: C.sand, marginTop: 8 }}>Amore Home <span style={{ margin: "0 6px" }}>/</span> <span style={{ color: C.wood }}>Cart</span></p>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 20px", display: "grid", gridTemplateColumns: "1fr min(380px,100%)", gap: 32, alignItems: "start" }}>

        {/* ── Danh sách sản phẩm ─────────────────────────────────────────── */}
        <div>
          {/* Cảnh báo mock items */}
          {mockItems.length > 0 && (
            <div style={{ background: "#FEF9EC", border: "1px solid #D4A843", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13 }}>
              <strong style={{ color: "#B7860B" }}>⚠️ Lưu ý:</strong>{" "}
              <span style={{ color: "#666" }}>{mockItems.length} sản phẩm chưa được thêm vào hệ thống và sẽ không được tính khi thanh toán. Vui lòng xoá chúng khỏi giỏ hàng.</span>
            </div>
          )}

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 32px", gap: 12, padding: "10px 16px", background: C.beige, borderRadius: 8, marginBottom: 12, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.dark }}>
            <span>Sản phẩm</span>
            <span style={{ textAlign: "center" }}>Đơn giá</span>
            <span style={{ textAlign: "center" }}>Số lượng</span>
            <span style={{ textAlign: "right" }}>Thành tiền</span>
            <span />
          </div>

          {cart.map(item => {
            const id = item._id || item.id;
            const isValid = isMongoId(String(id));
            const itemPrice = item.salePrice || item.price;

            return (
              <FadeUp key={id}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 32px", gap: 12, padding: "14px 16px", background: "#fff", borderRadius: 8, marginBottom: 10, alignItems: "center", border: `1px solid ${isValid ? C.sand : "#F0C040"}`, opacity: isValid ? 1 : 0.65 }}>
                  {/* Product */}
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <img src={item.img?.startsWith("/") ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${item.img}` : (item.img || "https://via.placeholder.com/56")}
                      alt={item.name}
                      style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, background: C.beige, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: 0 }}>{item.name}</p>
                      {!isValid && <p style={{ fontSize: 10, color: "#D4A843", margin: "2px 0 0", fontWeight: 600 }}>⚠ Sản phẩm chưa trong hệ thống</p>}
                    </div>
                  </div>

                  {/* Price */}
                  <p style={{ textAlign: "center", fontSize: 13, color: "#666", margin: 0 }}>{fmt(itemPrice)}</p>

                  {/* Qty */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.sand}`, borderRadius: 6, overflow: "hidden", width: 96, margin: "0 auto" }}>
                    <button onClick={() => updateQuantity(id, item.quantity - 1)} style={{ background: "none", border: "none", width: 28, height: 34, cursor: "pointer", fontSize: 16, color: C.wood }}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, width: 32, textAlign: "center" }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(id, item.quantity + 1)} style={{ background: "none", border: "none", width: 28, height: 34, cursor: "pointer", fontSize: 16, color: C.wood }}>+</button>
                  </div>

                  {/* Subtotal */}
                  <p style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: C.dark, margin: 0 }}>{fmt(itemPrice * item.quantity)}</p>

                  {/* Remove */}
                  <button onClick={() => removeFromCart(id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.sand, fontSize: 16, padding: 0, transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.error)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.sand)}>✕</button>
                </div>
              </FadeUp>
            );
          })}

          {/* Free ship progress */}
          {subtotal < FREE_SHIP && dbItems.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 8, padding: "14px 16px", border: `1px solid ${C.sand}`, marginTop: 8 }}>
              <p style={{ fontSize: 13, color: C.dark, margin: "0 0 8px" }}>
                Mua thêm <strong style={{ color: C.wood }}>{fmt(FREE_SHIP - subtotal)}</strong> để được miễn phí vận chuyển 🚚
              </p>
              <div style={{ height: 5, background: C.beige, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${progress}%`, background: C.wood, borderRadius: 3, transition: "width 0.4s" }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Order Summary ──────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.sand}`, padding: 24, position: "sticky", top: 84 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: C.dark, margin: "0 0 20px", paddingBottom: 14, borderBottom: `1px solid ${C.beige}` }}>
            Tóm tắt đơn hàng
          </h3>

          {/* Voucher */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.dark, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Mã giảm giá</label>
            {voucherData ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#EEF4EA", borderRadius: 6, padding: "9px 12px", border: "1px solid #8FA67A" }}>
                <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>✓ {voucherData.voucherCode}</span>
                <button onClick={() => { setVoucherData(null); setVoucherInput(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 16 }}>✕</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" placeholder="Nhập mã voucher" value={voucherInput}
                    onChange={e => { setVoucherInput(e.target.value.toUpperCase()); setVoucherError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleApplyVoucher()}
                    style={{ flex: 1, padding: "9px 12px", border: `1px solid ${voucherError ? C.error : C.sand}`, borderRadius: 6, fontSize: 13, outline: "none" }} />
                  <button onClick={handleApplyVoucher} disabled={voucherLoading}
                    style={{ background: C.dark, color: "#fff", border: "none", borderRadius: 6, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {voucherLoading ? "..." : "Áp dụng"}
                  </button>
                </div>
                {voucherError && <p style={{ fontSize: 11, color: C.error, margin: "5px 0 0" }}>{voucherError}</p>}
              </>
            )}
          </div>

          {/* Price breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            {[
              ["Tạm tính", fmt(subtotal)],
              ...(discount > 0 ? [["Giảm giá", `-${fmt(discount)}`]] : []),
              ["Vận chuyển", shippingFee === 0 ? "Miễn phí" : fmt(shippingFee)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666" }}>
                <span>{k}</span>
                <span style={{ color: k === "Giảm giá" ? C.green : "inherit", fontWeight: k === "Giảm giá" ? 600 : 400 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: C.dark, borderTop: `1px solid ${C.sand}`, paddingTop: 14, marginBottom: 20 }}>
            <span>Tổng cộng</span>
            <span style={{ color: C.wood }}>{fmt(total)}</span>
          </div>

          {dbItems.length === 0 ? (
            <div style={{ background: "#FEF9EC", border: "1px solid #D4A843", borderRadius: 6, padding: "12px 14px", fontSize: 13, color: "#B7860B", textAlign: "center" }}>
              Chưa có sản phẩm hợp lệ để thanh toán
            </div>
          ) : (
            <button onClick={() => setShowModal(true)}
              style={{ width: "100%", padding: "13px 0", background: C.dark, color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Playfair Display',serif", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = C.wood)}
              onMouseLeave={e => (e.currentTarget.style.background = C.dark)}>
              Tiến hành thanh toán
            </button>
          )}

          <button onClick={() => navigate("shop")}
            style={{ width: "100%", padding: "11px 0", background: "none", border: `1px solid ${C.sand}`, borderRadius: 6, fontSize: 13, cursor: "pointer", color: C.dark, marginTop: 10 }}>
            ← Tiếp tục mua sắm
          </button>
        </div>
      </div>

      {/* ── Checkout Modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, maxWidth: 600, width: "100%", maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${C.beige}`, background: C.cream }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", color: C.dark, margin: 0 }}>Thông tin giao hàng</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#bbb" }}>✕</button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <MF label="Họ và tên *" error={formErrors.fullName}>
                  <MI name="fullName" placeholder="Nguyễn Văn A" value={formData.fullName} onChange={v => setFormData(p => ({ ...p, fullName: v }))} hasError={!!formErrors.fullName} />
                </MF>
                <MF label="Email *" error={formErrors.email}>
                  <MI name="email" type="email" placeholder="email@example.com" value={formData.email} onChange={v => setFormData(p => ({ ...p, email: v }))} hasError={!!formErrors.email} />
                </MF>
                <MF label="Điện thoại *" error={formErrors.phone}>
                  <MI name="phone" type="tel" placeholder="0912345678" value={formData.phone} onChange={v => setFormData(p => ({ ...p, phone: v }))} hasError={!!formErrors.phone} />
                </MF>
                <MF label="Tỉnh/Thành phố *" error={formErrors.city}>
                  <MI name="city" placeholder="TP. Hồ Chí Minh" value={formData.city} onChange={v => setFormData(p => ({ ...p, city: v }))} hasError={!!formErrors.city} />
                </MF>
                <MF label="Quận/Huyện *" error={formErrors.district}>
                  <MI name="district" placeholder="Quận 1" value={formData.district} onChange={v => setFormData(p => ({ ...p, district: v }))} hasError={!!formErrors.district} />
                </MF>
                <MF label="Phường/Xã">
                  <MI name="ward" placeholder="Phường Bến Nghé" value={formData.ward} onChange={v => setFormData(p => ({ ...p, ward: v }))} />
                </MF>
              </div>
              <MF label="Địa chỉ chi tiết *" error={formErrors.address} style={{ marginBottom: 14 }}>
                <MI name="address" placeholder="123 Đường Lê Lợi" value={formData.address} onChange={v => setFormData(p => ({ ...p, address: v }))} hasError={!!formErrors.address} />
              </MF>
              <MF label="Ghi chú" style={{ marginBottom: 20 }}>
                <textarea placeholder="Ghi chú thêm..." value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2}
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.sand}`, borderRadius: 6, fontSize: 13, fontFamily: "'Poppins',sans-serif", resize: "none", outline: "none", boxSizing: "border-box" }} />
              </MF>

              {/* Order summary in modal */}
              <div style={{ background: C.beige, borderRadius: 8, padding: 14, marginBottom: 18 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: "0 0 10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Đơn hàng ({dbItems.length} sản phẩm)</p>
                {dbItems.slice(0, 3).map(i => (
                  <div key={i._id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 6 }}>
                    <span>{i.name} × {i.quantity}</span>
                    <span>{fmt((i.salePrice || i.price) * i.quantity)}</span>
                  </div>
                ))}
                {dbItems.length > 3 && <p style={{ fontSize: 11, color: "#bbb", margin: "4px 0 0" }}>+{dbItems.length - 3} sản phẩm khác</p>}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: C.dark, borderTop: `1px solid ${C.sand}`, paddingTop: 10, marginTop: 8 }}>
                  <span>Tổng</span><span>{fmt(total)}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button onClick={() => setShowModal(false)} style={{ padding: "12px 0", background: C.beige, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.dark }}>
                  Huỷ
                </button>
                <button onClick={handleCheckout} disabled={orderLoading}
                  style={{ padding: "12px 0", background: orderLoading ? C.sand : C.wood, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: orderLoading ? "not-allowed" : "pointer", color: "#fff", transition: "background 0.2s" }}>
                  {orderLoading ? "Đang xử lý..." : "Thanh toán VNPay →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MF({ label, error, children, style: s }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...s }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#1A1A2E", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</label>
      {children}
      {error && <p style={{ margin: 0, fontSize: 11, color: "#C0392B" }}>{error}</p>}
    </div>
  );
}

function MI({ onChange, hasError, ...props }) {
  return (
    <input {...props} onChange={e => onChange(e.target.value)}
      style={{ padding: "9px 12px", border: `1px solid ${hasError ? "#C0392B" : "#D9C9B0"}`, borderRadius: 6, fontSize: 13, fontFamily: "'Poppins',sans-serif", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" }}
      onFocus={e => { if (!hasError) e.target.style.borderColor = "#B8860B"; }}
      onBlur={e => { if (!hasError) e.target.style.borderColor = "#D9C9B0"; }} />
  );
}