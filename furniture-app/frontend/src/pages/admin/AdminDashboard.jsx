import { useState, useEffect } from "react";
import { useStore } from "../../../../store/store";

const C = { bg: "#FAF7F2", dark: "#4A2C1A", wood: "#8B5E3C", sand: "#D9C9B0", beige: "#F0E8DC", green: "#6B7C5C", error: "#C47B5A", gold: "#D4A843" };
const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin`;
const fmt = (n) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", notation: n >= 1e9 ? "compact" : "standard" }).format(n);

const STATUS_COLORS = { pending: C.gold, confirmed: "#4285F4", shipping: "#8B5E3C", completed: C.green, cancelled: C.error };
const STATUS_LABELS = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", shipping: "Đang giao", completed: "Hoàn tất", cancelled: "Đã huỷ" };

export default function AdminDashboard() {
    const { navigate } = useStore();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("revenue"); // revenue | orders

    useEffect(() => {
        fetch(`${API}/dashboard`, { credentials: "include" })
            .then(r => r.json())
            .then(d => { if (d.success) setData(d); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading />;
    if (!data) return <div style={{ padding: 40, color: C.error }}>Không thể tải dữ liệu dashboard</div>;

    const { stats, topProducts, revenueByDay, ordersByStatus } = data;

    // Build mini bar chart data
    const maxRev = Math.max(...revenueByDay.map(d => d.revenue), 1);
    const totalOrdersByStatus = Object.values(ordersByStatus).reduce((s, v) => s + v, 0);

    return (
        <div style={{ padding: "32px 40px", background: C.bg, minHeight: "100vh" }}>

            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: C.dark, margin: 0 }}>Dashboard</h1>
                <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Tổng quan hoạt động kinh doanh</p>
            </div>

            {/* ── Stat cards ───────────────────────────────────────────────────── */}
            <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
                {[
                    { label: "Doanh thu tháng này", value: fmt(stats.revenue.thisMonth), sub: `${stats.revenue.growth >= 0 ? "+" : ""}${stats.revenue.growth}% so với tháng trước`, subColor: stats.revenue.growth >= 0 ? C.green : C.error, icon: "💰", bg: "#EEF4EA" },
                    { label: "Đơn hàng tháng này", value: stats.orders.thisMonth, sub: `${stats.orders.growth >= 0 ? "+" : ""}${stats.orders.growth}% so với tháng trước`, subColor: stats.orders.growth >= 0 ? C.green : C.error, icon: "📦", bg: "#EBF2FE" },
                    { label: "Chờ xác nhận", value: stats.orders.pending, sub: "Cần xử lý ngay", subColor: C.gold, icon: "⏳", bg: "#FEF9EC" },
                    { label: "Người dùng", value: stats.users.total, sub: `+${stats.users.newThisMonth} mới tháng này`, subColor: C.wood, icon: "👥", bg: "#F5EDE3" },
                ].map((card) => (
                    <div key={card.label} style={{ background: "#fff", borderRadius: 10, padding: "20px 24px", border: `1px solid ${C.sand}`, boxShadow: "0 2px 12px rgba(74,44,26,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>{card.label}</p>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{card.icon}</div>
                        </div>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>{card.value}</p>
                        <p style={{ fontSize: 11, color: card.subColor, margin: 0, fontWeight: 500 }}>{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Charts row ───────────────────────────────────────────────────── */}
            <div className="admin-chart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginBottom: 32 }}>

                {/* Revenue / Orders bar chart */}
                <div style={{ background: "#fff", borderRadius: 10, padding: 24, border: `1px solid ${C.sand}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: C.dark, margin: 0 }}>30 ngày qua</h3>
                        <div style={{ display: "flex", gap: 8 }}>
                            {["revenue", "orders"].map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    style={{ background: tab === t ? C.dark : "none", color: tab === t ? "#fff" : "#999", border: `1px solid ${tab === t ? C.dark : C.sand}`, borderRadius: 4, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em" }}>
                                    {t === "revenue" ? "Doanh thu" : "Đơn hàng"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {revenueByDay.length === 0 ? (
                        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 14 }}>Chưa có dữ liệu</div>
                    ) : (
                        <>
                            {/* Vùng cột — chiều cao cố định, không lẫn với nhãn để tránh đè lên nhau */}
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 160, overflowX: "auto", overflowY: "hidden" }}>
                                {revenueByDay.map((d) => {
                                    const val = tab === "revenue" ? d.revenue : d.orders;
                                    const maxVal = tab === "revenue" ? maxRev : Math.max(...revenueByDay.map(x => x.orders), 1);
                                    const h = Math.max(4, Math.round((val / maxVal) * 150));
                                    return (
                                        <div key={d._id} style={{ flex: "1 0 16px", minWidth: 16, height: "100%", display: "flex", alignItems: "flex-end" }}
                                            title={`${d._id}: ${tab === "revenue" ? fmt(d.revenue) : d.orders + " đơn"}`}>
                                            <div style={{ width: "100%", height: `${h}px`, background: C.wood, borderRadius: "3px 3px 0 0", opacity: 0.85 }} />
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Nhãn ngày — hàng riêng bên dưới, không xoay để không chồng lên cột phía trên.
                                Chỉ hiện khoảng 8-10 nhãn để tránh chữ chen chúc khi có nhiều ngày. */}
                            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                                {revenueByDay.map((d, i) => {
                                    const step = Math.max(1, Math.ceil(revenueByDay.length / 8));
                                    return (
                                        <div key={d._id} style={{ flex: "1 0 16px", minWidth: 16, textAlign: "center" }}>
                                            {i % step === 0 && (
                                                <span style={{ fontSize: 9, color: "#bbb", whiteSpace: "nowrap" }}>{d._id.slice(5)}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Order status donut */}
                <div style={{ background: "#fff", borderRadius: 10, padding: 24, border: `1px solid ${C.sand}` }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: C.dark, margin: "0 0 20px" }}>Trạng thái đơn hàng</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {Object.entries(STATUS_COLORS).map(([status, color]) => {
                            const count = ordersByStatus[status] || 0;
                            const pct = totalOrdersByStatus === 0 ? 0 : Math.round((count / totalOrdersByStatus) * 100);
                            return (
                                <div key={status}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, color: C.dark, fontWeight: 500 }}>{STATUS_LABELS[status]}</span>
                                        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{count} ({pct}%)</span>
                                    </div>
                                    <div style={{ height: 6, background: C.beige, borderRadius: 3 }}>
                                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Top Products ─────────────────────────────────────────────────── */}
            <div style={{ background: "#fff", borderRadius: 10, padding: 24, border: `1px solid ${C.sand}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: C.dark, margin: 0 }}>Sản phẩm bán chạy</h3>
                    <button onClick={() => navigate("admin-products")} style={{ fontSize: 12, color: C.wood, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Xem tất cả →</button>
                </div>
                <div className="admin-top-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
                    {topProducts.length === 0
                        ? <p style={{ color: "#ccc", fontSize: 13, gridColumn: "1/-1" }}>Chưa có dữ liệu bán hàng</p>
                        : topProducts.map((p, i) => (
                            <div key={p._id} style={{ textAlign: "center" }}>
                                <div style={{ position: "relative", marginBottom: 10 }}>
                                    <img src={p.img} alt={p.name} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 8, background: C.beige }} />
                                    <div style={{ position: "absolute", top: 6, left: 6, background: i === 0 ? C.gold : C.dark, color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                                        {i + 1}
                                    </div>
                                </div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: C.dark, margin: "0 0 2px", lineHeight: 1.3 }}>{p.name}</p>
                                <p style={{ fontSize: 11, color: C.wood, margin: "0 0 2px" }}>{fmt(p.price)}</p>
                                <p style={{ fontSize: 10, color: "#bbb", margin: 0 }}>Đã bán: {p.sold || 0}</p>
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* Responsive — mục 10: lưới thống kê/biểu đồ cố định cột gây tràn trên mobile/tablet */}
            <style>{`
                @media (max-width: 1100px) {
                    .admin-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
                    .admin-chart-grid { grid-template-columns: 1fr !important; }
                    .admin-top-grid { grid-template-columns: repeat(3, 1fr) !important; }
                }
                @media (max-width: 640px) {
                    .admin-stat-grid { grid-template-columns: 1fr !important; }
                    .admin-top-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
            `}</style>
        </div>
    );
}

function Loading() {
    return (
        <div style={{ padding: 40, display: "flex", alignItems: "center", gap: 12, color: "#8B5E3C" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span style={{ fontSize: 14, fontFamily: "'Poppins', sans-serif" }}>Đang tải dữ liệu...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}