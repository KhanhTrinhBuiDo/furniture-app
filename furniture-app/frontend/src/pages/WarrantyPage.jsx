import { useState, useEffect } from "react";
import { useStore } from "../../../store/store";
import FadeUp from "../components/FadeUp";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const C = {
    cream: "#FAF7F2", beige: "#F0E8DC", dark: "#1A1A2E",
    wood: "#B8860B", sand: "#D9C9B0", green: "#27AE60",
    warn: "#E67E22", error: "#C0392B", brand: "#C9A96E",
};

const STATUS_CFG = {
    active: { label: "Đang bảo hành", color: C.green, bg: "#EAF7EE", icon: "✓" },
    expiring_soon: { label: "Sắp hết hạn", color: C.warn, bg: "#FEF3E8", icon: "⚡" },
    expired: { label: "Đã hết hạn", color: C.error, bg: "#FDECEC", icon: "✕" },
};

const EVENT_CFG = {
    warranty_start: { icon: "🛡", color: C.green },
    loyalty_reward: { icon: "🎁", color: C.wood },
    maintenance_due: { icon: "🔧", color: "#8E44AD" },
    warranty_reminder: { icon: "⏰", color: C.warn },
    warranty_expire: { icon: "📋", color: C.error },
    promotion: { icon: "✨", color: C.wood },
};

