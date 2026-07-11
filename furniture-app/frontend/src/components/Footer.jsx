import { useState } from "react";
import { useStore } from "../../../store/store";
import styles from "./Footer.module.css";

const NAV_LINKS = [
    { label: "Trang chủ", page: "home" },
    { label: "Cửa hàng", page: "shop" },
    { label: "Inspirations", page: "home" },
    { label: "Giới thiệu", page: "home" },
    { label: "Liên hệ", page: "home" },
];

const ACCOUNT_LINKS = [
    { label: "Tài khoản của tôi", page: "profile" },
    { label: "Đăng nhập / Đăng ký", page: "home" },
    { label: "Giỏ hàng", page: "cart" },
    { label: "Wishlist", page: "home" },
    { label: "Theo dõi đơn hàng", page: "orders" },
    { label: "Vệ sinh miễn phí", page: "cleaning-service" },
    { label: "Thu cũ đổi mới", page: "trade-in" },
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
        <footer className={styles.footer}>
            <div className={styles.inner}>

                {/* ── 4-column grid ─────────────────────────────────────────────── */}
                <div className={styles.grid}>

                    {/* Col 1 — Brand */}
                    <div>
                        <button onClick={() => setPage("home")} className={styles.brandBtn}>
                            <span className={styles.brandIcon}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4C2B08" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 11l9-8 9 8" />
                                    <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" />
                                </svg>
                            </span>
                            <span className={styles.brandName}>Amore Home</span>
                        </button>

                        <p className={styles.addressText}>
                            88 Đường Nguyễn Huệ, Phường Bến Nghé<br />
                            Quận 1, TP. Hồ Chí Minh
                        </p>

                        <p className={styles.contactText}>
                            support@amorehome.vn<br />
                            +84 28 3822 9999
                        </p>

                        {/* Social icons */}
                        <div className={styles.socialRow}>
                            {SOCIAL.map((s) => (
                                <a key={s.name} href={s.href} aria-label={s.name} title={s.name} className={styles.socialLink}>
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Col 2 — Menu */}
                    <div>
                        <h4 className={styles.colHeading}>Menu</h4>
                        <ul className={styles.list}>
                            {NAV_LINKS.map((l) => (
                                <li key={l.label} className={styles.listItem}>
                                    <button onClick={() => setPage(l.page)} className={styles.linkBtn}>
                                        {l.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 3 — Account */}
                    <div>
                        <h4 className={styles.colHeading}>Tài khoản & Dịch vụ</h4>
                        <ul className={styles.list}>
                            {ACCOUNT_LINKS.map((l) => (
                                <li key={l.label} className={styles.listItem}>
                                    <button onClick={() => setPage(l.page)} className={styles.linkBtn}>
                                        {l.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 4 — Newsletter */}
                    <div>
                        <h4 className={styles.colHeading}>Stay Updated</h4>
                        <p className={styles.newsletterText}>
                            Nhận bộ sưu tập mới nhất, ý tưởng nội thất và ưu đãi độc quyền.
                        </p>

                        {subscribed ? (
                            <p className={styles.subscribedText}>✓ Đăng ký thành công!</p>
                        ) : (
                            <div className={styles.newsletterForm}>
                                <input
                                    type="email"
                                    placeholder="Email của bạn"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSubscribe(e)}
                                    className={styles.newsletterInput}
                                />
                                <button onClick={handleSubscribe} className={styles.subscribeBtn}>
                                    Đăng ký
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Divider ─────────────────────────────────────────────────── */}
                <div className={styles.bottomRow}>
                    <p className={styles.copyright}>
                        © {new Date().getFullYear()} Amore Home Furniture. All rights reserved.
                    </p>
                    <div className={styles.bottomLinks}>
                        {["Chính sách bảo mật", "Điều khoản sử dụng", "Cookie"].map((t) => (
                            <button key={t} className={styles.bottomLink}>{t}</button>
                        ))}
                        <button onClick={() => setPage("admin-login")} className={styles.bottomLink}>
                            Admin
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}