import Product from "../models/Product.js";

// ─── Mô hình tồn kho 2 pha: actual_stock / locked_stock ──────────────────────
// actual_stock = tồn kho thật trong kho.
// locked_stock = số lượng đang bị "giữ chỗ" bởi các đơn hàng chưa thanh toán
//                xong (Pending). Số lượng CÓ THỂ BÁN = actual_stock - locked_stock.
//
// Vòng đời:
//   1) Tạo Order (Pending)        → lockStock()    (locked_stock += qty)
//   2) Thanh toán thành công      → commitStock()   (actual_stock -= qty, locked_stock -= qty)
//   3) Huỷ đơn / thanh toán fail  → releaseStock()  (locked_stock -= qty)
//
// Thiết kế này khớp với lý do collection `orders` có compound index
// (status, created_at) — phục vụ job quét các đơn Pending quá hạn (timeout)
// để tự động releaseStock() cho các đơn không thanh toán kịp.

export async function getAvailableStock(productId) {
    const p = await Product.findById(productId).select("actual_stock locked_stock").lean();
    if (!p) return 0;
    return Math.max(0, p.actual_stock - p.locked_stock);
}

/** Giữ chỗ tồn kho cho danh sách item [{ product_id, quantity }]. Ném lỗi nếu không đủ hàng. */
export async function lockStock(items) {
    for (const { product_id, quantity } of items) {
        const p = await Product.findById(product_id);
        if (!p) throw new Error("Sản phẩm không tồn tại");
        const available = p.actual_stock - p.locked_stock;
        if (available < quantity) {
            throw new Error(`"${p.name}" chỉ còn ${available} sản phẩm có thể đặt`);
        }
    }
    const ops = items.map(({ product_id, quantity }) => ({
        updateOne: { filter: { _id: product_id }, update: { $inc: { locked_stock: quantity } } },
    }));
    if (ops.length) await Product.bulkWrite(ops);
}

/** Giải phóng giữ chỗ (huỷ đơn / thanh toán thất bại / hết hạn) — KHÔNG đụng actual_stock. */
export async function releaseStock(items) {
    const ops = items.map(({ product_id, quantity }) => ({
        updateOne: { filter: { _id: product_id }, update: { $inc: { locked_stock: -quantity } } },
    }));
    if (ops.length) await Product.bulkWrite(ops);
}

/** Chốt bán khi thanh toán thành công — trừ thật actual_stock, đồng thời nhả locked_stock. */
export async function commitStock(items) {
    const ops = items.map(({ product_id, quantity }) => ({
        updateOne: {
            filter: { _id: product_id },
            update: { $inc: { actual_stock: -quantity, locked_stock: -quantity } },
        },
    }));
    if (ops.length) await Product.bulkWrite(ops);
}