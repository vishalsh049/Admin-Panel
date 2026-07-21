// Shared constants + formatting helpers for the Orders module.

export const ORDER_STATUSES = [
  { value: "pending", label: "Pending", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" },
  { value: "processing", label: "Processing", badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300" },
  { value: "shipped", label: "Shipped", badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300" },
  { value: "delivered", label: "Delivered", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" },
  { value: "cancelled", label: "Cancelled", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" },
];

export const PAYMENT_STATUSES = [
  { value: "not_applicable", label: "COD", badge: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300" },
  { value: "created", label: "Awaiting Payment", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" },
  { value: "paid", label: "Paid", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" },
  { value: "failed", label: "Failed", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" },
  { value: "refund_initiated", label: "Refund Initiated", badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300" },
  { value: "partially_refunded", label: "Partially Refunded", badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300" },
  { value: "refunded", label: "Refunded", badge: "border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300" },
];

export const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "razorpay", label: "Razorpay" },
  { value: "upi", label: "UPI" },
];

export const statusInfo = (value) => ORDER_STATUSES.find((s) => s.value === value) || ORDER_STATUSES[0];

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
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";
