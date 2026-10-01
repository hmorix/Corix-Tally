// SMTP mailer using nodemailer.
// Reads config from env vars at startup — no config needed in code.
// If SMTP_HOST is not set, every send() call is a no-op (silent skip),
// so the server works in dev/test without any mail config.
import nodemailer from "nodemailer";

const APP_URL = process.env.APP_URL || "https://corix-tally.vercel.app";

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_HOST) return null;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) !== 587, // 465 = SSL, 587 = STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

async function send({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — skipping email to ${to}: "${subject}"`);
    return;
  }
  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "Corix Tally"}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

// ─── Email templates ────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ to, fullName }) {
  const name = fullName || to;
  await send({
    to,
    subject: "Welcome to Corix Tally 🎉",
    text: `Hi ${name},\n\nWelcome to Corix Tally! Your account is ready.\n\nOpen the app: ${APP_URL}\n\nThanks,\nThe HMorix Team`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#EDE7D6;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#1F2A24;padding:24px 32px;">
            <h1 style="margin:0;color:#C5A852;font-size:22px;letter-spacing:-0.5px;">Corix Tally</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;color:#1F2A24;">Welcome aboard, ${name}! 🎉</h2>
            <p style="color:#444;line-height:1.6;">Your Corix Tally account has been created and is ready to use.</p>
            <p style="color:#444;line-height:1.6;">Start tracking your ledgers, vouchers, GST reports, and more — all in one place.</p>
            <a href="${APP_URL}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#1F2A24;color:#C5A852;text-decoration:none;border-radius:4px;font-weight:600;">Open Corix Tally →</a>
            <p style="color:#888;font-size:13px;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">
              You're receiving this because you signed up at <a href="${APP_URL}" style="color:#1F2A24;">${APP_URL}</a>.<br/>
              Powered by HMorix
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendPasswordResetEmail({ to, resetToken }) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  await send({
    to,
    subject: "Reset your Corix Tally password",
    text: `You requested a password reset.\n\nClick the link below (valid 30 minutes):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nThanks,\nThe HMorix Team`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#EDE7D6;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#1F2A24;padding:24px 32px;">
            <h1 style="margin:0;color:#C5A852;font-size:22px;letter-spacing:-0.5px;">Corix Tally</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;color:#1F2A24;">Password Reset Request</h2>
            <p style="color:#444;line-height:1.6;">We received a request to reset the password for your Corix Tally account.</p>
            <p style="color:#444;line-height:1.6;">Click the button below to set a new password. This link expires in <strong>30 minutes</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#1F2A24;color:#C5A852;text-decoration:none;border-radius:4px;font-weight:600;">Reset Password →</a>
            <p style="color:#888;font-size:13px;">Or copy this link:<br/><a href="${resetUrl}" style="color:#1F2A24;word-break:break-all;">${resetUrl}</a></p>
            <p style="color:#888;font-size:13px;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">
              If you didn't request this, you can safely ignore this email — your password won't change.<br/>
              Powered by HMorix
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
