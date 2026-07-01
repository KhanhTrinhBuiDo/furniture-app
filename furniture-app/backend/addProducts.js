import fs from "fs";
import path from "path";

import Product from "./models/Product.js"; // sửa lại nếu cần

async function addProducts() {
    try {
        const jsonPath = path.join(process.cwd(), "scripts", "product.json");

        const products = JSON.parse(
            fs.readFileSync(jsonPath, "utf8")
        );

        let added = 0;
        let skipped = 0;

        for (const product of products) {

            // Không thêm nếu đã có cùng tên
            const existed = await Product.findOne({
                name: product.name
            });

            if (existed) {
                console.log(`⏩ Bỏ qua: ${product.name}`);
                skipped++;
                continue;
            }

            await Product.create(product);

            console.log(`✅ Đã thêm: ${product.name}`);
            added++;
        }

        console.log("\n======================");
        console.log(`Added   : ${added}`);
        console.log(`Skipped : ${skipped}`);
        console.log("======================");

    } catch (err) {
        console.error(err);
    }
}

export default addProducts;