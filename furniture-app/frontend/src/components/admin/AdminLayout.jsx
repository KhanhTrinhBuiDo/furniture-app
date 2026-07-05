import { useStore } from "../../../../store/store";

const NAV_ITEMS = [
    { key: "admin-dashboard", icon: "📊", label: "Tổng quan" },
    { key: "admin-orders", icon: "📦", label: "Đơn hàng" },
    { key: "admin-products", icon: "🛋", label: "Sản phẩm" },
    { key: "admin-vouchers", icon: "🎟", label: "Voucher" },
    { key: "admin-users", icon: "👥", label: "Người dùng" },
    { key: "admin-blog", icon: "📝", label: "Blog" },
    { key: "admin-cleaning", icon: "🧼", label: "Vệ sinh miễn phí" },
    { key: "admin-tradein", icon: "♻️", label: "Thu cũ đổi mới" },
];

export default function AdminLayout({ children, activePage }) {
    const { navigate, currentUser } = useStore();

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>

            {/* Sidebar */}
            <aside style={{
                width: 220,
                background: "#1A1A2E",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                position: "sticky",
                top: 0,
                height: "100vh",
                overflowY: "auto",
            }}>
                {/* Logo */}
                <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <button onClick={() => navigate("home")}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                        <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                            <rect width="40" height="40" rx="6" fill="#B8860B" />
                            <path d="M8 30V16l12-8 12 8v14" stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round" />
                            <rect x="15" y="20" width="10" height="10" rx="1.5" fill="#1A1A2E" />
                        </svg>
                        <div>
                            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1rem", color: "#FAF7F2", fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
                                Amore Home
                            </p>
                            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                Admin Panel
                            </p>
                        </div>
                    </button>
                </div>

                {/* Nav */}
                <nav style={{ padding: "12px 0", flex: 1 }}>
                    {NAV_ITEMS.map(item => {
                        const active = activePage === item.key;
                        return (
                            <button key={item.key} onClick={() => navigate(item.key)}
                                style={{
                                    width: "100%", textAlign: "left",
                                    background: active ? "rgba(184,134,11,0.15)" : "none",
                                    border: "none",
                                    borderLeft: `3px solid ${active ? "#B8860B" : "transparent"}`,
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
                                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* User + back */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    {currentUser && (
                        <>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "0 0 2px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {currentUser.fullName}
                            </p>
                            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "0 0 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {currentUser.email}
                            </p>
                        </>
                    )}
                    <button onClick={() => navigate("home")}
                        style={{
                            background: "none", border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 6, padding: "7px 12px", fontSize: 11,
                            color: "rgba(255,255,255,0.5)", cursor: "pointer",
                            fontFamily: "'Poppins',sans-serif", width: "100%",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
                        ← Về trang chủ
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main style={{ flex: 1, overflowX: "auto", background: "#FAF7F2" }}>
                {children}
            </main>
        </div>
    );
}