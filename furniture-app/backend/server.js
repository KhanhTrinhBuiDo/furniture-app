import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Tạo thư mục uploads nếu chưa có ─────────────────────────────────────────
const uploadDir = join(__dirname, "../uploads/products");
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static: serve uploaded images ───────────────────────────────────────────
app.use("/uploads", express.static(join(__dirname, "../uploads")));

// ─── MongoDB ──────────────────────────────────────────────────────────────────
let dbConnected = false;
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.warn("⚠️  MONGODB_URI chưa cấu hình"); return false; }
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
    return true;
  } catch (err) {
    console.error("❌ MongoDB:", err.message);
    return false;
  }
};

// ─── Safe import (fix Windows ESM) ───────────────────────────────────────────
async function safeImport(relPath) {
  const abs = join(__dirname, relPath);
  if (!existsSync(abs)) { console.warn(`⚠️  Không tìm thấy: ${relPath}`); return null; }
  try {
    const mod = await import(pathToFileURL(abs).href);
    return mod.default;
  } catch (err) {
    console.error(`❌ Lỗi load ${relPath}:`, err.message);
    return null;
  }
}

// ─── Load routes ──────────────────────────────────────────────────────────────
dbConnected = await connectDB();

const [
  paymentRouter,
  authRouter,
  productRouter,
  orderRouter,
  adminRouter,
  blogRouter,
  warrantyRouter,
  cleaningRouter,
  tradeInRouter,
] = await Promise.all([
  safeImport("./routes/payment.js"),
  safeImport("./routes/auth.js"),
  safeImport("./routes/products.js"),
  safeImport("./routes/orders.js"),
  safeImport("./routes/admin.js"),
  safeImport("./routes/blog.js"),
  safeImport("./routes/warranty.js"),
  safeImport("./routes/cleaning.js"),
  safeImport("./routes/tradein.js"),
]);

const stub = (name) => (_req, res) =>
  res.status(503).json({ message: `${name}: cần ${dbConnected ? "route file" : "MongoDB"}` });

// Payment — luôn mount
if (paymentRouter) { app.use("/api/payment", paymentRouter); console.log("✅ /api/payment"); }

// Các route cần DB
const dbRoutes = [
  { path: "/api/auth", router: authRouter, name: "Auth" },
  { path: "/api/products", router: productRouter, name: "Products" },
  { path: "/api/orders", router: orderRouter, name: "Orders" },
  { path: "/api/admin", router: adminRouter, name: "Admin" },
  { path: "/api/blog", router: blogRouter, name: "Blog" },
  { path: "/api/warranty", router: warrantyRouter, name: "Warranty" },
  { path: "/api/cleaning", router: cleaningRouter, name: "Cleaning" },
  { path: "/api/tradein", router: tradeInRouter, name: "TradeIn" },
];

for (const { path, router, name } of dbRoutes) {
  if (router && dbConnected) {
    app.use(path, router);
    console.log(`✅ ${path}`);
  } else {
    app.use(path, stub(name));
    console.log(`⏸  ${path} — ${router ? "cần MongoDB" : "file không tìm thấy"}`);
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({
  message: "Amore Home Backend API v4",
  mongodb: dbConnected ? "✅ connected" : "❌ not connected",
}));

// ─── 404 + Error handler ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Lỗi máy chủ" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 http://localhost:${PORT}`);
  console.log(`🌐 CORS: ${process.env.CORS_ORIGIN || "http://localhost:3000"}\n`);
});