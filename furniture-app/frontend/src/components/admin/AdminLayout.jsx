import { useStore } from "../../../../store/store";

const C = { dark: "#4A2C1A", wood: "#8B5E3C", cream: "#FAF7F2" };

const NAV_ITEMS = [
    { key: "admin-dashboard", icon: "📊", label: "Tổng quan" },
    { key: "admin-orders", icon: "📦", label: "Đơn hàng" },
    { key: "admin-products", icon: "🛋", label: "Sản phẩm" },  // ← FR-08
    { key: "admin-vouchers", icon: "🎟", label: "Voucher" },
    { key: "admin-users", icon: "👥", label: "Người dùng" },
    { key: "admin-blog", icon: "📝", label: "Blog" },
];

export default function AdminLayout({ children, activePage }) {
    const { navigate, currentUser } = useStore();

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>

            {/* Sidebar */}
            <aside style={{ width: 220, background: C.dark, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>

                {/* Logo */}
                <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <button onClick={() => navigate("home")}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                            <rect width="28" height="28" rx="4" fill="#8B5E3C" />
                            <path d="M7 20V10l7-4 7 4v10" stroke="#FAF7F2" strokeWidth="1.5" strokeLinejoin="round" />
                            <rect x="11" y="14" width="6" height="6" rx="1" fill="#FAF7F2" />
                        </svg>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: "#FAF7F2", fontWeight: 700 }}>Amore Home.</span>
                    </button>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: "8px 0 0", letterSpacing: "0.1em", textTransform: "uppercase" }}>Admin Panel</p>
                </div>

                {/* Nav */}
                <nav style={{ padding: "12px 0", flex: 1 }}>
                    {NAV_ITEMS.map(item => {
                        const active = activePage === item.key;
                        return (
                            <button key={item.key} onClick={() => navigate(item.key)}
                                style={{
                                    width: "100%", textAlign: "left",
                                    background: active ? "rgba(255,255,255,0.1)" : "none",
                                    border: "none",
                                    borderLeft: `3px solid ${active ? C.wood : "transparent"}`,
                                    padding: "11px 20px",
                                    display: "flex", alignItems: "center", gap: 12,
                                    cursor: "pointer",
                                    color: active ? "#FAF7F2" : "rgba(255,255,255,0.5)",
                                    fontSize: 13, fontFamily: "'Poppins',sans-serif",
                                    fontWeight: active ? 600 : 400,
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={e => !active && (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                                onMouseLeave={e => !active && (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
                                <span style={{ fontSize: 16 }}>{item.icon}</span>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* User + back btn */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 2px", fontWeight: 600 }}>{currentUser?.fullName || "Admin"}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "0 0 12px" }}>{currentUser?.email || ""}</p>
                    <button onClick={() => navigate("home")}
                        style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 12px", fontSize: 11, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'Poppins',sans-serif", width: "100%", transition: "all 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
                        ← Về trang chủ
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main style={{ flex: 1, overflowX: "auto", background: "#FAF7F2" }}>
                {children}
            </main>
        </div>
    );
}