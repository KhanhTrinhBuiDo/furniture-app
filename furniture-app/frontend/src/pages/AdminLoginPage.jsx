import { useState } from "react";
import { useStore } from "../../../store/store";
import { login, logout } from "../services/authService";

const C = {
    bg: "#1A1A2E",
    card: "#22223A",
    gold: "#B8860B",
    text: "#FAF7F2",
    dim: "rgba(250,247,242,0.5)",
    border: "rgba(250,247,242,0.12)",
    input: "rgba(250,247,242,0.06)",
    error: "#E07A5F",
};

export default function AdminLoginPage() {
    const { navigate, showToast, setCurrentUser } = useStore();

    const [form, setForm] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const set = (field) => (e) => {
        setForm(p => ({ ...p, [field]: e.target.value }));
        setErrors(p => ({ ...p, [field]: "", general: "" }));
    };

    const validate = () => {
        const e = {};
        if (!form.email.trim()) e.email = "Vui lòng nhập email";
        if (!form.password) e.password = "Vui lòng nhập mật khẩu";
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const data = await login({ email: form.email.trim(), password: form.password });

            // ─── Chốt chặn: cổng này CHỈ dành cho tài khoản admin ─────────
            // login() đã set cookie phiên đăng nhập cho tài khoản này (bất kể
            // role gì) — nếu không phải admin, phải đăng xuất ngay lập tức
            // để không để lại phiên đăng nhập trái phép qua cổng admin.
            if (data.user?.role !== "admin") {
                await logout();
                setCurrentUser(null);
                setErrors({ general: "Tài khoản này không có quyền truy cập Admin Portal." });
                setLoading(false);
                return;
            }

            localStorage.setItem("funiro_user", JSON.stringify(data.user));
            setCurrentUser(data.user);
            showToast({ message: `Chào mừng trở lại, ${data.user.fullName}`, type: "success" });
            navigate("admin-dashboard");
        } catch (err) {
            setErrors({ general: err.message || "Email hoặc mật khẩu không đúng" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 400 }}>

                {/* Logo / Branding */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <svg width="44" height="44" viewBox="0 0 40 40" fill="none" style={{ margin: "0 auto 14px" }}>
                        <rect width="40" height="40" rx="6" fill={C.gold} />
                        <path d="M8 30V16l12-8 12 8v14" stroke={C.bg} strokeWidth="1.8" strokeLinejoin="round" />
                        <rect x="15" y="20" width="10" height="10" rx="1.5" fill={C.bg} />
                    </svg>
                    <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: C.text, margin: 0, fontWeight: 700 }}>
                        Amore Home
                    </h1>
                    <p style={{ fontSize: 11, color: C.dim, margin: "4px 0 0", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                        Admin Portal
                    </p>
                </div>

                {/* Card */}
                <div style={{ background: C.card, borderRadius: 12, padding: "32px 32px", border: `1px solid ${C.border}` }}>
                    {errors.general && (
                        <div style={{ background: "rgba(224,122,95,0.12)", border: `1px solid ${C.error}`, borderRadius: 6, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: C.error }}>
                            {errors.general}
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        <Field label="Email quản trị" error={errors.email}>
                            <Input
                                type="email"
                                placeholder="email@gmail.com"
                                value={form.email}
                                onChange={set("email")}
                                hasError={!!errors.email}
                                disabled={loading}
                                onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                            />
                        </Field>

                        <Field label="Mật khẩu" error={errors.password}>
                            <div style={{ position: "relative" }}>
                                <Input
                                    type={showPwd ? "text" : "password"}
                                    placeholder="••••••••••••"
                                    value={form.password}
                                    onChange={set("password")}
                                    hasError={!!errors.password}
                                    disabled={loading}
                                    style={{ paddingRight: 52 }}
                                    onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                                />
                                <button type="button" onClick={() => setShowPwd(p => !p)} tabIndex={-1}
                                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.gold, fontSize: 12, fontWeight: 600, padding: 4 }}>
                                    {showPwd ? "Ẩn" : "Hiện"}
                                </button>
                            </div>
                        </Field>

                        <button onClick={handleSubmit} disabled={loading}
                            style={{
                                background: C.gold, color: C.bg, border: "none", borderRadius: 8,
                                padding: "13px 0", fontSize: 14, fontWeight: 700,
                                fontFamily: "'Poppins', sans-serif", cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1, transition: "opacity 0.2s",
                            }}>
                            {loading ? "Đang xác thực..." : "Đăng nhập Admin"}
                        </button>

                        <button type="button" onClick={() => navigate("forgot-password")}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.dim, textAlign: "center", fontFamily: "'Poppins', sans-serif" }}>
                            Quên mật khẩu?
                        </button>
                    </div>
                </div>

                <button onClick={() => navigate("home")}
                    style={{ display: "block", margin: "24px auto 0", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.dim, fontFamily: "'Poppins', sans-serif" }}>
                    ← Về trang khách hàng
                </button>
            </div>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(250,247,242,0.7)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</label>
            {children}
            {error && <p style={{ margin: 0, fontSize: 11, color: C.error }}>{error}</p>}
        </div>
    );
}

function Input({ hasError, style: extra, ...props }) {
    return (
        <input {...props}
            style={{
                width: "100%", padding: "12px 14px", borderRadius: 8,
                border: `1.5px solid ${hasError ? C.error : C.border}`,
                background: C.input, fontSize: 14, fontFamily: "'Poppins', sans-serif",
                color: C.text, outline: "none", transition: "border-color 0.2s",
                boxSizing: "border-box", ...extra,
            }}
            onFocus={e => { if (!hasError) e.target.style.borderColor = C.gold; }}
            onBlur={e => { if (!hasError) e.target.style.borderColor = C.border; }}
        />
    );
}