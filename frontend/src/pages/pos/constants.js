// POS-specific constants. Formatting helpers (inr, fmtDate, fmtDateTime) are
// intentionally reused from the purchase-bills module instead of duplicated.
export { inr, inrCompact, fmtDate, fmtDateTime, today, r2 } from "../purchase/constants";

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "wallet", label: "Wallet" },
  { value: "credit", label: "Credit" },
];

export const SALE_STATUSES = [
  { value: "held", label: "Held", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "completed", label: "Completed", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "voided", label: "Voided", badge: "border-slate-300 bg-slate-200 text-slate-500" },
  { value: "refunded", label: "Refunded", badge: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "partially_refunded", label: "Partially Refunded", badge: "border-orange-200 bg-orange-50 text-orange-700" },
];

export const statusInfo = (value) =>
  SALE_STATUSES.find((s) => s.value === value) || SALE_STATUSES[0];

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

// Generates a fresh idempotency key for one checkout attempt so a
// double-submit (double-click, network retry) can never create two sales.
export const newIdempotencyKey = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Client-side mirror of the server's per-item math, for live cart display
// only — the server (utils/posSaleHelpers.js computeSale) remains authoritative.
export function computeCartTotals(items, { bill_discount = 0, coupon_discount = 0 } = {}) {
  const rows = items.map((it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unit_price) || 0;
    const gross = round2(qty * price);
    const dp = Number(it.discount_percent) || 0;
    const discount = dp > 0 ? round2((gross * dp) / 100) : Math.min(round2(it.discount_amount) || 0, gross);
    const taxable = round2(gross - discount);
    const gst = round2((taxable * (Number(it.gst_percent) || 0)) / 100);
    return { gross, discount, taxable, gst, total: round2(taxable + gst) };
  });

  const subtotal = round2(rows.reduce((s, r) => s + r.gross, 0));
  const itemDiscount = round2(rows.reduce((s, r) => s + r.discount, 0));
  const grossTaxable = round2(rows.reduce((s, r) => s + r.taxable, 0));
  const totalGst = round2(rows.reduce((s, r) => s + r.gst, 0));

  const extraDiscount = round2(Number(bill_discount) + Number(coupon_discount));
  const discountRatio = grossTaxable > 0 ? Math.min(1, extraDiscount / grossTaxable) : 0;
  const taxableAmount = Math.max(0, round2(grossTaxable - extraDiscount));
  const effectiveGst = round2(totalGst * (1 - discountRatio));

  const rawTotal = round2(taxableAmount + effectiveGst);
  const grandTotal = Math.max(0, Math.round(rawTotal));

  return {
    subtotal,
    itemDiscount,
    billDiscount: Number(bill_discount) || 0,
    couponDiscount: Number(coupon_discount) || 0,
    taxableAmount,
    gst: effectiveGst,
    roundOff: round2(grandTotal - rawTotal),
    grandTotal,
  };
}
