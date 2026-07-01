import nodemailer from "nodemailer";

// ─── Kiểm tra cấu hình email ──────────────────────────────────────────────────
function isEmailConfigured() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

// ─── Transporter ──────────────────────────────────────────────────────────────
function createTransporter() {
  if (process.env.EMAIL_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ─── Gửi OTP ─────────────────────────────────────────────────────────────────
export async function sendOTPEmail(toEmail, otp) {
  // Nếu chưa cấu hình email → log ra console thay vì crash
  if (!isEmailConfigured()) {
    console.log(`\n📧 [DEV MODE] OTP cho ${toEmail}: ${otp}`);
    console.log("   Để gửi email thật, thêm EMAIL_USER + EMAIL_PASS vào .env\n");
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Amore Home Support" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `[Amore Home] Mã OTP: ${otp}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
        <div style="background:#4A2C1A;padding:28px 32px">
          <h1 style="color:#FAF7F2;font-size:1.4rem;margin:0">Amore Home.</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#4A2C1A;font-size:1.1rem;margin:0 0 12px">Đặt lại mật khẩu</h2>
          <p style="color:#666;font-size:14px;line-height:1.7;margin:0 0 20px">
            Mã OTP của bạn là:
          </p>
          <div style="background:#F0E8DC;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px">
            <span style="font-size:2rem;font-weight:700;color:#4A2C1A;letter-spacing:0.3em;font-family:monospace">${otp}</span>
          </div>
          <p style="color:#999;font-size:12px;margin:0">Mã có hiệu lực trong <strong>10 phút</strong>.</p>
        </div>
        <div style="background:#F0E8DC;padding:16px 32px;font-size:11px;color:#bbb;text-align:center">
          © ${new Date().getFullYear()} Amore Home Furniture
        </div>
      </div>
    `,
  });
}

// ─── Gửi email chào mừng ──────────────────────────────────────────────────────
export async function sendWelcomeEmail(toEmail, fullName) {
  if (!isEmailConfigured()) {
    console.log(`\n📧 [DEV MODE] Welcome email cho ${toEmail} (${fullName}) — bỏ qua\n`);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Amore Home" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Chào mừng bạn đến với Amore Home! 🛋️",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <div style="background:#4A2C1A;padding:28px 32px">
          <h1 style="color:#FAF7F2;font-size:1.4rem;margin:0">Amore Home.</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#4A2C1A">Xin chào, ${fullName}! 👋</h2>
          <p style="color:#666;font-size:14px;line-height:1.7">
            Cảm ơn bạn đã đăng ký tài khoản tại <strong>Amore Home</strong>.
          </p>
          <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}"
            style="display:inline-block;background:#8B5E3C;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
            Khám phá ngay
          </a>
        </div>
      </div>
    `,
  });
}