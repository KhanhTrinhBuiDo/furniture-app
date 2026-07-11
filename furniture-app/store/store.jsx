import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

const StoreContext = createContext();

// ─── URL sync helpers ─────────────────────────────────────────────────────────
// App vốn không dùng react-router — điều hướng chỉ là state nội bộ, khiến
// refresh trang luôn quay về "home" và không giữ được vị trí (kể cả màn hình
// xác nhận thanh toán). Các hàm dưới đây đồng bộ state điều hướng vào query
// string của URL để refresh/back/forward hoạt động đúng như một trang web
// thông thường, mà không cần đổi sang thư viện router đầy đủ.
function readURLState() {
  const params = new URLSearchParams(window.location.search);
  return {
    page: params.get("page") || "home",
    category: params.get("category") || null,
    product: params.get("product") || null,
    orderCode: params.get("order") || null,
  };
}

function writeURLState({ page, category, product, orderCode }) {
  const params = new URLSearchParams();
  if (page && page !== "home") params.set("page", page);
  if (category) params.set("category", category);
  if (product) params.set("product", product);
  if (orderCode) params.set("order", orderCode);
  const qs = params.toString();
  const url = window.location.pathname + (qs ? `?${qs}` : "");
  window.history.pushState({ page, category, product, orderCode }, "", url);
}

