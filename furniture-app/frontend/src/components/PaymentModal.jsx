import { useState, useMemo } from "react";
import { createOrder, validateVoucher } from "../services/orderService";
import { createPayment } from "../services/paymentService";

const colors = {
  cream: "#FAF7F2",
  beige: "#F0E8DC",
  dark: "#4A2C1A",
  wood: "#8B5E3C",
  sand: "#D9C9B0",
  error: "#C47B5A",
  success: "#6B7C5C",
};

const fmt = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

// Cùng ngưỡng miễn phí vận chuyển như backend (orders.js) — chỉ để hiển thị
// tạm trước khi tạo đơn; giá trị cuối cùng luôn do backend tính lại và
// quyết định, đây không phải nguồn xác thực.
const FREE_SHIP_THRESHOLD = 5_000_000;
const SHIPPING_FEE = 50_000;

export default function PaymentModal({ isOpen, onClose, cartItems }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    ward: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  // ─── Voucher ────────────────────────────────────────────────────────────
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherApplied, setVoucherApplied] = useState(null); // { code, discount, description }
  const [voucherError, setVoucherError] = useState("");
  const [checkingVoucher, setCheckingVoucher] = useState(false);

  const subtotal = useMemo(
    () => cartItems.reduce((s, i) => s + (i.salePrice || i.price) * i.quantity, 0),
    [cartItems]
  );
  const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const discount = voucherApplied?.discount || 0;
  const total = Math.max(0, subtotal - discount + shipping);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setCheckingVoucher(true);
    setVoucherError("");
    try {
      const result = await validateVoucher(voucherInput.trim(), subtotal);
      setVoucherApplied({
        code: result.voucherCode,
        discount: result.discount,
        description: result.description,
      });
    } catch (err) {
      setVoucherApplied(null);
      setVoucherError(err.message || "Mã voucher không hợp lệ");
    }
    setCheckingVoucher(false);
  };

  const handleRemoveVoucher = () => {
    setVoucherApplied(null);
    setVoucherInput("");
    setVoucherError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên";
    if (!formData.email.trim()) newErrors.email = "Vui lòng nhập email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }
    if (!formData.phone.trim()) newErrors.phone = "Vui lòng nhập số điện thoại";
    if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }
    if (!formData.address.trim()) newErrors.address = "Vui lòng nhập địa chỉ";
    if (!formData.city.trim()) newErrors.city = "Vui lòng chọn tỉnh/thành phố";
    if (!formData.district.trim()) newErrors.district = "Vui lòng nhập quận/huyện";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // ─── 1. Tạo đơn hàng THẬT trong MongoDB ──────────────────────────
      const orderPayload = {
        items: cartItems.map((item) => ({
          productId: item._id || item.id,
          name: item.name,
          img: item.img,
          price: item.salePrice || item.price,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          ward: formData.ward,
          district: formData.district,
          city: formData.city,
          notes: formData.notes,
        },
        paymentMethod: "vnpay",
        ...(voucherApplied ? { voucherCode: voucherApplied.code } : {}),
      };

      const { order } = await createOrder(orderPayload);

      // ─── 2. Khởi tạo thanh toán cho đúng đơn hàng vừa tạo ────────────
      const paymentResult = await createPayment({ orderId: order._id });

      if (paymentResult.success && paymentResult.paymentUrl) {
        window.location.href = paymentResult.paymentUrl;
      } else {
        alert("Không thể tạo thanh toán. Vui lòng thử lại.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert(error.message || "Lỗi thanh toán. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Thông tin thanh toán</h2>
          <button
            onClick={onClose}
            style={styles.closeBtn}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Row 1: Full Name & Email */}
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Họ và tên *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Nguyễn Văn A"
                style={{
                  ...styles.input,
                  borderColor: errors.fullName ? colors.error : colors.sand,
                }}
                disabled={loading}
              />
              {errors.fullName && <p style={styles.error}>{errors.fullName}</p>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@example.com"
                style={{
                  ...styles.input,
                  borderColor: errors.email ? colors.error : colors.sand,
                }}
                disabled={loading}
              />
              {errors.email && <p style={styles.error}>{errors.email}</p>}
            </div>
          </div>

          {/* Row 2: Phone & City */}
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Số điện thoại *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="0912345678"
                style={{
                  ...styles.input,
                  borderColor: errors.phone ? colors.error : colors.sand,
                }}
                disabled={loading}
              />
              {errors.phone && <p style={styles.error}>{errors.phone}</p>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tỉnh/Thành phố *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="TP. Hồ Chí Minh"
                style={{
                  ...styles.input,
                  borderColor: errors.city ? colors.error : colors.sand,
                }}
                disabled={loading}
              />
              {errors.city && <p style={styles.error}>{errors.city}</p>}
            </div>
          </div>

          {/* Row 3: District & Ward */}
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Quận/Huyện *</label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                placeholder="Quận 1"
                style={{
                  ...styles.input,
                  borderColor: errors.district ? colors.error : colors.sand,
                }}
                disabled={loading}
              />
              {errors.district && <p style={styles.error}>{errors.district}</p>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phường/Xã</label>
              <input
                type="text"
                name="ward"
                value={formData.ward}
                onChange={handleInputChange}
                placeholder="Phường Bến Nghé"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          {/* Row 4: Address */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Địa chỉ chi tiết *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="123 Đường Nguyễn Huệ"
              style={{
                ...styles.input,
                borderColor: errors.address ? colors.error : colors.sand,
              }}
              disabled={loading}
            />
            {errors.address && <p style={styles.error}>{errors.address}</p>}
          </div>

          {/* Row 5: Notes */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Ghi chú</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Ghi chú thêm về đơn hàng (tuỳ chọn)"
              style={styles.textarea}
              rows={3}
              disabled={loading}
            />
          </div>

          {/* ─── Voucher ─────────────────────────────────────────────── */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Mã giảm giá</label>
            {voucherApplied ? (
              <div style={styles.voucherApplied}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.success }}>
                    ✓ {voucherApplied.code}
                  </p>
                  {voucherApplied.description && (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>
                      {voucherApplied.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  disabled={loading}
                  style={styles.voucherRemoveBtn}
                >
                  Gỡ bỏ
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={voucherInput}
                  onChange={(e) => { setVoucherInput(e.target.value.toUpperCase()); setVoucherError(""); }}
                  placeholder="Nhập mã voucher"
                  style={{ ...styles.input, flex: 1, borderColor: voucherError ? colors.error : colors.sand }}
                  disabled={loading || checkingVoucher}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyVoucher(); } }}
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={loading || checkingVoucher || !voucherInput.trim()}
                  style={styles.voucherApplyBtn}
                >
                  {checkingVoucher ? "..." : "Áp dụng"}
                </button>
              </div>
            )}
            {voucherError && <p style={styles.error}>{voucherError}</p>}
          </div>

          {/* Order Summary */}
          <div style={styles.summary}>
            <div style={styles.summaryRow}>
              <span>Tạm tính ({cartItems.length} sản phẩm)</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={styles.summaryRow}>
                <span>Giảm giá</span>
                <span style={{ color: colors.success }}>-{fmt(discount)}</span>
              </div>
            )}
            <div style={styles.summaryRow}>
              <span>Phí vận chuyển</span>
              <span>{shipping === 0 ? "Miễn phí" : fmt(shipping)}</span>
            </div>
            <div style={styles.summaryTotal}>
              <span>Tổng cộng</span>
              <span>{fmt(total)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...styles.btnSecondary,
                opacity: loading ? 0.5 : 1,
              }}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={{
                ...styles.btnPrimary,
                opacity: loading ? 0.7 : 1,
              }}
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Tiến hành thanh toán"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    maxWidth: 600,
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px",
    borderBottom: `1px solid ${colors.beige}`,
    backgroundColor: colors.cream,
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    fontWeight: 600,
    color: colors.dark,
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 24,
    cursor: "pointer",
    color: colors.dark,
    padding: "0 8px",
    transition: "opacity 0.2s",
  },
  form: {
    padding: "24px",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 20,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.dark,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    padding: "10px 12px",
    border: `1px solid ${colors.sand}`,
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "'Poppins', sans-serif",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  textarea: {
    padding: "10px 12px",
    border: `1px solid ${colors.sand}`,
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "'Poppins', sans-serif",
    resize: "none",
    transition: "border-color 0.2s",
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    margin: "4px 0 0 0",
  },
  voucherApplied: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#EEF4EA",
    border: `1px solid ${colors.success}`,
    borderRadius: 6,
    padding: "10px 14px",
  },
  voucherRemoveBtn: {
    background: "none",
    border: "none",
    color: colors.error,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
  },
  voucherApplyBtn: {
    padding: "0 18px",
    backgroundColor: colors.dark,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    whiteSpace: "nowrap",
  },
  summary: {
    backgroundColor: colors.beige,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 14,
    color: colors.dark,
  },
  summaryTotal: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 12,
    borderTop: `1px solid ${colors.sand}`,
    fontSize: 16,
    fontWeight: 600,
    color: colors.dark,
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  btnPrimary: {
    padding: "12px 20px",
    backgroundColor: colors.wood,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  btnSecondary: {
    padding: "12px 20px",
    backgroundColor: colors.beige,
    color: colors.dark,
    border: `1px solid ${colors.sand}`,
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
};