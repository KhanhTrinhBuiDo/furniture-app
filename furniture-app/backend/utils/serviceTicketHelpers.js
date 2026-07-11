// ─── Helper dùng chung cho cleaning.js / tradein.js ───────────────────────────
// Cả 2 route giờ cùng thao tác trên model ServiceTicket (lọc theo `type`),
// thay cho CleaningRequest/TradeInRequest riêng biệt trước đây — vì init-db.js
// chỉ khởi tạo 12 collection chính thức, không có 2 cái đó.

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