export function StoreProvider({ children }) {

  // ─── Toast ───────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast(typeof msg === "string" ? { message: msg, type } : msg);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // ─── Auth ─────────────────────────────────────────────────────────────────────
  const [currentUser, _setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("funiro_user") || "null"); }
    catch { return null; }
  });

  const setCurrentUser = useCallback((user) => {
    if (user) {
      localStorage.setItem("funiro_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("funiro_user");
    }
    _setCurrentUser(user);
  }, []);

  const isLoggedIn = !!currentUser;

  // ─── Navigation (đồng bộ với URL) ─────────────────────────────────────────────
  // Dùng thêm ref song song với state: nhiều nơi trong app gọi
  // setSelectedCategory(x) / setSelectedProduct(x) rồi gọi navigate(...) NGAY
  // SAU ĐÓ trong cùng một handler — nếu navigate() đọc lại giá trị từ state
  // React thông thường, nó sẽ đọc phải giá trị CŨ (state chưa kịp re-render).
  // Ref luôn phản ánh giá trị mới nhất ngay lập tức, không bị batch delay.
  const initial = readURLState();
  const [page, _setPageState] = useState(initial.page);
  const [selectedCategory, _setSelectedCategoryState] = useState(initial.category);
  const [selectedProduct, _setSelectedProductState] = useState(initial.product);
  const [selectedOrderCode, _setSelectedOrderCodeState] = useState(initial.orderCode);

  const pageRef = useRef(initial.page);
  const categoryRef = useRef(initial.category);
  const productRef = useRef(initial.product);
  const orderCodeRef = useRef(initial.orderCode);

  // Nút Back/Forward trình duyệt
  useEffect(() => {
    const onPopState = () => {
      const s = readURLState();
      pageRef.current = s.page;
      categoryRef.current = s.category;
      productRef.current = s.product;
      orderCodeRef.current = s.orderCode;
      _setPageState(s.page);
      _setSelectedCategoryState(s.category);
      _setSelectedProductState(s.product);
      _setSelectedOrderCodeState(s.orderCode);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // navigate() là nơi DUY NHẤT ghi vào URL (pushState) — tránh tạo nhiều entry
  // lịch sử trình duyệt thừa cho một lần điều hướng.
  const navigate = useCallback((newPage, options = {}) => {
    const nextCategory = options.category !== undefined ? options.category : categoryRef.current;
    const nextProduct = options.product !== undefined ? options.product : productRef.current;
    const nextOrderCode = options.orderCode !== undefined ? options.orderCode : orderCodeRef.current;

    pageRef.current = newPage;
    categoryRef.current = nextCategory;
    productRef.current = nextProduct;
    orderCodeRef.current = nextOrderCode;

    _setPageState(newPage);
    _setSelectedCategoryState(nextCategory);
    _setSelectedProductState(nextProduct);
    _setSelectedOrderCodeState(nextOrderCode);

    writeURLState({ page: newPage, category: nextCategory, product: nextProduct, orderCode: nextOrderCode });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // setPage giữ nguyên tên/API cũ để không phải sửa hàng loạt component đang
  // gọi trực tiếp setPage(...) — đồng bộ URL luôn như navigate().
  const setPage = useCallback((p) => navigate(p), [navigate]);

  // setSelectedCategory/setSelectedProduct CHỈ cập nhật ref + state, KHÔNG tự
  // ghi URL — vì trong toàn bộ codebase, hai hàm này luôn được gọi ngay trước
  // một lệnh navigate()/setPage() khác trong cùng handler; để navigate() ghi
  // URL một lần duy nhất (đọc đúng giá trị mới nhất qua ref) là đủ và tránh
  // sinh thêm lịch sử trình duyệt thừa.
  const setSelectedCategory = useCallback((cat) => {
    categoryRef.current = cat;
    _setSelectedCategoryState(cat);
  }, []);

  const setSelectedProduct = useCallback((prod) => {
    productRef.current = prod;
    _setSelectedProductState(prod);
  }, []);

  // ─── Selected style (dùng khi bấm "More" ở Tropical/Matcha Concept) ──────────
  // Không đồng bộ vào URL — chỉ là tham số điều hướng một lần (ShopPage đọc rồi
  // tự xoá ngay sau khi áp dụng), giống cách selectedCategory được dùng cho
  // CategoryPage nhưng không cần lưu lại khi refresh trang.
  const [selectedStyle, setSelectedStyle] = useState(null);

  // ─── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/logout`,
        { method: "POST", credentials: "include" }
      );
    } catch { /* ignore */ }
    setCurrentUser(null);
    navigate("home");
    showToast({ message: "Đã đăng xuất", type: "info" });
  }, [navigate, setCurrentUser, showToast]);

  // ─── Cart ─────────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);

  const addToCart = useCallback((product) => {
    const id = product._id || product.id;
    setCart(prev => {
      const exists = prev.find(i => (i._id || i.id) === id);
      if (exists) return prev.map(i => (i._id || i.id) === id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast({ message: `✓ ${product.name} đã thêm vào giỏ`, type: "success" });
  }, [showToast]);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(i => (i._id || i.id) !== id));
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    setCart(prev => prev.map(i => (i._id || i.id) === id ? { ...i, quantity: Math.max(1, quantity) } : i));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartCount = cart.reduce((s, i) => s + (i.quantity ?? 1), 0);
  const cartTotal = cart.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0);

  // ─── Wishlist ─────────────────────────────────────────────────────────────────
  const [wishlist, setWishlist] = useState([]);

  const toggleWishlist = useCallback((product) => {
    const id = product._id || product.id;
    setWishlist(prev =>
      prev.find(i => (i._id || i.id) === id)
        ? prev.filter(i => (i._id || i.id) !== id)
        : [...prev, product]
    );
  }, []);

  const isWishlisted = useCallback(
    (id) => wishlist.some(i => (i._id || i.id) === id),
    [wishlist]
  );

  // ─── Search ───────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Context value ────────────────────────────────────────────────────────────
  return (
    <StoreContext.Provider value={{
      // Auth
      currentUser, setCurrentUser, isLoggedIn, logout,
      // Cart
      cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal,
      // Wishlist
      wishlist, toggleWishlist, isWishlisted,
      // Navigation
      page, setPage, navigate,
      selectedCategory, setSelectedCategory,
      selectedProduct, setSelectedProduct,
      selectedOrderCode,
      selectedStyle, setSelectedStyle,
      // Toast
      toast, showToast,
      // Search
      searchQuery, setSearchQuery,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
};