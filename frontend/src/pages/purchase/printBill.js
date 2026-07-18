import { fmtDate, inr } from "./constants";

// Opens a print-ready A4 window for one bill. The server PDF (pdfkit) is the
// downloadable artifact; this is the instant in-browser print path.
export function printBill(detail) {
  const { bill, items = [] } = detail;
  const gstTotal = Number(bill.cgst) + Number(bill.sgst) + Number(bill.igst) + Number(bill.cess);

  const rows = items
    .map(
      (it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(it.product_name)}</strong>${it.batch_number ? `<br><small>Batch: ${esc(it.batch_number)}</small>` : ""}</td>
        <td>${esc(it.hsn) || "—"}</td>
        <td class="r">${Number(it.quantity)}${Number(it.free_quantity) ? ` +${Number(it.free_quantity)}` : ""} ${esc(it.unit)}</td>
        <td class="r">${inr(it.purchase_price)}</td>
        <td class="r">${Number(it.discount_amount) ? inr(it.discount_amount) : "—"}</td>
        <td class="r">${inr(it.gst_amount)}<br><small>${Number(it.gst_percent)}%</small></td>
        <td class="r"><strong>${inr(it.total)}</strong></td>
      </tr>`
    )
    .join("");

  const totalsRows = [
    ["Subtotal", inr(bill.subtotal)],
    Number(bill.item_discount) ? ["Item Discount", `- ${inr(bill.item_discount)}`] : null,
    Number(bill.bill_discount) ? ["Bill Discount", `- ${inr(bill.bill_discount)}`] : null,
    ["Taxable Amount", inr(bill.taxable_amount)],
    Number(bill.cgst) ? ["CGST", inr(bill.cgst)] : null,
    Number(bill.sgst) ? ["SGST", inr(bill.sgst)] : null,
    Number(bill.igst) ? ["IGST", inr(bill.igst)] : null,
    Number(bill.cess) ? ["CESS", inr(bill.cess)] : null,
    Number(bill.shipping_charges) ? ["Shipping", inr(bill.shipping_charges)] : null,
    Number(bill.packing_charges) ? ["Packing", inr(bill.packing_charges)] : null,
    Number(bill.other_charges) ? ["Other Charges", inr(bill.other_charges)] : null,
    Number(bill.tds_amount) ? ["TDS", `- ${inr(bill.tds_amount)}`] : null,
    ["Round Off", inr(bill.round_off)],
  ]
    .filter(Boolean)
    .map(([k, v]) => `<tr><td>${k}</td><td class="r">${v}</td></tr>`)
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(bill.bill_number)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 28px; font-size: 12px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; background: #1e1b4b; color: #fff; padding: 20px 24px; border-radius: 12px; }
    .head h1 { font-size: 20px; letter-spacing: 0.5px; }
    .head .meta { text-align: right; }
    .head .meta h2 { font-size: 15px; letter-spacing: 2px; color: #c7d2fe; }
    .panels { display: flex; gap: 12px; margin: 16px 0; }
    .panel { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
    .panel h3 { font-size: 10px; letter-spacing: 1.5px; color: #6d28d9; margin-bottom: 6px; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.items th { background: #312e81; color: #fff; font-size: 10px; letter-spacing: 1px; padding: 8px 8px; text-align: left; }
    table.items th.r, td.r { text-align: right; }
    table.items td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    table.items tr:nth-child(even) td { background: #f8fafc; }
    small { color: #64748b; }
    .bottom { display: flex; justify-content: space-between; gap: 16px; margin-top: 14px; }
    table.totals { width: 260px; border-collapse: collapse; }
    table.totals td { padding: 4px 6px; font-size: 12px; }
    table.totals td.r { font-weight: 600; }
    .grand { background: #1e1b4b; color: #fff; border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; width: 260px; margin-top: 6px; font-weight: 700; font-size: 14px; }
    .words { max-width: 55%; }
    .words h3 { font-size: 10px; letter-spacing: 1.5px; color: #6d28d9; margin-bottom: 4px; }
    .foot { margin-top: 40px; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; color: #94a3b8; font-size: 10px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; background: rgba(255,255,255,0.15); font-size: 10px; letter-spacing: 1px; margin-top: 6px; }
    @media print { body { padding: 10px; } }
  </style></head><body>
    <div class="head">
      <div>
        <h1>PURCHASE BILL</h1>
        <div class="badge">${esc(String(bill.status).toUpperCase())} · ${esc(String(bill.payment_status).toUpperCase())}</div>
      </div>
      <div class="meta">
        <h2>${esc(bill.bill_number)}</h2>
        <p>Purchase Date: ${fmtDate(bill.purchase_date)}</p>
        ${bill.invoice_number ? `<p>Invoice: ${esc(bill.invoice_number)} (${fmtDate(bill.invoice_date)})</p>` : ""}
        ${bill.due_date ? `<p>Due: ${fmtDate(bill.due_date)}</p>` : ""}
      </div>
    </div>
    <div class="panels">
      <div class="panel">
        <h3>VENDOR</h3>
        <p><strong>${esc(bill.vendor_name)}</strong></p>
        ${bill.billing_address ? `<p>${esc(bill.billing_address)}</p>` : ""}
        ${bill.vendor_gstin ? `<p>GSTIN: ${esc(bill.vendor_gstin)}</p>` : ""}
        ${[bill.vendor_phone, bill.vendor_email].filter(Boolean).map(esc).join(" · ")}
      </div>
      <div class="panel">
        <h3>DETAILS</h3>
        <p>Warehouse: <strong>${esc(bill.warehouse || "Main")}</strong></p>
        <p>GST Type: ${bill.gst_type === "inter" ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}</p>
        ${bill.payment_terms ? `<p>Terms: ${esc(bill.payment_terms)}</p>` : ""}
        ${bill.reference_number ? `<p>Reference: ${esc(bill.reference_number)}</p>` : ""}
        <p>GST Input Credit: <strong>${inr(gstTotal)}</strong></p>
      </div>
    </div>
    <table class="items">
      <thead><tr><th>#</th><th>ITEM</th><th>HSN</th><th class="r">QTY</th><th class="r">RATE</th><th class="r">DISC</th><th class="r">GST</th><th class="r">AMOUNT</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="bottom">
      <div class="words">
        ${bill.remarks ? `<h3>REMARKS</h3><p>${esc(bill.remarks)}</p>` : ""}
        <h3 style="margin-top:10px">PAYMENT</h3>
        <p>Paid: <strong>${inr(bill.paid_amount)}</strong> &nbsp;·&nbsp; Balance: <strong>${inr(bill.balance_amount)}</strong></p>
      </div>
      <div>
        <table class="totals">${totalsRows}</table>
        <div class="grand"><span>GRAND TOTAL</span><span>${inr(bill.grand_total)}</span></div>
      </div>
    </div>
    <div class="foot">
      <span>Computer generated purchase bill — ${esc(bill.bill_number)}</span>
      <span>Authorised Signatory</span>
    </div>
    <script>window.onload = () => { window.print(); };</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

// Print the current filtered list as a compact register.
export function printBillList(bills, totals) {
  const rows = bills
    .map(
      (b, i) => `<tr>
        <td>${i + 1}</td><td>${esc(b.bill_number)}</td><td>${esc(b.vendor_name)}</td>
        <td>${esc(b.invoice_number) || "—"}</td><td>${fmtDate(b.purchase_date)}</td>
        <td>${esc(b.status)}</td><td>${esc(b.payment_status)}</td>
        <td class="r">${inr(b.grand_total)}</td><td class="r">${inr(b.paid_amount)}</td><td class="r">${inr(b.balance_amount)}</td>
      </tr>`
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Purchase Bills Register</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #0f172a; font-size: 11px; }
    h1 { font-size: 16px; margin-bottom: 2px; } p.sub { color: #64748b; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e1b4b; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; letter-spacing: 0.5px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; } .r { text-align: right; }
    tfoot td { font-weight: 700; background: #f1f5f9; }
  </style></head><body>
    <h1>Purchase Bills Register</h1>
    <p class="sub">Generated ${new Date().toLocaleString("en-IN")} · ${bills.length} bills</p>
    <table>
      <thead><tr><th>#</th><th>Bill No</th><th>Vendor</th><th>Invoice</th><th>Date</th><th>Status</th><th>Payment</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="7">TOTALS</td><td class="r">${inr(totals?.grand_total)}</td><td class="r">${inr(totals?.paid)}</td><td class="r">${inr(totals?.balance)}</td></tr></tfoot>
    </table>
    <script>window.onload = () => { window.print(); };</script>
  </body></html>`;
  const w = window.open("", "_blank", "width=1000,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
