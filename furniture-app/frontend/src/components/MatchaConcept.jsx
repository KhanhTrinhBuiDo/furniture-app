import FadeUp from "./FadeUp";
import { useStore } from "../../../store/store";
import styles from "./MatchaConcept.module.css";

const matchaImages = [
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786052/matcha_bed_lw9aof.jpg", alt: "Phòng khách matcha" },
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786049/garden_matcha_d3ty4z.jpg", alt: "Sân vườn matcha" },
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786052/matcha_kitchen_wxtfmm.jpg", alt: "Bếp matcha" },
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786051/matcha_bed_1_kojkav.jpg", alt: "Phòng ngủ matcha" },
  { src: "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786052/matcha_vs_m7xsga.jpg", alt: "Phòng tắm matcha" },
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