import { useState } from "react";
import { useStore } from "../../../store/store";
import { login, loginWithGoogle, getMe } from "../services/authService";

const C = {
    bg: "#E8D9C8",
    card: "rgba(255,255,255,0.92)",
    dark: "#4A2C1A",
    wood: "#8B5E3C",
    coffee: "#6D3914",
    sand: "#D9C9B0",
    error: "#C47B5A",
};

const HERO_IMG =
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=400&fit=crop&q=80";

export default function LoginPage() {
    const { navigate, showToast, setCurrentUser } = useStore();

    const [form, setForm] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [remember, setRemember] = useState(false);

    const set = (field) => (e) => {
        setForm(p => ({ ...p, [field]: e.target.value }));
        setErrors(p => ({ ...p, [field]: "", general: "" }));
    };

    const validate = () => {
        const e = {};
        if (!form.email.trim()) e.email = "Vui lòng nhập email";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email không hợp lệ";
        if (!form.password) e.password = "Vui lòng nhập mật khẩu";
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            // 1. Đăng nhập — nhận user từ response
            const data = await login({
                email: form.email.trim(),
                password: form.password,
                remember,
            });

            // 2. Lưu user vào store ngay lập tức (không đợi getMe)
            if (data.user) {
                localStorage.setItem("funiro_user", JSON.stringify(data.user));
                setCurrentUser(data.user);
            }

            showToast({ message: `Chào mừng, ${data.user?.fullName || "bạn"}!`, type: "success" });

            // 3. Redirect về intended page hoặc home
            const intended = sessionStorage.getItem("funiro_intended");
            sessionStorage.removeItem("funiro_intended");
            navigate(intended && intended !== "login" ? intended : "home");

        } catch (err) {
            setErrors({ general: err.message || "Email hoặc mật khẩu không đúng" });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = () => {
        try {
            loginWithGoogle();  // redirect sang Google
        } catch {
            showToast({ message: "Không thể kết nối Google", type: "error" });
        }
    };

    return (
        <div style={{ background: C.bg, minHeight: "100vh" }}>

            {/* Hero */}
            <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
                <img src={HERO_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 700, color: C.coffee, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        Welcome to Amore Home
                    </h1>
                </div>
            </div>

            {/* Card */}
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px 60px" }}>
                <div style={{ background: C.card, borderRadius: 16, padding: "36px 40px", width: "100%", maxWidth: 480, boxShadow: "0 8px 48px rgba(74,44,26,0.12)" }}>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: C.dark, textAlign: "center", margin: "0 0 28px" }}>
                        Sign in
                    </h2>

                    {errors.general && (
                        <div style={{ background: "#FBF0ED", border: "1px solid #C47B5A", borderRadius: 6, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: C.error }}>
                            {errors.general}
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                        <Field label="Email" error={errors.email}>
                            <Input type="email" placeholder="email@example.com" value={form.email}
                                onChange={set("email")} hasError={!!errors.email} disabled={loading}
                                onKeyDown={e => e.key === "Enter" && handleSubmit(e)} />
                        </Field>

                        <Field label="Password" error={errors.password}>
                            <div style={{ position: "relative" }}>
                                <Input type={showPwd ? "text" : "password"} placeholder="••••••••••••"
                                    value={form.password} onChange={set("password")}
                                    hasError={!!errors.password} disabled={loading}
                                    style={{ paddingRight: 52 }}
                                    onKeyDown={e => e.key === "Enter" && handleSubmit(e)} />
                                <button type="button" onClick={() => setShowPwd(p => !p)}
                                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.wood, fontSize: 12, fontWeight: 600, padding: 4 }} tabIndex={-1}>
                                    {showPwd ? "Ẩn" : "Hiện"}
                                </button>
                            </div>
                        </Field>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.dark, cursor: "pointer" }}>
                                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: C.wood }} />
                                Save account
                            </label>
                            <button type="button" onClick={() => navigate("forgot-password")}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.coffee, fontFamily: "'Poppins', sans-serif" }}>
                                Forget password?
                            </button>
                        </div>

                        <button onClick={handleSubmit} disabled={loading}
                            style={{ background: C.coffee, color: "#fff", border: "none", borderRadius: 8, padding: "14px 0", fontSize: "1rem", fontWeight: 700, fontFamily: "'Playfair Display', serif", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "background 0.2s" }}
                            onMouseEnter={e => !loading && (e.currentTarget.style.background = C.dark)}
                            onMouseLeave={e => !loading && (e.currentTarget.style.background = C.coffee)}>
                            {loading ? "Đang đăng nhập..." : "Sign in"}
                        </button>

                        <p style={{ textAlign: "center", fontSize: 13, color: C.dark, margin: 0 }}>
                            Don't have an account?{" "}
                            <button type="button" onClick={() => navigate("register")}
                                style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: C.coffee, fontFamily: "'Poppins', sans-serif", fontSize: 13 }}>
                                Register now!
                            </button>
                        </p>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ flex: 1, height: 1, background: C.sand }} />
                            <span style={{ fontSize: 11, color: "#bbb", letterSpacing: "0.05em" }}>HOẶC</span>
                            <div style={{ flex: 1, height: 1, background: C.sand }} />
                        </div>

                        <button type="button" onClick={handleGoogle} disabled={loading}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: "#4285F4", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: "pointer", transition: "opacity 0.2s" }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                            <GoogleIcon />
                            Sign in with Google
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({ label, error, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#6D3914", letterSpacing: "0.03em" }}>{label}</label>
            {children}
            {error && <p style={{ margin: 0, fontSize: 11, color: "#C47B5A" }}>{error}</p>}
        </div>
    );
}

function Input({ hasError, style: extra, ...props }) {
    return (
        <input {...props}
            style={{ width: "100%", padding: "13px 14px", borderRadius: 8, border: `1.5px solid ${hasError ? "#C47B5A" : "rgba(183,149,127,0.4)"}`, background: "rgba(183,149,127,0.18)", fontSize: 14, fontFamily: "'Poppins', sans-serif", color: "#4A2C1A", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box", ...extra }}
            onFocus={e => { if (!hasError) e.target.style.borderColor = "#8B5E3C"; }}
            onBlur={e => { if (!hasError) e.target.style.borderColor = "rgba(183,149,127,0.4)"; }} />
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.2-2.7-.5-4z" />
        </svg>
    );
}