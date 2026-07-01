import { useState, useRef, useEffect } from "react";
import { useStore } from "../../../store/store";
import { forgotPassword, verifyOTP, resetPassword } from "../services/authService";

const C = {
    bg: "#E8D9C8",
    card: "rgba(255,255,255,0.92)",
    dark: "#4A2C1A",
    wood: "#8B5E3C",
    coffee: "#6D3914",
    sand: "#D9C9B0",
    error: "#C47B5A",
    success: "#6B7C5C",
};

const HERO_IMG =
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=400&fit=crop&q=80";

const STEPS = ["email", "otp", "reset"];

export default function ForgotPasswordPage() {
    const { navigate, showToast } = useStore();
    const [step, setStep] = useState("email");   // "email" | "otp" | "reset"
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [form, setForm] = useState({ password: "", confirm: "" });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [showPwd, setShowPwd] = useState(false);
    const otpRefs = useRef([]);

    // Countdown timer cho resend OTP
    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // ── Step 1: Gửi OTP ──────────────────────────────────────────────────
    const handleSendOTP = async (e) => {
        e?.preventDefault();
        if (!email.trim()) return setErrors({ email: "Vui lòng nhập email" });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErrors({ email: "Email không hợp lệ" });
        setErrors({});
        setLoading(true);
        try {
            await forgotPassword(email);
            setStep("otp");
            setCountdown(60);
            showToast({ message: "Mã OTP đã được gửi tới email của bạn", type: "info" });
        } catch (err) {
            setErrors({ email: err.message || "Email không tồn tại trong hệ thống" });
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Xác thực OTP ─────────────────────────────────────────────
    const otpValue = otp.join("");

    const handleOTPInput = (idx, val) => {
        const char = val.replace(/\D/g, "").slice(-1);
        const next = [...otp];
        next[idx] = char;
        setOtp(next);
        if (char && idx < 5) otpRefs.current[idx + 1]?.focus();
    };

    const handleOTPKeyDown = (idx, e) => {
        if (e.key === "Backspace" && !otp[idx] && idx > 0) {
            otpRefs.current[idx - 1]?.focus();
        }
    };

    const handleOTPPaste = (e) => {
        const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (paste.length === 6) {
            setOtp(paste.split(""));
            otpRefs.current[5]?.focus();
        }
    };

    const handleVerifyOTP = async (e) => {
        e?.preventDefault();
        if (otpValue.length < 6) return setErrors({ otp: "Vui lòng nhập đủ 6 chữ số" });
        setErrors({});
        setLoading(true);
        try {
            await verifyOTP(email, otpValue);
            setStep("reset");
        } catch (err) {
            setErrors({ otp: err.message || "Mã OTP không đúng hoặc đã hết hạn" });
            setOtp(["", "", "", "", "", ""]);
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Đặt lại mật khẩu ─────────────────────────────────────────
    const handleReset = async (e) => {
        e?.preventDefault();
        const e2 = {};
        if (!form.password) e2.password = "Vui lòng nhập mật khẩu mới";
        else if (form.password.length < 8) e2.password = "Tối thiểu 8 ký tự";
        else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(form.password))
            e2.password = "Cần ít nhất 1 chữ hoa và 1 số";
        if (form.password !== form.confirm) e2.confirm = "Mật khẩu không khớp";
        if (Object.keys(e2).length) return setErrors(e2);
        setErrors({});
        setLoading(true);
        try {
            await resetPassword(email, otpValue, form.password);
            showToast({ message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập.", type: "success" });
            navigate("login");
        } catch (err) {
            setErrors({ general: err.message || "Đặt lại mật khẩu thất bại" });
        } finally {
            setLoading(false);
        }
    };

    // ── Progress indicator ────────────────────────────────────────────────
    const stepIdx = STEPS.indexOf(step);

    return (
        <div style={{ background: C.bg, minHeight: "100vh" }}>

            {/* Hero */}
            <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
                <img src={HERO_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{
                    position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)",
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
                    background: C.card, borderRadius: 16,
                    padding: "36px 40px", width: "100%", maxWidth: 480,
                    boxShadow: "0 8px 48px rgba(74,44,26,0.12)",
                }}>

                    {/* Step progress */}
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 0 }}>
                        {["Email", "Xác thực", "Mật khẩu"].map((label, i) => (
                            <div key={label} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : 0 }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: "50%",
                                        background: i <= stepIdx ? C.coffee : C.sand,
                                        color: i <= stepIdx ? "#fff" : "#999",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 12, fontWeight: 700,
                                        transition: "background 0.3s",
                                    }}>
                                        {i < stepIdx ? "✓" : i + 1}
                                    </div>
                                    <span style={{ fontSize: 10, color: i <= stepIdx ? C.coffee : "#bbb", whiteSpace: "nowrap" }}>
                                        {label}
                                    </span>
                                </div>
                                {i < 2 && (
                                    <div style={{
                                        flex: 1, height: 2, margin: "0 8px", marginBottom: 18,
                                        background: i < stepIdx ? C.coffee : C.sand,
                                        transition: "background 0.3s",
                                    }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── Step: Email ─────────────────────────────────────────── */}
                    {step === "email" && (
                        <>
                            <h2 style={styles.title}>Quên mật khẩu</h2>
                            <p style={{ fontSize: 13, color: "#888", marginBottom: 24, lineHeight: 1.6 }}>
                                Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi mã OTP để xác thực.
                            </p>

                            {errors.email && <ErrorBox msg={errors.email} />}

                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                <Field label="Email">
                                    <Input
                                        type="email" placeholder="email@example.com"
                                        value={email} onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                                        hasError={!!errors.email} disabled={loading}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendOTP(e)}
                                    />
                                </Field>

                                <Btn onClick={handleSendOTP} loading={loading}>
                                    Gửi mã xác thực
                                </Btn>

                                <BackToLogin onClick={() => navigate("login")} />
                            </div>
                        </>
                    )}

                    {/* ── Step: OTP ───────────────────────────────────────────── */}
                    {step === "otp" && (
                        <>
                            <h2 style={styles.title}>Nhập mã OTP</h2>
                            <p style={{ fontSize: 13, color: "#888", marginBottom: 8, lineHeight: 1.6 }}>
                                Mã 6 chữ số đã được gửi đến <strong style={{ color: C.coffee }}>{email}</strong>
                            </p>
                            <p style={{ fontSize: 12, color: "#bbb", marginBottom: 24 }}>Mã có hiệu lực trong 10 phút.</p>

                            {errors.otp && <ErrorBox msg={errors.otp} />}

                            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                                {/* OTP boxes */}
                                <div style={{ display: "flex", gap: 10, justifyContent: "center" }} onPaste={handleOTPPaste}>
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => (otpRefs.current[i] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOTPInput(i, e.target.value)}
                                            onKeyDown={(e) => handleOTPKeyDown(i, e)}
                                            disabled={loading}
                                            style={{
                                                width: 48, height: 56,
                                                textAlign: "center",
                                                fontSize: "1.4rem", fontWeight: 700,
                                                fontFamily: "'Playfair Display', serif",
                                                color: C.dark,
                                                border: `2px solid ${digit ? C.coffee : C.sand}`,
                                                borderRadius: 8,
                                                background: digit ? "rgba(109,57,20,0.08)" : "rgba(183,149,127,0.15)",
                                                outline: "none",
                                                transition: "border-color 0.2s",
                                            }}
                                            onFocus={(e) => (e.target.style.borderColor = C.wood)}
                                            onBlur={(e) => (e.target.style.borderColor = digit ? C.coffee : C.sand)}
                                        />
                                    ))}
                                </div>

                                <Btn onClick={handleVerifyOTP} loading={loading}>
                                    Xác nhận OTP
                                </Btn>

                                {/* Resend */}
                                <p style={{ textAlign: "center", fontSize: 13, color: "#888" }}>
                                    Không nhận được mã?{" "}
                                    {countdown > 0 ? (
                                        <span style={{ color: C.coffee }}>Gửi lại sau {countdown}s</span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleSendOTP}
                                            style={{
                                                background: "none", border: "none", cursor: "pointer",
                                                fontWeight: 700, color: C.coffee,
                                                fontFamily: "'Poppins', sans-serif", fontSize: 13,
                                            }}
                                        >
                                            Gửi lại
                                        </button>
                                    )}
                                </p>
                            </div>
                        </>
                    )}

                    {/* ── Step: Reset ─────────────────────────────────────────── */}
                    {step === "reset" && (
                        <>
                            <h2 style={styles.title}>Đặt lại mật khẩu</h2>
                            <p style={{ fontSize: 13, color: "#888", marginBottom: 24, lineHeight: 1.6 }}>
                                Tạo mật khẩu mới cho tài khoản <strong style={{ color: C.coffee }}>{email}</strong>
                            </p>

                            {errors.general && <ErrorBox msg={errors.general} />}

                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                <Field label="Password" error={errors.password}>
                                    <div style={{ position: "relative" }}>
                                        <Input
                                            type={showPwd ? "text" : "password"}
                                            placeholder="••••••••••••"
                                            value={form.password}
                                            onChange={(e) => { setForm(p => ({ ...p, password: e.target.value })); setErrors(p => ({ ...p, password: "" })); }}
                                            hasError={!!errors.password}
                                            disabled={loading}
                                            style={{ paddingRight: 44 }}
                                        />
                                        <button type="button" onClick={() => setShowPwd(p => !p)}
                                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.wood, fontSize: 13 }}
                                            tabIndex={-1}>{showPwd ? "Ẩn" : "Hiện"}</button>
                                    </div>
                                </Field>

                                <Field label="Confirm Password" error={errors.confirm}>
                                    <Input
                                        type="password"
                                        placeholder="••••••••••••"
                                        value={form.confirm}
                                        onChange={(e) => { setForm(p => ({ ...p, confirm: e.target.value })); setErrors(p => ({ ...p, confirm: "" })); }}
                                        hasError={!!errors.confirm}
                                        disabled={loading}
                                    />
                                </Field>

                                <Btn onClick={handleReset} loading={loading}>
                                    Xác nhận đặt lại mật khẩu
                                </Btn>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, error, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#6D3914" }}>{label}</label>
            {children}
            {error && <p style={{ margin: 0, fontSize: 11, color: "#C47B5A" }}>{error}</p>}
        </div>
    );
}

