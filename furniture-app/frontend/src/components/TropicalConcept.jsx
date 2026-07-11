import FadeUp from "./FadeUp";
import { useStore } from "../../../store/store";
import styles from "./TropicalConcept.module.css";

// ─── Data ─────────────────────────────────────────────────────────────────
// 5 ảnh bố cục mosaic: hàng 1 gồm 2 ảnh rộng, hàng 2 gồm 3 ảnh hẹp (ảnh cuối
// có nhãn "MORE"). Ảnh minh hoạ dùng chung nguồn Unsplash đã có sẵn trong dự án.
const tropicalImages = [
  { src: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&h=700&fit=crop", alt: "Phòng khách tropical" },
  { src: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=900&h=700&fit=crop", alt: "Sân vườn tropical" },
  { src: "https://images.unsplash.com/photo-1537737711114-ec537f8f4242?w=700&h=560&fit=crop", alt: "Phòng ăn tropical" },
  { src: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=700&h=560&fit=crop", alt: "Phòng ngủ tropical" },
  { src: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=700&h=560&fit=crop", alt: "Phòng tắm tropical" },
];

const CELL_CLASSES = [styles.cellA, styles.cellB, styles.cellC, styles.cellD, styles.cellE];

export default function TropicalConcept() {
  const { navigate, setSelectedStyle } = useStore();

  const handleMoreClick = () => {
    setSelectedStyle("Tropical");
    navigate("shop");
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <FadeUp>
          <h2 className={styles.title}>Tropical Concept</h2>
        </FadeUp>
      </div>

      <div className={styles.mosaic}>
        {tropicalImages.map((img, i) => (
          <FadeUp key={i} className={`${styles.cell} ${CELL_CLASSES[i]}`}>
            <img src={img.src} alt={img.alt} className={styles.image} />
            {i === tropicalImages.length - 1 && (
              <button onClick={handleMoreClick} className={styles.moreBadge}>More</button>
            )}
          </FadeUp>
        ))}
      </div>
    </section>
  );
}