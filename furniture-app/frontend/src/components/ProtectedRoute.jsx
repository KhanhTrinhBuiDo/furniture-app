import { useEffect } from "react";
import { useStore } from "../../../store/store";
import { isLoggedIn, getCurrentUser } from "../services/authService";

/**
 * Bọc trang cần đăng nhập.
 * Props:
 *   redirectTo   — trang redirect nếu chưa đăng nhập (default: "login")
 *   requireRole  — "admin" — nếu cần role cụ thể
 */
export default function ProtectedRoute({ children, redirectTo = "login", requireRole }) {
    const { navigate, page, currentUser } = useStore();
    const user = currentUser || getCurrentUser();
    const loggedIn = !!user;

    useEffect(() => {
        if (!loggedIn) {
            sessionStorage.setItem("funiro_intended", page);
            navigate(redirectTo);
            return;
        }
        if (requireRole && user.role !== requireRole) {
            navigate("home");
        }
    }, [loggedIn, requireRole]);

    if (!loggedIn) return <RedirectScreen text="Đang chuyển hướng đến trang đăng nhập..." />;
    if (requireRole && user.role !== requireRole) {
        return <RedirectScreen text="Bạn không có quyền truy cập trang này" />;
    }

    return children;
}

function RedirectScreen({ text }) {
    return (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2" }}>
            <div style={{ textAlign: "center" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8B5E3C" strokeWidth="1.5" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <p style={{ fontSize: 13, color: "#8B5E3C", marginTop: 12, fontFamily: "'Poppins', sans-serif" }}>{text}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}