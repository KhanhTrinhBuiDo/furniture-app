import FadeUp from "./FadeUp";
import { useStore } from "../../../store/store";
import styles from "./TropicalConcept.module.css";

// ─── Data ─────────────────────────────────────────────────────────────────
// 5 ảnh bố cục mosaic: hàng 1 gồm 2 ảnh rộng, hàng 2 gồm 3 ảnh hẹp (ảnh cuối
// có nhãn "MORE"). Ảnh minh hoạ dùng chung nguồn Unsplash đã có sẵn trong dự án.
const tropicalImages = [
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786047/CHAIR_wq0rlq.jpg", alt: "Phòng khách tropical" },
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786050/garden_e3upmi.png", alt: "Phòng khách tropical" },
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786049/eat_c4n15o.png", alt: "Sân vườn tropical" },
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786048/bed_iwitsb.png", alt: "Phòng ăn tropical" },
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786047/bath_oybemr.png", alt: "Phòng ngủ tropical" },
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