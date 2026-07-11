import { useState, useEffect } from "react";
import { useStore } from "../../../store/store";
import FadeUp from "../components/FadeUp";
import TropicalConcept from "../components/TropicalConcept";
import MatchaConcept from "../components/MatchaConcept";
import MoreProducts from "../components/MoreProducts";
import ProductCard from "../components/ProductCard";
import styles from "./HomePage.module.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const HERO_IMAGES = [
  { src: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=800", big: true, alt: "Không gian sống chính" },
  { src: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800", alt: "Chi tiết nội thất" },
  { src: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800", alt: "Phòng ngủ ấm áp" },
];

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
    <div className={styles.page}>

      {/* HERO SECTION */}
      <div className={styles.hero}>
        <div className={styles.heroTextCol}>
          <FadeUp>
            <div className={styles.heroCard}>
              <p className={styles.heroEyebrow}>Amore Home</p>
              <h1 className={styles.heroTitle}>
                Nội thất tinh tế cho không gian sống ấm áp
              </h1>
              <p className={styles.heroDesc}>
                Mỗi sản phẩm được chọn lọc kỹ lưỡng từ chất liệu cao cấp, mang đến sự sang trọng và bền vững cho ngôi nhà của bạn.
              </p>
              <button onClick={() => navigate("shop")} className={styles.heroBtn}>
                Khám phá ngay
              </button>
            </div>
          </FadeUp>
        </div>

        <div className={styles.heroCollage}>
          {HERO_IMAGES.map((img, i) => (
            <div key={i} className={`${styles.collageCell} ${img.big ? styles.collageCellBig : ""}`}>
              <img src={img.src} alt={img.alt} className={styles.collageImg} />
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURED PRODUCTS (từ Database thật) ──────────────────────────── */}
      {(loadingF || featured.length > 0) && (
        <section className={styles.featured}>
          <FadeUp>
            <div className={styles.featuredHeader}>
              <p className={styles.featuredEyebrow}>Best Sellers</p>
              <h2 className={styles.featuredTitle}>Sản phẩm nổi bật</h2>
            </div>
          </FadeUp>

          <div className={styles.featuredGrid}>
            {loadingF
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${styles.skeletonCard} shimmer`} />
              ))
              : featured.map(p => (
                <FadeUp key={p._id}>
                  <div onClick={() => handleProductClick(p)} className={styles.productLink}>
                    <ProductCard product={p} />
                  </div>
                </FadeUp>
              ))
            }
          </div>

          <div className={styles.viewAllWrap}>
            <button onClick={() => navigate("shop")} className={styles.viewAllBtn}>
              Xem tất cả sản phẩm →
            </button>
          </div>
        </section>
      )}

      {/* Decor sections — theo concept mới */}
      <TropicalConcept />
      <MatchaConcept />

      {/* Category grid — fetch từ DB */}
      <MoreProducts />
    </div>
  );
}