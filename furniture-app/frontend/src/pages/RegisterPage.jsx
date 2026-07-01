import { useState } from "react";
import { useStore } from "../../../store/store";
import { register } from "../services/authService";

const C = {
    bg: "#E8D9C8",
    card: "rgba(255,255,255,0.90)",
    dark: "#4A2C1A",
    wood: "#8B5E3C",
    coffee: "#6D3914",
    sand: "#D9C9B0",
    error: "#C47B5A",
};

const HERO_IMG =
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=400&fit=crop&q=80";

export default function RegisterPage() {
    const { navigate, showToast } = useStore();

    const [form, setForm] = useState({
        fullName: "",
        phone: "",
        dob: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [showCpwd, setShowCpwd] = useState(false);

    const set = (field) => (e) => {
        setForm((p) => ({ ...p, [field]: e.target.value }));
        setErrors((p) => ({ ...p, [field]: "" }));
    };

    const validate = () => {
        const e = {};
        if (!form.fullName.trim()) e.fullName = "Vui lòng nhập họ tên";
        if (!form.phone.trim()) e.phone = "Vui lòng nhập số điện thoại";
        else if (!/^(0|\+84)[0-9]{9,10}$/.test(form.phone.replace(/\s/g, "")))
            e.phone = "Số điện thoại không hợp lệ";
        if (!form.email.trim()) e.email = "Vui lòng nhập email";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email không hợp lệ";
        if (!form.password) e.password = "Vui lòng nhập mật khẩu";
        else if (form.password.length < 8) e.password = "Mật khẩu tối thiểu 8 ký tự";
        else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(form.password)) e.password = "Cần ít nhất 1 chữ hoa và 1 số";
        if (!form.confirmPassword) e.confirmPassword = "Vui lòng xác nhận mật khẩu";
        else if (form.password !== form.confirmPassword) e.confirmPassword = "Mật khẩu không khớp";
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            await register({
                fullName: form.fullName,
                phone: form.phone,
                dob: form.dob,
                email: form.email,
                password: form.password,
            });
            showToast({ message: "Đăng ký thành công! Vui lòng đăng nhập.", type: "success" });
            navigate("login");
        } catch (err) {
            setErrors({ general: err.message || "Đăng ký thất bại. Vui lòng thử lại." });
        } finally {
            setLoading(false);
        }
    };

    // ── Password strength ─────────────────────────────────────────────────
    const strength = (() => {
        const p = form.password;
        if (!p) return 0;
        let s = 0;
        if (p.length >= 8) s++;
        if (/[A-Z]/.test(p)) s++;
        if (/[0-9]/.test(p)) s++;
        if (/[^A-Za-z0-9]/.test(p)) s++;
        return s;
    })();
    const strengthLabel = ["", "Yếu", "Trung bình", "Tốt", "Mạnh"][strength];
    const strengthColor = ["", "#C47B5A", "#D4A843", "#8B5E3C", "#6B7C5C"][strength];

    return (
        <div style={{ background: C.bg, minHeight: "100vh" }}>

            {/* Hero */}
            <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
                <img src={HERO_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(255,255,255,0.55)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <h1 style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                        fontWeight: 700, color: "#6D3914",
                        letterSpacing: "0.05em", textTransform: "uppercase",
                    }}>
                        Welcome to Amore Home
                    </h1>
                </div>
            </div>

            {/* Card */}
            <div style={{ display: "flex", justifyContent: "center", padding: "36px 20px 60px" }}>
                <div style={{
                    background: C.card,
                    borderRadius: 16,
                    padding: "36px 40px",
                    width: "100%", maxWidth: 520,
                    boxShadow: "0 8px 48px rgba(74,44,26,0.12)",
                }}>
                    <h2 style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "1.5rem", fontWeight: 700, color: C.dark,
                        textAlign: "center", marginBottom: 28,
                    }}>
                        Register
                    </h2>

                    {errors.general && (
                        <div style={{
                            background: "#FBF0ED", border: "1px solid #C47B5A",
                            borderRadius: 6, padding: "10px 14px", marginBottom: 20,
                            fontSize: 13, color: C.error,
                        }}>
                            {errors.general}
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                        {/* Full name */}
                        <Field label="Fullname" error={errors.fullName}>
                            <Input placeholder="Nguyen Thi Hai Linh" value={form.fullName} onChange={set("fullName")} hasError={!!errors.fullName} disabled={loading} />
                        </Field>

                        {/* Phone */}
                        <Field label="Phone number" error={errors.phone}>
                            <Input type="tel" placeholder="0909 355 355" value={form.phone} onChange={set("phone")} hasError={!!errors.phone} disabled={loading} />
                        </Field>

                        {/* Date of birth */}
                        <Field label="Date of birth" error={errors.dob}>
                            <Input type="date" value={form.dob} onChange={set("dob")} hasError={!!errors.dob} disabled={loading} />
                        </Field>

                        {/* Email */}
                        <Field label="Email" error={errors.email}>
                            <Input type="email" placeholder="email@example.com" value={form.email} onChange={set("email")} hasError={!!errors.email} disabled={loading} />
                        </Field>

                        {/* Password */}
                        <Field label="Password" error={errors.password}>
                            <div style={{ position: "relative" }}>
                                <Input
                                    type={showPwd ? "text" : "password"}
                                    placeholder="••••••••••••"
                                    value={form.password}
                                    onChange={set("password")}
                                    hasError={!!errors.password}
                                    disabled={loading}
                                    style={{ paddingRight: 44 }}
                                />
                                <EyeBtn show={showPwd} toggle={() => setShowPwd(p => !p)} />
                            </div>
                            {/* Strength bar */}
                            {form.password && (
                                <div style={{ marginTop: 6 }}>
                                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                                        {[1, 2, 3, 4].map((n) => (
                                            <div key={n} style={{
                                                flex: 1, height: 3, borderRadius: 2,
                                                background: n <= strength ? strengthColor : C.sand,
                                                transition: "background 0.3s",
                                            }} />
                                        ))}
                                    </div>
                                    <p style={{ fontSize: 10, color: strengthColor, margin: 0 }}>{strengthLabel}</p>
                                </div>
                            )}
                        </Field>

                        {/* Confirm password */}
                        <Field label="Confirm Password" error={errors.confirmPassword}>
                            <div style={{ position: "relative" }}>
                                <Input
                                    type={showCpwd ? "text" : "password"}
                                    placeholder="••••••••••••"
                                    value={form.confirmPassword}
                                    onChange={set("confirmPassword")}
                                    hasError={!!errors.confirmPassword}
                                    disabled={loading}
                                    style={{ paddingRight: 44 }}
                                />
                                <EyeBtn show={showCpwd} toggle={() => setShowCpwd(p => !p)} />
                            </div>
                        </Field>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{
                                background: C.coffee, color: "#fff", border: "none",
                                borderRadius: 8, padding: "14px 0",
                                fontSize: "1rem", fontWeight: 700,
                                fontFamily: "'Playfair Display', serif",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1, marginTop: 4,
                                transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = C.dark)}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = C.coffee)}
                        >
                            {loading ? "Đang đăng ký..." : "Register"}
                        </button>

                        {/* Login link */}
                        <p style={{ textAlign: "center", fontSize: 13, color: C.dark, margin: 0 }}>
                            Đã có tài khoản?{" "}
                            <button
                                type="button"
                                onClick={() => navigate("login")}
                                style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    fontWeight: 700, color: C.coffee,
                                    fontFamily: "'Poppins', sans-serif", fontSize: 13,
                                }}
                            >
                                Đăng nhập ngay!
                            </button>
                        </p>
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
            <label style={{ fontSize: 13, fontWeight: 700, color: "#6D3914", letterSpacing: "0.03em" }}>
                {label}
            </label>
            {children}
            {error && <p style={{ margin: 0, fontSize: 11, color: "#C47B5A" }}>{error}</p>}
        </div>
    );
}

function Input({ hasError, style: extraStyle, ...props }) {
    return (
        <input
            {...props}
            style={{
                width: "100%", padding: "13px 14px", borderRadius: 8,
                border: `1.5px solid ${hasError ? "#C47B5A" : "rgba(183,149,127,0.4)"}`,
                background: "rgba(183,149,127,0.18)",
                fontSize: 14, fontFamily: "'Poppins', sans-serif",
                color: "#4A2C1A", outline: "none",
                transition: "border-color 0.2s", boxSizing: "border-box",
                ...extraStyle,
            }}
            onFocus={(e) => { if (!hasError) e.target.style.borderColor = "#8B5E3C"; }}
            onBlur={(e) => { if (!hasError) e.target.style.borderColor = "rgba(183,149,127,0.4)"; }}
        />
    );
}

function EyeBtn({ show, toggle }) {
    return (
        <button
            type="button"
            onClick={toggle}
            style={{
                position: "absolute", right: 12, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#8B5E3C", fontSize: 13, padding: 4,
            }}
            tabIndex={-1}
        >
            {show ? "Ẩn" : "Hiện"}
        </button>
    );
}