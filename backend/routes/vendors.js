const express = require("express");
const router = express.Router();
const sequelize = require("../config/db");
const { QueryTypes } = require("sequelize");
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");

router.use(adminAuth, requirePermission("vendors"));

const VENDOR_FIELDS = [
  "name", "company", "gstin", "pan", "gst_type", "phone", "email",
  "billing_address", "shipping_address", "city", "state", "pincode",
  "credit_days", "opening_balance", "rating", "notes", "status",
];

function pickVendorValues(body) {
  return {
    name: (body.name || "").trim(),
    company: body.company || null,
    gstin: (body.gstin || "").trim().toUpperCase() || null,
    pan: (body.pan || "").trim().toUpperCase() || null,
    gst_type: body.gst_type || "regular",
    phone: body.phone || null,
    email: body.email || null,
    billing_address: body.billing_address || null,
    shipping_address: body.shipping_address || null,
    city: body.city || null,
    state: body.state || null,
    pincode: body.pincode || null,
    credit_days: parseInt(body.credit_days, 10) || 0,
    opening_balance: parseFloat(body.opening_balance) || 0,
    rating: Math.min(5, Math.max(0, parseInt(body.rating, 10) || 0)),
    notes: body.notes || null,
    status: body.status === "inactive" ? "inactive" : "active",
  };
}

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function validateVendor(values) {
  if (!values.name) return "Vendor name is required";
  if (values.gstin && !GSTIN_RE.test(values.gstin)) return "Invalid GSTIN format";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return "Invalid email";
  return null;
}

// GET /api/vendors — list with outstanding balance + purchase stats.
// Outstanding = opening balance + billed (debit) - paid (credit).
router.get("/", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const where = search ? "WHERE (v.name LIKE :like OR v.company LIKE :like OR v.gstin LIKE :like OR v.phone LIKE :like)" : "";
    const vendors = await sequelize.query(
      `SELECT v.*,
        v.opening_balance + IFNULL(l.debit_sum, 0) - IFNULL(l.credit_sum, 0) AS outstanding,
        IFNULL(b.bill_count, 0) AS bill_count,
        IFNULL(b.total_purchase, 0) AS total_purchase,
        b.last_purchase_date
      FROM vendors v
      LEFT JOIN (
        SELECT vendor_id, SUM(debit) AS debit_sum, SUM(credit) AS credit_sum
        FROM vendor_ledger GROUP BY vendor_id
      ) l ON l.vendor_id = v.id
      LEFT JOIN (
        SELECT vendor_id, COUNT(*) AS bill_count, SUM(grand_total) AS total_purchase, MAX(purchase_date) AS last_purchase_date
        FROM purchase_bills WHERE status NOT IN ('cancelled', 'rejected') GROUP BY vendor_id
      ) b ON b.vendor_id = v.id
      ${where}
      ORDER BY v.name ASC`,
      { replacements: { like: `%${search}%` }, type: QueryTypes.SELECT }
    );
    res.json(vendors);
  } catch (error) {
    console.error("VENDORS LIST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vendors/:id — vendor + ledger + recent bills
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await sequelize.query("SELECT * FROM vendors WHERE id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    if (!rows.length) return res.status(404).json({ error: "Vendor not found" });

    const ledger = await sequelize.query(
      `SELECT * FROM vendor_ledger WHERE vendor_id = ? ORDER BY entry_date DESC, id DESC LIMIT 200`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    const bills = await sequelize.query(
      `SELECT id, bill_number, invoice_number, purchase_date, grand_total, paid_amount, balance_amount, status, payment_status
       FROM purchase_bills WHERE vendor_id = ? ORDER BY purchase_date DESC, id DESC LIMIT 50`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    const totals = await sequelize.query(
      `SELECT IFNULL(SUM(debit), 0) AS debit_sum, IFNULL(SUM(credit), 0) AS credit_sum FROM vendor_ledger WHERE vendor_id = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    const vendor = rows[0];
    vendor.outstanding =
      parseFloat(vendor.opening_balance) + parseFloat(totals[0].debit_sum) - parseFloat(totals[0].credit_sum);

    res.json({ vendor, ledger, bills });
  } catch (error) {
    console.error("VENDOR DETAIL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vendors
router.post("/", async (req, res) => {
  try {
    const values = pickVendorValues(req.body);
    const invalid = validateVendor(values);
    if (invalid) return res.status(400).json({ error: invalid });

    const [insertId] = await sequelize.query(
      `INSERT INTO vendors (${VENDOR_FIELDS.join(", ")})
       VALUES (${VENDOR_FIELDS.map((f) => `:${f}`).join(", ")})`,
      { replacements: values, type: QueryTypes.INSERT }
    );

    if (values.opening_balance !== 0) {
      await sequelize.query(
        `INSERT INTO vendor_ledger (vendor_id, entry_date, entry_type, narration, debit, credit, created_by)
         VALUES (?, CURDATE(), 'opening', 'Opening balance', 0, 0, ?)`,
        { replacements: [insertId, req.currentUser?.id || null] }
      );
    }

    const created = await sequelize.query("SELECT * FROM vendors WHERE id = ?", {
      replacements: [insertId], type: QueryTypes.SELECT,
    });
    res.status(201).json(created[0]);
  } catch (error) {
    console.error("VENDOR CREATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/vendors/:id
router.put("/:id", async (req, res) => {
  try {
    const values = pickVendorValues(req.body);
    const invalid = validateVendor(values);
    if (invalid) return res.status(400).json({ error: invalid });

    const [, meta] = await sequelize.query(
      `UPDATE vendors SET ${VENDOR_FIELDS.map((f) => `${f} = :${f}`).join(", ")} WHERE id = :id`,
      { replacements: { ...values, id: req.params.id } }
    );
    const updated = await sequelize.query("SELECT * FROM vendors WHERE id = ?", {
      replacements: [req.params.id], type: QueryTypes.SELECT,
    });
    if (!updated.length) return res.status(404).json({ error: "Vendor not found" });
    res.json(updated[0]);
  } catch (error) {
    console.error("VENDOR UPDATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/vendors/:id — blocked while purchase bills reference the vendor
router.delete("/:id", async (req, res) => {
  try {
    const bills = await sequelize.query(
      "SELECT COUNT(*) AS count FROM purchase_bills WHERE vendor_id = ?",
      { replacements: [req.params.id], type: QueryTypes.SELECT }
    );
    if (bills[0].count > 0) {
      return res.status(400).json({
        error: `Vendor has ${bills[0].count} purchase bill(s). Mark the vendor inactive instead of deleting.`,
      });
    }
    await sequelize.query("DELETE FROM vendors WHERE id = ?", { replacements: [req.params.id] });
    res.json({ success: true });
  } catch (error) {
    console.error("VENDOR DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
