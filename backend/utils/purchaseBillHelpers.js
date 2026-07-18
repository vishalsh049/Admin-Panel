const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");

// ---------------------------------------------------------------------------
// Shared helpers for the purchase-bills module. Every rupee figure is
// recomputed server-side from raw item rows — client totals are never trusted.
// ---------------------------------------------------------------------------

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

const BILL_STATUSES = ["draft", "pending", "approved", "rejected", "cancelled", "completed"];
// Stock and vendor ledger only exist while the bill is in one of these states.
const STOCK_STATUSES = ["approved", "completed"];

function normalizeItem(raw) {
  const qty = r3(raw.quantity ?? raw.qty);
  const freeQty = r3(raw.free_quantity ?? raw.freeQty);
  const price = r2(raw.purchase_price ?? raw.price);
  const gross = r2(qty * price);

  let discountPercent = r3(raw.discount_percent);
  let discountAmount = r2(raw.discount_amount);
  if (discountPercent > 0) discountAmount = r2((gross * discountPercent) / 100);
  else if (discountAmount > 0 && gross > 0) discountPercent = r3((discountAmount / gross) * 100);
  if (discountAmount > gross) discountAmount = gross;

  const taxable = r2(gross - discountAmount);
  const gstPercent = r3(raw.gst_percent);
  const cessPercent = r3(raw.cess_percent);
  const gstAmount = r2((taxable * gstPercent) / 100);
  const cessAmount = r2((taxable * cessPercent) / 100);

  return {
    product_id: raw.product_id ? parseInt(raw.product_id, 10) : null,
    product_name: String(raw.product_name || raw.name || "").trim(),
    sku: raw.sku || null,
    hsn: raw.hsn || null,
    description: raw.description || null,
    batch_number: raw.batch_number || null,
    expiry_date: raw.expiry_date || null,
    unit: raw.unit || "pcs",
    quantity: qty,
    free_quantity: freeQty,
    purchase_price: price,
    mrp: r2(raw.mrp),
    selling_price: r2(raw.selling_price),
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    gst_percent: gstPercent,
    gst_amount: gstAmount,
    cess_percent: cessPercent,
    cess_amount: cessAmount,
    taxable_amount: taxable,
    total: r2(taxable + gstAmount + cessAmount),
  };
}

// Recomputes the whole bill from items + header charges. GST splits CGST/SGST
// for intra-state bills and goes fully to IGST for inter-state ones.
function computeBill(body) {
  const items = (Array.isArray(body.items) ? body.items : [])
    .map(normalizeItem)
    .filter((it) => it.product_name && it.quantity > 0);

  const subtotal = r2(items.reduce((s, it) => s + it.quantity * it.purchase_price, 0));
  const itemDiscount = r2(items.reduce((s, it) => s + it.discount_amount, 0));
  const taxableAmount = r2(items.reduce((s, it) => s + it.taxable_amount, 0));
  const totalGst = r2(items.reduce((s, it) => s + it.gst_amount, 0));
  const cess = r2(items.reduce((s, it) => s + it.cess_amount, 0));

  const gstType = body.gst_type === "inter" ? "inter" : "intra";
  const cgst = gstType === "intra" ? r2(totalGst / 2) : 0;
  const sgst = gstType === "intra" ? r2(totalGst - cgst) : 0;
  const igst = gstType === "inter" ? totalGst : 0;

  const billDiscount = r2(body.bill_discount);
  const shipping = r2(body.shipping_charges);
  const packing = r2(body.packing_charges);
  const other = r2(body.other_charges);
  const tdsPercent = r3(body.tds_percent);
  const tdsAmount = tdsPercent > 0 ? r2((taxableAmount * tdsPercent) / 100) : r2(body.tds_amount);

  const rawTotal = r2(
    taxableAmount + totalGst + cess + shipping + packing + other - billDiscount - tdsAmount
  );
  const grandTotal = Math.max(0, Math.round(rawTotal));
  const roundOff = r2(grandTotal - rawTotal);

  return {
    items,
    totals: {
      subtotal,
      item_discount: itemDiscount,
      bill_discount: billDiscount,
      taxable_amount: taxableAmount,
      cgst,
      sgst,
      igst,
      cess,
      shipping_charges: shipping,
      packing_charges: packing,
      other_charges: other,
      tds_percent: tdsPercent,
      tds_amount: tdsAmount,
      round_off: roundOff,
      grand_total: grandTotal,
      items_count: items.length,
    },
  };
}

function paymentStatusFor(grandTotal, paidAmount) {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount + 0.01 >= grandTotal) return "paid";
  return "partial";
}

