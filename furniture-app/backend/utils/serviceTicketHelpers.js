// ─── Helper dùng chung cho cleaning.js / tradein.js ───────────────────────────
// Cả 2 route giờ cùng thao tác trên model ServiceTicket (lọc theo `type`),
// thay cho CleaningRequest/TradeInRequest riêng biệt trước đây — vì init-db.js
// chỉ khởi tạo 12 collection chính thức, không có 2 cái đó.
//
// ServiceTicket không có các field structured mà CleaningRequest/TradeInRequest
// cũ có (address, phone, notes, productName, category, condition, description,
// contactPhone, contactAddress...) — chỉ có `error_description` (String tự do).
// Để KHÔNG phải sửa CleaningServicePage.jsx/TradeInPage.jsx/AdminCleaning.jsx/
// AdminTradeIn.jsx (vốn đọc các field này trực tiếp: r.address, r.productName...),
// ta lưu TOÀN BỘ các field đó dưới dạng 1 JSON string trong error_description,
// rồi giải mã lại thành các field riêng lẻ khi trả response (unpackMeta()).
// error_description vẫn đúng kiểu String theo schema — chỉ là nội dung có cấu
// trúc bên trong thay vì văn xuôi tự do.

export function packMeta(obj) {
    return JSON.stringify(obj || {});
}

export function unpackMeta(str) {
    try {
        const parsed = JSON.parse(str);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export function genVoucherCode(prefix = "TRADEIN") {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = `${prefix}-`;
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

export function pushLog(ticket, status, note) {
    ticket.status = status;
    ticket.log.push({ status, note: note || "", changed_at: new Date() });
}