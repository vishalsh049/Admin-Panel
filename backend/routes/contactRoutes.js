const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const StoreContactMessage = require("../models/StoreContactMessage");
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const { sendMail } = require("../utils/mailer");

const JWT_SECRET = process.env.JWT_SECRET || "please-set-JWT_SECRET";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["new", "read", "replied", "closed"];

const contactFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages sent. Please try again later." },
});

function getCustomerIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    return decoded.type === "customer" ? decoded.id : null;
  } catch {
    return null;
  }
}

// ─── POST /api/store/contact  (public – submit a contact inquiry) ─────────────
router.post("/", contactFormLimiter, async (req, res) => {
  try {
    const { name, email, phone, subject, message, website } = req.body;

    // Honeypot — real users never fill this hidden field.
    if (website) {
      return res.json({ message: "Message sent successfully." });
    }

    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedSubject = subject?.trim();
    const normalizedMessage = message?.trim();

    if (!normalizedName || !normalizedEmail || !normalizedSubject || !normalizedMessage) {
      return res.status(400).json({ message: "Name, email, subject, and message are required." });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (normalizedMessage.length < 10) {
      return res.status(400).json({ message: "Please provide a bit more detail in your message." });
    }

    const contactMessage = await StoreContactMessage.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: phone?.trim() || null,
      subject: normalizedSubject,
      message: normalizedMessage,
      customerId: getCustomerIdFromRequest(req),
      ipAddress: req.ip || null,
    });

    const notifyTo = process.env.CONTACT_NOTIFY_EMAIL || process.env.SMTP_FROM;
    if (notifyTo) {
      await sendMail({
        to: notifyTo,
        subject: `New Contact Inquiry: ${normalizedSubject}`,
        html: `<h2>New Contact Inquiry</h2>
<p><strong>Name:</strong> ${normalizedName}</p>
<p><strong>Email:</strong> ${normalizedEmail}</p>
<p><strong>Phone:</strong> ${contactMessage.phone || "—"}</p>
<p><strong>Subject:</strong> ${normalizedSubject}</p>
<p><strong>Message:</strong></p>
<p>${normalizedMessage.replace(/\n/g, "<br/>")}</p>`,
      });
    }

    await sendMail({
      to: normalizedEmail,
      subject: "We've received your message — Divya Darshnam",
      html: `<h2>Thank you for reaching out, ${normalizedName}!</h2>
<p>We've received your message and our team will get back to you shortly.</p>
<p><strong>Your message:</strong></p>
<p>${normalizedMessage.replace(/\n/g, "<br/>")}</p>
<p>— Team Divya Darshnam</p>`,
    });

    res.json({ message: "Message sent successfully.", id: contactMessage.id });
  } catch (error) {
    console.error("Contact submit error:", error.message);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ─── GET /api/store/contact/admin  (protected – list, search, filter, paginate) ──
router.get("/admin", adminAuth, requirePermission("contact_messages"), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { search, status } = req.query;

    const where = {};
    if (status && STATUSES.includes(status)) {
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await StoreContactMessage.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      offset: (page - 1) * limit,
      limit,
    });

    res.json({ success: true, data: rows, total: count });
  } catch (error) {
    console.error("Contact list error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── GET /api/store/contact/admin/:id  (protected – single message) ───────────
router.get("/admin/:id", adminAuth, requirePermission("contact_messages"), async (req, res) => {
  try {
    const contactMessage = await StoreContactMessage.findByPk(req.params.id);
    if (!contactMessage) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    res.json({ success: true, data: contactMessage });
  } catch (error) {
    console.error("Contact detail error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── PATCH /api/store/contact/admin/:id/status  (protected – update status) ───
router.patch("/admin/:id/status", adminAuth, requirePermission("contact_messages"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const contactMessage = await StoreContactMessage.findByPk(req.params.id);
    if (!contactMessage) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    contactMessage.status = status;
    await contactMessage.save();
    res.json({ success: true, data: contactMessage });
  } catch (error) {
    console.error("Contact status update error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── POST /api/store/contact/admin/:id/reply  (protected – reply to inquiry) ──
router.post("/admin/:id/reply", adminAuth, requirePermission("contact_messages"), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Reply message is required" });
    }
    const contactMessage = await StoreContactMessage.findByPk(req.params.id);
    if (!contactMessage) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    let repliedBy = "Admin";
    try {
      const admins = await sequelize.query("SELECT name, email FROM users WHERE id=?", {
        replacements: [req.adminId],
        type: QueryTypes.SELECT,
      });
      if (admins.length > 0) {
        repliedBy = admins[0].name || admins[0].email || "Admin";
      }
    } catch {
      // Fall back to "Admin" if the lookup fails — non-critical.
    }

    contactMessage.adminReply = message.trim();
    contactMessage.repliedAt = new Date();
    contactMessage.repliedBy = repliedBy;
    contactMessage.status = "replied";
    await contactMessage.save();

    await sendMail({
      to: contactMessage.email,
      subject: `Re: ${contactMessage.subject}`,
      html: `<h2>Reply from Divya Darshnam Support</h2>
<p>${message.trim().replace(/\n/g, "<br/>")}</p>
<hr/>
<p style="color:#888;font-size:12px;">In response to your message: "${contactMessage.message}"</p>`,
    });

    res.json({ success: true, data: contactMessage });
  } catch (error) {
    console.error("Contact reply error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── DELETE /api/store/contact/admin/:id  (protected) ─────────────────────────
router.delete("/admin/:id", adminAuth, requirePermission("contact_messages"), async (req, res) => {
  try {
    const deleted = await StoreContactMessage.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("Contact delete error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
