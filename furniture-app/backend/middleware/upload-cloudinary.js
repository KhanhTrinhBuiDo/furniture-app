/**
 * Amore Home — Cloudinary Upload Middleware
 *
 * Thay thế multer local storage khi deploy lên Vercel
 * (Vercel filesystem là read-only ở production)
 *
 * Cài đặt: npm install cloudinary multer-storage-cloudinary multer
 */

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// ─── Config Cloudinary ────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Storage: tự động upload lên Cloudinary ───────────────────────────────────
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => ({
        folder: "amore-home/products",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            { width: 1200, height: 1200, crop: "limit", quality: "auto:good" },
        ],
        public_id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }),
});

// ─── Filter ──────────────────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Chỉ chấp nhận JPG, PNG, WebP"), false);
};

// ─── Upload instance ──────────────────────────────────────────────────────────
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

// ─── Error handler ────────────────────────────────────────────────────────────
export function handleUploadError(err, _req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ message: "File quá 5MB" });
        if (err.code === "LIMIT_FILE_COUNT") return res.status(400).json({ message: "Tối đa 10 ảnh" });
        return res.status(400).json({ message: err.message });
    }
    if (err) return res.status(400).json({ message: err.message });
    next();
}

// ─── Delete từ Cloudinary ────────────────────────────────────────────────────
export async function deleteCloudinaryImage(publicId) {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error("Cloudinary delete error:", err.message);
    }
}

export const uploadMultiple = upload.array("images", 10);
export const uploadSingle = upload.single("image");
export default upload;