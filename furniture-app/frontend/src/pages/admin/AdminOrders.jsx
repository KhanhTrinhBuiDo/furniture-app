import { useState, useEffect, useCallback } from "react";

const C = { dark: "#4A2C1A", wood: "#8B5E3C", sand: "#D9C9B0", beige: "#F0E8DC", cream: "#FAF7F2", error: "#C47B5A", green: "#6B7C5C", gold: "#D4A843" };
const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const fmt = (n) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const STATUS_CFG = {
    pending: { label: "Chờ xác nhận", color: C.gold, bg: "#FEF9EC", next: ["confirmed", "cancelled"] },
    confirmed: { label: "Đã xác nhận", color: "#4285F4", bg: "#EBF2FE", next: ["shipping", "cancelled"] },
    shipping: { label: "Đang giao", color: C.wood, bg: "#F5EDE3", next: ["completed"] },
    completed: { label: "Hoàn tất", color: C.green, bg: "#EEF4EA", next: [] },
    cancelled: { label: "Đã huỷ", color: C.error, bg: "#FBF0ED", next: [] },
};

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState("");
    const [detail, setDetail] = useState(null);
    const [updating, setUpdating] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const url = `${API}/orders${statusTab ? `?status=${statusTab}` : ""}`;
        const res = await fetch(url, { credentials: "include" });
        const d = await res.json();
        setOrders(d.orders || []);
        setLoading(false);
    }, [statusTab]);

    useEffect(() => { load(); }, [load]);

    const updateStatus = async (orderId, status) => {
        if (!status) return;
        setUpdating(orderId);
        await fetch(`${API}/orders/${orderId}/status`, {
            method: "PUT", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        await load();
        setUpdating(null);
        if (detail?._id === orderId) setDetail(prev => prev ? { ...prev, status } : null);
    };

    const downloadCSV = () => {
        window.open(`${API}/admin/export/orders${statusTab ? `?status=${statusTab}` : ""}`, "_blank");
    };

    return (
        <div style={{ padding: "32px 40px", background: C.cream, minHeight: "100vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: C.dark, margin: 0 }}>Quản lý đơn hàng</h1>
                    <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Tổng: {orders.length} đơn hàng</p>
                </div>
                <button onClick={downloadCSV} style={S.exportBtn}>
                    ⬇ Xuất CSV
                </button>
            </div>

            {/* Status tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.sand}`, marginBottom: 24, overflowX: "auto" }}>
                {[{ value: "", label: "Tất cả" }, ...Object.entries(STATUS_CFG).map(([v, c]) => ({ value: v, label: c.label }))].map(tab => (
                    <button key={tab.value} onClick={() => setStatusTab(tab.value)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 18px", fontSize: 13, fontFamily: "'Poppins', sans-serif", color: statusTab === tab.value ? C.wood : "#888", fontWeight: statusTab === tab.value ? 600 : 400, borderBottom: `2px solid ${statusTab === tab.value ? C.wood : "transparent"}`, whiteSpace: "nowrap" }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table — overflowX auto để cuộn ngang thay vì cắt mất nội dung */}
            {loading ? <p style={{ color: "#bbb", fontSize: 14 }}>Đang tải...</p> : (
                <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.sand}`, overflowX: "auto" }}>
                    <table style={{ width: "100%", minWidth: 920, borderCollapse: "collapse", fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>
                        <thead>
                            <tr style={{ background: C.beige }}>
                                {["Mã đơn", "Khách hàng", "Sản phẩm", "Tổng tiền", "Thanh toán", "Trạng thái", "Ngày tạo", "Thao tác"].map(h => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.dark, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#bbb" }}>Không có đơn hàng nào</td></tr>
                            ) : orders.map((o, i) => {
                                const cfg = STATUS_CFG[o.status] || {};
                                const isUpdating = updating === o._id;
                                return (
                                    <tr key={o._id} style={{ borderTop: `1px solid ${C.beige}`, background: i % 2 === 0 ? "#fff" : "#FDFAF7" }}>
                                        <td style={{ padding: "12px 16px", fontWeight: 600, color: C.dark, whiteSpace: "nowrap" }}>{o.orderCode}</td>
                                        <td style={{ padding: "12px 16px", minWidth: 160 }}>
                                            <p style={{ margin: 0, fontWeight: 500, color: C.dark }}>{o.shippingAddress?.fullName || o.user?.fullName || "—"}</p>
                                            <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>{o.user?.email || ""}</p>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#666", whiteSpace: "nowrap" }}>{o.items.length} sản phẩm</td>
                                        <td style={{ padding: "12px 16px", fontWeight: 600, color: C.wood, whiteSpace: "nowrap" }}>{fmt(o.total)}</td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: o.paymentStatus === "paid" ? "#EEF4EA" : "#FEF9EC", color: o.paymentStatus === "paid" ? C.green : C.gold, fontWeight: 600, whiteSpace: "nowrap" }}>
                                                {o.paymentStatus === "paid" ? "Đã TT" : "Chưa TT"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: cfg.bg, color: cfg.color, fontWeight: 600, whiteSpace: "nowrap" }}>
                                                {cfg.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#999", fontSize: 12, whiteSpace: "nowrap" }}>
                                            {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                                        </td>
                                        {/* ── Thao tác: gộp thành 1 dropdown + nút Chi tiết, đủ chỗ hiển thị ── */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 180 }}>
                                                <button onClick={() => setDetail(o)} style={S.actionBtn}>Chi tiết</button>
                                                {(cfg.next || []).length > 0 && (
                                                    <select
                                                        value=""
                                                        disabled={isUpdating}
                                                        onChange={e => updateStatus(o._id, e.target.value)}
                                                        style={{
                                                            fontSize: 11, padding: "5px 8px", borderRadius: 4,
                                                            border: `1px solid ${C.wood}`, background: "#fff", color: C.wood,
                                                            cursor: isUpdating ? "not-allowed" : "pointer", fontFamily: "'Poppins', sans-serif",
                                                            fontWeight: 600, opacity: isUpdating ? 0.6 : 1, maxWidth: 150,
                                                        }}
                                                    >
                                                        <option value="" disabled>{isUpdating ? "Đang cập nhật..." : "Chuyển trạng thái"}</option>
                                                        {cfg.next.map(next => (
                                                            <option key={next} value={next}>→ {STATUS_CFG[next]?.label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail panel */}
            {detail && (
                <div style={{ position: "fixed", top: 0, right: 0, width: 440, height: "100vh", background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", zIndex: 200, overflowY: "auto" }}>
                    <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.beige}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.cream }}>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: C.dark, margin: 0 }}>#{detail.orderCode}</h3>
                        <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#bbb" }}>✕</button>
                    </div>
                    <div style={{ padding: 24 }}>
                        {/* Trạng thái hiện tại + chuyển nhanh ngay trong panel chi tiết */}
                        <Section title="Trạng thái">
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: STATUS_CFG[detail.status]?.bg, color: STATUS_CFG[detail.status]?.color, fontWeight: 600 }}>
                                    {STATUS_CFG[detail.status]?.label}
                                </span>
                                {(STATUS_CFG[detail.status]?.next || []).map(next => (
                                    <button key={next} disabled={updating === detail._id}
                                        onClick={() => updateStatus(detail._id, next)}
                                        style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, border: `1px solid ${STATUS_CFG[next]?.color}`, background: STATUS_CFG[next]?.bg, color: STATUS_CFG[next]?.color, cursor: "pointer", fontWeight: 600 }}>
                                        → {STATUS_CFG[next]?.label}
                                    </button>
                                ))}
                            </div>
                        </Section>

                        {/* Items */}
                        <Section title="Sản phẩm">
                            {detail.items.map((item, i) => (
                                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                                    <img src={item.img} alt={item.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, background: C.beige }} />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: 0 }}>{item.name}</p>
                                        <p style={{ fontSize: 12, color: "#999", margin: 0 }}>x{item.quantity} × {fmt(item.price)}</p>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(item.subtotal)}</span>
                                </div>
                            ))}
                        </Section>

                        {/* Address */}
                        {detail.shippingAddress && (
                            <Section title="Địa chỉ giao hàng">
                                <p style={S.infoText}><b>{detail.shippingAddress.fullName}</b> · {detail.shippingAddress.phone}</p>
                                <p style={S.infoText}>{detail.shippingAddress.address}, {detail.shippingAddress.district}, {detail.shippingAddress.city}</p>
                                {detail.shippingAddress.notes && <p style={{ ...S.infoText, color: "#bbb", fontStyle: "italic" }}>{detail.shippingAddress.notes}</p>}
                            </Section>
                        )}

                        {/* Pricing */}
                        <Section title="Thanh toán">
                            {[["Tạm tính", fmt(detail.subtotal)], ...(detail.discount ? [["Giảm giá", `-${fmt(detail.discount)}`]] : []), ["Phí ship", detail.shippingFee === 0 ? "Miễn phí" : fmt(detail.shippingFee)], ["Tổng", fmt(detail.total)]].map(([k, v], i, arr) => (
                                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8, fontWeight: i === arr.length - 1 ? 700 : 400, color: i === arr.length - 1 ? C.dark : "#666", paddingTop: i === arr.length - 1 ? 8 : 0, borderTop: i === arr.length - 1 ? `1px solid ${C.sand}` : "none" }}>
                                    <span>{k}</span><span style={{ color: i === arr.length - 1 ? C.wood : "inherit" }}>{v}</span>
                                </div>
                            ))}
                        </Section>

                        {/* Status history */}
                        {detail.statusHistory?.length > 0 && (
                            <Section title="Lịch sử">
                                {[...detail.statusHistory].reverse().map((h, i) => (
                                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CFG[h.status]?.color || C.sand, marginTop: 4, flexShrink: 0 }} />
                                        <div>
                                            <p style={{ fontSize: 12, fontWeight: 600, color: C.dark, margin: 0 }}>{STATUS_CFG[h.status]?.label || h.status}</p>
                                            {h.note && <p style={{ fontSize: 11, color: "#999", margin: 0 }}>{h.note}</p>}
                                        </div>
                                    </div>
                                ))}
                            </Section>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#4A2C1A", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid #F0E8DC" }}>{title}</p>
            {children}
        </div>
    );
}

const S = {
    exportBtn: { background: "#4A2C1A", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
    actionBtn: { fontSize: 11, padding: "5px 10px", borderRadius: 4, border: `1px solid ${C.sand}`, background: "none", cursor: "pointer", color: "#666", fontFamily: "'Poppins', sans-serif", whiteSpace: "nowrap" },
    infoText: { fontSize: 13, color: "#666", margin: "0 0 4px", lineHeight: 1.6 },
};