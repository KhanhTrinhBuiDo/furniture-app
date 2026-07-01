import { useState, useEffect } from "react";
import { useStore } from "../../../store/store";
import FadeUp from "../components/FadeUp";
import TropicalConcept from "../components/TropicalConcept";
import MatchaConcept from "../components/MatchaConcept";
import MoreProducts from "../components/MoreProducts";
import ProductCard from "../components/ProductCard";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function HomePage() {
  const { navigate, setSelectedProduct } = useStore();
  const [featured, setFeatured] = useState([]);
  const [loadingF, setLoadingF] = useState(true);

  // Fetch sản phẩm nổi bật từ DB thật
  useEffect(() => {
    fetch(`${BASE}/api/products?featured=true&limit=8&sort=newest`)
      .then(r => r.json())
      .then(d => { if (d.success) setFeatured(d.products); })
      .catch(console.error)
      .finally(() => setLoadingF(false));
  }, []);

  const handleProductClick = (p) => {
    setSelectedProduct(p._id);
    navigate("product");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2" }}>

      {/* HERO SECTION */}
      <div style={{
        minHeight: "85vh",
        display: "flex",
        background: "#F0E8DC",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "40px",
        gap: "40px",
        flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <FadeUp>
            <div style={{
              background: "#ffffffcc",
              padding: 40,
              maxWidth: 420,
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(26,26,46,0.10)",
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#B8860B", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>
                Amore Home
              </p>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "2.4rem",
                color: "#1A1A2E",
                marginBottom: 16,
                margin: 0,
                lineHeight: 1.2,
              }}>
                Nội thất tinh tế cho không gian sống ấm áp
              </h1>
              <p style={{ fontSize: 15, color: "#666", marginTop: 16, marginBottom: 24, lineHeight: 1.7 }}>
                Mỗi sản phẩm được chọn lọc kỹ lưỡng từ chất liệu cao cấp, mang đến sự sang trọng và bền vững cho ngôi nhà của bạn.
              </p>
              <button
                onClick={() => navigate("shop")}
                style={{
                  background: "#1A1A2E", color: "#fff", padding: "14px 32px",
                  border: "none", borderRadius: 6, cursor: "pointer",
                  transition: "0.3s", fontSize: 14, fontWeight: 600, letterSpacing: "0.05em",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#B8860B")}
                onMouseLeave={e => (e.currentTarget.style.background = "#1A1A2E")}>
                Khám phá ngay
              </button>
            </div>
          </FadeUp>
        </div>

        <div style={{
          flex: 1.2, minWidth: 280,
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 12, height: 480,
        }}>
          {[
            { src: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=800", big: true },
            { src: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800" },
            { src: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800" },
          ].map((img, i) => (
            <div key={i} style={{
              position: "relative", overflow: "hidden", borderRadius: 12,
              gridRow: img.big ? "1 / 3" : "auto", cursor: "pointer", transition: "transform 0.3s",
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
              <img src={img.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURED PRODUCTS (từ Database thật) ──────────────────────────── */}
      {(loadingF || featured.length > 0) && (
        <section style={{ padding: "80px 40px", background: "#fff" }}>
          <FadeUp>
            <div style={{ textAlign: "center", marginBottom: 50 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#B8860B", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
                Best Sellers
              </p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.2rem", color: "#1A1A2E", margin: 0 }}>
                Sản phẩm nổi bật
              </h2>
            </div>
          </FadeUp>

          <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
            {loadingF
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 320, borderRadius: 8, background: "#F0E8DC" }} className="shimmer" />
              ))
              : featured.map(p => (
                <FadeUp key={p._id}>
                  <div onClick={() => handleProductClick(p)} style={{ cursor: "pointer" }}>
                    <ProductCard product={p} />
                  </div>
                </FadeUp>
              ))
            }
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button onClick={() => navigate("shop")}
              style={{ background: "none", border: "1px solid #1A1A2E", color: "#1A1A2E", padding: "12px 32px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1A1A2E"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#1A1A2E"; }}>
              Xem tất cả sản phẩm →
            </button>
          </div>
        </section>
      )}

      {/* Decor sections — giữ nguyên, không phải sản phẩm thật */}
      <TropicalConcept />
      <MatchaConcept />

      {/* Category grid — fetch từ DB */}
      <MoreProducts />
    </div>
  );
}