const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const { r2, r3 } = require("./purchaseBillHelpers");

// ---------------------------------------------------------------------------
// Shared helpers for the POS module. Mirrors utils/purchaseBillHelpers.js —
// every rupee figure is recomputed server-side from raw item rows, client
// totals are never trusted.
// ---------------------------------------------------------------------------

const SALE_STATUSES = ["held", "completed", "voided", "refunded", "partially_refunded"];
const PAYMENT_METHODS = ["cash", "upi", "card", "wallet", "credit"];

function normalizeItem(raw) {
  const qty = r3(raw.quantity ?? raw.qty);
  const price = r2(raw.unit_price ?? raw.price);
  const gross = r2(qty * price);

  let discountPercent = r3(raw.discount_percent);
  let discountAmount = r2(raw.discount_amount);
  if (discountPercent > 0) discountAmount = r2((gross * discountPercent) / 100);
  else if (discountAmount > 0 && gross > 0) discountPercent = r3((discountAmount / gross) * 100);
  if (discountAmount > gross) discountAmount = gross;

  const taxable = r2(gross - discountAmount);
  const gstPercent = r3(raw.gst_percent);
  const gstAmount = r2((taxable * gstPercent) / 100);

  return {
    product_id: raw.product_id ? parseInt(raw.product_id, 10) : null,
    variation_id: raw.variation_id ? parseInt(raw.variation_id, 10) : null,
    product_name: String(raw.product_name || raw.name || "").trim(),
    sku: raw.sku || null,
    hsn: raw.hsn || null,
    unit: raw.unit || "pcs",
    quantity: qty,
    unit_price: price,
    mrp: r2(raw.mrp),
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    gst_percent: gstPercent,
    gst_amount: gstAmount,
    taxable_amount: taxable,
    total: r2(taxable + gstAmount),
  };
}

// Recomputes the whole sale from items + bill-level discount/coupon. GST
// splits CGST/SGST for intra-state sales and goes fully to IGST otherwise.
function computeSale(body) {
  const items = (Array.isArray(body.items) ? body.items : [])
    .map(normalizeItem)
    .filter((it) => it.product_name && it.quantity > 0);

  const subtotal = r2(items.reduce((s, it) => s + it.quantity * it.unit_price, 0));
  const itemDiscount = r2(items.reduce((s, it) => s + it.discount_amount, 0));
  const totalGst = r2(items.reduce((s, it) => s + it.gst_amount, 0));

  const gstType = body.gst_type === "inter" ? "inter" : "intra";

  const billDiscount = r2(body.bill_discount);
  const couponDiscount = r2(body.coupon_discount);
  const extraDiscount = r2(billDiscount + couponDiscount);

  // Bill-level discount/coupon is applied proportionally across the taxable
  // base so GST is recalculated on the post-discount amount.
  const grossTaxable = r2(items.reduce((s, it) => s + it.taxable_amount, 0));
  const discountRatio = grossTaxable > 0 ? Math.min(1, extraDiscount / grossTaxable) : 0;
  const taxableAmount = r2(grossTaxable - extraDiscount);
  const effectiveGst = r2(totalGst * (1 - discountRatio));

  const cgst = gstType === "intra" ? r2(effectiveGst / 2) : 0;
  const sgst = gstType === "intra" ? r2(effectiveGst - cgst) : 0;
  const igst = gstType === "inter" ? effectiveGst : 0;

  const rawTotal = r2(taxableAmount + effectiveGst);
  const grandTotal = Math.max(0, Math.round(rawTotal));
  const roundOff = r2(grandTotal - rawTotal);

  return {
    items,
    totals: {
      subtotal,
      item_discount: itemDiscount,
      bill_discount: billDiscount,
      coupon_discount: couponDiscount,
      taxable_amount: Math.max(0, taxableAmount),
      cgst,
      sgst,
      igst,
      round_off: roundOff,
      grand_total: grandTotal,
      items_count: items.length,
    },
  };
}

