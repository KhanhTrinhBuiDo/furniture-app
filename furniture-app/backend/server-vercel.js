/**
 * Amore Home — Backend cho Vercel Serverless
 *
 * Vercel dùng serverless functions: không gọi app.listen()
 * Thay vào đó export `app` để Vercel xử lý.
 *
 * Lưu ý về uploads:
 * - Vercel filesystem là read-only ở production
 * - Ảnh sản phẩm cần lưu trên Cloudinary / AWS S3 / Uploadthing
 * - File này có cloudinaryUpload() thay thế multer local storage
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// ─── CORS — cho phép Vercel frontend domain ───────────────────────────────────
const allowedOrigins = [
    process.env.CORS_ORIGIN,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    "http://localhost:3000",
    "http://localhost:4173",
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        // Cho phép requests không có origin (mobile apps, Postman)
        if (!origin) return cb(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── MongoDB — kết nối 1 lần, tái dùng qua requests (Vercel serverless) ───────
let mongoConnected = false;

const connectDB = async () => {
    if (mongoConnected && mongoose.connection.readyState === 1) return;
    const uri = process.env.MONGODB_URI;
    if (!uri) { console.warn("⚠️  MONGODB_URI không cấu hình"); return; }
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 10,
        });
        mongoConnected = true;
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB:", err.message);
    }
};

// Middleware: connect DB trước mỗi request
app.use(async (_req, _res, next) => {
    await connectDB();
    next();
});

// ─── Safe import ──────────────────────────────────────────────────────────────
async function safeImport(relPath) {
    const abs = join(__dirname, relPath);
    if (!existsSync(abs)) return null;
    try {
        const mod = await import(pathToFileURL(abs).href);
        return mod.default;
    } catch (err) {
        console.error(`❌ ${relPath}:`, err.message);
        return null;
    }
}

// ─── Mount routes ─────────────────────────────────────────────────────────────
const [paymentRouter, authRouter, productRouter, orderRouter, adminRouter, blogRouter, warrantyRouter] =
    await Promise.all([
        safeImport("./routes/payment.js"),
        safeImport("./routes/auth.js"),
        safeImport("./routes/products.js"),
        safeImport("./routes/orders.js"),
        safeImport("./routes/admin.js"),
        safeImport("./routes/blog.js"),
        safeImport("./routes/warranty.js"),
    ]);

if (paymentRouter) app.use("/api/payment", paymentRouter);
if (authRouter) app.use("/api/auth", authRouter);
if (productRouter) app.use("/api/products", productRouter);
if (orderRouter) app.use("/api/orders", orderRouter);
if (adminRouter) app.use("/api/admin", adminRouter);
if (blogRouter) app.use("/api/blog", blogRouter);
if (warrantyRouter) app.use("/api/warranty", warrantyRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        brand: "Amore Home",
        mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        env: process.env.NODE_ENV,
    });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: `${req.method} ${req.path} not found` });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error("Error:", err.message);
    if (err.message?.includes("CORS")) {
        return res.status(403).json({ message: err.message });
    }
    res.status(err.status || 500).json({ message: err.message || "Lỗi máy chủ" });
});

// ─── Local dev: listen ────────────────────────────────────────────────────────
// Vercel sẽ không gọi đoạn này — chỉ dùng khi chạy local
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`\n🚀 Amore Home API: http://localhost:${PORT}`);
        console.log(`🌐 CORS origins: ${allowedOrigins.join(", ")}\n`);
    });
}

// ─── Export cho Vercel ────────────────────────────────────────────────────────
export default app;