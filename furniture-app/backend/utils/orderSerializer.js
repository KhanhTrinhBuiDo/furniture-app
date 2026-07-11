import Transaction from "../models/Transaction.js";

// ─── Map trạng thái: DB dùng "Pending/Confirmed/..." (viết hoa, theo Order.js
// gốc: default "Pending") — frontend dùng "pending/confirmed/..." (thường).
export const STATUS_TO_DB = { pending: "Pending", confirmed: "Confirmed", shipping: "Shipping", completed: "Completed", cancelled: "Cancelled" };
export const STATUS_TO_CLIENT = { Pending: "pending", Confirmed: "confirmed", Shipping: "shipping", Completed: "completed", Cancelled: "cancelled" };

const TX_STATUS_TO_CLIENT = { Success: "paid", Failed: "failed", Expired: "failed", Pending: "pending" };

/**
 * Parse delivery_address_snapshot (String) thành object shippingAddress.
 * GHI CHÚ: Order model mới định nghĩa delivery_address_snapshot là 1 String
 * (không phải object có cấu trúc). Để giữ đúng shippingAddress {fullName,
 * phone, email, address, ward, district, city, notes} mà CartPage.jsx /
 * PaymentModal.jsx / OrderHistoryPage.jsx / AdminOrders.jsx đã build sẵn,
 * ta LƯU JSON.stringify(shippingAddress) vào field String đó (vẫn đúng kiểu
 * String theo schema), rồi JSON.parse() lại lúc đọc. Nếu vì lý do gì đó nội
 * dung không phải JSON hợp lệ (dữ liệu cũ/nhập tay), fallback về 1 object chỉ
 * có field `address` để không vỡ giao diện.
 */
export function packAddress(shippingAddress) {
    return JSON.stringify(shippingAddress || {});
}

export function unpackAddress(snapshot) {
    try {
        const parsed = JSON.parse(snapshot);
        if (parsed && typeof parsed === "object") return parsed;
    } catch { /* không phải JSON — dữ liệu cũ dạng string thuần */ }
    return { address: snapshot || "" };
}

/** Lấy Transaction gần nhất cho nhiều order cùng lúc (tránh N+1 query). */
export async function fetchLatestTransactions(orderIds) {
    const txs = await Transaction.find({ order_id: { $in: orderIds } }).sort({ created_at: -1 }).lean();
    const map = new Map();
    for (const t of txs) {
        const key = String(t.order_id);
        if (!map.has(key)) map.set(key, t); // đã sort desc — bản ghi đầu tiên gặp là mới nhất
    }
    return map;
}

/**
 * Serialize 1 Order document (đã populate items.product_id, voucher_id nếu
 * có) + Transaction gần nhất tương ứng, về đúng hình dạng cũ frontend cần.
 */
export function serializeOrder(orderDoc, latestTx) {
    const o = typeof orderDoc.toObject === "function" ? orderDoc.toObject() : orderDoc;

    const items = (o.items || []).map(i => ({
        product: i.product_id?._id || i.product_id,
        productId: i.product_id?._id || i.product_id,
        name: i.product_name_snapshot,
        img: (i.product_id && typeof i.product_id === "object") ? (i.product_id.images?.[0] || i.product_id.image || "") : "",
        price: i.unit_price_snapshot,
        quantity: i.quantity,
        subtotal: i.unit_price_snapshot * i.quantity,
    }));

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const discount = o.discount_amount || 0;
    const shippingFee = Math.max(0, (o.total_amount || 0) - subtotal + discount);

    const user = o.user_id && typeof o.user_id === "object"
        ? { _id: o.user_id._id, fullName: o.user_id.full_name, email: o.user_id.email }
        : o.user_id;

    return {
        _id: o._id,
        orderCode: o.tracking_token,
        user,
        items,
        shippingAddress: unpackAddress(o.delivery_address_snapshot),
        subtotal,
        discount,
        shippingFee,
        total: o.total_amount,
        status: STATUS_TO_CLIENT[o.status] || String(o.status).toLowerCase(),
        cancelReason: o.cancel_reason || "",
        statusHistory: (o.status_log || []).map(s => ({
            status: STATUS_TO_CLIENT[s.status] || String(s.status).toLowerCase(),
            note: s.note,
            changedAt: s.changed_at,
        })),
        voucherCode: (o.voucher_id && typeof o.voucher_id === "object") ? o.voucher_id.code : undefined,
        paymentStatus: latestTx ? (TX_STATUS_TO_CLIENT[latestTx.status] || "pending") : "pending",
        paymentMethod: latestTx?.method ? latestTx.method.toLowerCase() : undefined,
        transactionNo: latestTx?.gateway_transaction_id,
        paidAt: latestTx?.status === "Success" ? latestTx.updated_at : undefined,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
    };
}