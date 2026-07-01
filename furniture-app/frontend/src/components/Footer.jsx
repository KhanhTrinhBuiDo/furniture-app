import { useState } from "react";
import { useStore } from "../../../store/store";

const C = {
    bg: "#4A2C1A",
    text: "rgba(250,247,242,0.75)",
    dim: "rgba(250,247,242,0.35)",
    heading: "#FAF7F2",
    accent: "#C4A882",
    border: "rgba(250,247,242,0.10)",
    input: "rgba(250,247,242,0.06)",
};

const NAV_LINKS = [
    { label: "Trang chủ", page: "home" },
    { label: "Cửa hàng", page: "shop" },
    { label: "Inspirations", page: "home" },
    { label: "Giới thiệu", page: "home" },
    { label: "Liên hệ", page: "home" },
];

const ACCOUNT_LINKS = [
    { label: "Tài khoản của tôi", page: "home" },
    { label: "Đăng nhập / Đăng ký", page: "home" },
    { label: "Giỏ hàng", page: "cart" },
    { label: "Wishlist", page: "home" },
    { label: "Theo dõi đơn hàng", page: "home" },
];

const SOCIAL = [
    {
        name: "Facebook",
        href: "#",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
            </svg>
        ),
    },
    {
        name: "Instagram",
        href: "#",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
        ),
    },
    {
        name: "Twitter / X",
        href: "#",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
            </svg>
        ),
    },
    {
        name: "Pinterest",
        href: "#",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.04-2.83.18-.77 1.22-5.17 1.22-5.17s-.31-.63-.31-1.56c0-1.46.85-2.55 1.9-2.55.9 0 1.33.67 1.33 1.48 0 .9-.58 2.25-.87 3.5-.25 1.04.52 1.89 1.54 1.89 1.85 0 3.28-1.95 3.28-4.77 0-2.49-1.79-4.23-4.35-4.23-2.96 0-4.7 2.22-4.7 4.51 0 .89.34 1.85.77 2.37.08.1.09.19.07.29-.08.33-.25 1.04-.29 1.18-.05.19-.16.23-.38.14-1.39-.65-2.26-2.68-2.26-4.32 0-3.51 2.55-6.74 7.36-6.74 3.86 0 6.86 2.75 6.86 6.42 0 3.83-2.41 6.9-5.76 6.9-1.13 0-2.19-.59-2.55-1.28l-.69 2.59c-.25.97-.93 2.18-1.39 2.92.05.01.09.02.14.03C12.09 22 12 22 12 22c-5.52 0-10-4.48-10-10S6.48 2 12 2z" />
            </svg>
        ),
    },
];

export default function Footer() {
    const { setPage } = useStore();
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        setSubscribed(true);
    };

    return (
        <footer style={{ background: C.bg, color: C.text, paddingTop: 64, paddingBottom: 32 }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>

                {/* ── 4-column grid ─────────────────────────────────────────────── */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1.6fr",
                    gap: 48,
                    marginBottom: 56,
                }}>

                    {/* Col 1 — Brand */}
                    <div>
                        <button
                            onClick={() => setPage("home")}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}
                        >
                            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
                                <rect width="28" height="28" rx="4" fill="#C4A882" />
                                <path d="M7 20V10l7-4 7 4v10" stroke="#4A2C1A" strokeWidth="1.5" strokeLinejoin="round" />
                                <rect x="11" y="14" width="6" height="6" rx="1" fill="#4A2C1A" />
                            </svg>
                            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: C.heading, fontWeight: 700, letterSpacing: "0.03em" }}>
                                Amore Home.
                            </span>
                        </button>

                        <p style={{ fontSize: 12, lineHeight: 1.8, color: C.dim, marginBottom: 8 }}>
                            400 University Drive Suite 200<br />
                            Coral Gables, FL 33134 USA
                        </p>

                        <p style={{ fontSize: 12, lineHeight: 1.8, color: C.dim }}>
                            support@Amore Home.com<br />
                            +62 (299) 466 3455
                        </p>

                        {/* Social icons */}
                        <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
                            {SOCIAL.map((s) => (
                                <a
                                    key={s.name}
                                    href={s.href}
                                    aria-label={s.name}
                                    title={s.name}
                                    style={{ color: C.dim, transition: "color 0.2s", display: "flex" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = C.dim)}
                                >
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Col 2 — Menu */}
                    <div>
                        <h4 style={styles.colHeading}>Menu</h4>
                        <ul style={styles.list}>
                            {NAV_LINKS.map((l) => (
                                <li key={l.label} style={styles.listItem}>
                                    <button
                                        onClick={() => setPage(l.page)}
                                        style={styles.linkBtn}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = C.dim)}
                                    >
                                        {l.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 3 — Account */}
                    <div>
                        <h4 style={styles.colHeading}>Tài khoản</h4>
                        <ul style={styles.list}>
                            {ACCOUNT_LINKS.map((l) => (
                                <li key={l.label} style={styles.listItem}>
                                    <button
                                        onClick={() => setPage(l.page)}
                                        style={styles.linkBtn}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = C.dim)}
                                    >
                                        {l.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 4 — Newsletter */}
                    <div>
                        <h4 style={styles.colHeading}>Stay Updated</h4>
                        <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 20 }}>
                            Nhận bộ sưu tập mới nhất, ý tưởng nội thất và ưu đãi độc quyền.
                        </p>

                        {subscribed ? (
                            <p style={{ fontSize: 13, color: "#8FA67A", fontWeight: 500 }}>
                                ✓ Đăng ký thành công!
                            </p>
                        ) : (
                            <div
                                onSubmit={handleSubscribe}
                                style={{ display: "flex", flexDirection: "column", gap: 10 }}
                            >
                                <input
                                    type="email"
                                    placeholder="Email của bạn"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSubscribe(e)}
                                    style={{
                                        background: C.input,
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        padding: "10px 14px",
                                        color: C.heading,
                                        fontSize: 12,
                                        fontFamily: "'Poppins', sans-serif",
                                        outline: "none",
                                    }}
                                />
                                <button
                                    onClick={handleSubscribe}
                                    style={{
                                        background: C.accent,
                                        color: C.bg,
                                        border: "none",
                                        borderRadius: 4,
                                        padding: "10px 0",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        cursor: "pointer",
                                        fontFamily: "'Poppins', sans-serif",
                                        transition: "opacity 0.2s",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                                >
                                    Đăng ký
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Divider ─────────────────────────────────────────────────── */}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>
                        © {new Date().getFullYear()} Amore Home Furniture. All rights reserved.
                    </p>
                    <div style={{ display: "flex", gap: 24 }}>
                        {["Chính sách bảo mật", "Điều khoản sử dụng", "Cookie"].map((t) => (
                            <button
                                key={t}
                                style={{ ...styles.linkBtn, fontSize: 11 }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                                onMouseLeave={(e) => (e.currentTarget.style.color = C.dim)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Responsive */}
            <style>{`
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </footer>
    );
}

// ─── Shared styles ───────────────────────────────────────────────────────────
const styles = {
    colHeading: {
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#FAF7F2",
        marginBottom: 20,
        margin: "0 0 20px 0",
    },
    list: {
        listStyle: "none",
        padding: 0,
        margin: 0,
    },
    listItem: {
        marginBottom: 12,
    },
    linkBtn: {
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        color: "rgba(250,247,242,0.35)",
        fontFamily: "'Poppins', sans-serif",
        padding: 0,
        transition: "color 0.2s",
        textAlign: "left",
    },
};