function Input({ hasError, style: extra, ...props }) {
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
                ...extra,
            }}
            onFocus={(e) => { if (!hasError) e.target.style.borderColor = "#8B5E3C"; }}
            onBlur={(e) => { if (!hasError) e.target.style.borderColor = "rgba(183,149,127,0.4)"; }}
        />
    );
}

function Btn({ onClick, loading, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            style={{
                background: "#6D3914", color: "#fff", border: "none", borderRadius: 8,
                padding: "14px 0", fontSize: "1rem", fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, transition: "background 0.2s",
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#4A2C1A")}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#6D3914")}
        >
            {loading ? "Đang xử lý..." : children}
        </button>
    );
}

function ErrorBox({ msg }) {
    return (
        <div style={{
            background: "#FBF0ED", border: "1px solid #C47B5A",
            borderRadius: 6, padding: "10px 14px", marginBottom: 16,
            fontSize: 13, color: "#C47B5A",
        }}>
            {msg}
        </div>
    );
}

function BackToLogin({ onClick }) {
    return (
        <p style={{ textAlign: "center", fontSize: 13, color: "#888", margin: 0 }}>
            Nhớ mật khẩu?{" "}
            <button
                type="button"
                onClick={onClick}
                style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontWeight: 700, color: "#6D3914",
                    fontFamily: "'Poppins', sans-serif", fontSize: 13,
                }}
            >
                Đăng nhập
            </button>
        </p>
    );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const styles = {
    title: {
        fontFamily: "'Playfair Display', serif",
        fontSize: "1.4rem", fontWeight: 700, color: "#4A2C1A",
        textAlign: "center", margin: "0 0 16px",
    },
};