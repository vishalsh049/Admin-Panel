// Shared constants + formatting helpers for the Purchase Bills module.

export const BILL_STATUSES = [
  { value: "draft", label: "Draft", badge: "border-slate-200 bg-slate-100 text-slate-600" },
  { value: "pending", label: "Pending Approval", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "approved", label: "Approved", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "rejected", label: "Rejected", badge: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "cancelled", label: "Cancelled", badge: "border-slate-300 bg-slate-200 text-slate-500" },
  { value: "completed", label: "Completed", badge: "border-sky-200 bg-sky-50 text-sky-700" },
];

export const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Unpaid", badge: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "partial", label: "Partial", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "paid", label: "Paid", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
];

export const PAYMENT_MODES = ["cash", "upi", "bank", "cheque", "card", "credit"];

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

export const UNITS = ["pcs", "box", "kg", "g", "ltr", "ml", "mtr", "set", "dozen", "pack"];

export const statusInfo = (value) =>
  BILL_STATUSES.find((s) => s.value === value) || BILL_STATUSES[0];

export const paymentInfo = (value) =>
  PAYMENT_STATUSES.find((s) => s.value === value) || PAYMENT_STATUSES[0];

export const inr = (n, opts = {}) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: opts.decimals ?? 2,
    maximumFractionDigits: opts.decimals ?? 2,
  })}`;

export const inrCompact = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

export const today = () => new Date().toISOString().slice(0, 10);

export const isOverdue = (bill) =>
  bill.due_date &&
  new Date(bill.due_date) < new Date(new Date().toDateString()) &&
  Number(bill.balance_amount) > 0 &&
  !["cancelled", "rejected", "draft"].includes(bill.status);

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Client-side mirror of the server's per-item math (server remains authoritative).
export function computeItem(it) {
  const qty = Number(it.quantity) || 0;
  const price = Number(it.purchase_price) || 0;
  const gross = r2(qty * price);
  const dp = Number(it.discount_percent) || 0;
  const discount = dp > 0 ? r2((gross * dp) / 100) : Math.min(r2(it.discount_amount), gross);
  const taxable = r2(gross - discount);
  const gst = r2((taxable * (Number(it.gst_percent) || 0)) / 100);
  const cess = r2((taxable * (Number(it.cess_percent) || 0)) / 100);
  return { gross, discount, taxable, gst, cess, total: r2(taxable + gst + cess) };
}

export function computeTotals(items, header) {
  const rows = items.map(computeItem);
  const subtotal = r2(rows.reduce((s, x) => s + x.gross, 0));
  const itemDiscount = r2(rows.reduce((s, x) => s + x.discount, 0));
  const taxable = r2(rows.reduce((s, x) => s + x.taxable, 0));
  const totalGst = r2(rows.reduce((s, x) => s + x.gst, 0));
  const cess = r2(rows.reduce((s, x) => s + x.cess, 0));
  const intra = header.gst_type !== "inter";
  const cgst = intra ? r2(totalGst / 2) : 0;
  const sgst = intra ? r2(totalGst - cgst) : 0;
  const igst = intra ? 0 : totalGst;
  const billDiscount = Number(header.bill_discount) || 0;
  const shipping = Number(header.shipping_charges) || 0;
  const packing = Number(header.packing_charges) || 0;
  const other = Number(header.other_charges) || 0;
  const tdsPercent = Number(header.tds_percent) || 0;
  const tds = tdsPercent > 0 ? r2((taxable * tdsPercent) / 100) : Number(header.tds_amount) || 0;
  const raw = r2(taxable + totalGst + cess + shipping + packing + other - billDiscount - tds);
  const grand = Math.max(0, Math.round(raw));
  return {
    subtotal, itemDiscount, billDiscount, taxable, cgst, sgst, igst, cess,
    shipping, packing, other, tds, roundOff: r2(grand - raw), grand,
  };
}
