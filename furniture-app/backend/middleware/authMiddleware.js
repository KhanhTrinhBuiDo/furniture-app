import { verifyToken, getTokenFromRequest } from "../utils/jwtUtils.js";
import User from "../models/User.js";

// ─── Protect: user phải đăng nhập ────────────────────────────────────────────
export async function protect(req, res, next) {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            return res.status(401).json({ message: "Chưa đăng nhập" });
        }

        const decoded = verifyToken(token);
        // GHI CHÚ: model User mới không còn field password/resetOTP*, và tên
        // field mật khẩu đổi thành password_hash — cập nhật lại danh sách loại trừ.
        const user = await User.findById(decoded.id).select("-password_hash -refresh_token");

        if (!user) {
            return res.status(401).json({ message: "Tài khoản không tồn tại" });
        }
        // GHI CHÚ: model User mới dùng is_active (snake_case) thay vì isActive.
        if (user.is_active === false) {
            return res.status(403).json({ message: "Tài khoản đã bị khóa" });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
}

// ─── Require Admin ────────────────────────────────────────────────────────────
export function requireAdmin(req, res, next) {
    // GHI CHÚ: model User mới dùng enum ["User", "Admin"] viết hoa chữ cái đầu
    // (không phải "admin" chữ thường như bản cũ).
    if (req.user?.role !== "Admin") {
        return res.status(403).json({ message: "Chỉ Admin mới có quyền truy cập" });
    }
    next();
}

// ─── Optional auth (không bắt buộc đăng nhập, nhưng nếu có thì parse) ────────
export async function optionalAuth(req, res, next) {
    try {
        const token = getTokenFromRequest(req);
        if (token) {
            const decoded = verifyToken(token);
            req.user = await User.findById(decoded.id).select("-password_hash -refresh_token");
        }
    } catch {
        // không làm gì — optional
    }
    next();
}