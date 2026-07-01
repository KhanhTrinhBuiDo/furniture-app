/**
 * AMORE HOME — Xoá toàn bộ sản phẩm (dùng để test lại từ đầu)
 * Chạy: node scripts/clear-products.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/amore-home";

await mongoose.connect(MONGODB_URI);
console.log("✅ Connected:", MONGODB_URI.replace(/:([^@]+)@/, ":***@"));

const Product = mongoose.models.Product || mongoose.model("Product", new mongoose.Schema({}, { strict: false }));

const count = await Product.countDocuments();
console.log(`\n⚠️  Sắp xoá ${count} sản phẩm khỏi database.`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const confirm = await new Promise(resolve => rl.question("Xác nhận xoá? Gõ 'YES' để tiếp tục: ", resolve));
rl.close();

if (confirm !== "YES") {
    console.log("❌ Đã huỷ.\n");
    process.exit(0);
}

const result = await Product.deleteMany({});
console.log(`\n✅ Đã xoá ${result.deletedCount} sản phẩm.\n`);

await mongoose.disconnect();
process.exit(0);