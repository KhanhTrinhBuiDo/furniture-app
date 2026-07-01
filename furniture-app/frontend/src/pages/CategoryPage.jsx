import { useState, useEffect } from "react";
import { useStore } from "../../../store/store";
import ProductCard from "../components/ProductCard";
import FadeUp from "../components/FadeUp";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const C = { cream: "#FAF7F2", beige: "#F0E8DC", dark: "#1A1A2E", wood: "#B8860B", sand: "#D9C9B0" };

const CATEGORY_LABELS = {
  "LIVING ROOM": "Phòng khách",
  "KITCHEN": "Nhà bếp",
  "BEDROOM": "Phòng ngủ",
  "BATHROOM": "Phòng tắm",
  "DECORATION": "Trang trí",
  "DINING ROOM": "Phòng ăn",
};

export default function CategoryPage() {
  const { selectedCategory, navigate, setSelectedProduct } = useStore();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedCategory) return;
    setLoading(true);
    fetch(`${BASE}/api/products?category=${encodeURIComponent(selectedCategory)}&limit=50`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProducts(d.products);
          setTotal(d.pagination?.total || d.products.length);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  const handleProductClick = (p) => {
    setSelectedProduct(p._id);
    navigate("product");
  };

  const label = CATEGORY_LABELS[selectedCategory] || selectedCategory;

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.hero}>
        <FadeUp>
          <h1 style={styles.heroTitle}>{label}</h1>
          <p style={styles.breadcrumb}>
            Amore Home <span style={{ margin: "0 8px", color: C.sand }}>/</span>
            <span style={styles.breadcrumbActive}>{label}</span>
          </p>
        </FadeUp>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.container}>
        {/* SIDEBAR */}
        <div style={styles.sidebar}>
          <FadeUp>
            <div style={styles.filterBox}>
              <h3 style={styles.filterTitle}>Bộ lọc</h3>
              <p style={styles.resultCount}>
                Tìm thấy <strong>{loading ? "..." : total}</strong> sản phẩm
              </p>
              <button
                onClick={() => navigate("shop")}
                style={styles.backButton}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.wood; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.wood; }}>
                ← Xem tất cả sản phẩm
              </button>
            </div>
          </FadeUp>
        </div>

        {/* PRODUCTS GRID */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 320, borderRadius: 8, background: "#fff", border: `1px solid ${C.sand}` }} className="shimmer" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <FadeUp>
              <div style={styles.empty}>
                <p style={{ fontSize: 16, color: C.dark, marginBottom: 8 }}>
                  Chưa có sản phẩm trong danh mục này
                </p>
                <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
                  Admin có thể thêm sản phẩm qua Admin Panel
                </p>
                <button onClick={() => navigate("shop")} style={{ background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 13, cursor: "pointer" }}>
                  Xem các danh mục khác
                </button>
              </div>
            </FadeUp>
          ) : (
            <div style={styles.grid}>
              {products.map(p => (
                <FadeUp key={p._id}>
                  <div onClick={() => handleProductClick(p)} style={{ cursor: "pointer" }}>
                    <ProductCard product={p} />
                  </div>
                </FadeUp>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", backgroundColor: C.cream },
  hero: { backgroundColor: C.beige, borderBottom: `1px solid ${C.sand}`, padding: "40px 0 32px", textAlign: "center" },
  heroTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 600, color: C.dark, margin: 0 },
  breadcrumb: { fontSize: 13, color: "#C4A882", marginTop: 8, letterSpacing: "0.04em" },
  breadcrumbActive: { color: C.wood, fontWeight: 500 },
  container: { maxWidth: 1400, margin: "0 auto", padding: "48px 24px", display: "grid", gridTemplateColumns: "280px 1fr", gap: 40, alignItems: "start" },
  sidebar: { position: "sticky", top: 100 },
  filterBox: { background: "#fff", borderRadius: 8, padding: 24, border: `1px solid ${C.sand}` },
  filterTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: C.dark, margin: 0, marginBottom: 16 },
  resultCount: { fontSize: 13, color: "#999", margin: 0, marginBottom: 20 },
  backButton: { width: "100%", padding: "12px 16px", backgroundColor: "transparent", border: `1px solid ${C.wood}`, borderRadius: 4, color: C.wood, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.3s" },
  content: { minHeight: "500px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 },
  empty: { textAlign: "center", padding: "60px 40px", background: "#fff", borderRadius: 8, border: `1px solid ${C.sand}` },
};