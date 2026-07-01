import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../../store/store";
import ProductCard from "../components/ProductCard";
import FadeUp from "../components/FadeUp";

const C = {
  cream: "#FAF7F2", beige: "#F0E8DC", dark: "#1A1A2E",
  wood: "#B8860B", sand: "#D9C9B0", tan: "#C4A882",
};

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CATEGORIES = ["LIVING ROOM", "KITCHEN", "BEDROOM", "BATHROOM", "DECORATION", "DINING ROOM"];
const PRICE_RANGES = [
  { label: "Tất cả mức giá", min: null, max: null },
  { label: "Dưới 1 triệu", min: 0, max: 1_000_000 },
  { label: "1 – 3 triệu", min: 1_000_000, max: 3_000_000 },
  { label: "3 – 6 triệu", min: 3_000_000, max: 6_000_000 },
  { label: "Trên 6 triệu", min: 6_000_000, max: null },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "best_selling", label: "Bán chạy nhất" },
];

export default function ShopPage() {
  const { searchQuery, setSearchQuery, navigate, setSelectedProduct } = useStore();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    priceIdx: 0,
    sort: "newest",
  });
  const [localSearch, setLocalSearch] = useState(searchQuery || "");

  // Sync search từ Navbar
  useEffect(() => { if (searchQuery) setLocalSearch(searchQuery); }, [searchQuery]);

  // Fetch từ API
  const fetchProducts = useCallback(async (pg = 1) => {
    setLoading(true);
    setError(null);
    try {
      const pr = PRICE_RANGES[filters.priceIdx];
      const params = new URLSearchParams({ page: pg, limit: 12, sort: filters.sort });
      if (localSearch.trim()) params.set("q", localSearch.trim());
      if (filters.category) params.set("category", filters.category);
      if (pr.min !== null) params.set("minPrice", pr.min);
      if (pr.max !== null) params.set("maxPrice", pr.max);

      const res = await fetch(`${BASE_URL}/api/products?${params}`);
      const data = await res.json();

      if (!data.success) throw new Error("Không thể tải sản phẩm");
      setProducts(data.products || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [localSearch, filters]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchProducts(1); }, 400);
    return () => clearTimeout(t);
  }, [localSearch, filters]);

  useEffect(() => { fetchProducts(page); }, [page]);

  const setFilter = (key, value) => { setFilters(f => ({ ...f, [key]: value })); setPage(1); };

  const totalPages = Math.ceil(total / 12);

  const handleProductClick = (product) => {
    setSelectedProduct(product._id);
    navigate("product");
  };

  const clearAll = () => {
    setFilters({ category: "", priceIdx: 0, sort: "newest" });
    setLocalSearch("");
    setSearchQuery("");
    setPage(1);
  };

  const activeFiltersCount = (filters.category ? 1 : 0) + (filters.priceIdx !== 0 ? 1 : 0);

  return (
    <div style={{ background: C.cream, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ background: C.beige, borderBottom: `1px solid ${C.sand}`, padding: "36px 40px 28px", textAlign: "center" }}>
        <FadeUp>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 700, color: C.dark, margin: 0 }}>
            Cửa hàng
          </h1>
          <p style={{ fontSize: 13, color: C.tan, marginTop: 8 }}>
            Amore Home <span style={{ margin: "0 6px" }}>/</span>
            <span style={{ color: C.wood, fontWeight: 500 }}>Shop</span>
          </p>
        </FadeUp>
      </div>

      {/* Toolbar */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.sand}`, padding: "12px 40px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.wood} strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input type="search" placeholder="Tìm kiếm sản phẩm..." value={localSearch}
            onChange={e => { setLocalSearch(e.target.value); setPage(1); }}
            style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: `1px solid ${C.sand}`, borderRadius: 6, fontSize: 13, fontFamily: "'Poppins',sans-serif", outline: "none", boxSizing: "border-box" }}
            onFocus={e => (e.target.style.borderColor = C.wood)}
            onBlur={e => (e.target.style.borderColor = C.sand)} />
        </div>

        {/* Sort */}
        <select value={filters.sort} onChange={e => setFilter("sort", e.target.value)}
          style={{ padding: "8px 12px", border: `1px solid ${C.sand}`, borderRadius: 6, fontSize: 13, fontFamily: "'Poppins',sans-serif", color: C.dark, outline: "none", cursor: "pointer", background: "#fff" }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Result count */}
        <span style={{ fontSize: 12, color: "#999", marginLeft: "auto" }}>{total} sản phẩm</span>

        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(p => !p)}
          style={{ background: "none", border: `1px solid ${C.sand}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer", color: C.dark, display: "flex", alignItems: "center", gap: 6, fontFamily: "'Poppins',sans-serif" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="10" y2="18" />
          </svg>
          Lọc {activeFiltersCount > 0 && (
            <span style={{ background: C.wood, color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 40px", display: "grid", gridTemplateColumns: sidebarOpen ? "240px 1fr" : "1fr", gap: 28 }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside>
            <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${C.sand}`, padding: 20, position: "sticky", top: 76 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", color: C.dark, margin: 0 }}>Bộ lọc</h3>
                {activeFiltersCount > 0 && (
                  <button onClick={clearAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.wood }}>Xoá tất cả</button>
                )}
              </div>

              {/* Category */}
              <div style={{ marginBottom: 24 }}>
                <p style={styles.filterLabel}>Danh mục</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <RadioItem name="cat" checked={!filters.category} onChange={() => setFilter("category", "")} label="Tất cả" />
                  {CATEGORIES.map(cat => (
                    <RadioItem key={cat} name="cat" checked={filters.category === cat} onChange={() => setFilter("category", cat)} label={cat.charAt(0) + cat.slice(1).toLowerCase()} />
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <p style={styles.filterLabel}>Khoảng giá</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {PRICE_RANGES.map((pr, i) => (
                    <RadioItem key={i} name="price" checked={filters.priceIdx === i} onChange={() => setFilter("priceIdx", i)} label={pr.label} />
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Products */}
        <div>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 8, height: 320, border: `1px solid ${C.sand}`, animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : error ? (
            <FadeUp>
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <p style={{ fontSize: 16, color: C.dark, marginBottom: 8 }}>Không thể tải sản phẩm</p>
                <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>{error}</p>
                <button onClick={() => fetchProducts(1)} style={{ background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 13, cursor: "pointer" }}>
                  Thử lại
                </button>
              </div>
            </FadeUp>
          ) : products.length === 0 ? (
            <FadeUp>
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.sand} strokeWidth="1.5" style={{ marginBottom: 16 }}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <p style={{ fontSize: 16, color: C.dark, marginBottom: 8 }}>Không tìm thấy sản phẩm</p>
                <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
                  {total === 0 && !localSearch && !filters.category
                    ? "Chưa có sản phẩm nào trong hệ thống. Admin hãy thêm sản phẩm qua Admin Panel."
                    : "Thử thay đổi từ khoá hoặc bộ lọc."}
                </p>
                <button onClick={clearAll} style={{ background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 13, cursor: "pointer" }}>
                  Xoá bộ lọc
                </button>
              </div>
            </FadeUp>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
                {products.map(p => (
                  <FadeUp key={p._id}>
                    <div onClick={() => handleProductClick(p)} style={{ cursor: "pointer" }}>
                      <ProductCard product={p} />
                    </div>
                  </FadeUp>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ ...styles.pageBtn, opacity: page === 1 ? 0.4 : 1 }}>←</button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)}
                      style={{ ...styles.pageBtn, background: n === page ? C.dark : "#fff", color: n === page ? "#fff" : C.dark, border: `1px solid ${n === page ? C.dark : C.sand}` }}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ ...styles.pageBtn, opacity: page === totalPages ? 0.4 : 1 }}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
    </div>
  );
}

function RadioItem({ name, checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#666", cursor: "pointer" }}>
      <input type="radio" name={name} checked={checked} onChange={onChange} style={{ accentColor: "#B8860B" }} />
      {label}
    </label>
  );
}

const styles = {
  filterLabel: { fontSize: 11, fontWeight: 700, color: "#1A1A2E", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" },
  pageBtn: { width: 34, height: 34, border: "1px solid #D9C9B0", borderRadius: 6, background: "#fff", color: "#1A1A2E", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" },
};