// PB-202607-0001 style, seeded from the highest sequence already used this month.
async function nextBillNumber(transaction) {
  const prefix = `PB-${new Date().toISOString().slice(0, 7).replace("-", "")}-`;
  const rows = await sequelize.query(
    `SELECT MAX(CAST(SUBSTRING(bill_number, ?) AS UNSIGNED)) AS seq
     FROM purchase_bills WHERE bill_number LIKE ?`,
    { replacements: [prefix.length + 1, `${prefix}%`], type: QueryTypes.SELECT, transaction }
  );
  const seq = (parseInt(rows[0]?.seq, 10) || 0) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function logTimeline(billId, action, details, user, transaction) {
  await sequelize.query(
    `INSERT INTO purchase_bill_timeline (bill_id, action, details, user_id, user_name)
     VALUES (?, ?, ?, ?, ?)`,
    {
      replacements: [billId, action, details || null, user?.id || null, user?.name || user?.email || null],
      transaction,
    }
  );
}

// Increases product stock, moves cost_price to the weighted average, refreshes
// stock_status and writes one stock_ledger row per item.
async function applyStock(bill, items, user, transaction) {
  for (const it of items) {
    if (!it.product_id) continue;
    const qtyIn = r3(Number(it.quantity) + Number(it.free_quantity || 0));
    if (qtyIn <= 0) continue;

    const rows = await sequelize.query(
      "SELECT id, stock, cost_price FROM products WHERE id = ? FOR UPDATE",
      { replacements: [it.product_id], type: QueryTypes.SELECT, transaction }
    );
    if (!rows.length) continue;

    const oldStock = Math.max(0, Number(rows[0].stock) || 0);
    const oldCost = Number(rows[0].cost_price) || 0;
    const newStock = oldStock + qtyIn;
    // Weighted average cost; free quantity dilutes the average (paid amount
    // spreads over paid + free units).
    const paidQty = Number(it.quantity) || 0;
    const newCost =
      newStock > 0 ? r2((oldStock * oldCost + paidQty * Number(it.purchase_price)) / newStock) : oldCost;

    await sequelize.query(
      `UPDATE products SET stock = ?, cost_price = ?, stock_status = ? WHERE id = ?`,
      {
        replacements: [Math.round(newStock), newCost, newStock > 0 ? "in_stock" : "out_of_stock", it.product_id],
        transaction,
      }
    );

    await sequelize.query(
      `INSERT INTO stock_ledger
        (product_id, txn_type, ref_type, ref_id, warehouse, qty_in, qty_out, balance_qty, unit_cost, batch_number, expiry_date, narration, created_by)
       VALUES (?, 'purchase', 'purchase_bill', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          it.product_id,
          bill.id,
          bill.warehouse || "Main",
          qtyIn,
          newStock,
          it.purchase_price,
          it.batch_number || null,
          it.expiry_date || null,
          `Purchase ${bill.bill_number}`,
          user?.id || null,
        ],
        transaction,
      }
    );
  }
}

// Mirror of applyStock: subtracts quantities and writes reversal ledger rows.
// Cost price is left at its current average (reversing an average is lossy).
async function reverseStock(bill, items, user, transaction) {
  for (const it of items) {
    if (!it.product_id) continue;
    const qtyOut = r3(Number(it.quantity) + Number(it.free_quantity || 0));
    if (qtyOut <= 0) continue;

    const rows = await sequelize.query(
      "SELECT id, stock FROM products WHERE id = ? FOR UPDATE",
      { replacements: [it.product_id], type: QueryTypes.SELECT, transaction }
    );
    if (!rows.length) continue;

    const newStock = Math.max(0, (Number(rows[0].stock) || 0) - qtyOut);
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
       VALUES (?, 'purchase_reversal', 'purchase_bill', ?, ?, 0, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          it.product_id,
          bill.id,
          bill.warehouse || "Main",
          qtyOut,
          newStock,
          it.purchase_price,
          `Reversal of ${bill.bill_number}`,
          user?.id || null,
        ],
        transaction,
      }
    );
  }
}

// The vendor ledger debit lives and dies with the bill's approved state.
async function syncVendorLedgerDebit(bill, shouldExist, user, transaction) {
  if (!bill.vendor_id) return;
  await sequelize.query(
    "DELETE FROM vendor_ledger WHERE bill_id = ? AND entry_type = 'bill'",
    { replacements: [bill.id], transaction }
  );
  if (shouldExist) {
    await sequelize.query(
      `INSERT INTO vendor_ledger (vendor_id, bill_id, entry_date, entry_type, narration, debit, credit, created_by)
       VALUES (?, ?, ?, 'bill', ?, ?, 0, ?)`,
      {
        replacements: [
          bill.vendor_id,
          bill.id,
          bill.purchase_date,
          `Purchase bill ${bill.bill_number}`,
          bill.grand_total,
          user?.id || null,
        ],
        transaction,
      }
    );
  }
}

// Indian numbering (lakh/crore) amount-in-words for the PDF footer.
function amountInWords(num) {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n) => (n < 20 ? a[n] : `${b[Math.floor(n / 10)]}${n % 10 ? " " + a[n % 10] : ""}`);
  const three = (n) =>
    n >= 100 ? `${a[Math.floor(n / 100)]} Hundred${n % 100 ? " " + two(n % 100) : ""}` : two(n);

  let n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return "Zero Rupees Only";
  const paise = Math.round((Math.abs(num) - n) * 100);
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  let words = `${parts.join(" ")} Rupees`;
  if (paise) words += ` and ${two(paise)} Paise`;
  return `${words} Only`;
}

module.exports = {
  r2,
  r3,
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
};
