import { useStore } from "../../../store/store";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { optimizeCloudinaryUrl } from "../utils/cloudinary";
import styles from "./ProductCard.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + "₫";

export default function ProductCard({ product }) {
  const { addToCart, navigate, setSelectedProduct, toggleWishlist, isWishlisted } = useStore();
  const [hovered, setHovered] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [popupSide, setPopupSide] = useState("right");
  const hoverTimer = useRef(null);
  const cardRef = useRef(null);

  const id = product._id || product.id;
  const inWish = isWishlisted(id);
  const price = product.salePrice || product.price;
  const discount = product.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100) : 0;
  const inStock = product.stock === undefined || product.stock > 0;

  const handleCardClick = () => {
    setSelectedProduct(id);
    navigate("product");
  };

  const handleMouseEnter = () => {
    setHovered(true);
    // Nếu bung sang phải mà tràn ra ngoài màn hình thì tự chuyển sang trái.
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const POPUP_WIDTH_WITH_GAP = 260 + 12; // khớp width .quickView + gap trong CSS
      setPopupSide(rect.right + POPUP_WIDTH_WITH_GAP > window.innerWidth ? "left" : "right");
    }
    hoverTimer.current = setTimeout(() => setShowQuickView(true), 380);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setShowQuickView(false);
    clearTimeout(hoverTimer.current);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -6 }}
      onClick={handleCardClick}
      className={styles.card}
      data-hovered={hovered}
    >
      <div className={styles.cardInner}>
        {/* Badges */}
        <div className={styles.badges}>
          {discount > 0 && (
            <span className={`${styles.badge} ${styles.badgeDiscount}`}>-{discount}%</span>
          )}
          {product.isNew && (
            <span className={`${styles.badge} ${styles.badgeNew}`}>NEW</span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
          className={styles.wishlistBtn}
          data-active={inWish}
        >
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill={inWish ? "#C47B5A" : "none"}
            stroke={inWish ? "#C47B5A" : "#8B5E3C"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>

        {/* Image */}
        <div className={styles.imageWrap}>
          <motion.img
            src={optimizeCloudinaryUrl(product.img, { width: 500 })}
            alt={product.name}
            className={styles.image}
            animate={{ scale: hovered ? 1.08 : 1 }}
            transition={{ duration: 0.4 }}
          />
          <div className={styles.overlay} data-visible={hovered}>
            <button
              onClick={(e) => { e.stopPropagation(); addToCart(product); }}
              className={styles.addToCartBtn}
            >
              + Thêm vào giỏ
            </button>
          </div>
        </div>

        {/* Info */}
        <div className={styles.info}>
          <p className={styles.category}>{product.category}</p>
          <h3 className={styles.name}>{product.name}</h3>
          <div className={styles.priceRow}>
            <span className={styles.price} data-sale={!!product.salePrice}>{fmt(price)}</span>
            {product.salePrice && <span className={styles.priceOld}>{fmt(product.price)}</span>}
          </div>
        </div>
      </div>

      {/* Quick view popup */}
      <AnimatePresence>
        {showQuickView && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className={styles.quickView}
            data-side={popupSide}
          >
            <div className={styles.quickViewArrow} />

            <p className={styles.quickViewCategory}>{product.category}</p>
            <h4 className={styles.quickViewName}>{product.name}</h4>

            <div className={styles.quickViewPriceRow}>
              <span className={styles.quickViewPrice} data-sale={!!product.salePrice}>{fmt(price)}</span>
              {product.salePrice && <span className={styles.priceOld}>{fmt(product.price)}</span>}
            </div>

            {product.rating > 0 && (
              <div className={styles.ratingRow}>
                <div className={styles.stars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                      fill={i < Math.round(product.rating) ? "#D4A843" : "#eee"}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                    </svg>
                  ))}
                </div>
                <span className={styles.reviewCount}>({product.reviewCount || 0} đánh giá)</span>
              </div>
            )}

            {product.description && (
              <p className={styles.description}>{product.description}</p>
            )}

            <p className={styles.stockStatus} data-instock={inStock}>
              {inStock ? "✓ Còn hàng" : "✕ Hết hàng"}
              {typeof product.sold === "number" && product.sold > 0 && (
                <span className={styles.soldCount}> · Đã bán {product.sold}</span>
              )}
            </p>

            <div className={styles.quickViewActions}>
              <button
                onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                disabled={!inStock}
                className={styles.quickViewBtnPrimary}
              >
                Thêm vào giỏ
              </button>
              <button onClick={handleCardClick} className={styles.quickViewBtnSecondary}>
                Xem chi tiết
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}