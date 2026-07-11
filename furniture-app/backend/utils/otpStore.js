// ─── OTP store cho luồng quên mật khẩu ───────────────────────────────────────
// Model User mới (theo tài liệu schema 12 collections) KHÔNG có các field
// resetOTP/resetOTPExpires/resetOTPVerified như bản cũ. Vì OTP vốn là dữ liệu
// phiên tạm thời (ephemeral), không phải dữ liệu nghiệp vụ cần lưu vĩnh viễn,
// nên thay vì thêm field vào User (đổi schema đã được duyệt), ta giữ nó ở đây
// dưới dạng Map trong bộ nhớ tiến trình.
//
// LƯU Ý QUAN TRỌNG khi lên production nhiều instance (PM2 cluster / nhiều
// server đứng sau load balancer): Map này KHÔNG được chia sẻ giữa các tiến
// trình — OTP gửi ở instance A có thể verify thất bại nếu request verify rơi
// vào instance B. Nếu cần chạy multi-instance, hãy thay bằng Redis (TTL tự
// nhiên khớp với thời gian hết hạn OTP) thay vì Map này.
const store = new Map(); // email -> { otp, expires, verified }

const OTP_TTL_MS = 10 * 60 * 1000; // 10 phút

export function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + OTP_TTL_MS;
    return { otp, expires };
}

export function saveOTP(email, otp, expires) {
    store.set(email.toLowerCase(), { otp, expires, verified: false });
}

export function isOTPValid(email, otp) {
    const rec = store.get(email.toLowerCase());
    if (!rec) return false;
    if (Date.now() > rec.expires) return false;
    return rec.otp === otp;
}

export function markOTPVerified(email) {
    const rec = store.get(email.toLowerCase());
    if (rec) rec.verified = true;
}

export function isOTPVerified(email) {
    const rec = store.get(email.toLowerCase());
    return !!rec?.verified;
}

export function clearOTP(email) {
    store.delete(email.toLowerCase());
}