const fmt = (d) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtP = (n) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export default function WarrantyPage() {
    const { navigate } = useStore();
    const [warranties, setWarranties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [tabFilter, setTabFilter] = useState("all");

    useEffect(() => {
        fetch(`${BASE}/api/warranty/my`, { credentials: "include" })
            .then(r => r.json())
            .then(d => { if (d.success) setWarranties(d.warranties); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = tabFilter === "all"
        ? warranties
        : warranties.filter(w => w.status === tabFilter);

    const imgSrc = (img) => img?.startsWith("/")
        ? `${BASE}${img}` : (img || "https://via.placeholder.com/64");

    return (
        <div style={{ background: C.cream, minHeight: "100vh" }}>

            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #2C2C54 100%)", padding: "40px", color: "#fff" }}>
                <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                    <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6, fontFamily: "'Poppins',sans-serif" }}>
                        ← Trang chủ
                    </button>
                    <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.6rem,3vw,2.2rem)", margin: "0 0 8px", color: "#fff" }}>
                        Bảo hành & Hậu đãi
                    </h1>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                        Theo dõi tình trạng bảo hành và nhận ưu đãi từ Amore Home
                    </p>

                    {/* Stats */}
                    {warranties.length > 0 && (
                        <div style={{ display: "flex", gap: 20, marginTop: 28, flexWrap: "wrap" }}>
                            {[
                                { label: "Đang bảo hành", value: warranties.filter(w => w.status === "active").length, color: C.green },
                                { label: "Sắp hết hạn", value: warranties.filter(w => w.status === "expiring_soon").length, color: C.warn },
                                { label: "Đã hết hạn", value: warranties.filter(w => w.status === "expired").length, color: C.error },
                            ].map(s => (
                                <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 20px", minWidth: 120 }}>
                                    <p style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color, margin: 0, fontFamily: "'Playfair Display',serif" }}>{s.value}</p>
                                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px" }}>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.sand}`, marginBottom: 24, overflowX: "auto" }}>
                    {[["all", "Tất cả"], ["active", "Đang BH"], ["expiring_soon", "Sắp hết hạn"], ["expired", "Đã hết hạn"]].map(([val, label]) => (
                        <button key={val} onClick={() => setTabFilter(val)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 18px", fontSize: 13, fontFamily: "'Poppins',sans-serif", color: tabFilter === val ? C.wood : "#888", fontWeight: tabFilter === val ? 600 : 400, borderBottom: `2px solid ${tabFilter === val ? C.wood : "transparent"}`, whiteSpace: "nowrap", transition: "all 0.2s" }}>
                            {label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <p style={{ color: "#bbb", textAlign: "center", padding: 40 }}>Đang tải...</p>
                ) : filtered.length === 0 ? (
                    <FadeUp>
                        <div style={{ textAlign: "center", padding: "60px 20px" }}>
                            <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>🛡</span>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", color: C.dark, margin: "0 0 8px" }}>Chưa có thông tin bảo hành</h3>
                            <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Mua sản phẩm và hoàn tất đơn hàng để xem bảo hành tại đây.</p>
                            <button onClick={() => navigate("shop")} style={{ background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "11px 28px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                                Khám phá sản phẩm
                            </button>
                        </div>
                    </FadeUp>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {filtered.map(w => {
                            const cfg = STATUS_CFG[w.status] || STATUS_CFG.active;
                            const isExpanded = selected === w._id;
                            const now = new Date();

                            return (
                                <FadeUp key={w._id}>
                                    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.sand}`, overflow: "hidden", boxShadow: isExpanded ? "0 4px 24px rgba(74,44,26,0.08)" : "none" }}>

                                        {/* Card header */}
                                        <div
                                            onClick={() => setSelected(isExpanded ? null : w._id)}
                                            style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", cursor: "pointer" }}
                                        >
                                            <img src={imgSrc(w.productImg)} alt={w.productName}
                                                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, background: C.beige, flexShrink: 0 }} />

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                                    <div>
                                                        <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: "0 0 4px" }}>{w.productName}</p>
                                                        <p style={{ fontSize: 12, color: "#999", margin: 0 }}>Đơn hàng #{w.orderCode} · Mua {fmt(w.purchasedAt)}</p>
                                                    </div>
                                                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                                                        {cfg.icon} {cfg.label}
                                                    </span>
                                                </div>

                                                {/* Progress bar bảo hành */}
                                                <div style={{ marginTop: 12 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", marginBottom: 4 }}>
                                                        <span>{fmt(w.warrantyStartAt)}</span>
                                                        <span style={{ color: w.status === "expired" ? C.error : w.status === "expiring_soon" ? C.warn : C.green, fontWeight: 600 }}>
                                                            {w.daysLeft > 0 ? `Còn ${w.daysLeft} ngày` : "Đã hết hạn"}
                                                        </span>
                                                        <span>{fmt(w.warrantyEndAt)}</span>
                                                    </div>
                                                    <div style={{ height: 6, background: C.beige, borderRadius: 3 }}>
                                                        <div style={{
                                                            height: "100%",
                                                            width: `${Math.max(0, Math.min(100, (w.daysLeft / (w.warrantyMonths * 30.5)) * 100))}%`,
                                                            background: w.status === "expired" ? C.error : w.status === "expiring_soon" ? C.warn : C.green,
                                                            borderRadius: 3,
                                                            transition: "width 0.6s ease",
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>

                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"
                                                style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </div>

                                        {/* Timeline */}
                                        {isExpanded && (
                                            <div style={{ borderTop: `1px solid ${C.beige}`, padding: "24px 24px 24px 40px" }}>
                                                <p style={{ fontSize: 11, fontWeight: 700, color: C.dark, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 20px" }}>
                                                    Dòng thời gian bảo hành & hậu đãi
                                                </p>

                                                <div style={{ position: "relative" }}>
                                                    {/* Vertical line */}
                                                    <div style={{ position: "absolute", left: 15, top: 8, bottom: 0, width: 2, background: C.beige }} />

                                                    {(w.events || []).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).map((ev, i) => {
                                                        const evCfg = EVENT_CFG[ev.type] || EVENT_CFG.warranty_start;
                                                        const isPast = new Date(ev.scheduledAt) <= now;
                                                        const isCurrent = !isPast && (i === 0 || new Date((w.events[i - 1] || {}).scheduledAt) <= now);

                                                        return (
                                                            <div key={i} style={{ position: "relative", display: "flex", gap: 16, marginBottom: 20, paddingLeft: 16 }}>
                                                                {/* Dot */}
                                                                <div style={{
                                                                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                                                                    background: isPast ? evCfg.color : isCurrent ? evCfg.color : C.beige,
                                                                    border: `2px solid ${isPast || isCurrent ? evCfg.color : C.sand}`,
                                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                                    fontSize: 14, zIndex: 1,
                                                                    boxShadow: isCurrent ? `0 0 0 4px ${evCfg.color}22` : "none",
                                                                }}>
                                                                    {isPast ? "✓" : evCfg.icon}
                                                                </div>

                                                                {/* Content */}
                                                                <div style={{ flex: 1, paddingTop: 4, opacity: isPast ? 0.7 : 1 }}>
                                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                                                        <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: 0 }}>{ev.title}</p>
                                                                        <span style={{ fontSize: 11, color: "#999", whiteSpace: "nowrap", flexShrink: 0 }}>{fmt(ev.scheduledAt)}</span>
                                                                    </div>
                                                                    <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0", lineHeight: 1.6 }}>{ev.description}</p>
                                                                    {ev.type === "loyalty_reward" && !isPast && (
                                                                        <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: "#FEF9E7", border: "1px solid #F39C12", borderRadius: 6, padding: "5px 10px" }}>
                                                                            <span style={{ fontSize: 11, color: "#B7860B", fontWeight: 600 }}>🎟 Voucher sẽ gửi qua email vào ngày này</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Footer info */}
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20, padding: "16px", background: C.cream, borderRadius: 8 }}>
                                                    {[
                                                        ["Giá mua", fmtP(w.purchasePrice)],
                                                        ["Thời hạn BH", `${w.warrantyMonths} tháng`],
                                                        ["Bắt đầu BH", fmt(w.warrantyStartAt)],
                                                        ["Kết thúc BH", fmt(w.warrantyEndAt)],
                                                    ].map(([k, v]) => (
                                                        <div key={k}>
                                                            <p style={{ fontSize: 11, color: "#999", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</p>
                                                            <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: 0 }}>{v}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 16, marginBottom: 0 }}>
                                                    Liên hệ hỗ trợ: <span style={{ color: C.wood }}>support@amorehome.vn</span> · Hotline: 1800 1234
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </FadeUp>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}