import express from "express";
import User from "../models/User.js";
import { signToken, setAuthCookie, clearAuthCookie, generateOTP, isOTPValid } from "../utils/jwtUtils.js";
import { sendOTPEmail, sendWelcomeEmail } from "../utils/emailUtils.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadSingle, handleUploadError } from "../middleware/upload-cloudinary.js";

const router = express.Router();

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        const { fullName, phone, dob, email, password } = req.body;

        // Validate required
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
        }

        // Check duplicate email
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) {
            return res.status(409).json({ message: "Email này đã được đăng ký" });
        }

        // Create user (password tự hash qua pre-save hook)
        const user = await User.create({
            fullName,
            email: email.toLowerCase(),
            phone: phone || "",
            dob: dob || null,
            password,
            authProvider: "local",
        });

        // Gửi email chào mừng (không block response)
        sendWelcomeEmail(user.email, user.fullName).catch(console.error);

        res.status(201).json({
            success: true,
            message: "Đăng ký thành công",
            user: user.toPublicJSON(),
        });
    } catch (err) {
        console.error("Register error:", err);
        if (err.name === "ValidationError") {
            const msg = Object.values(err.errors)[0]?.message;
            return res.status(400).json({ message: msg });
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

        // Lấy user kèm password (select: false ở schema)
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
        if (!user) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }
        if (user.authProvider === "google") {
            return res.status(401).json({ message: "Tài khoản này đăng nhập bằng Google" });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: "Tài khoản đã bị khóa" });
        }

        const match = await user.comparePassword(password);
        if (!match) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }

        // Sign token + set cookie
        const token = signToken({ id: user._id, role: user.role });
        setAuthCookie(res, token);

        res.json({
            success: true,
            message: "Đăng nhập thành công",
            user: user.toPublicJSON(),
            // token cũng trả về để client lưu nếu không dùng cookie (mobile)
            token,
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
    res.json({ success: true, user: req.user.toPublicJSON() });
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
router.put("/profile", protect, async (req, res) => {
    try {
        const { fullName, phone, dob, avatar } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { fullName, phone, dob, avatar },
            { new: true, runValidators: true }
        );
        res.json({ success: true, user: user.toPublicJSON() });
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

        // req.file.path là URL Cloudinary đầy đủ (CloudinaryStorage tự upload)
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: req.file.path },
            { new: true }
        );

        res.json({ success: true, user: user.toPublicJSON() });
    } catch (err) {
        console.error("Upload avatar error:", err.message);
        res.status(500).json({ message: err.message || "Lỗi tải ảnh lên" });
    }
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────
router.put("/change-password", protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select("+password");

        const match = await user.comparePassword(currentPassword);
        if (!match) {
            return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
        }

        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: "Đổi mật khẩu thành công" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ─── FORGOT PASSWORD FLOW ─────────────────────────────────────────────────────

// POST /api/auth/forgot-password — Gửi OTP
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() });

        // Không tiết lộ email có tồn tại hay không — luôn trả 200
        if (!user || user.authProvider !== "local") {
            return res.json({ success: true, message: "Nếu email tồn tại, OTP đã được gửi" });
        }

        const { otp, expires } = generateOTP();
        user.resetOTP = otp;
        user.resetOTPExpires = expires;
        user.resetOTPVerified = false;
        await user.save({ validateBeforeSave: false });

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
        const user = await User.findOne({ email: email?.toLowerCase() })
            .select("+resetOTP +resetOTPExpires +resetOTPVerified");

        if (!user || !isOTPValid(user.resetOTP, user.resetOTPExpires, otp)) {
            return res.status(400).json({ message: "Mã OTP không đúng hoặc đã hết hạn" });
        }

        user.resetOTPVerified = true;
        await user.save({ validateBeforeSave: false });

        res.json({ success: true, message: "OTP hợp lệ" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// POST /api/auth/reset-password — Đặt lại mật khẩu
router.post("/reset-password", async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() })
            .select("+resetOTP +resetOTPExpires +resetOTPVerified +password");

        if (!user) return res.status(404).json({ message: "Tài khoản không tồn tại" });

        // Double check: OTP phải được xác thực ở bước trước
        if (!user.resetOTPVerified || !isOTPValid(user.resetOTP, user.resetOTPExpires, otp)) {
            return res.status(400).json({ message: "Phiên đặt lại mật khẩu không hợp lệ" });
        }

        user.password = newPassword;
        user.resetOTP = null;
        user.resetOTPExpires = null;
        user.resetOTPVerified = false;
        await user.save();

        // Xóa cookie cũ (bắt buộc đăng nhập lại)
        clearAuthCookie(res);

        res.json({ success: true, message: "Đặt lại mật khẩu thành công" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────
// Sử dụng passport-google-oauth20
// Cần cài thêm: npm install passport passport-google-oauth20

// GET /api/auth/google — Redirect sang Google
router.get("/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const callbackUrl = encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback");
    const scope = encodeURIComponent("openid email profile");

    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;
    res.redirect(googleUrl);
});

// GET /api/auth/google/callback — Google redirect về đây
router.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) throw new Error("No code received from Google");

        // 1. Exchange code for tokens
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

        // 2. Get user info from Google
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();

        // 3. Upsert user
        let user = await User.findOne({ $or: [{ googleId: profile.id }, { email: profile.email }] });

        if (user) {
            // Liên kết Google nếu chưa có
            if (!user.googleId) {
                user.googleId = profile.id;
                user.authProvider = "google";
                user.avatar = user.avatar || profile.picture || "";
                await user.save({ validateBeforeSave: false });
            }
        } else {
            // Tạo user mới
            user = await User.create({
                fullName: profile.name || profile.email.split("@")[0],
                email: profile.email,
                googleId: profile.id,
                avatar: profile.picture || "",
                authProvider: "google",
                isActive: true,
            });
        }

        if (!user.isActive) {
            return res.redirect(`${process.env.CORS_ORIGIN}/login?error=account_disabled`);
        }

        // 4. Sign JWT + set cookie
        const token = signToken({ id: user._id, role: user.role });
        setAuthCookie(res, token);

        // 5. Redirect về frontend
        res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}?auth=success`);
    } catch (err) {
        console.error("Google OAuth error:", err);
        res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/login?error=google_failed`);
    }
});

export default router;