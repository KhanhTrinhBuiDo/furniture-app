import { useState, useEffect } from "react";
import FadeUp from "./FadeUp";
import { useStore } from "../../../store/store";
import styles from "./MoreProducts.module.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Ảnh đại diện tĩnh cho mỗi danh mục (chỉ là decor, không phải data sản phẩm)
const CATEGORY_IMAGES = {
  "LIVING ROOM": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&h=560&fit=crop",
  "KITCHEN": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&h=560&fit=crop",
  "BEDROOM": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=700&h=560&fit=crop",
  "BATHROOM": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=700&h=560&fit=crop",
  "DECORATION": "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=700&h=560&fit=crop",
  "DINING ROOM": "https://images.unsplash.com/photo-1537737711114-ec537f8f4242?w=700&h=560&fit=crop",
};

const CATEGORY_LABELS = {
  "LIVING ROOM": "Living Room",
  "KITCHEN": "Kitchen",
  "BEDROOM": "Bedroom",
  "BATHROOM": "Bathroom",
  "DECORATION": "Decoration",
  "DINING ROOM": "Dining Room",
};

export default function MoreProducts() {
  const { navigate, setSelectedCategory } = useStore();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/products/categories`)
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.categories); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCategoryClick = (categoryName) => {
    setSelectedCategory(categoryName);
    navigate("category");
  };

  // Không hiện section nếu chưa có sản phẩm nào trong DB
  if (!loading && categories.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <FadeUp><h2 className={styles.title}>More Product</h2></FadeUp>
      </div>

      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.skeleton} shimmer`} />
          ))
        ) : (
          categories.map((cat) => (
            <FadeUp key={cat.name}>
              <button onClick={() => handleCategoryClick(cat.name)} className={styles.card}>
                <img
                  src={CATEGORY_IMAGES[cat.name] || CATEGORY_IMAGES["LIVING ROOM"]}
                  alt={cat.name}
                  className={styles.image}
                />
                <span className={styles.scrim} />
                <span className={styles.labelChip}>{CATEGORY_LABELS[cat.name] || cat.name}</span>
                <span className={styles.countText}>{cat.count} sản phẩm</span>
              </button>
            </FadeUp>
          ))
        )}
      </div>
    </section>
  );
}