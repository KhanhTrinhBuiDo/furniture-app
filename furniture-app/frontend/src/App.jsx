import { useEffect } from "react";
import { StoreProvider, useStore } from "../../store/store";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Toast from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";

// Public pages
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import CartPage from "./pages/CartPage";
import CategoryPage from "./pages/CategoryPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import BlogPage from "./pages/BlogPage";
import WarrantyPage from "./pages/WarrantyPage";
import PaymentReturn from "./pages/PaymentReturn";
import CleaningServicePage from "./pages/CleaningServicePage";
import TradeInPage from "./pages/TradeInPage";
import ProfilePage from "./pages/ProfilePage";
import AdminLoginPage from "./pages/AdminLoginPage";

// Auth pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminVouchers from "./pages/admin/AdminVouchers";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminCleaning from "./pages/admin/AdminCleaning";
import AdminTradeIn from "./pages/admin/AdminTradeIn";

import { getMe } from "./services/authService";

// ─── Admin page map ───────────────────────────────────────────────────────────
const ADMIN_PAGES = {
  "admin-dashboard": AdminDashboard,
  "admin-orders": AdminOrders,
  "admin-products": AdminProducts,
  "admin-vouchers": AdminVouchers,
  "admin-users": AdminUsers,
  "admin-blog": AdminBlog,
  "admin-cleaning": AdminCleaning,
  "admin-tradein": AdminTradeIn,
};

// ─── Auth Init ────────────────────────────────────────────────────────────────
function AuthInit() {
  const { setCurrentUser } = useStore();
  useEffect(() => {
    getMe()
      .then(d => { if (d?.user) setCurrentUser(d.user); })
      .catch(() => setCurrentUser(null));
  }, []);
  return null;
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  const { page, selectedCategory, navigate, showToast, setCurrentUser } = useStore();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // VNPay return
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("vnp_TxnRef")) return <PaymentReturn />;

  // Google OAuth callback
  if (urlParams.get("auth") === "success") {
    window.history.replaceState({}, document.title, window.location.pathname);
    getMe().then(d => {
      if (d?.user) {
        setCurrentUser(d.user);
        showToast({ message: `Chào mừng, ${d.user.fullName}!`, type: "success" });
      }
    }).catch(() => { });
    const intended = sessionStorage.getItem("funiro_intended");
    sessionStorage.removeItem("funiro_intended");
    navigate(intended && intended !== "login" ? intended : "home");
    return null;
  }

  // Cổng đăng nhập Admin riêng — PHẢI kiểm tra trước block "admin-" bên dưới,
  // vì "admin-login" cũng khớp page.startsWith("admin-")
  if (page === "admin-login") return <AdminLoginPage />;

  // Admin pages
  if (page.startsWith("admin-")) {
    const AdminPage = ADMIN_PAGES[page];
    if (!AdminPage) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "#C0392B", fontSize: 15 }}>
            Trang admin không tồn tại: <code>{page}</code>
          </p>
          <p style={{ color: "#999", fontSize: 13, marginTop: 8 }}>
            Trang này chưa được thêm vào ADMIN_PAGES trong App.jsx
          </p>
        </div>
      );
    }
    return (
      <ProtectedRoute redirectTo="admin-login" requireRole="admin">
        <AdminLayout activePage={page}>
          <AdminPage />
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  // Regular pages
  switch (page) {
    case "login": return <LoginPage />;
    case "register": return <RegisterPage />;
    case "forgot-password": return <ForgotPasswordPage />;
    case "shop": return <ShopPage />;
    case "product": return <ProductDetailPage />;
    case "blog": return <BlogPage />;
    case "warranty": return <ProtectedRoute><WarrantyPage /></ProtectedRoute>;
    case "profile": return <ProtectedRoute><ProfilePage /></ProtectedRoute>;
    case "cleaning-service": return <ProtectedRoute><CleaningServicePage /></ProtectedRoute>;
    case "trade-in": return <ProtectedRoute><TradeInPage /></ProtectedRoute>;
    case "category": return selectedCategory ? <CategoryPage /> : <HomePage />;
    case "orders": return <ProtectedRoute><OrderHistoryPage /></ProtectedRoute>;
    case "cart": return <ProtectedRoute><CartPage /></ProtectedRoute>;
    default: return <HomePage />;
  }
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  const { page } = useStore();
  const isAdmin = page.startsWith("admin-");

  return (
    <div style={{
      fontFamily: "'Poppins', sans-serif",
      background: "#FAF7F2",
      color: "#1A1A2E",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      <AuthInit />
      {!isAdmin && <Navbar />}
      <main style={{ flex: 1 }}>
        <Router />
      </main>
      {!isAdmin && <Footer />}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}