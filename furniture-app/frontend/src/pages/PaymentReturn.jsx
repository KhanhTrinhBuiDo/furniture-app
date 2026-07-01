import { useEffect, useState } from "react";
import { useStore } from "../../../store/store";
import { checkPaymentStatus } from "../services/paymentService";

const C = {
  cream: "#FAF7F2",
  beige: "#F0E8DC",
  dark: "#4A2C1A",
  wood: "#8B5E3C",
  success: "#6B7C5C",
  error: "#C47B5A",
  sand: "#D9C9B0",
};

export default function PaymentReturn() {
  const { setPage, clearCart, showToast } = useStore();
  const [status, setStatus] = useState(null);   // null | "loading" | "success" | "failed"
  const [data, setData] = useState(null);

  useEffect(() => {
    const check = async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams(window.location.search);
        const orderCode = params.get("vnp_TxnRef");

        if (!orderCode) {
          setStatus("failed");
          setData({ message: "Không tìm thấy mã đơn hàng." });
          return;
        }

        const result = await checkPaymentStatus(orderCode);
        setData(result);

        if (result.success && result.status === "completed") {
          setStatus("success");
          clearCart();                              // clear giỏ hàng
          showToast({ message: "Thanh toán thành công!", type: "success" });
          // Clean up URL params
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          setStatus("failed");
          showToast({ message: "Thanh toán thất bại. Vui lòng thử lại.", type: "error" });
        }
      } catch (err) {
        console.error(err);
        setStatus("failed");
        setData({ message: "Lỗi kiểm tra thanh toán. Vui lòng thử lại." });
      }
    };

    check();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Loading */}
        {status === "loading" && (
          <>
            <div style={styles.spinner}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.wood} strokeWidth="1.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <p style={styles.loadingText}>Đang xác nhận thanh toán...</p>
          </>
        )}

        {/* Success */}
        {status === "success" && (
          <>
            <div style={{ ...styles.iconCircle, background: "#EEF4EA", color: C.success }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={styles.title}>Thanh toán thành công!</h1>
            <p style={{ ...styles.message, color: C.success }}>Đơn hàng của bạn đã được xác nhận.</p>

            {data && (
              <div style={styles.infoBox}>
                {[
                  ["Mã đơn hàng", data.orderCode],
                  ["Số tiền", data.amount ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(data.amount) : "—"],
                  ["Mã giao dịch", data.transactionNo || "—"],
                  ["Thời gian", data.payDate || "—"],
                ].map(([label, value]) => (
                  <div key={label} style={styles.infoRow}>
                    <span style={{ color: "#999", fontSize: 13 }}>{label}</span>
                    <strong style={{ fontSize: 13, color: C.dark }}>{value}</strong>
                  </div>
                ))}
              </div>
            )}

            <p style={styles.note}>Chúng tôi sẽ giao hàng trong vòng 3–5 ngày làm việc.</p>

            <div style={styles.btnGroup}>
              <button style={styles.btnPrimary} onClick={() => setPage("home")}>Về trang chủ</button>
              <button style={styles.btnSecondary} onClick={() => setPage("shop")}>Tiếp tục mua sắm</button>
            </div>
          </>
        )}

        {/* Failed */}
        {status === "failed" && (
          <>
            <div style={{ ...styles.iconCircle, background: "#FBF0ED", color: C.error }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h1 style={styles.title}>Thanh toán thất bại</h1>
            <p style={{ ...styles.message, color: C.error }}>{data?.message || "Giao dịch không thành công."}</p>

            <div style={styles.infoBox}>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, margin: 0 }}>
                Vui lòng kiểm tra lại thông tin thẻ hoặc tài khoản và thử lại.
                Nếu vấn đề vẫn tiếp tục, hãy liên hệ hỗ trợ tại{" "}
                <span style={{ color: C.wood }}>support@AmoreHome.com</span>.
              </p>
            </div>

            <div style={styles.btnGroup}>
              <button style={styles.btnPrimary} onClick={() => setPage("cart")}>Quay lại giỏ hàng</button>
              <button style={styles.btnSecondary} onClick={() => setPage("home")}>Trang chủ</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "80vh",
    background: C.cream,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "52px 48px",
    maxWidth: 520,
    width: "100%",
    textAlign: "center",
    boxShadow: "0 8px 40px rgba(74,44,26,0.08)",
    border: `1px solid ${C.sand}`,
  },
  spinner: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 20,
    animation: "spin 1.2s linear infinite",
  },
  loadingText: {
    fontSize: 15,
    color: C.wood,
    margin: 0,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 28,
    fontWeight: 600,
    color: C.dark,
    margin: "0 0 8px",
  },
  message: {
    fontSize: 14,
    marginBottom: 24,
  },
  infoBox: {
    background: C.beige,
    borderRadius: 8,
    padding: "16px 20px",
    marginBottom: 20,
    textAlign: "left",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: `1px solid ${C.sand}`,
  },
  note: {
    fontSize: 12,
    color: "#999",
    marginBottom: 28,
  },
  btnGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  btnPrimary: {
    padding: "12px 0",
    background: C.wood,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    transition: "background 0.2s",
  },
  btnSecondary: {
    padding: "12px 0",
    background: C.beige,
    color: C.dark,
    border: `1px solid ${C.sand}`,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    transition: "background 0.2s",
  },
};