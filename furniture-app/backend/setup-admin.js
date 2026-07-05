/**
 * Amore Home — Tạo Admin User
 * Chạy: node setup-admin.js
 * 
 * Script này chỉ tạo tài khoản admin để đăng nhập backoffice.
 * Sản phẩm, voucher sẽ được tạo qua Admin Panel (FR-08, FR-25).
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/funiro";

// ─── User Schema (inline) ────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    authProvider: { type: String, default: "local" },
    avatar: { type: String, default: "" },
    resetOTP: { type: String, default: null, select: false },
    resetOTPExpires: { type: Date, default: null, select: false },
    resetOTPVerified: { type: Boolean, default: false, select: false },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);

// ─── CLI helper ──────────────────────────────────────────────────────────────
function ask(rl, question) {
    return new Promise(resolve => rl.question(question, resolve));
}

function askPassword(rl, question) {
    return new Promise(resolve => {
        process.stdout.write(question);
        process.stdin.setRawMode?.(true);
        let pwd = "";
        const onData = (char) => {
            const c = char.toString();
            if (c === "\r" || c === "\n") {
                process.stdin.setRawMode?.(false);
                process.stdin.removeListener("data", onData);
                process.stdout.write("\n");
                resolve(pwd);
            } else if (c === "\u0003") {
                process.exit();
            } else if (c === "\u007f") {
                if (pwd.length > 0) { pwd = pwd.slice(0, -1); process.stdout.write("\b \b"); }
            } else {
                pwd += c;
                process.stdout.write("*");
            }
        };
        process.stdin.on("data", onData);
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log("\n╔══════════════════════════════════════╗");
console.log("║  Amore Home — Tạo tài khoản Admin         ║");
console.log("╚══════════════════════════════════════╝\n");

console.log("🔌 Connecting to:", MONGODB_URI);
await mongoose.connect(MONGODB_URI);
console.log("✅ MongoDB connected\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ─── Kiểm tra admin đã tồn tại chưa ─────────────────────────────────────────
const existingAdmins = await User.find({ role: "admin" }).select("fullName email");
if (existingAdmins.length > 0) {
    console.log("⚠️  Đã có tài khoản Admin:");
    existingAdmins.forEach(u => console.log(`   👑 ${u.fullName} <${u.email}>`));
    const cont = await ask(rl, "\nVẫn muốn tạo thêm admin? (y/N): ");
    if (cont.toLowerCase() !== "y") {
        console.log("\nKhông tạo thêm. Thoát.\n");
        rl.close();
        await mongoose.disconnect();
        process.exit(0);
    }
    console.log("");
}

// ─── Nhập thông tin ───────────────────────────────────────────────────────────
const fullName = await ask(rl, "Họ tên Admin: ");
const email = await ask(rl, "Email: ");

// Kiểm tra email đã tồn tại
const existing = await User.findOne({ email: email.toLowerCase() });
if (existing) {
    console.log(`\n❌ Email "${email}" đã được sử dụng bởi tài khoản role="${existing.role}".`);

    if (existing.role !== "admin") {
        const upgrade = await ask(rl, "Nâng cấp tài khoản này lên Admin? (y/N): ");
        if (upgrade.toLowerCase() === "y") {
            existing.role = "admin";
            existing.isActive = true;
            await existing.save();
            console.log(`\n✅ Đã nâng cấp "${existing.fullName}" lên Admin!\n`);
        }
    }
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
}

// Nhập mật khẩu
let password = "";
while (true) {
    password = await ask(rl, "Mật khẩu (tối thiểu 8 ký tự, có chữ hoa và số): ");

    if (password.length < 8) {
        console.log("❌ Mật khẩu tối thiểu 8 ký tự");
        continue;
    }
    if (!/(?=.*[A-Z])/.test(password)) {
        console.log("❌ Mật khẩu cần ít nhất 1 chữ hoa");
        continue;
    }
    if (!/(?=.*[0-9])/.test(password)) {
        console.log("❌ Mật khẩu cần ít nhất 1 chữ số");
        continue;
    }

    const confirm = await ask(rl, "Xác nhận mật khẩu: ");
    if (password !== confirm) {
        console.log("❌ Mật khẩu không khớp\n");
        continue;
    }
    break;
}

const phone = await ask(rl, "Số điện thoại (có thể bỏ qua): ");
rl.close();

// ─── Tạo admin ───────────────────────────────────────────────────────────────
console.log("\n⏳ Đang tạo tài khoản...");

const hashed = await bcrypt.hash(password, 12);
const admin = await User.create({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password: hashed,
    phone: phone.trim(),
    role: "admin",
    isActive: true,
    authProvider: "local",
});

console.log("\n╔══════════════════════════════════════╗");
console.log("║  ✅ Tạo Admin thành công!              ║");
console.log("╚══════════════════════════════════════╝");
console.log(`\n  👑 Tên   : ${admin.fullName}`);
console.log(`  📧 Email : ${admin.email}`);
console.log(`  🎭 Role  : admin`);
console.log(`  🆔 ID    : ${admin._id}`);
console.log("\n  Đăng nhập tại: http://localhost:3000");
console.log("  (Nhấn avatar → Admin Dashboard)\n");

await mongoose.disconnect();
process.exit(0);