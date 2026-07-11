import { useState, useEffect, useRef } from "react";
import { useStore } from "../../../store/store";
import styles from "./Navbar.module.css";

// ─── Logo: hình vuông bo góc màu vanilla + icon nhà màu espresso (theo ảnh mẫu) ─
const BRAND_LOGO = (
  <span className={styles.logoIcon}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4C2B08" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" />
    </svg>
  </span>
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

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "staff";

  const NAV = [
    { label: "Sản phẩm", action: () => navigate("shop") },
    { label: "Không gian", action: () => navigate("home") },
    { label: "Inspirations", action: () => navigate("blog") },
    // { label: "Bảo hành", action: () => navigate("warranty") },
  ];

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
        <div className={styles.nav}>

          {/* Logo */}
          <button onClick={() => navigate("home")} className={styles.logoBtn} aria-label="Amore Home">
            {BRAND_LOGO}
            <div className={styles.brandSub}>
              <span className={styles.logoText}>Amore Home</span>
              <span className={styles.logoSub}>Living · Refined</span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className={styles.desktopNav}>
            {NAV.map(item => (
              <button key={item.label} onClick={item.action} className={styles.navLink}>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Spacer */}
          <div className={styles.spacer} />

          {/* Search — desktop inline (giữ nguyên như cũ) */}
          <div ref={searchRef} className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Tìm kiếm nội thất..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchQuery.trim() && navigate("shop")}
              className={styles.searchInput}
            />
          </div>

          {/* Icons */}
          <div className={styles.icons}>

            {/* Search icon — mobile */}
            <button className={styles.hamburgerBtn} onClick={() => setSearchOpen(p => !p)} aria-label="Tìm kiếm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            {/* Wishlist */}
            <div className={styles.iconWrap}>
              <button className={styles.iconBtn} aria-label="Wishlist yêu thích">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
              {wishlist?.length > 0 && <Badge count={wishlist.length} />}
            </div>

            {/* Cart */}
            <div className={styles.iconWrap}>
              <button onClick={() => navigate("cart")} className={styles.iconBtn} aria-label="Giỏ hàng">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19.4a2 2 0 001.99-1.61L23 6H6" />
                </svg>
              </button>
              {cartCount > 0 && <Badge count={cartCount} />}
            </div>

            {/* Auth */}
            {isLoggedIn ? (
              <div ref={profileRef} className={styles.dropdownAnchor}>
                <button onClick={() => setProfileOpen(p => !p)} className={styles.avatarBtn} aria-label="Tài khoản">
                  {currentUser?.avatar
                    ? <img src={currentUser.avatar} alt="" className={styles.avatarImg} />
                    : <div className={styles.avatarFallback}>{currentUser?.fullName?.[0]?.toUpperCase() || "U"}</div>
                  }
                </button>

                {profileOpen && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownHead}>
                      <p className={styles.dropdownName}>{currentUser?.fullName}</p>
                      <p className={styles.dropdownEmail}>{currentUser?.email}</p>
                      {isAdmin && <span className={styles.roleTag}>{currentUser?.role?.toUpperCase()}</span>}
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
                      <button key={item.label} onClick={() => { item.action(); setProfileOpen(false); }} className={styles.dropdownItem}>
                        <span>{item.icon}</span> {item.label}
                      </button>
                    ))}
                    <div>
                      <button onClick={() => { logout(); setProfileOpen(false); }} className={styles.dropdownItemDanger}>
                        <span>🚪</span> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate("login")} className={styles.loginBtn}>
                Đăng nhập
              </button>
            )}

            {/* Hamburger */}
            <button className={styles.hamburgerBtn} onClick={() => setDrawerOpen(true)} aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="16" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div ref={searchRef} className={styles.mobileSearchBar}>
            <input
              type="search"
              placeholder="Tìm kiếm nội thất..."
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && searchQuery.trim()) { navigate("shop"); setSearchOpen(false); } }}
              className={styles.mobileSearchInput}
            />
          </div>
        )}
      </header>

      {/* ── Mobile Drawer ──────────────────────────────────────────────────── */}
      {drawerOpen && <div onClick={() => setDrawerOpen(false)} className={styles.overlay} />}

      <div className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}>
        {/* Drawer header */}
        <div className={styles.drawerHeader}>
          <div className={styles.drawerBrand}>
            {BRAND_LOGO}
            <span className={styles.logoText}>Amore Home</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} className={styles.drawerClose}>✕</button>
        </div>

        {/* User info */}
        {isLoggedIn && (
          <div className={styles.drawerUser}>
            <div className={styles.drawerUserRow}>
              {currentUser?.avatar
                ? <img src={currentUser.avatar} alt="" className={styles.drawerAvatarImg} />
                : <div className={styles.drawerAvatarFallback}>{currentUser?.fullName?.[0]?.toUpperCase()}</div>
              }
              <div>
                <p className={styles.drawerUserName}>{currentUser?.fullName}</p>
                <p className={styles.drawerUserEmail}>{currentUser?.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className={styles.drawerNav}>
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
              className={item.isMain ? styles.drawerItemMain : styles.drawerItem}>
              <span className={styles.drawerItemIcons}>
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </span>
              {item.badge > 0 && <span className={styles.drawerBadge}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        {isLoggedIn && (
          <div className={styles.drawerLogoutWrap}>
            <button onClick={() => { logout(); setDrawerOpen(false); }} className={styles.drawerLogoutBtn}>
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Badge({ count }) {
  return <div className={styles.badge}>{count > 99 ? "99+" : count}</div>;
}