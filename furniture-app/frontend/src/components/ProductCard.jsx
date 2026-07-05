import { useStore } from "../../../store/store";
import { theme } from "../../../styles/theme";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + "₫";

export default function ProductCard({ product }) {
  const { addToCart, navigate, setSelectedProduct, toggleWishlist, isWishlisted } = useStore();
  const [hovered, setHovered] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const hoverTimer = useRef(null);

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
    // Delay nhỏ để tránh quick-view nhấp nháy khi rê chuột lướt qua
    hoverTimer.current = setTimeout(() => setShowQuickView(true), 380);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setShowQuickView(false);
    clearTimeout(hoverTimer.current);
  };

  return (
    <motion.div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -6 }}
      onClick={handleCardClick}
      style={{
        background: theme.soft,
        borderRadius: 8,
        overflow: "visible",
        cursor: "pointer",
        boxShadow: hovered ? "0 16px 40px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.3s",
        position: "relative",
      }}
    >
      <div style={{ borderRadius: 8, overflow: "hidden" }}>
        {/* Badges */}
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, display: "flex", flexDirection: "column", gap: 6 }}>
          {discount > 0 && (
            <span style={{ background: "#C47B5A", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4 }}>
              -{discount}%
            </span>
          )}
          {product.isNew && (
            <span style={{ background: "#6B7C5C", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4 }}>
              NEW
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 2,
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "transform 0.2s",
            transform: inWish ? "scale(1.1)" : "scale(1)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill={inWish ? "#C47B5A" : "none"}
            stroke={inWish ? "#C47B5A" : "#8B5E3C"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>

        {/* Image */}
        <div style={{ position: "relative", overflow: "hidden", height: 220 }}>
          <motion.img
            src={product.img}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            animate={{ scale: hovered ? 1.08 : 1 }}
            transition={{ duration: 0.4 }}
          />
          {/* Hover overlay — Add to Cart */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.38)",
            opacity: hovered ? 1 : 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "opacity 0.3s",
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); addToCart(product); }}
              style={{
                background: "#fff",
                color: theme.dark,
                padding: "10px 22px",
                border: "none",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                transform: hovered ? "translateY(0)" : "translateY(8px)",
                transition: "transform 0.3s",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              }}
            >
              + Thêm vào giỏ
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "14px 16px 18px" }}>
          <p style={{ fontSize: 10, color: "#bbb", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>
            {product.category}
          </p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: theme.dark, margin: "0 0 8px", lineHeight: 1.3 }}>
            {product.name}
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: product.salePrice ? "#C47B5A" : theme.primary }}>
              {fmt(price)}
            </span>
            {product.salePrice && (
              <span style={{ fontSize: "0.8rem", color: "#ccc", textDecoration: "line-through" }}>
                {fmt(product.price)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── QUICK VIEW POPUP — hiện khi hover đủ lâu (giống Shopee/Lazada) ─── */}
      <AnimatePresence>
        {showQuickView && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "50%",
              left: "calc(100% + 12px)",
              transform: "translateY(-50%)",
              width: 260,
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 12px 40px rgba(26,26,46,0.18)",
              border: `1px solid ${theme.sand}`,
              padding: 18,
              zIndex: 20,
            }}
          >
            {/* Mũi tên trỏ vào card */}
            <div style={{
              position: "absolute", left: -6, top: "50%", transform: "translateY(-50%) rotate(45deg)",
              width: 12, height: 12, background: "#fff",
              borderLeft: `1px solid ${theme.sand}`, borderBottom: `1px solid ${theme.sand}`,
            }} />

            <p style={{ fontSize: 10, color: "#bbb", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px" }}>
              {product.category}
            </p>
            <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: theme.dark, margin: "0 0 8px", lineHeight: 1.3 }}>
              {product.name}
            </h4>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: product.salePrice ? "#C47B5A" : theme.primary }}>
                {fmt(price)}
              </span>
              {product.salePrice && (
                <span style={{ fontSize: "0.85rem", color: "#ccc", textDecoration: "line-through" }}>
                  {fmt(product.price)}
                </span>
              )}
            </div>

            {product.rating > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 1 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                      fill={i < Math.round(product.rating) ? "#D4A843" : "#eee"}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                    </svg>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: "#999" }}>
                  ({product.reviewCount || 0} đánh giá)
                </span>
              </div>
            )}

            {product.description && (
              <p style={{
                fontSize: 12.5, color: "#666", lineHeight: 1.6, margin: "0 0 12px",
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {product.description}
              </p>
            )}

            <p style={{ fontSize: 11.5, margin: "0 0 14px", fontWeight: 600, color: inStock ? "#6B7C5C" : "#C47B5A" }}>
              {inStock ? "✓ Còn hàng" : "✕ Hết hàng"}
              {typeof product.sold === "number" && product.sold > 0 && (
                <span style={{ color: "#bbb", fontWeight: 400 }}> · Đã bán {product.sold}</span>
              )}
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                disabled={!inStock}
                style={{
                  flex: 1, background: theme.dark, color: "#fff", border: "none",
                  borderRadius: 6, padding: "9px 0", fontSize: 12, fontWeight: 600,
                  cursor: inStock ? "pointer" : "not-allowed", opacity: inStock ? 1 : 0.5,
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Thêm vào giỏ
              </button>
              <button
                onClick={handleCardClick}
                style={{
                  flex: 1, background: "none", color: theme.dark, border: `1px solid ${theme.sand}`,
                  borderRadius: 6, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Xem chi tiết
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}