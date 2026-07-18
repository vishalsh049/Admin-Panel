const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const sequelize = require("../config/db");
const { QueryTypes } = require("sequelize");
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const {
  r2,
  BILL_STATUSES,
  STOCK_STATUSES,
  computeBill,
  paymentStatusFor,
  nextBillNumber,
  logTimeline,
  applyStock,
  reverseStock,
  syncVendorLedgerDebit,
  amountInWords,
} = require("../utils/purchaseBillHelpers");

router.use(adminAuth, requirePermission("purchase_bills"));

// ---------------------------------------------------------------------------
// Attachment upload (invoice PDFs / images) → uploads/purchase-bills
// ---------------------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "purchase-bills");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => {
    const ok = /^(image\/(png|jpe?g|webp|gif)|application\/pdf)$/.test(file.mimetype);
    cb(ok ? null : new Error("Only images and PDF files are allowed"), ok);
  },
});

// ---------------------------------------------------------------------------
// Header field mapping (everything except computed totals)
// ---------------------------------------------------------------------------
function pickHeader(body) {
  return {
    vendor_id: body.vendor_id ? parseInt(body.vendor_id, 10) : null,
    vendor_name: String(body.vendor_name || "").trim(),
    vendor_gstin: (body.vendor_gstin || "").trim().toUpperCase() || null,
    vendor_phone: body.vendor_phone || null,
    vendor_email: body.vendor_email || null,
    vendor_state: body.vendor_state || null,
    billing_address: body.billing_address || null,
    shipping_address: body.shipping_address || null,
    invoice_number: (body.invoice_number || "").trim() || null,
    invoice_date: body.invoice_date || null,
    purchase_date: body.purchase_date || new Date().toISOString().slice(0, 10),
    due_date: body.due_date || null,
    warehouse: body.warehouse || "Main",
    reference_number: body.reference_number || null,
    purchase_order_ref: body.purchase_order_ref || null,
    currency: body.currency || "INR",
    exchange_rate: parseFloat(body.exchange_rate) || 1,
    payment_terms: body.payment_terms || null,
    gst_type: body.gst_type === "inter" ? "inter" : "intra",
    reverse_charge: body.reverse_charge ? 1 : 0,
    remarks: body.remarks || null,
    internal_notes: body.internal_notes || null,
  };
}

// When a vendor_id is supplied, fill any snapshot fields the client left
// blank from the vendors table (so the API works with just vendor_id).
async function hydrateVendorSnapshot(header, transaction) {
  if (!header.vendor_id) return header;
  const rows = await sequelize.query("SELECT * FROM vendors WHERE id = ?", {
    replacements: [header.vendor_id], type: QueryTypes.SELECT, transaction,
  });
  if (!rows.length) {
    header.vendor_id = null;
    return header;
  }
  const v = rows[0];
  header.vendor_name = header.vendor_name || v.name;
  header.vendor_gstin = header.vendor_gstin || (v.gstin || null);
  header.vendor_phone = header.vendor_phone || v.phone;
  header.vendor_email = header.vendor_email || v.email;
  header.vendor_state = header.vendor_state || v.state;
  header.billing_address = header.billing_address || v.billing_address;
  header.shipping_address = header.shipping_address || v.shipping_address;
  return header;
}

function validateBill(header, computed) {
  if (!header.vendor_name) return "Vendor is required";
  if (!header.purchase_date) return "Purchase date is required";
  if (!computed.items.length) return "At least one item with a name and quantity is required";
  if (header.vendor_gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(header.vendor_gstin)) {
    return "Invalid vendor GSTIN format";
  }
  for (const it of computed.items) {
    if (it.purchase_price < 0 || it.quantity <= 0) return `Invalid quantity/price for "${it.product_name}"`;
  }
  return null;
}

const ITEM_COLS = [
  "bill_id", "product_id", "product_name", "sku", "hsn", "description", "batch_number",
  "expiry_date", "unit", "quantity", "free_quantity", "purchase_price", "mrp", "selling_price",
  "discount_percent", "discount_amount", "gst_percent", "gst_amount", "cess_percent",
  "cess_amount", "taxable_amount", "total",
];

async function insertItems(billId, items, transaction) {
  for (const it of items) {
    await sequelize.query(
      `INSERT INTO purchase_bill_items (${ITEM_COLS.join(", ")})
       VALUES (${ITEM_COLS.map(() => "?").join(", ")})`,
      {
        replacements: [
          billId, it.product_id, it.product_name, it.sku, it.hsn, it.description,
          it.batch_number, it.expiry_date, it.unit, it.quantity, it.free_quantity,
          it.purchase_price, it.mrp, it.selling_price, it.discount_percent, it.discount_amount,
          it.gst_percent, it.gst_amount, it.cess_percent, it.cess_amount, it.taxable_amount, it.total,
        ],
        transaction,
      }
    );
  }
}

async function getBillRow(id, transaction) {
  const rows = await sequelize.query("SELECT * FROM purchase_bills WHERE id = ?", {
    replacements: [id], type: QueryTypes.SELECT, transaction,
  });
  return rows[0] || null;
}

async function getBillItems(id, transaction) {
  return sequelize.query("SELECT * FROM purchase_bill_items WHERE bill_id = ? ORDER BY id ASC", {
    replacements: [id], type: QueryTypes.SELECT, transaction,
  });
}

