const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

// Best-effort email send — never throws. Callers should not depend on
// delivery to complete their own request/response cycle (e.g. saving a
// contact inquiry must succeed even if SMTP isn't configured yet).
async function sendMail({ to, subject, html, attachments }) {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    console.log(`[mailer] SMTP not configured — skipping email to ${to} ("${subject}")`);
    return { skipped: true };
  }
  try {
    await activeTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    });
    return { skipped: false };
  } catch (err) {
    console.error("[mailer] Failed to send email:", err.message);
    return { skipped: true, error: err.message };
  }
}

module.exports = { sendMail };
