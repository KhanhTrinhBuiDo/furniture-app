import FadeUp from "./FadeUp";
import { useStore } from "../../../store/store";
import styles from "./MatchaConcept.module.css";

const matchaImages = [
  { src: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=900&h=700&fit=crop", alt: "Phòng khách matcha" },
  { src: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&h=700&fit=crop", alt: "Sân vườn matcha" },
  { src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&h=560&fit=crop", alt: "Bếp matcha" },
  { src: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=700&h=560&fit=crop", alt: "Phòng ngủ matcha" },
  { src: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=700&h=560&fit=crop", alt: "Phòng tắm matcha" },
];

const CELL_CLASSES = [styles.cellA, styles.cellB, styles.cellC, styles.cellD, styles.cellE];

export default function MatchaConcept() {
  const { navigate, setSelectedStyle } = useStore();

  const handleMoreClick = () => {
    setSelectedStyle("Matcha");
    navigate("shop");
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <FadeUp>
          <h2 className={styles.title}>Matcha Concept</h2>
        </FadeUp>
      </div>

      <div className={styles.mosaic}>
        {matchaImages.map((img, i) => (
          <FadeUp key={i} className={`${styles.cell} ${CELL_CLASSES[i]}`}>
            <img src={img.src} alt={img.alt} className={styles.image} />
            {i === matchaImages.length - 1 && (
              <button onClick={handleMoreClick} className={styles.moreBadge}>More</button>
            )}
          </FadeUp>
        ))}
      </div>
    </section>
  );
}