// Shared WHERE builder for list + export (all values parameterised).
function buildListFilters(query) {
  const where = [];
  const params = {};
  const add = (clause, key, value) => { where.push(clause); params[key] = value; };

  if (query.search) add(
    "(b.bill_number LIKE :search OR b.invoice_number LIKE :search OR b.vendor_name LIKE :search OR b.reference_number LIKE :search)",
    "search", `%${query.search.trim()}%`
  );
  if (query.vendor_id) add("b.vendor_id = :vendor_id", "vendor_id", parseInt(query.vendor_id, 10));
  if (query.status && BILL_STATUSES.includes(query.status)) add("b.status = :status", "status", query.status);
  if (["unpaid", "partial", "paid"].includes(query.payment_status)) {
    add("b.payment_status = :payment_status", "payment_status", query.payment_status);
  }
  if (query.warehouse) add("b.warehouse = :warehouse", "warehouse", query.warehouse);
  if (query.gst_type) add("b.gst_type = :gst_type", "gst_type", query.gst_type);
  if (query.created_by) add("b.created_by = :created_by", "created_by", parseInt(query.created_by, 10));
  if (query.date_from) add("b.purchase_date >= :date_from", "date_from", query.date_from);
  if (query.date_to) add("b.purchase_date <= :date_to", "date_to", query.date_to);
  if (query.due_from) add("b.due_date >= :due_from", "due_from", query.due_from);
  if (query.due_to) add("b.due_date <= :due_to", "due_to", query.due_to);
  if (query.overdue === "1") {
    where.push("b.due_date IS NOT NULL AND b.due_date < CURDATE() AND b.balance_amount > 0 AND b.status NOT IN ('cancelled','rejected','draft')");
  }
  return { whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

const SORTABLE = {
  bill_number: "b.bill_number", vendor_name: "b.vendor_name", purchase_date: "b.purchase_date",
  due_date: "b.due_date", grand_total: "b.grand_total", balance_amount: "b.balance_amount",
  status: "b.status", payment_status: "b.payment_status", created_at: "b.created_at",
  updated_at: "b.updated_at", id: "b.id",
};

// ---------------------------------------------------------------------------
// GET /api/purchase-bills/dashboard — KPI cards + chart series
// ---------------------------------------------------------------------------
router.get("/dashboard", async (req, res) => {
  try {
    const active = "status NOT IN ('cancelled','rejected')";
    const [kpis] = await sequelize.query(
      `SELECT
        IFNULL(SUM(grand_total), 0) AS total_purchase,
        COUNT(*) AS total_bills,
        IFNULL(SUM(CASE WHEN purchase_date = CURDATE() THEN grand_total END), 0) AS today_purchase,
        SUM(purchase_date = CURDATE()) AS today_bills,
        IFNULL(SUM(CASE WHEN purchase_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN grand_total END), 0) AS month_purchase,
        SUM(purchase_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS month_bills,
        IFNULL(SUM(CASE WHEN purchase_date >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
                         AND purchase_date < DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN grand_total END), 0) AS prev_month_purchase,
        SUM(payment_status != 'paid') AS pending_bills,
        IFNULL(SUM(CASE WHEN payment_status != 'paid' THEN balance_amount END), 0) AS pending_amount,
        SUM(payment_status = 'paid') AS paid_bills,
        IFNULL(SUM(CASE WHEN payment_status = 'paid' THEN grand_total END), 0) AS paid_amount,
        SUM(due_date IS NOT NULL AND due_date < CURDATE() AND balance_amount > 0) AS overdue_bills,
        IFNULL(SUM(CASE WHEN due_date IS NOT NULL AND due_date < CURDATE() AND balance_amount > 0 THEN balance_amount END), 0) AS overdue_amount,
        IFNULL(SUM(cgst + sgst + igst + cess), 0) AS gst_input_credit,
        IFNULL(SUM(CASE WHEN purchase_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN cgst + sgst + igst + cess END), 0) AS month_gst,
        IFNULL(AVG(grand_total), 0) AS avg_purchase_value
      FROM purchase_bills WHERE ${active}`,
      { type: QueryTypes.SELECT }
    );

    const [vendorCount] = await sequelize.query(
      "SELECT COUNT(*) AS total_vendors FROM vendors WHERE status = 'active'",
      { type: QueryTypes.SELECT }
    );

    const monthly = await sequelize.query(
      `SELECT DATE_FORMAT(purchase_date, '%Y-%m') AS ym,
              IFNULL(SUM(grand_total), 0) AS total,
              IFNULL(SUM(cgst + sgst + igst + cess), 0) AS gst,
              COUNT(*) AS bills
       FROM purchase_bills
       WHERE ${active} AND purchase_date >= DATE_FORMAT(CURDATE() - INTERVAL 11 MONTH, '%Y-%m-01')
       GROUP BY ym ORDER BY ym ASC`,
      { type: QueryTypes.SELECT }
    );

    const topVendors = await sequelize.query(
      `SELECT vendor_name, IFNULL(SUM(grand_total), 0) AS total, COUNT(*) AS bills
       FROM purchase_bills WHERE ${active} AND vendor_name != ''
       GROUP BY vendor_name ORDER BY total DESC LIMIT 6`,
      { type: QueryTypes.SELECT }
    );

    const statusSplit = await sequelize.query(
      `SELECT status, COUNT(*) AS count, IFNULL(SUM(grand_total), 0) AS total
       FROM purchase_bills GROUP BY status`,
      { type: QueryTypes.SELECT }
    );

    const paymentSplit = await sequelize.query(
      `SELECT payment_status, COUNT(*) AS count, IFNULL(SUM(grand_total), 0) AS total
       FROM purchase_bills WHERE ${active} GROUP BY payment_status`,
      { type: QueryTypes.SELECT }
    );

    res.json({
      kpis: { ...kpis, total_vendors: vendorCount.total_vendors },
      monthly,
      topVendors,
      statusSplit,
      paymentSplit,
    });
  } catch (error) {
    console.error("PURCHASE DASHBOARD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/purchase-bills/next-number
router.get("/next-number", async (req, res) => {
  try {
    res.json({ bill_number: await nextBillNumber() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/purchase-bills/meta — distinct filter values
router.get("/meta", async (req, res) => {
  try {
    const warehouses = await sequelize.query(
      "SELECT DISTINCT warehouse FROM purchase_bills WHERE warehouse != '' ORDER BY warehouse",
      { type: QueryTypes.SELECT }
    );
    const creators = await sequelize.query(
      "SELECT DISTINCT created_by AS id, created_by_name AS name FROM purchase_bills WHERE created_by IS NOT NULL ORDER BY name",
      { type: QueryTypes.SELECT }
    );
    res.json({ warehouses: warehouses.map((w) => w.warehouse), creators });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/purchase-bills/export — CSV respecting the same filters as the list
router.get("/export", async (req, res) => {
  try {
    const { whereSql, params } = buildListFilters(req.query);
    const bills = await sequelize.query(
      `SELECT b.* FROM purchase_bills b ${whereSql} ORDER BY b.purchase_date DESC, b.id DESC LIMIT 5000`,
      { replacements: params, type: QueryTypes.SELECT }
    );

    const cols = [
      "bill_number", "vendor_name", "vendor_gstin", "invoice_number", "invoice_date",
      "purchase_date", "due_date", "warehouse", "items_count", "subtotal", "item_discount",
      "bill_discount", "taxable_amount", "cgst", "sgst", "igst", "cess", "shipping_charges",
      "round_off", "grand_total", "paid_amount", "balance_amount", "status", "payment_status",
      "created_by_name", "created_at",
    ];
    const esc = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(","), ...bills.map((b) => cols.map((c) => esc(b[c])).join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=purchase-bills-${Date.now()}.csv`);
    res.send("﻿" + csv);
  } catch (error) {
    console.error("PURCHASE EXPORT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/purchase-bills/pdf/:id — premium A4 purchase bill via pdfkit
// ---------------------------------------------------------------------------
router.get("/pdf/:id", async (req, res) => {
  try {
    const bill = await getBillRow(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    const items = await getBillItems(bill.id);

    let company = { name: "Divya Darshnam", address: "", gstin: "", phone: "", email: "" };
    try {
      const [settings] = await sequelize.query(
        "SELECT site_name, contact_email, contact_phone, contact_address FROM site_settings WHERE id = 1",
        { type: QueryTypes.SELECT }
      );
      if (settings) {
        company = {
          name: settings.site_name || company.name,
          address: settings.contact_address || "",
          gstin: "",
          phone: settings.contact_phone || "",
          email: settings.contact_email || "",
        };
      }
    } catch { /* site_settings optional — fall back to defaults */ }

    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${bill.bill_number}.pdf`);
    doc.pipe(res);

    const W = doc.page.width - 80;
    const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const fdate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

    // Header band
    doc.rect(0, 0, doc.page.width, 110).fill("#1e1b4b");
    doc.fill("#ffffff").font("Helvetica-Bold").fontSize(20).text(company.name, 40, 30);
    doc.font("Helvetica").fontSize(9).fill("#c7d2fe");
    if (company.address) doc.text(company.address, 40, 56, { width: 300 });
    const contactBits = [company.gstin && `GSTIN: ${company.gstin}`, company.phone, company.email].filter(Boolean).join("  |  ");
    if (contactBits) doc.text(contactBits, 40, company.address ? doc.y + 2 : 56, { width: 320 });
    doc.font("Helvetica-Bold").fontSize(16).fill("#ffffff").text("PURCHASE BILL", 340, 34, { width: W - 300, align: "right" });
    doc.font("Helvetica").fontSize(10).fill("#c7d2fe")
      .text(bill.bill_number, 340, 58, { width: W - 300, align: "right" })
      .text(`Status: ${String(bill.status).toUpperCase()}  |  ${String(bill.payment_status).toUpperCase()}`, 340, 72, { width: W - 300, align: "right" });

    // Vendor / bill info panels
    let y = 130;
    doc.roundedRect(40, y, W / 2 - 10, 110, 6).fill("#f5f3ff");
    doc.roundedRect(40 + W / 2 + 10, y, W / 2 - 10, 110, 6).fill("#f8fafc");
    doc.fill("#6d28d9").font("Helvetica-Bold").fontSize(8).text("VENDOR", 52, y + 10);
    doc.fill("#0f172a").font("Helvetica-Bold").fontSize(11).text(bill.vendor_name || "—", 52, y + 22, { width: W / 2 - 34 });
    doc.font("Helvetica").fontSize(8.5).fill("#334155");
    let vy = doc.y + 2;
    for (const line of [
      bill.billing_address, bill.vendor_gstin && `GSTIN: ${bill.vendor_gstin}`,
      [bill.vendor_phone, bill.vendor_email].filter(Boolean).join("  |  "), bill.vendor_state && `State: ${bill.vendor_state}`,
    ].filter(Boolean)) {
      doc.text(line, 52, vy, { width: W / 2 - 34 }); vy = doc.y + 2;
      if (vy > y + 100) break;
    }
    const rx = 52 + W / 2 + 10;
    doc.fill("#475569").font("Helvetica-Bold").fontSize(8).text("BILL DETAILS", rx, y + 10);
    doc.font("Helvetica").fontSize(8.5).fill("#334155");
    const details = [
      ["Invoice No", bill.invoice_number || "—"], ["Invoice Date", fdate(bill.invoice_date)],
      ["Purchase Date", fdate(bill.purchase_date)], ["Due Date", fdate(bill.due_date)],
      ["Warehouse", bill.warehouse || "Main"], ["GST Type", bill.gst_type === "inter" ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"],
    ];
    details.forEach(([k, v], i) => {
      const dy = y + 24 + i * 13;
      doc.font("Helvetica").fill("#64748b").text(k, rx, dy, { width: 90 });
      doc.font("Helvetica-Bold").fill("#0f172a").text(String(v), rx + 92, dy, { width: W / 2 - 130 });
    });

    // Items table
    y = 260;
    const cols = [
      { key: "idx", label: "#", w: 22, align: "left" },
      { key: "product_name", label: "ITEM", w: 150, align: "left" },
      { key: "hsn", label: "HSN", w: 45, align: "left" },
      { key: "quantity", label: "QTY", w: 45, align: "right" },
      { key: "purchase_price", label: "RATE", w: 60, align: "right" },
      { key: "discount_amount", label: "DISC", w: 50, align: "right" },
      { key: "gst", label: "GST", w: 60, align: "right" },
      { key: "total", label: "AMOUNT", w: 83, align: "right" },
    ];
    const drawHead = () => {
      doc.rect(40, y, W, 20).fill("#312e81");
      let x = 46;
      doc.font("Helvetica-Bold").fontSize(7.5).fill("#ffffff");
      for (const c of cols) { doc.text(c.label, x, y + 6, { width: c.w - 8, align: c.align }); x += c.w; }
      y += 20;
    };
    drawHead();
    doc.font("Helvetica").fontSize(8.5);
    items.forEach((it, i) => {
      if (y > 700) { doc.addPage(); y = 50; drawHead(); doc.font("Helvetica").fontSize(8.5); }
      if (i % 2) { doc.rect(40, y, W, 18).fill("#f8fafc"); }
      let x = 46;
      const rowVals = {
        idx: String(i + 1),
        product_name: it.product_name + (it.batch_number ? `  (B:${it.batch_number})` : ""),
        hsn: it.hsn || "—",
        quantity: `${Number(it.quantity)}${Number(it.free_quantity) ? `+${Number(it.free_quantity)}` : ""} ${it.unit}`,
        purchase_price: money(it.purchase_price),
        discount_amount: Number(it.discount_amount) ? money(it.discount_amount) : "—",
        gst: `${money(it.gst_amount)} (${Number(it.gst_percent)}%)`,
        total: money(it.total),
      };
      doc.fill("#1e293b");
      for (const c of cols) { doc.text(rowVals[c.key], x, y + 5, { width: c.w - 8, align: c.align, lineBreak: false }); x += c.w; }
      y += 18;
    });
    doc.moveTo(40, y).lineTo(40 + W, y).strokeColor("#e2e8f0").stroke();

    // Totals
    y += 12;
    if (y > 620) { doc.addPage(); y = 50; }
    const totals = [
      ["Subtotal", money(bill.subtotal)],
      Number(bill.item_discount) ? ["Item Discount", `- ${money(bill.item_discount)}`] : null,
      Number(bill.bill_discount) ? ["Bill Discount", `- ${money(bill.bill_discount)}`] : null,
      ["Taxable Amount", money(bill.taxable_amount)],
      Number(bill.cgst) ? ["CGST", money(bill.cgst)] : null,
      Number(bill.sgst) ? ["SGST", money(bill.sgst)] : null,
      Number(bill.igst) ? ["IGST", money(bill.igst)] : null,
      Number(bill.cess) ? ["CESS", money(bill.cess)] : null,
      Number(bill.shipping_charges) ? ["Shipping", money(bill.shipping_charges)] : null,
      Number(bill.packing_charges) ? ["Packing", money(bill.packing_charges)] : null,
      Number(bill.other_charges) ? ["Other Charges", money(bill.other_charges)] : null,
      Number(bill.tds_amount) ? ["TDS", `- ${money(bill.tds_amount)}`] : null,
      ["Round Off", money(bill.round_off)],
    ].filter(Boolean);
    const tx = 40 + W - 220;
    totals.forEach(([k, v]) => {
      doc.font("Helvetica").fontSize(8.5).fill("#64748b").text(k, tx, y, { width: 110 });
      doc.font("Helvetica-Bold").fill("#0f172a").text(v, tx + 110, y, { width: 110, align: "right" });
      y += 14;
    });
    doc.rect(tx - 8, y + 2, 228, 24).fill("#1e1b4b");
    doc.font("Helvetica-Bold").fontSize(10).fill("#ffffff")
      .text("GRAND TOTAL", tx, y + 9, { width: 110 })
      .text(money(bill.grand_total), tx + 100, y + 9, { width: 120, align: "right" });
    y += 34;
    doc.font("Helvetica").fontSize(8.5).fill("#475569")
      .text(`Paid: ${money(bill.paid_amount)}    Balance: ${money(bill.balance_amount)}`, tx - 8, y, { width: 228, align: "right" });

    // Amount in words + footer
    doc.font("Helvetica-Bold").fontSize(8).fill("#6d28d9").text("AMOUNT IN WORDS", 40, y - 34);
    doc.font("Helvetica").fontSize(9).fill("#0f172a").text(amountInWords(bill.grand_total), 40, y - 22, { width: W - 260 });
    if (bill.remarks) {
      doc.font("Helvetica-Bold").fontSize(8).fill("#6d28d9").text("REMARKS", 40, doc.y + 10);
      doc.font("Helvetica").fontSize(8.5).fill("#334155").text(bill.remarks, 40, doc.y + 2, { width: W - 260 });
    }
    const fy = Math.max(doc.y + 40, 730);
    doc.moveTo(40, fy).lineTo(40 + W, fy).strokeColor("#e2e8f0").stroke();
    doc.font("Helvetica").fontSize(8).fill("#94a3b8")
      .text("This is a computer generated purchase bill.", 40, fy + 8)
      .text(`For ${company.name} — Authorised Signatory`, 40, fy + 8, { width: W, align: "right" });

    doc.end();

    await logTimeline(bill.id, "downloaded", `PDF generated for ${bill.bill_number}`, req.currentUser).catch(() => {});
  } catch (error) {
    console.error("PURCHASE PDF ERROR:", error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/purchase-bills — filtered, sorted, paginated list
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const sortCol = SORTABLE[req.query.sort_by] || "b.id";
    const sortDir = req.query.sort_dir === "asc" ? "ASC" : "DESC";
    const { whereSql, params } = buildListFilters(req.query);

    const bills = await sequelize.query(
      `SELECT b.* FROM purchase_bills b ${whereSql}
       ORDER BY ${sortCol} ${sortDir}, b.id DESC LIMIT :limit OFFSET :offset`,
      { replacements: { ...params, limit, offset: (page - 1) * limit }, type: QueryTypes.SELECT }
    );
    const [agg] = await sequelize.query(
      `SELECT COUNT(*) AS total,
              IFNULL(SUM(b.grand_total), 0) AS sum_total,
              IFNULL(SUM(b.paid_amount), 0) AS sum_paid,
              IFNULL(SUM(b.balance_amount), 0) AS sum_balance
       FROM purchase_bills b ${whereSql}`,
      { replacements: params, type: QueryTypes.SELECT }
    );

    res.json({
      bills,
      totals: { grand_total: agg.sum_total, paid: agg.sum_paid, balance: agg.sum_balance },
      pagination: {
        page, limit,
        total: Number(agg.total),
        totalPages: Math.max(1, Math.ceil(Number(agg.total) / limit)),
      },
    });
  } catch (error) {
    console.error("PURCHASE BILLS LIST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/purchase-bills — create (transactional)
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  let t;
  try {
    const header = await hydrateVendorSnapshot(pickHeader(req.body));
    const computed = computeBill(req.body);
    const invalid = validateBill(header, computed);
    if (invalid) return res.status(400).json({ error: invalid });

    let status = BILL_STATUSES.includes(req.body.status) ? req.body.status : "draft";
    const user = req.currentUser;
    const isAdmin = String(user.role || "").toLowerCase() === "admin";
    if (STOCK_STATUSES.includes(status) && !isAdmin) status = "pending"; // only admins approve

    t = await sequelize.transaction();
    const bill_number = (req.body.bill_number || "").trim() || (await nextBillNumber(t));

    const fields = {
      bill_number, ...header, ...computed.totals,
      paid_amount: 0, balance_amount: computed.totals.grand_total,
      status, payment_status: "unpaid",
      stock_applied: 0,
      created_by: user.id, created_by_name: user.name || user.email,
      updated_by: user.id, updated_by_name: user.name || user.email,
      approved_by: null, approved_by_name: null, approved_at: null,
    };
    if (STOCK_STATUSES.includes(status)) {
      fields.approved_by = user.id;
      fields.approved_by_name = user.name || user.email;
      fields.approved_at = new Date();
    }

    const keys = Object.keys(fields);
    const [insertId] = await sequelize.query(
      `INSERT INTO purchase_bills (${keys.join(", ")}) VALUES (${keys.map((k) => `:${k}`).join(", ")})`,
      { replacements: fields, type: QueryTypes.INSERT, transaction: t }
    );

    await insertItems(insertId, computed.items, t);
    const billRef = { id: insertId, bill_number, vendor_id: header.vendor_id, purchase_date: header.purchase_date, warehouse: header.warehouse, grand_total: computed.totals.grand_total };

    if (STOCK_STATUSES.includes(status)) {
      await applyStock(billRef, computed.items, user, t);
      await sequelize.query("UPDATE purchase_bills SET stock_applied = 1 WHERE id = ?", { replacements: [insertId], transaction: t });
      await syncVendorLedgerDebit(billRef, true, user, t);
    }

    await logTimeline(insertId, "created", `Bill ${bill_number} created (${status})`, user, t);
    if (STOCK_STATUSES.includes(status)) await logTimeline(insertId, "approved", "Auto-approved on creation by admin", user, t);

    // Optional initial payment recorded alongside creation
    const initialPayment = parseFloat(req.body.payment?.amount) || 0;
    if (initialPayment > 0) {
      const pay = req.body.payment;
      const amount = Math.min(r2(initialPayment), computed.totals.grand_total);
      const [payId] = await sequelize.query(
        `INSERT INTO purchase_payments (bill_id, vendor_id, payment_date, amount, mode, transaction_number, reference_number, bank_name, notes, created_by, created_by_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            insertId, header.vendor_id, pay.payment_date || header.purchase_date, amount,
            pay.mode || "cash", pay.transaction_number || null, pay.reference_number || null,
            pay.bank_name || null, pay.notes || null, user.id, user.name || user.email,
          ],
          type: QueryTypes.INSERT, transaction: t,
        }
      );
      await sequelize.query(
        `UPDATE purchase_bills SET paid_amount = ?, balance_amount = ?, payment_status = ? WHERE id = ?`,
        {
          replacements: [amount, r2(computed.totals.grand_total - amount), paymentStatusFor(computed.totals.grand_total, amount), insertId],
          transaction: t,
        }
      );
      if (header.vendor_id) {
        await sequelize.query(
          `INSERT INTO vendor_ledger (vendor_id, bill_id, payment_id, entry_date, entry_type, narration, debit, credit, created_by)
           VALUES (?, ?, ?, ?, 'payment', ?, 0, ?, ?)`,
          {
            replacements: [header.vendor_id, insertId, payId, pay.payment_date || header.purchase_date, `Payment for ${bill_number}`, amount, user.id],
            transaction: t,
          }
        );
      }
      await logTimeline(insertId, "payment", `Payment of ₹${amount} (${pay.mode || "cash"}) recorded`, user, t);
    }

    await t.commit();
    const created = await getBillRow(insertId);
    res.status(201).json(created);
  } catch (error) {
    if (t) await t.rollback().catch(() => {});
    console.error("PURCHASE BILL CREATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/purchase-bills/import — bulk import (validated, duplicate-checked)
// ---------------------------------------------------------------------------
router.post("/import", async (req, res) => {
  try {
    const rows = Array.isArray(req.body.bills) ? req.body.bills : [];
    if (!rows.length) return res.status(400).json({ error: "No bills to import" });
    if (rows.length > 200) return res.status(400).json({ error: "Import limit is 200 bills per batch" });

    const user = req.currentUser;
    const results = { created: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let t;
      try {
        const header = pickHeader(row);
        const computed = computeBill(row);
        const invalid = validateBill(header, computed);
        if (invalid) throw new Error(invalid);

        if (header.invoice_number) {
          const dupes = await sequelize.query(
            "SELECT id FROM purchase_bills WHERE invoice_number = ? AND vendor_name = ? LIMIT 1",
            { replacements: [header.invoice_number, header.vendor_name], type: QueryTypes.SELECT }
          );
          if (dupes.length) throw new Error(`Duplicate: invoice ${header.invoice_number} already exists for this vendor`);
        }

        // Match vendor by exact name when no id supplied
        if (!header.vendor_id && header.vendor_name) {
          const match = await sequelize.query("SELECT id FROM vendors WHERE name = ? LIMIT 1", {
            replacements: [header.vendor_name], type: QueryTypes.SELECT,
          });
          if (match.length) header.vendor_id = match[0].id;
        }
        await hydrateVendorSnapshot(header);

        t = await sequelize.transaction();
        const bill_number = await nextBillNumber(t);
        const fields = {
          bill_number, ...header, ...computed.totals,
          paid_amount: 0, balance_amount: computed.totals.grand_total,
          status: "draft", payment_status: "unpaid", stock_applied: 0,
          created_by: user.id, created_by_name: user.name || user.email,
          updated_by: user.id, updated_by_name: user.name || user.email,
        };
        const keys = Object.keys(fields);
        const [insertId] = await sequelize.query(
          `INSERT INTO purchase_bills (${keys.join(", ")}) VALUES (${keys.map((k) => `:${k}`).join(", ")})`,
          { replacements: fields, type: QueryTypes.INSERT, transaction: t }
        );
        await insertItems(insertId, computed.items, t);
        await logTimeline(insertId, "created", `Imported from Excel as ${bill_number}`, user, t);
        await t.commit();
        results.created += 1;
      } catch (rowErr) {
        if (t) await t.rollback().catch(() => {});
        results.errors.push({ row: i + 1, error: rowErr.message });
      }
    }
    res.json(results);
  } catch (error) {
    console.error("PURCHASE IMPORT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/purchase-bills/:id — bill + items + payments + attachments + timeline
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const bill = await getBillRow(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    const [items, payments, attachments, timeline] = await Promise.all([
      getBillItems(bill.id),
      sequelize.query("SELECT * FROM purchase_payments WHERE bill_id = ? ORDER BY payment_date DESC, id DESC", { replacements: [bill.id], type: QueryTypes.SELECT }),
      sequelize.query("SELECT * FROM purchase_bill_attachments WHERE bill_id = ? ORDER BY id DESC", { replacements: [bill.id], type: QueryTypes.SELECT }),
      sequelize.query("SELECT * FROM purchase_bill_timeline WHERE bill_id = ? ORDER BY id DESC LIMIT 100", { replacements: [bill.id], type: QueryTypes.SELECT }),
    ]);
    res.json({ bill, items, payments, attachments, timeline });
  } catch (error) {
    console.error("PURCHASE BILL DETAIL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/purchase-bills/timeline/:id (spec alias) and /:id/timeline
async function timelineHandler(req, res) {
  try {
    const timeline = await sequelize.query(
      "SELECT * FROM purchase_bill_timeline WHERE bill_id = ? ORDER BY id DESC LIMIT 200",
      { replacements: [req.params.id], type: QueryTypes.SELECT }
    );
    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
router.get("/timeline/:id", timelineHandler);
router.get("/:id/timeline", timelineHandler);

// ---------------------------------------------------------------------------
// PUT /api/purchase-bills/:id — update (reverses & re-applies stock if needed)
// ---------------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  let t;
  try {
    const existing = await getBillRow(req.params.id);
    if (!existing) return res.status(404).json({ error: "Bill not found" });
    if (["cancelled"].includes(existing.status)) {
      return res.status(400).json({ error: "Cancelled bills cannot be edited" });
    }

    const header = await hydrateVendorSnapshot(pickHeader(req.body));
    const computed = computeBill(req.body);
    const invalid = validateBill(header, computed);
    if (invalid) return res.status(400).json({ error: invalid });

    const user = req.currentUser;
    const isAdmin = String(user.role || "").toLowerCase() === "admin";
    let status = BILL_STATUSES.includes(req.body.status) ? req.body.status : existing.status;
    // Status promotion into approved territory requires admin
    if (STOCK_STATUSES.includes(status) && !STOCK_STATUSES.includes(existing.status) && !isAdmin) {
      status = existing.status === "draft" ? "pending" : existing.status;
    }

    t = await sequelize.transaction();
    const oldItems = await getBillItems(existing.id, t);

    if (existing.stock_applied) await reverseStock(existing, oldItems, user, t);

    const paid = Number(existing.paid_amount) || 0;
    const fields = {
      ...header, ...computed.totals,
      paid_amount: paid,
      balance_amount: r2(computed.totals.grand_total - paid),
      payment_status: paymentStatusFor(computed.totals.grand_total, paid),
      status,
      stock_applied: STOCK_STATUSES.includes(status) ? 1 : 0,
      updated_by: user.id, updated_by_name: user.name || user.email,
    };
    if (STOCK_STATUSES.includes(status) && !STOCK_STATUSES.includes(existing.status)) {
      fields.approved_by = user.id;
      fields.approved_by_name = user.name || user.email;
      fields.approved_at = new Date();
    }

    await sequelize.query(
      `UPDATE purchase_bills SET ${Object.keys(fields).map((k) => `${k} = :${k}`).join(", ")} WHERE id = :id`,
      { replacements: { ...fields, id: existing.id }, transaction: t }
    );
    await sequelize.query("DELETE FROM purchase_bill_items WHERE bill_id = ?", { replacements: [existing.id], transaction: t });
    await insertItems(existing.id, computed.items, t);

    const billRef = { id: existing.id, bill_number: existing.bill_number, vendor_id: header.vendor_id, purchase_date: header.purchase_date, warehouse: header.warehouse, grand_total: computed.totals.grand_total };
    if (STOCK_STATUSES.includes(status)) {
      await applyStock(billRef, computed.items, user, t);
      await syncVendorLedgerDebit(billRef, true, user, t);
    } else {
      await syncVendorLedgerDebit(billRef, false, user, t);
    }

    await logTimeline(existing.id, "updated", `Bill updated (${existing.status} → ${status})`, user, t);
    await t.commit();
    res.json(await getBillRow(existing.id));
  } catch (error) {
    if (t) await t.rollback().catch(() => {});
    console.error("PURCHASE BILL UPDATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/purchase-bills/:id/status — workflow transitions
// ---------------------------------------------------------------------------
router.post("/:id/status", async (req, res) => {
  let t;
  try {
    const target = req.body.status;
    if (!BILL_STATUSES.includes(target)) return res.status(400).json({ error: "Invalid status" });

    const bill = await getBillRow(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    if (bill.status === target) return res.json(bill);

    const user = req.currentUser;
    const isAdmin = String(user.role || "").toLowerCase() === "admin";
    if (STOCK_STATUSES.includes(target) && !isAdmin) {
      return res.status(403).json({ error: "Only an administrator can approve purchase bills" });
    }

    t = await sequelize.transaction();
    const items = await getBillItems(bill.id, t);
    const wasApplied = !!bill.stock_applied;
    const willApply = STOCK_STATUSES.includes(target);

    if (wasApplied && !willApply) await reverseStock(bill, items, user, t);
    if (!wasApplied && willApply) await applyStock(bill, items, user, t);
    await syncVendorLedgerDebit(bill, willApply, user, t);

    const extra = {};
    if (willApply && !STOCK_STATUSES.includes(bill.status)) {
      extra.approved_by = user.id;
      extra.approved_by_name = user.name || user.email;
      extra.approved_at = new Date();
    }
    await sequelize.query(
      `UPDATE purchase_bills SET status = :status, stock_applied = :applied,
        updated_by = :uid, updated_by_name = :uname
        ${extra.approved_by ? ", approved_by = :approved_by, approved_by_name = :approved_by_name, approved_at = :approved_at" : ""}
       WHERE id = :id`,
      {
        replacements: {
          status: target, applied: willApply ? 1 : 0,
          uid: user.id, uname: user.name || user.email, id: bill.id, ...extra,
        },
        transaction: t,
      }
    );

    const actionMap = { approved: "approved", rejected: "rejected", cancelled: "cancelled", completed: "completed", pending: "submitted", draft: "reverted" };
    await logTimeline(bill.id, actionMap[target] || "status", `Status changed ${bill.status} → ${target}`, user, t);
    await t.commit();
    res.json(await getBillRow(bill.id));
  } catch (error) {
    if (t) await t.rollback().catch(() => {});
    console.error("PURCHASE STATUS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/purchase-bills/:id/payments  |  POST /api/purchase-bills/payment
// ---------------------------------------------------------------------------
async function addPaymentHandler(req, res) {
  let t;
  try {
    const billId = req.params.id || req.body.bill_id;
    const bill = await getBillRow(billId);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    if (["cancelled", "rejected"].includes(bill.status)) {
      return res.status(400).json({ error: `Cannot record payment on a ${bill.status} bill` });
    }

    const amount = r2(req.body.amount);
    const balance = r2(bill.balance_amount);
    if (amount <= 0) return res.status(400).json({ error: "Payment amount must be greater than zero" });
    if (amount > balance + 0.01) return res.status(400).json({ error: `Payment exceeds balance (₹${balance})` });

    const user = req.currentUser;
    t = await sequelize.transaction();
    const [payId] = await sequelize.query(
      `INSERT INTO purchase_payments (bill_id, vendor_id, payment_date, amount, mode, transaction_number, reference_number, bank_name, notes, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          bill.id, bill.vendor_id, req.body.payment_date || new Date().toISOString().slice(0, 10),
          amount, req.body.mode || "cash", req.body.transaction_number || null,
          req.body.reference_number || null, req.body.bank_name || null, req.body.notes || null,
          user.id, user.name || user.email,
        ],
        type: QueryTypes.INSERT, transaction: t,
      }
    );

    const newPaid = r2(Number(bill.paid_amount) + amount);
    await sequelize.query(
      "UPDATE purchase_bills SET paid_amount = ?, balance_amount = ?, payment_status = ? WHERE id = ?",
      {
        replacements: [newPaid, r2(bill.grand_total - newPaid), paymentStatusFor(Number(bill.grand_total), newPaid), bill.id],
        transaction: t,
      }
    );
    if (bill.vendor_id) {
      await sequelize.query(
        `INSERT INTO vendor_ledger (vendor_id, bill_id, payment_id, entry_date, entry_type, narration, debit, credit, created_by)
         VALUES (?, ?, ?, ?, 'payment', ?, 0, ?, ?)`,
        {
          replacements: [bill.vendor_id, bill.id, payId, req.body.payment_date || new Date().toISOString().slice(0, 10), `Payment for ${bill.bill_number}`, amount, user.id],
          transaction: t,
        }
      );
    }
    await logTimeline(bill.id, "payment", `Payment of ₹${amount} (${req.body.mode || "cash"}) recorded`, user, t);
    await t.commit();
    res.status(201).json(await getBillRow(bill.id));
  } catch (error) {
    if (t) await t.rollback().catch(() => {});
    console.error("PURCHASE PAYMENT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}
router.post("/:id/payments", addPaymentHandler);
router.post("/payment", addPaymentHandler); // spec alias (bill_id in body)

// DELETE /api/purchase-bills/:id/payments/:paymentId
router.delete("/:id/payments/:paymentId", async (req, res) => {
  let t;
  try {
    const bill = await getBillRow(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    const payments = await sequelize.query(
      "SELECT * FROM purchase_payments WHERE id = ? AND bill_id = ?",
      { replacements: [req.params.paymentId, bill.id], type: QueryTypes.SELECT }
    );
    if (!payments.length) return res.status(404).json({ error: "Payment not found" });
    const payment = payments[0];

    const user = req.currentUser;
    t = await sequelize.transaction();
    await sequelize.query("DELETE FROM purchase_payments WHERE id = ?", { replacements: [payment.id], transaction: t });
    await sequelize.query("DELETE FROM vendor_ledger WHERE payment_id = ?", { replacements: [payment.id], transaction: t });
    const newPaid = Math.max(0, r2(Number(bill.paid_amount) - Number(payment.amount)));
    await sequelize.query(
      "UPDATE purchase_bills SET paid_amount = ?, balance_amount = ?, payment_status = ? WHERE id = ?",
      {
        replacements: [newPaid, r2(bill.grand_total - newPaid), paymentStatusFor(Number(bill.grand_total), newPaid), bill.id],
        transaction: t,
      }
    );
    await logTimeline(bill.id, "payment_deleted", `Payment of ₹${payment.amount} removed`, user, t);
    await t.commit();
    res.json(await getBillRow(bill.id));
  } catch (error) {
    if (t) await t.rollback().catch(() => {});
    console.error("PAYMENT DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/purchase-bills/:id/duplicate — copy as a fresh draft
router.post("/:id/duplicate", async (req, res) => {
  let t;
  try {
    const bill = await getBillRow(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    const items = await getBillItems(bill.id);
    const user = req.currentUser;

    t = await sequelize.transaction();
    const bill_number = await nextBillNumber(t);
    const copyCols = [
      "vendor_id", "vendor_name", "vendor_gstin", "vendor_phone", "vendor_email", "vendor_state",
      "billing_address", "shipping_address", "warehouse", "reference_number", "purchase_order_ref",
      "currency", "exchange_rate", "payment_terms", "gst_type", "reverse_charge", "remarks",
      "internal_notes", "subtotal", "item_discount", "bill_discount", "taxable_amount", "cgst",
      "sgst", "igst", "cess", "shipping_charges", "packing_charges", "other_charges",
      "tds_percent", "tds_amount", "round_off", "grand_total", "items_count",
    ];
    const fields = { bill_number, purchase_date: new Date().toISOString().slice(0, 10) };
    for (const c of copyCols) fields[c] = bill[c];
    Object.assign(fields, {
      invoice_number: null, invoice_date: null, due_date: null,
      paid_amount: 0, balance_amount: bill.grand_total,
      status: "draft", payment_status: "unpaid", stock_applied: 0,
      created_by: user.id, created_by_name: user.name || user.email,
      updated_by: user.id, updated_by_name: user.name || user.email,
    });
    const keys = Object.keys(fields);
    const [newId] = await sequelize.query(
      `INSERT INTO purchase_bills (${keys.join(", ")}) VALUES (${keys.map((k) => `:${k}`).join(", ")})`,
      { replacements: fields, type: QueryTypes.INSERT, transaction: t }
    );
    await insertItems(newId, items.map((it) => ({ ...it })), t);
    await logTimeline(newId, "created", `Duplicated from ${bill.bill_number}`, user, t);
    await logTimeline(bill.id, "duplicated", `Copied to ${bill_number}`, user, t);
    await t.commit();
    res.status(201).json(await getBillRow(newId));
  } catch (error) {
    if (t) await t.rollback().catch(() => {});
    console.error("PURCHASE DUPLICATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/purchase-bills/:id/attachments — upload invoice files
router.post("/:id/attachments", upload.array("files", 8), async (req, res) => {
  try {
    const bill = await getBillRow(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    const user = req.currentUser;
    const saved = [];
    for (const file of req.files || []) {
      const [id] = await sequelize.query(
        `INSERT INTO purchase_bill_attachments (bill_id, file_name, file_path, file_type, file_size, uploaded_by, uploaded_by_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            bill.id, file.originalname, `/uploads/purchase-bills/${file.filename}`,
            file.mimetype, file.size, user.id, user.name || user.email,
          ],
          type: QueryTypes.INSERT,
        }
      );
      saved.push({ id, file_name: file.originalname, file_path: `/uploads/purchase-bills/${file.filename}`, file_type: file.mimetype, file_size: file.size });
    }
    if (saved.length) await logTimeline(bill.id, "attachment", `${saved.length} file(s) uploaded`, user);
    res.status(201).json(saved);
  } catch (error) {
    console.error("ATTACHMENT UPLOAD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/purchase-bills/:id/attachments/:attachmentId
router.delete("/:id/attachments/:attachmentId", async (req, res) => {
  try {
    const rows = await sequelize.query(
      "SELECT * FROM purchase_bill_attachments WHERE id = ? AND bill_id = ?",
      { replacements: [req.params.attachmentId, req.params.id], type: QueryTypes.SELECT }
    );
    if (!rows.length) return res.status(404).json({ error: "Attachment not found" });
    await sequelize.query("DELETE FROM purchase_bill_attachments WHERE id = ?", { replacements: [rows[0].id] });
    const diskPath = path.join(__dirname, "..", rows[0].file_path.replace(/^\//, ""));
    fs.promises.unlink(diskPath).catch(() => {});
    await logTimeline(req.params.id, "attachment_deleted", `${rows[0].file_name} removed`, req.currentUser);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/purchase-bills/:id — reverses stock/ledger, cascades children
// ---------------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  let t;
  try {
    const bill = await getBillRow(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    const user = req.currentUser;
    const isAdmin = String(user.role || "").toLowerCase() === "admin";
    if (STOCK_STATUSES.includes(bill.status) && !isAdmin) {
      return res.status(403).json({ error: "Only an administrator can delete an approved bill" });
    }

    t = await sequelize.transaction();
    if (bill.stock_applied) {
      const items = await getBillItems(bill.id, t);
      await reverseStock(bill, items, user, t);
    }
    await sequelize.query("DELETE FROM vendor_ledger WHERE bill_id = ?", { replacements: [bill.id], transaction: t });
    const attachments = await sequelize.query(
      "SELECT file_path FROM purchase_bill_attachments WHERE bill_id = ?",
      { replacements: [bill.id], type: QueryTypes.SELECT, transaction: t }
    );
    // items/payments/attachments/timeline rows cascade via FK
    await sequelize.query("DELETE FROM purchase_bills WHERE id = ?", { replacements: [bill.id], transaction: t });
    await t.commit();

    for (const a of attachments) {
      fs.promises.unlink(path.join(__dirname, "..", a.file_path.replace(/^\//, ""))).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    if (t) await t.rollback().catch(() => {});
    console.error("PURCHASE DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
