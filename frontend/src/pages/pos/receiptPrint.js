import { fmtDateTime, inr } from "./constants";

// Opens an instant in-browser print window for a completed sale, sized for
// an 80mm thermal receipt printer (falls back gracefully to A4 if printed
// from a regular printer). Same window.open + window.print() pattern as
// src/pages/purchase/printBill.js — no server round-trip needed.
export function printReceipt({ sale, items = [], payments = [] }) {
  const rows = items
    .map(
      (it) => `
      <tr>
        <td>${esc(it.product_name)}${it.sku ? `<br><small>${esc(it.sku)}</small>` : ""}</td>
        <td class="c">${Number(it.quantity)}</td>
        <td class="r">${inr(it.unit_price)}</td>
        <td class="r">${inr(it.total)}</td>
      </tr>`
    )
    .join("");

  const paymentRows = payments
    .map((p) => `<tr><td>${esc(p.method?.toUpperCase())}</td><td class="r">${inr(p.amount)}</td></tr>`)
    .join("");

  const discount = Number(sale.item_discount) + Number(sale.bill_discount) + Number(sale.coupon_discount);
  const gstTotal = Number(sale.cgst) + Number(sale.sgst) + Number(sale.igst);

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sale.sale_number)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; width: 80mm; margin: 0 auto; padding: 10px 8px; font-size: 11px; }
    .center { text-align: center; }
    h1 { font-size: 14px; letter-spacing: 0.5px; margin-bottom: 2px; }
    .muted { color: #64748b; font-size: 10px; }
    .divider { border-top: 1px dashed #94a3b8; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 9px; letter-spacing: 0.5px; color: #64748b; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1; }
    td { padding: 4px 0; vertical-align: top; }
    .c { text-align: center; }
    .r { text-align: right; }
    small { color: #64748b; }
    .totals td { padding: 2px 0; }
    .grand { font-weight: 700; font-size: 13px; border-top: 1px solid #0f172a; padding-top: 4px; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #1e1b4b; color: #fff; font-size: 9px; letter-spacing: 1px; margin-top: 4px; }
    @media print { body { width: 80mm; } }
  </style></head><body>
    <div class="center">
      <h1>DIVYA DARSHNAM</h1>
      <div class="muted">Point of Sale Receipt</div>
      <div class="badge">${esc(sale.sale_number)}</div>
    </div>
    <div class="divider"></div>
    <div>Date: ${fmtDateTime(sale.completed_at || sale.created_at)}</div>
    <div>Customer: ${esc(sale.customer_name || "Walk-in")}</div>
    ${sale.customer_phone ? `<div>Phone: ${esc(sale.customer_phone)}</div>` : ""}
    <div class="divider"></div>
    <table>
      <thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Amt</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="divider"></div>
    <table class="totals">
      <tr><td>Subtotal</td><td class="r">${inr(sale.subtotal)}</td></tr>
      ${discount ? `<tr><td>Discount</td><td class="r">- ${inr(discount)}</td></tr>` : ""}
      ${gstTotal ? `<tr><td>GST</td><td class="r">${inr(gstTotal)}</td></tr>` : ""}
      ${Number(sale.round_off) ? `<tr><td>Round Off</td><td class="r">${inr(sale.round_off)}</td></tr>` : ""}
      <tr class="grand"><td>TOTAL</td><td class="r">${inr(sale.grand_total)}</td></tr>
    </table>
    <div class="divider"></div>
    <table class="totals">
      <tr><td colspan="2" class="muted">PAYMENT</td></tr>
      ${paymentRows}
    </table>
    <div class="divider"></div>
    <div class="center muted">Thank you for shopping with us!</div>
    <div class="center muted">Goods once sold are not returnable after 7 days.</div>
    <script>window.onload = () => { window.print(); };</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=420,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
