const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const sequelize = require("../config/db");
const { QueryTypes } = require("sequelize");
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const { amountInWords } = require("../utils/purchaseBillHelpers");
const {
  r2,
  r3,
  PAYMENT_METHODS,
  computeSale,
  nextSaleNumber,
  nextReturnNumber,
  logTimeline,
  applyPosSaleStock,
  reversePosSaleStock,
} = require("../utils/posSaleHelpers");

router.use(adminAuth, requirePermission("pos"));

function actorName(user) {
  return user?.name || user?.email || null;
}

// GET /api/pos/sales — order history / held-orders list
router.get("/sales", async (req, res) => {
  try {
    const { status, from, to, customer_id, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const conditions = [];
    const replacements = { limit, offset };
    if (status) { conditions.push("status = :status"); replacements.status = status; }
    if (from) { conditions.push("DATE(created_at) >= :from"); replacements.from = from; }
    if (to) { conditions.push("DATE(created_at) <= :to"); replacements.to = to; }
    if (customer_id) { conditions.push("customer_id = :customer_id"); replacements.customer_id = customer_id; }
    if (search) {
      conditions.push("(sale_number LIKE :search OR customer_name LIKE :search OR customer_phone LIKE :search)");
      replacements.search = `%${search}%`;
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const sales = await sequelize.query(
      `SELECT * FROM pos_sales ${where} ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );
    const countRows = await sequelize.query(`SELECT COUNT(*) AS count FROM pos_sales ${where}`, {
      replacements, type: QueryTypes.SELECT,
    });

    res.json({ sales, total: Number(countRows[0].count), page, limit });
  } catch (error) {
    console.error("POS SALES LIST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/sales/summary — today's KPI strip (must precede /sales/:id)
router.get("/sales/summary", async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS count, IFNULL(SUM(grand_total), 0) AS total, IFNULL(AVG(grand_total), 0) AS avg_basket
       FROM pos_sales WHERE status = 'completed' AND DATE(completed_at) = :date`,
      { replacements: { date }, type: QueryTypes.SELECT }
    );
    res.json({
      date,
      count: Number(rows[0].count),
      total: Number(rows[0].total),
      avg_basket: Number(rows[0].avg_basket),
    });
  } catch (error) {
    console.error("POS SUMMARY ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/sales/:id — full detail
router.get("/sales/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await sequelize.query("SELECT * FROM pos_sales WHERE id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    if (!rows.length) return res.status(404).json({ error: "Sale not found" });

    const items = await sequelize.query(
      "SELECT * FROM pos_sale_items WHERE sale_id = ? ORDER BY id",
      { replacements: [id], type: QueryTypes.SELECT }
    );
    const payments = await sequelize.query(
      "SELECT * FROM pos_payments WHERE sale_id = ? ORDER BY id",
      { replacements: [id], type: QueryTypes.SELECT }
    );
    const timeline = await sequelize.query(
      "SELECT * FROM pos_sale_timeline WHERE sale_id = ? ORDER BY id",
      { replacements: [id], type: QueryTypes.SELECT }
    );
    const returns = await sequelize.query(
      "SELECT r.*, ri.sale_item_id, ri.product_id, ri.quantity, ri.unit_price, ri.refund_amount AS line_refund_amount FROM pos_returns r LEFT JOIN pos_return_items ri ON ri.return_id = r.id WHERE r.sale_id = ? ORDER BY r.id",
      { replacements: [id], type: QueryTypes.SELECT }
    );

    res.json({ sale: rows[0], items, payments, timeline, returns });
  } catch (error) {
    console.error("POS SALE DETAIL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/sales — create (status: "held" | "completed")
router.post("/sales", async (req, res) => {
  let t;
  try {
    const body = req.body || {};
    const status = body.status === "held" ? "held" : "completed";

    if (body.idempotency_key) {
      const existing = await sequelize.query("SELECT * FROM pos_sales WHERE idempotency_key = ?", {
        replacements: [body.idempotency_key], type: QueryTypes.SELECT,
      });
      if (existing.length) return res.status(200).json({ sale: existing[0], deduped: true });
    }

    const { items, totals } = computeSale(body);
    if (!items.length) return res.status(400).json({ error: "Cart is empty" });

    const payments = Array.isArray(body.payments) ? body.payments : [];
    if (status === "completed") {
      for (const p of payments) {
        if (!PAYMENT_METHODS.includes(p.method)) {
          return res.status(400).json({ error: `Invalid payment method: ${p.method}` });
        }
      }
      const paidSum = r2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
      if (Math.abs(paidSum - totals.grand_total) > 0.01) {
        return res.status(400).json({
          error: `Payments (₹${paidSum}) do not match the amount due (₹${totals.grand_total})`,
        });
      }
    }

    t = await sequelize.transaction();
    const user = req.currentUser;
    const saleNumber = await nextSaleNumber(t);

    const [saleId] = await sequelize.query(
      `INSERT INTO pos_sales
        (sale_number, customer_id, customer_name, customer_phone, customer_email, warehouse,
         subtotal, item_discount, bill_discount, taxable_amount, cgst, sgst, igst, cess, round_off,
         grand_total, gst_type, coupon_code, coupon_discount, items_count, status, idempotency_key,
         notes, created_by, created_by_name, completed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      {
        replacements: [
          saleNumber,
          body.customer_id || null,
          body.customer_name || null,
          body.customer_phone || null,
          body.customer_email || null,
          body.warehouse || "Main",
          totals.subtotal,
          totals.item_discount,
          totals.bill_discount,
          totals.taxable_amount,
          totals.cgst,
          totals.sgst,
          totals.igst,
          0,
          totals.round_off,
          totals.grand_total,
          body.gst_type === "inter" ? "inter" : "intra",
          body.coupon_code || null,
          totals.coupon_discount,
          totals.items_count,
          status,
          body.idempotency_key || null,
          body.notes || null,
          user?.id || null,
          actorName(user),
          status === "completed" ? new Date() : null,
        ],
        type: QueryTypes.INSERT,
        transaction: t,
      }
    );

    for (const it of items) {
      await sequelize.query(
        `INSERT INTO pos_sale_items
          (sale_id, product_id, variation_id, product_name, sku, hsn, unit, quantity, unit_price, mrp,
           discount_percent, discount_amount, gst_percent, gst_amount, taxable_amount, total)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        {
          replacements: [
            saleId, it.product_id, it.variation_id, it.product_name, it.sku, it.hsn, it.unit,
            it.quantity, it.unit_price, it.mrp, it.discount_percent, it.discount_amount,
            it.gst_percent, it.gst_amount, it.taxable_amount, it.total,
          ],
          transaction: t,
        }
      );
    }

    if (status === "completed") {
      await applyPosSaleStock({ id: saleId, sale_number: saleNumber, warehouse: body.warehouse || "Main" }, items, user, t);
      for (const p of payments) {
        await sequelize.query(
          `INSERT INTO pos_payments (sale_id, method, amount, reference_number, notes, created_by, created_by_name)
           VALUES (?,?,?,?,?,?,?)`,
          {
            replacements: [saleId, p.method, r2(p.amount), p.reference_number || null, p.notes || null, user?.id || null, actorName(user)],
            transaction: t,
          }
        );
      }
      await logTimeline(saleId, "completed", `Sale completed — grand total ₹${totals.grand_total}`, user, t);
    } else {
      await logTimeline(saleId, "held", "Sale held for later", user, t);
    }

    await t.commit();
    const created = await sequelize.query("SELECT * FROM pos_sales WHERE id = ?", {
      replacements: [saleId], type: QueryTypes.SELECT,
    });
    res.status(201).json({ sale: created[0], items });
  } catch (error) {
    if (t) await t.rollback();
    console.error("POS SALE CREATE ERROR:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// PUT /api/pos/sales/:id — edit a held sale
router.put("/sales/:id", async (req, res) => {
  let t;
  try {
    const id = req.params.id;
    const existing = await sequelize.query("SELECT * FROM pos_sales WHERE id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    if (!existing.length) return res.status(404).json({ error: "Sale not found" });
    if (existing[0].status !== "held") {
      return res.status(409).json({ error: "Only held sales can be edited" });
    }

    const body = req.body || {};
    const { items, totals } = computeSale(body);
    if (!items.length) return res.status(400).json({ error: "Cart is empty" });

    t = await sequelize.transaction();
    await sequelize.query("DELETE FROM pos_sale_items WHERE sale_id = ?", { replacements: [id], transaction: t });

    for (const it of items) {
      await sequelize.query(
        `INSERT INTO pos_sale_items
          (sale_id, product_id, variation_id, product_name, sku, hsn, unit, quantity, unit_price, mrp,
           discount_percent, discount_amount, gst_percent, gst_amount, taxable_amount, total)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        {
          replacements: [
            id, it.product_id, it.variation_id, it.product_name, it.sku, it.hsn, it.unit,
            it.quantity, it.unit_price, it.mrp, it.discount_percent, it.discount_amount,
            it.gst_percent, it.gst_amount, it.taxable_amount, it.total,
          ],
          transaction: t,
        }
      );
    }

    await sequelize.query(
      `UPDATE pos_sales SET
        customer_id = ?, customer_name = ?, customer_phone = ?, customer_email = ?, warehouse = ?,
        subtotal = ?, item_discount = ?, bill_discount = ?, taxable_amount = ?, cgst = ?, sgst = ?,
        igst = ?, round_off = ?, grand_total = ?, gst_type = ?, coupon_code = ?, coupon_discount = ?,
        items_count = ?, notes = ?
       WHERE id = ?`,
      {
        replacements: [
          body.customer_id || null, body.customer_name || null, body.customer_phone || null,
          body.customer_email || null, body.warehouse || "Main", totals.subtotal, totals.item_discount,
          totals.bill_discount, totals.taxable_amount, totals.cgst, totals.sgst, totals.igst,
          totals.round_off, totals.grand_total, body.gst_type === "inter" ? "inter" : "intra",
          body.coupon_code || null, totals.coupon_discount, totals.items_count, body.notes || null, id,
        ],
        transaction: t,
      }
    );

    await logTimeline(id, "updated", "Held sale updated", req.currentUser, t);
    await t.commit();

    const updated = await sequelize.query("SELECT * FROM pos_sales WHERE id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    res.json({ sale: updated[0], items });
  } catch (error) {
    if (t) await t.rollback();
    console.error("POS SALE UPDATE ERROR:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// POST /api/pos/sales/:id/complete — finalize a held sale with payment
router.post("/sales/:id/complete", async (req, res) => {
  let t;
  try {
    const id = req.params.id;
    const existing = await sequelize.query("SELECT * FROM pos_sales WHERE id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    if (!existing.length) return res.status(404).json({ error: "Sale not found" });
    const sale = existing[0];
    if (sale.status !== "held") return res.status(409).json({ error: "Only held sales can be completed" });

    const items = await sequelize.query("SELECT * FROM pos_sale_items WHERE sale_id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    if (!items.length) return res.status(400).json({ error: "Cart is empty" });

    const payments = Array.isArray(req.body.payments) ? req.body.payments : [];
    for (const p of payments) {
      if (!PAYMENT_METHODS.includes(p.method)) {
        return res.status(400).json({ error: `Invalid payment method: ${p.method}` });
      }
    }
    const paidSum = r2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
    if (Math.abs(paidSum - Number(sale.grand_total)) > 0.01) {
      return res.status(400).json({
        error: `Payments (₹${paidSum}) do not match the amount due (₹${sale.grand_total})`,
      });
    }

    t = await sequelize.transaction();
    await applyPosSaleStock(sale, items, req.currentUser, t);

    for (const p of payments) {
      await sequelize.query(
        `INSERT INTO pos_payments (sale_id, method, amount, reference_number, notes, created_by, created_by_name)
         VALUES (?,?,?,?,?,?,?)`,
        {
          replacements: [id, p.method, r2(p.amount), p.reference_number || null, p.notes || null, req.currentUser?.id || null, actorName(req.currentUser)],
          transaction: t,
        }
      );
    }

    await sequelize.query("UPDATE pos_sales SET status = 'completed', completed_at = NOW() WHERE id = ?", {
      replacements: [id], transaction: t,
    });
    await logTimeline(id, "completed", "Held sale completed", req.currentUser, t);
    await t.commit();

    const updated = await sequelize.query("SELECT * FROM pos_sales WHERE id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    res.json({ sale: updated[0] });
  } catch (error) {
    if (t) await t.rollback();
    console.error("POS SALE COMPLETE ERROR:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// DELETE /api/pos/sales/:id — void (held: no stock impact; completed: reverses stock, admin-only)
router.delete("/sales/:id", async (req, res) => {
  let t;
  try {
    const id = req.params.id;
    const existing = await sequelize.query("SELECT * FROM pos_sales WHERE id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    if (!existing.length) return res.status(404).json({ error: "Sale not found" });
    const sale = existing[0];
    if (["voided", "refunded"].includes(sale.status)) {
      return res.status(400).json({ error: `Sale is already ${sale.status}` });
    }

    const needsStockReversal = sale.status === "completed" || sale.status === "partially_refunded";
    if (needsStockReversal && String(req.currentUser.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Only an administrator can void a completed sale" });
    }

    t = await sequelize.transaction();
    if (needsStockReversal) {
      const items = await sequelize.query("SELECT * FROM pos_sale_items WHERE sale_id = ?", {
        replacements: [id], type: QueryTypes.SELECT, transaction: t,
      });
      const reversible = items
        .map((it) => ({ ...it, quantity: Number(it.quantity) - Number(it.returned_quantity) }))
        .filter((it) => it.quantity > 0);
      await reversePosSaleStock(sale, reversible, req.currentUser, t, { reason: "void" });
    }

    await sequelize.query(
      "UPDATE pos_sales SET status = 'voided', voided_by = ?, voided_by_name = ?, void_reason = ?, voided_at = NOW() WHERE id = ?",
      {
        replacements: [req.currentUser?.id || null, actorName(req.currentUser), req.body?.reason || null, id],
        transaction: t,
      }
    );
    await logTimeline(id, "voided", req.body?.reason || "Sale voided", req.currentUser, t);
    await t.commit();
    res.json({ success: true });
  } catch (error) {
    if (t) await t.rollback();
    console.error("POS SALE VOID ERROR:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// POST /api/pos/sales/:id/return — partial/full return + refund
router.post("/sales/:id/return", async (req, res) => {
  let t;
  try {
    const id = req.params.id;
    const existing = await sequelize.query("SELECT * FROM pos_sales WHERE id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    if (!existing.length) return res.status(404).json({ error: "Sale not found" });
    const sale = existing[0];
    if (!["completed", "partially_refunded"].includes(sale.status)) {
      return res.status(400).json({ error: "Only completed sales can be returned" });
    }

    const requested = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requested.length) return res.status(400).json({ error: "Select at least one item to return" });

    const saleItems = await sequelize.query("SELECT * FROM pos_sale_items WHERE sale_id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    const byId = new Map(saleItems.map((it) => [it.id, it]));

    const lines = [];
    for (const r of requested) {
      const item = byId.get(Number(r.sale_item_id));
      if (!item) return res.status(400).json({ error: `Sale item ${r.sale_item_id} not found on this sale` });
      const qty = r3(r.quantity);
      const available = r3(Number(item.quantity) - Number(item.returned_quantity));
      if (qty <= 0 || qty > available) {
        return res.status(400).json({
          error: `Cannot return ${qty} of "${item.product_name}" — only ${available} returnable`,
        });
      }
      const originalQty = Number(item.quantity) || 1;
      const refundAmount = r2((qty / originalQty) * Number(item.total));
      lines.push({ item, qty, refundAmount });
    }

    const refundMethod = PAYMENT_METHODS.includes(req.body.refund_method) ? req.body.refund_method : "cash";
    const totalRefund = r2(lines.reduce((s, l) => s + l.refundAmount, 0));

    t = await sequelize.transaction();
    const returnNumber = await nextReturnNumber(t);
    const [returnId] = await sequelize.query(
      `INSERT INTO pos_returns (sale_id, return_number, reason, refund_method, refund_amount, created_by, created_by_name)
       VALUES (?,?,?,?,?,?,?)`,
      {
        replacements: [id, returnNumber, req.body.reason || null, refundMethod, totalRefund, req.currentUser?.id || null, actorName(req.currentUser)],
        type: QueryTypes.INSERT,
        transaction: t,
      }
    );

    for (const l of lines) {
      await sequelize.query(
        `INSERT INTO pos_return_items (return_id, sale_item_id, product_id, quantity, unit_price, refund_amount)
         VALUES (?,?,?,?,?,?)`,
        { replacements: [returnId, l.item.id, l.item.product_id, l.qty, l.item.unit_price, l.refundAmount], transaction: t }
      );
      await sequelize.query(
        "UPDATE pos_sale_items SET returned_quantity = returned_quantity + ? WHERE id = ?",
        { replacements: [l.qty, l.item.id], transaction: t }
      );
    }

    await reversePosSaleStock(
      sale,
      lines.map((l) => ({ product_id: l.item.product_id, quantity: l.qty, unit_price: l.item.unit_price })),
      req.currentUser,
      t,
      { reason: "return" }
    );

    const allItems = await sequelize.query(
      "SELECT quantity, returned_quantity FROM pos_sale_items WHERE sale_id = ?",
      { replacements: [id], type: QueryTypes.SELECT, transaction: t }
    );
    const fullyReturned = allItems.every((it) => Number(it.returned_quantity) >= Number(it.quantity));
    const newStatus = fullyReturned ? "refunded" : "partially_refunded";
    await sequelize.query("UPDATE pos_sales SET status = ? WHERE id = ?", { replacements: [newStatus, id], transaction: t });

    await logTimeline(id, "returned", `${returnNumber}: ₹${totalRefund} refunded via ${refundMethod}`, req.currentUser, t);
    await t.commit();

    const createdReturn = await sequelize.query("SELECT * FROM pos_returns WHERE id = ?", {
      replacements: [returnId], type: QueryTypes.SELECT,
    });
    res.status(201).json({ return: createdReturn[0] });
  } catch (error) {
    if (t) await t.rollback();
    console.error("POS SALE RETURN ERROR:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// GET /api/pos/sales/:id/pdf — A4 record-copy invoice
router.get("/sales/:id/pdf", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await sequelize.query("SELECT * FROM pos_sales WHERE id = ?", {
      replacements: [id], type: QueryTypes.SELECT,
    });
    if (!rows.length) return res.status(404).json({ error: "Sale not found" });
    const sale = rows[0];
    const items = await sequelize.query("SELECT * FROM pos_sale_items WHERE sale_id = ? ORDER BY id", {
      replacements: [id], type: QueryTypes.SELECT,
    });

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${sale.sale_number}.pdf"`);
    doc.pipe(res);

    doc.rect(40, 40, 515, 60).fill("#1e1b4b");
    doc.fillColor("#ffffff").fontSize(18).text("POS SALE RECEIPT", 55, 58);
    doc.fontSize(10).fillColor("#c7d2fe").text(sale.sale_number, 55, 80);
    doc.fillColor("#ffffff").fontSize(9)
      .text(new Date(sale.completed_at || sale.created_at).toLocaleString("en-IN"), 400, 58, { width: 140, align: "right" })
      .text(`Status: ${String(sale.status).toUpperCase()}`, 400, 76, { width: 140, align: "right" });

    let y = 120;
    doc.fillColor("#0f172a").fontSize(10);
    doc.text(`Customer: ${sale.customer_name || "Walk-in"}`, 40, y);
    if (sale.customer_phone) doc.text(`Phone: ${sale.customer_phone}`, 40, y + 14);
    y += 40;

    doc.rect(40, y, 515, 20).fill("#312e81");
    doc.fillColor("#ffffff").fontSize(9)
      .text("ITEM", 46, y + 6).text("QTY", 300, y + 6).text("RATE", 350, y + 6)
      .text("GST", 420, y + 6).text("AMOUNT", 470, y + 6);
    y += 24;

    doc.fillColor("#0f172a");
    for (const it of items) {
      doc.fontSize(9).text(it.product_name, 46, y, { width: 250 });
      doc.text(String(Number(it.quantity)), 300, y);
      doc.text(`Rs.${Number(it.unit_price).toFixed(2)}`, 350, y);
      doc.text(`${Number(it.gst_percent)}%`, 420, y);
      doc.text(`Rs.${Number(it.total).toFixed(2)}`, 470, y);
      y += 18;
      if (y > 700) { doc.addPage(); y = 40; }
    }

    y += 10;
    doc.moveTo(40, y).lineTo(555, y).strokeColor("#e2e8f0").stroke();
    y += 10;

    const totalsLines = [
      ["Subtotal", sale.subtotal],
      ["Discount", -(Number(sale.item_discount) + Number(sale.bill_discount) + Number(sale.coupon_discount))],
      ["CGST", sale.cgst],
      ["SGST", sale.sgst],
      ["IGST", sale.igst],
      ["Round Off", sale.round_off],
    ];
    for (const [label, val] of totalsLines) {
      if (!Number(val)) continue;
      doc.fontSize(9).fillColor("#0f172a").text(label, 400, y).text(`Rs.${Number(val).toFixed(2)}`, 470, y);
      y += 16;
    }

    doc.rect(400, y, 155, 24).fill("#1e1b4b");
    doc.fillColor("#ffffff").fontSize(11).text("GRAND TOTAL", 408, y + 6).text(`Rs.${Number(sale.grand_total).toFixed(2)}`, 470, y + 6);
    y += 44;

    doc.fillColor("#64748b").fontSize(8)
      .text(amountInWords(sale.grand_total), 40, y)
      .text("Computer generated receipt — no signature required", 40, y + 14);

    doc.end();
  } catch (error) {
    console.error("POS PDF ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
