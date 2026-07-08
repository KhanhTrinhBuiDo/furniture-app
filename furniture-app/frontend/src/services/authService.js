const BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

// ─── Helper ───────────────────────────────────────────────────────────────────
async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",          // gửi HttpOnly cookie tự động
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || "Request failed");
    return data;
}

// ─── AUTH ACTIONS ─────────────────────────────────────────────────────────────

/** Đăng nhập bằng email + password */
export async function login({ email, password, remember }) {
    const data = await request("/login", {
        method: "POST",
        body: JSON.stringify({ email, password, remember }),
    });
    // Lưu user info vào localStorage (token nằm trong HttpOnly cookie)
    if (data.user) localStorage.setItem("funiro_user", JSON.stringify(data.user));
    return data;
}

/** Đăng ký tài khoản mới */
export async function register({ fullName, phone, dob, email, password }) {
    return request("/register", {
        method: "POST",
        body: JSON.stringify({ fullName, phone, dob, email, password }),
    });
}

/** Đăng xuất */
export async function logout() {
    await request("/logout", { method: "POST" });
    localStorage.removeItem("funiro_user");
}

/** Lấy thông tin user hiện tại (dùng khi refresh trang) */
export async function getMe() {
    return request("/me");
}

/** Cập nhật thông tin profile */
export async function updateProfile(data) {
    return request("/profile", {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

/** Upload ảnh đại diện lên Cloudinary */
export async function uploadAvatar(file) {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`${BASE}/avatar`, {
        method: "PUT",
        credentials: "include",
        body: form, // Không set Content-Type — browser tự set kèm boundary
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Upload thất bại");
    if (data.user) localStorage.setItem("funiro_user", JSON.stringify(data.user));
    return data;
}

/** Đổi mật khẩu (khi đã đăng nhập) */
export async function changePassword({ currentPassword, newPassword }) {
    return request("/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
    });
}

// ─── FORGOT PASSWORD FLOW ─────────────────────────────────────────────────────

/** Bước 1: Gửi OTP về email */
export async function forgotPassword(email) {
    return request("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

/** Bước 2: Xác thực OTP */
export async function verifyOTP(email, otp) {
    return request("/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
    });
}

/** Bước 3: Đặt lại mật khẩu */
export async function resetPassword(email, otp, newPassword) {
    return request("/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword }),
    });
}

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────

/**
 * Redirect sang Google OAuth — backend xử lý toàn bộ flow
 * Frontend chỉ cần redirect về URL này, backend sẽ redirect lại về /auth/callback
 */
export function loginWithGoogle() {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    window.location.href = `${apiUrl}/api/auth/google`;
}

// ─── LOCAL HELPERS ────────────────────────────────────────────────────────────

/** Lấy user từ localStorage (không cần call API) */
export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("funiro_user") || "null");
    } catch {
        return null;
    }
}

/** Kiểm tra đã đăng nhập chưa */
export function isLoggedIn() {
    return !!getCurrentUser();
}