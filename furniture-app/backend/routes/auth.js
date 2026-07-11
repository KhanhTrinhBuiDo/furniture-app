import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sanitizeUser } from "../utils/userSerializer.js";
import { generateOTP, saveOTP, isOTPValid, markOTPVerified, isOTPVerified, clearOTP } from "../utils/otpStore.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../utils/jwtUtils.js";
import { sendOTPEmail, sendWelcomeEmail } from "../utils/emailUtils.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadSingle, handleUploadError } from "../middleware/upload-cloudinary.js";

const router = express.Router();
const SALT_ROUNDS = 10;

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        const { fullName, phone, dob, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
        }

        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) {
            return res.status(409).json({ message: "Email này đã được đăng ký" });
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await User.create({
            full_name: fullName,
            email: email.toLowerCase(),
            phone: phone || undefined,
            dob: dob || null,
            password_hash,
            role: "User",
        });

        sendWelcomeEmail(user.email, user.full_name).catch(console.error);

        res.status(201).json({
            success: true,
            message: "Đăng ký thành công",
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error("Register error:", err);
        if (err.name === "ValidationError") {
            const msg = Object.values(err.errors)[0]?.message;
            return res.status(400).json({ message: msg });
        }
        if (err.code === 11000) {
            return res.status(409).json({ message: "Email hoặc số điện thoại đã được sử dụng" });
        }
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }
        if (user.google_id && !user.password_hash) {
            return res.status(401).json({ message: "Tài khoản này đăng nhập bằng Google" });
        }
        if (user.is_active === false) {
            return res.status(403).json({ message: "Tài khoản đã bị khóa" });
        }

        const match = await bcrypt.compare(password, user.password_hash || "");
        if (!match) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }

        const token = signToken({ id: user._id, role: user.role });
        setAuthCookie(res, token);

        res.json({
            success: true,
            message: "Đăng nhập thành công",
            user: sanitizeUser(user),
            token, // trả kèm cho client không dùng cookie (mobile)
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
    clearAuthCookie(res);
    res.json({ success: true, message: "Đăng xuất thành công" });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", protect, (req, res) => {
    res.json({ success: true, user: sanitizeUser(req.user) });
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
router.put("/profile", protect, async (req, res) => {
    try {
        const { fullName, phone, dob } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { full_name: fullName, phone, dob: dob || null },
            { new: true, runValidators: true }
        );
        res.json({ success: true, user: sanitizeUser(user) });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ─── PUT /api/auth/avatar — Upload ảnh đại diện lên Cloudinary ───────────────
router.put("/avatar", protect, uploadSingle, handleUploadError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Vui lòng chọn ảnh để tải lên" });
        }
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: req.file.path },
            { new: true }
        );
        res.json({ success: true, user: sanitizeUser(user) });
    } catch (err) {
        console.error("Upload avatar error:", err.message);
        res.status(500).json({ message: err.message || "Lỗi tải ảnh lên" });
    }
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────
router.put("/change-password", protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        const match = await bcrypt.compare(currentPassword, user.password_hash || "");
        if (!match) {
            return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
        }

        user.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();
        res.json({ success: true, message: "Đổi mật khẩu thành công" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ─── FORGOT PASSWORD FLOW ─────────────────────────────────────────────────────
// GHI CHÚ: OTP được lưu tạm trong bộ nhớ (utils/otpStore.js), KHÔNG lưu vào
// User document — model User mới không có field resetOTP*. Xem chi tiết
// đánh đổi trong otpStore.js.

// POST /api/auth/forgot-password — Gửi OTP
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() });

        // Không tiết lộ email có tồn tại hay không — luôn trả 200
        if (!user || user.google_id) {
            return res.json({ success: true, message: "Nếu email tồn tại, OTP đã được gửi" });
        }

        const { otp, expires } = generateOTP();
        saveOTP(user.email, otp, expires);
        await sendOTPEmail(user.email, otp);

        res.json({ success: true, message: "OTP đã được gửi tới email của bạn" });
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ message: "Lỗi gửi email" });
    }
});

// POST /api/auth/verify-otp — Xác thực OTP
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !isOTPValid(email, otp)) {
            return res.status(400).json({ message: "Mã OTP không đúng hoặc đã hết hạn" });
        }
        markOTPVerified(email);
        res.json({ success: true, message: "OTP hợp lệ" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// POST /api/auth/reset-password — Đặt lại mật khẩu
router.post("/reset-password", async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() });
        if (!user) return res.status(404).json({ message: "Tài khoản không tồn tại" });

        if (!isOTPVerified(email) || !isOTPValid(email, otp)) {
            return res.status(400).json({ message: "Phiên đặt lại mật khẩu không hợp lệ" });
        }

        user.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();
        clearOTP(email);

        clearAuthCookie(res); // bắt buộc đăng nhập lại
        res.json({ success: true, message: "Đặt lại mật khẩu thành công" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────
router.get("/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const callbackUrl = encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback");
    const scope = encodeURIComponent("openid email profile");
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;
    res.redirect(googleUrl);
});

router.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) throw new Error("No code received from Google");

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
                grant_type: "authorization_code",
            }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error("Failed to get access token");

        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();

        let user = await User.findOne({ $or: [{ google_id: profile.id }, { email: profile.email }] });

        if (user) {
            if (!user.google_id) {
                user.google_id = profile.id;
                user.avatar = user.avatar || profile.picture || "";
                await user.save({ validateBeforeSave: false });
            }
        } else {
            user = await User.create({
                full_name: profile.name || profile.email.split("@")[0],
                email: profile.email,
                google_id: profile.id,
                avatar: profile.picture || "",
                role: "User",
            });
        }

        if (user.is_active === false) {
            return res.redirect(`${process.env.CORS_ORIGIN}/login?error=account_disabled`);
        }

        const token = signToken({ id: user._id, role: user.role });
        setAuthCookie(res, token);

        res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}?auth=success`);
    } catch (err) {
        console.error("Google OAuth error:", err);
        res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/login?error=google_failed`);
    }
});

export default router;