// ─── Mô hình sử dụng voucher 2 pha: used_count / locked_count ────────────────
// Giống hệt actual_stock/locked_stock ở Product — used_count là số lượt ĐÃ
// dùng thật (đơn đã thanh toán), locked_count là số lượt đang bị giữ chỗ bởi
// đơn Pending. Lượt còn dùng được = usage_limit - used_count - locked_count.

export function checkVoucherValidity(voucher, orderTotal) {
    if (!voucher) return { ok: false, msg: "Mã voucher không tồn tại" };
    if (voucher.is_active === false) return { ok: false, msg: "Mã voucher đã bị vô hiệu hoá" };
    if (new Date(voucher.expiry_date) < new Date()) return { ok: false, msg: "Mã voucher đã hết hạn" };
    const remaining = voucher.usage_limit - voucher.used_count - voucher.locked_count;
    if (remaining <= 0) return { ok: false, msg: "Mã voucher đã hết lượt sử dụng" };

    const cond = voucher.conditions || {};
    if (cond.minOrderValue && orderTotal < cond.minOrderValue) {
        return { ok: false, msg: `Đơn hàng tối thiểu ${Number(cond.minOrderValue).toLocaleString("vi-VN")}đ để áp dụng mã này` };
    }
    return { ok: true };
}

export function calcVoucherDiscount(voucher, orderTotal) {
    const cond = voucher.conditions || {};
    if (voucher.discount_type === "PERCENTAGE") {
        let discount = (orderTotal * (cond.percent || 0)) / 100;
        if (cond.maxDiscount) discount = Math.min(discount, cond.maxDiscount);
        return Math.round(discount);
    }
    // FIXED_AMOUNT
    return Math.min(cond.amount || 0, orderTotal);
}

export async function lockVoucher(VoucherModel, voucherId) {
    await VoucherModel.findByIdAndUpdate(voucherId, { $inc: { locked_count: 1 } });
}

export async function releaseVoucher(VoucherModel, voucherId) {
    await VoucherModel.findByIdAndUpdate(voucherId, { $inc: { locked_count: -1 } });
}

export async function commitVoucher(VoucherModel, voucherId) {
    await VoucherModel.findByIdAndUpdate(voucherId, { $inc: { locked_count: -1, used_count: 1 } });
}

// ─── Serialize cho AdminVouchers.jsx (giữ đúng tên field cũ: type/value/... ─
export function serializeVoucher(v) {
    const o = typeof v.toObject === "function" ? v.toObject() : v;
    const cond = o.conditions || {};
    return {
        _id: o._id,
        code: o.code,
        description: o.description || "",
        type: o.discount_type === "PERCENTAGE" ? "percent" : "fixed",
        value: o.discount_type === "PERCENTAGE" ? (cond.percent ?? 0) : (cond.amount ?? 0),
        minOrderValue: cond.minOrderValue ?? 0,
        maxDiscount: cond.maxDiscount ?? null,
        usageLimit: o.usage_limit,
        usedCount: o.used_count,
        lockedCount: o.locked_count,
        startDate: o.start_date,
        endDate: o.expiry_date,
        isActive: o.is_active !== false,
        createdAt: o.created_at,
    };
}