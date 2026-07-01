import { useState, useEffect } from "react";
import FadeUp from "./FadeUp";
import { useStore } from "../../../store/store";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const C = { cream: "#FAF7F2", dark: "#1A1A2E", wood: "#B8860B" };

// Ảnh đại diện tĩnh cho mỗi danh mục (chỉ là decor, không phải data sản phẩm)
const CATEGORY_IMAGES = {
    "LIVING ROOM": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=400&fit=crop",
    "KITCHEN": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=400&fit=crop",
    "BEDROOM": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=500&h=400&fit=crop",
    "BATHROOM": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=500&h=400&fit=crop",
    "DECORATION": "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500&h=400&fit=crop",
    "DINING ROOM": "https://images.unsplash.com/photo-1537737711114-ec537f8f4242?w=500&h=400&fit=crop",
};

const CATEGORY_LABELS = {
    "LIVING ROOM": "Phòng khách",
    "KITCHEN": "Nhà bếp",
    "BEDROOM": "Phòng ngủ",
    "BATHROOM": "Phòng tắm",
    "DECORATION": "Trang trí",
    "DINING ROOM": "Phòng ăn",
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
        <section style={styles.section}>
            <div style={styles.header}>
                <FadeUp><h2 style={styles.title}>DANH MỤC SẢN PHẨM</h2></FadeUp>
            </div>

            <div style={styles.container}>
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{ ...styles.categoryCard, height: 300 }} className="shimmer" />
                    ))
                ) : (
                    categories.map((cat) => (
                        <FadeUp key={cat.name}>
                            <button
                                onClick={() => handleCategoryClick(cat.name)}
                                style={{ ...styles.categoryCard, border: "none" }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.12)"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"; }}
                            >
                                <div style={styles.imageContainer}>
                                    <img src={CATEGORY_IMAGES[cat.name] || CATEGORY_IMAGES["LIVING ROOM"]} alt={cat.name} style={styles.image} />
                                </div>
                                <h3 style={styles.categoryName}>{CATEGORY_LABELS[cat.name] || cat.name}</h3>
                                <p style={styles.productCount}>{cat.count} sản phẩm</p>
                            </button>
                        </FadeUp>
                    ))
                )}
            </div>
        </section>
    );
}

const styles = {
    section: { padding: "80px 40px", background: C.cream },
    header: { textAlign: "center", marginBottom: 60 },
    title: { fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 600, color: C.dark, margin: 0, letterSpacing: 2 },
    container: { maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 30 },
    categoryCard: { background: "#fff", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all 0.3s ease", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
    imageContainer: { position: "relative", overflow: "hidden", height: 250, background: "#f0f0f0" },
    image: { width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" },
    categoryName: { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: C.dark, padding: "20px 16px 8px", margin: 0, textAlign: "center" },
    productCount: { fontSize: 12, color: C.wood, padding: "0 16px 16px", margin: 0, textAlign: "center", letterSpacing: "0.05em", textTransform: "uppercase" },
};