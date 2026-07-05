import { useState, useEffect, useRef } from "react";
import { useStore } from "../../../store/store";
import { theme } from "../../../styles/theme";

const BRAND_LOGO = (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="6" fill="#1A1A2E" />
    <path d="M8 30V16l12-8 12 8v14" stroke="#B8860B" strokeWidth="1.8" strokeLinejoin="round" />
    <rect x="15" y="20" width="10" height="10" rx="1.5" fill="#B8860B" />
    <circle cx="20" cy="13" r="2" fill="#C9A96E" />
  </svg>
);

export default function Navbar() {
  const { navigate, cartCount, wishlist, searchQuery, setSearchQuery,
    currentUser, isLoggedIn, logout } = useStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Lock body scroll khi drawer mở
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "staff";

  const NAV = [
    { label: "Sản phẩm", action: () => navigate("shop") },
    { label: "Không gian", action: () => navigate("home") },
    { label: "Inspirations", action: () => navigate("blog") },
    { label: "Bảo hành", action: () => navigate("warranty") },
  ];

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 200,
        background: scrolled ? "rgba(250,247,242,0.96)" : "#FAF7F2",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: `1px solid ${scrolled ? "#D9C9B0" : "transparent"}`,
        boxShadow: scrolled ? "0 2px 20px rgba(26,26,46,0.06)" : "none",
        transition: "all 0.3s",
      }}>
        <nav style={{
          maxWidth: 1280, margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex", alignItems: "center", gap: 16,
        }}>

          {/* Logo */}
          <button onClick={() => navigate("home")} style={S.logoBtn} aria-label="Amore Home">
            {BRAND_LOGO}
            <div className="hide-mobile">
              <span style={{ fontFamily: theme.fontDisplay, fontSize: "1.1rem", color: theme.dark, fontWeight: 700, display: "block", lineHeight: 1.1 }}>
                Amore Home
              </span>
              <span style={{ fontSize: "9px", color: theme.gold, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                Living · Refined
              </span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="desktop-menu" style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {NAV.map(item => (
              <button key={item.label} onClick={item.action}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: theme.dark, fontFamily: "'Poppins',sans-serif", fontWeight: 500, padding: "6px 12px", borderRadius: 6, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.soft; e.currentTarget.style.color = theme.primary; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = theme.dark; }}>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Search — desktop inline */}
          <div ref={searchRef} style={{ position: "relative" }} className="hide-mobile">
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input type="search" placeholder="Tìm kiếm nội thất..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchQuery.trim() && navigate("shop")}
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, width: 220, border: `1px solid ${theme.sand}`, borderRadius: 20, fontSize: 13, fontFamily: "'Poppins',sans-serif", background: "#fff", outline: "none", transition: "all 0.2s" }}
                onFocus={e => { e.target.style.width = "280px"; e.target.style.borderColor = theme.primary; }}
                onBlur={e => { e.target.style.width = "220px"; e.target.style.borderColor = theme.sand; }} />
            </div>
          </div>

          {/* Icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>

            {/* Search icon — mobile */}
            <button className="menu-btn" onClick={() => setSearchOpen(p => !p)} style={S.iconBtn} aria-label="Tìm kiếm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            {/* Wishlist */}
            <div style={{ position: "relative" }}>
              <button style={S.iconBtn} aria-label="Wishlist yêu thích">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
              {wishlist?.length > 0 && <Badge count={wishlist.length} />}
            </div>

            {/* Cart */}
            <div style={{ position: "relative" }}>
              <button onClick={() => navigate("cart")} style={S.iconBtn} aria-label="Giỏ hàng">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19.4a2 2 0 001.99-1.61L23 6H6" />
                </svg>
              </button>
              {cartCount > 0 && <Badge count={cartCount} />}
            </div>

            {/* Auth */}
            {isLoggedIn ? (
              <div ref={profileRef} style={{ position: "relative" }}>
                <button onClick={() => setProfileOpen(p => !p)} style={{ ...S.iconBtn, padding: 2 }} aria-label="Tài khoản">
                  {currentUser?.avatar
                    ? <img src={currentUser.avatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.primary}` }} />
                    : <div style={{ width: 34, height: 34, borderRadius: "50%", background: theme.dark, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                      {currentUser?.fullName?.[0]?.toUpperCase() || "U"}
                    </div>
                  }
                </button>

                {profileOpen && (
                  <div style={S.dropdown}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid #F0E8DC" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: theme.dark, margin: 0 }}>{currentUser?.fullName}</p>
                      <p style={{ fontSize: 11, color: "#999", margin: "2px 0 0" }}>{currentUser?.email}</p>
                      {isAdmin && (
                        <span style={{ fontSize: 9, background: theme.dark, color: "#fff", padding: "2px 8px", borderRadius: 10, fontWeight: 700, display: "inline-block", marginTop: 4, letterSpacing: "0.08em" }}>
                          {currentUser?.role?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {[
                      { icon: "👤", label: "Hồ sơ cá nhân", action: () => navigate("profile") },
                      { icon: "📦", label: "Đơn hàng", action: () => navigate("orders") },
                      { icon: "🛡", label: "Bảo hành", action: () => navigate("warranty") },
                      { icon: "❤️", label: "Yêu thích", action: () => navigate("home") },
                      { icon: "🧼", label: "Vệ sinh miễn phí", action: () => navigate("cleaning-service") },
                      { icon: "♻️", label: "Thu cũ đổi mới", action: () => navigate("trade-in") },
                      ...(isAdmin ? [{ icon: "⚙️", label: "Admin Panel", action: () => navigate("admin-dashboard") }] : []),
                    ].map(item => (
                      <button key={item.label} onClick={() => { item.action(); setProfileOpen(false); }}
                        style={S.dropdownItem}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F5EDE3")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <span>{item.icon}</span> {item.label}
                      </button>
                    ))}
                    <div style={{ borderTop: "1px solid #F0E8DC" }}>
                      <button onClick={() => { logout(); setProfileOpen(false); }}
                        style={{ ...S.dropdownItem, color: theme.error }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#FDECEC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <span>🚪</span> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate("login")} className="hide-mobile"
                style={{ background: theme.dark, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins',sans-serif", transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.primary)}
                onMouseLeave={e => (e.currentTarget.style.background = theme.dark)}>
                Đăng nhập
              </button>
            )}

            {/* Hamburger */}
            <button className="menu-btn" onClick={() => setDrawerOpen(true)}
              style={{ ...S.iconBtn, display: "none" }} aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="16" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile search bar */}
        {searchOpen && (
          <div ref={searchRef} style={{ padding: "10px 16px", borderTop: "1px solid #F0E8DC", background: "#FAF7F2" }}>
            <input type="search" placeholder="Tìm kiếm nội thất..." autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && searchQuery.trim()) { navigate("shop"); setSearchOpen(false); } }}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${theme.sand}`, borderRadius: 8, fontSize: 14, fontFamily: "'Poppins',sans-serif", outline: "none" }} />
          </div>
        )}
      </header>

      {/* ── Mobile Drawer ──────────────────────────────────────────────────── */}
      {/* Overlay */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, backdropFilter: "blur(2px)" }} />
      )}

      {/* Drawer panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(320px, 88vw)",
        background: "#FAF7F2", zIndex: 301,
        transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Drawer header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px", borderBottom: "1px solid #F0E8DC" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {BRAND_LOGO}
            <span style={{ fontFamily: theme.fontDisplay, fontSize: "1.1rem", color: theme.dark, fontWeight: 700 }}>Amore Home</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#bbb" }}>✕</button>
        </div>

        {/* User info */}
        {isLoggedIn && (
          <div style={{ padding: "16px 20px", background: theme.soft, borderBottom: "1px solid #F0E8DC" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {currentUser?.avatar
                ? <img src={currentUser.avatar} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.dark, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  {currentUser?.fullName?.[0]?.toUpperCase()}
                </div>
              }
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: theme.dark, margin: 0 }}>{currentUser?.fullName}</p>
                <p style={{ fontSize: 11, color: "#999", margin: 0 }}>{currentUser?.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "12px 0" }}>
          {[
            ...NAV.map(item => ({ ...item, isMain: true })),
            { label: "Giỏ hàng", action: () => navigate("cart"), icon: "🛒", badge: cartCount },
            ...(isLoggedIn ? [
              { label: "Hồ sơ cá nhân", action: () => navigate("profile"), icon: "👤" },
              { label: "Đơn hàng", action: () => navigate("orders"), icon: "📦" },
              { label: "Bảo hành", action: () => navigate("warranty"), icon: "🛡" },
              { label: "Vệ sinh miễn phí", action: () => navigate("cleaning-service"), icon: "🧼" },
              { label: "Thu cũ đổi mới", action: () => navigate("trade-in"), icon: "♻️" },
            ] : [
              { label: "Đăng nhập", action: () => navigate("login"), icon: "👤" },
              { label: "Đăng ký", action: () => navigate("register"), icon: "✍️" },
            ]),
            ...(isAdmin ? [{ label: "Admin Panel", action: () => navigate("admin-dashboard"), icon: "⚙️" }] : []),
          ].map((item, i) => (
            <button key={i} onClick={() => { item.action(); setDrawerOpen(false); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", background: "none", border: "none", padding: "13px 20px", fontSize: 14, color: theme.dark, fontFamily: "'Poppins',sans-serif", cursor: "pointer", fontWeight: item.isMain ? 500 : 400, borderBottom: "1px solid rgba(0,0,0,0.04)", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.soft)}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </span>
              {item.badge > 0 && (
                <span style={{ background: theme.primary, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        {isLoggedIn && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #F0E8DC" }}>
            <button onClick={() => { logout(); setDrawerOpen(false); }}
              style={{ width: "100%", padding: "11px 0", background: "none", border: `1px solid ${theme.error}`, borderRadius: 6, color: theme.error, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}>
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Badge({ count }) {
  return (
    <div style={{ position: "absolute", top: -5, right: -6, background: "#C0392B", color: "#fff", width: 17, height: 17, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, pointerEvents: "none" }}>
      {count > 99 ? "99+" : count}
    </div>
  );
}

const S = {
  logoBtn: { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", color: "#1A1A2E", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, transition: "background 0.15s" },
  dropdown: { position: "absolute", top: 46, right: 0, background: "#fff", borderRadius: 10, boxShadow: "0 8px 32px rgba(26,26,46,0.12)", border: "1px solid #F0E8DC", minWidth: 220, zIndex: 200, overflow: "hidden" },
  dropdownItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "11px 16px", fontSize: 13, color: "#1A1A2E", fontFamily: "'Poppins',sans-serif", cursor: "pointer", transition: "background 0.15s" },
};