// POS-YYYYMM-0001 style, seeded from the highest sequence already used this month.
async function nextSaleNumber(transaction) {
  const prefix = `POS-${new Date().toISOString().slice(0, 7).replace("-", "")}-`;
  const rows = await sequelize.query(
    `SELECT MAX(CAST(SUBSTRING(sale_number, ?) AS UNSIGNED)) AS seq
     FROM pos_sales WHERE sale_number LIKE ?`,
    { replacements: [prefix.length + 1, `${prefix}%`], type: QueryTypes.SELECT, transaction }
  );
  const seq = (parseInt(rows[0]?.seq, 10) || 0) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// RTN-YYYYMM-0001
async function nextReturnNumber(transaction) {
  const prefix = `RTN-${new Date().toISOString().slice(0, 7).replace("-", "")}-`;
  const rows = await sequelize.query(
    `SELECT MAX(CAST(SUBSTRING(return_number, ?) AS UNSIGNED)) AS seq
     FROM pos_returns WHERE return_number LIKE ?`,
    { replacements: [prefix.length + 1, `${prefix}%`], type: QueryTypes.SELECT, transaction }
  );
  const seq = (parseInt(rows[0]?.seq, 10) || 0) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function logTimeline(saleId, action, details, user, transaction) {
  await sequelize.query(
    `INSERT INTO pos_sale_timeline (sale_id, action, details, user_id, user_name)
     VALUES (?, ?, ?, ?, ?)`,
    {
      replacements: [saleId, action, details || null, user?.id || null, user?.name || user?.email || null],
      transaction,
    }
  );
}

// Decreases product stock for a completed sale. Throws (aborting the
// transaction) if any line requests more than what's currently available —
// this is the negative-stock guard, enforced under row locks.
async function applyPosSaleStock(sale, items, user, transaction) {
  for (const it of items) {
    if (!it.product_id) continue;
    const qtyOut = r3(it.quantity);
    if (qtyOut <= 0) continue;

    const rows = await sequelize.query(
      "SELECT id, name, stock FROM products WHERE id = ? FOR UPDATE",
      { replacements: [it.product_id], type: QueryTypes.SELECT, transaction }
    );
    if (!rows.length) continue;

    const currentStock = Math.max(0, Number(rows[0].stock) || 0);
    if (qtyOut > currentStock) {
      const err = new Error(
        `Insufficient stock for "${rows[0].name}" — only ${currentStock} available, ${qtyOut} requested`
      );
      err.status = 400;
      throw err;
    }

    const newStock = currentStock - qtyOut;
    await sequelize.query(
      `UPDATE products SET stock = ?, stock_status = ? WHERE id = ?`,
      {
        replacements: [Math.round(newStock), newStock > 0 ? "in_stock" : "out_of_stock", it.product_id],
        transaction,
      }
    );

    await sequelize.query(
      `INSERT INTO stock_ledger
        (product_id, txn_type, ref_type, ref_id, warehouse, qty_in, qty_out, balance_qty, unit_cost, narration, created_by)
       VALUES (?, 'sale', 'pos_sale', ?, ?, 0, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          it.product_id,
          sale.id,
          sale.warehouse || "Main",
          qtyOut,
          newStock,
          it.unit_price,
          `POS sale ${sale.sale_number}`,
          user?.id || null,
        ],
        transaction,
      }
    );
  }
}

// Restores stock for a return or a voided completed sale.
async function reversePosSaleStock(sale, items, user, transaction, { reason = "return" } = {}) {
  const txnType = reason === "void" ? "sale_void" : "sale_return";
  for (const it of items) {
    if (!it.product_id) continue;
    const qtyIn = r3(it.quantity);
    if (qtyIn <= 0) continue;

    const rows = await sequelize.query(
      "SELECT id, stock FROM products WHERE id = ? FOR UPDATE",
      { replacements: [it.product_id], type: QueryTypes.SELECT, transaction }
    );
    if (!rows.length) continue;

    const newStock = Math.max(0, Number(rows[0].stock) || 0) + qtyIn;
    await sequelize.query(
      `UPDATE products SET stock = ?, stock_status = ? WHERE id = ?`,
      { replacements: [Math.round(newStock), "in_stock", it.product_id], transaction }
    );

    await sequelize.query(
      `INSERT INTO stock_ledger
        (product_id, txn_type, ref_type, ref_id, warehouse, qty_in, qty_out, balance_qty, unit_cost, narration, created_by)
       VALUES (?, ?, 'pos_sale', ?, ?, ?, 0, ?, ?, ?, ?)`,
      {
        replacements: [
          it.product_id,
          txnType,
          sale.id,
          sale.warehouse || "Main",
          qtyIn,
          newStock,
          it.unit_price,
          `${reason === "void" ? "Void of" : "Return against"} ${sale.sale_number}`,
          user?.id || null,
        ],
        transaction,
      }
    );
  }
}

module.exports = {
  r2,
  r3,
  SALE_STATUSES,
  PAYMENT_METHODS,
  computeSale,
  nextSaleNumber,
  nextReturnNumber,
  logTimeline,
  applyPosSaleStock,
  reversePosSaleStock,
};
