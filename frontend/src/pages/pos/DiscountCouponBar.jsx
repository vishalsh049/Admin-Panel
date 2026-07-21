import { Tag, Percent } from "lucide-react";

export default function DiscountCouponBar({ billDiscount, onBillDiscountChange, couponCode, onCouponCodeChange, couponDiscount, onCouponDiscountChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 px-4">
      <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800">
        <Percent className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          type="number"
          min={0}
          value={billDiscount || ""}
          onChange={(e) => onBillDiscountChange(Number(e.target.value) || 0)}
          placeholder="Bill discount ₹"
          className="w-full bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
        />
      </label>

      <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800">
        <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          value={couponCode}
          onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
          placeholder="Coupon code"
          className="min-w-0 flex-1 bg-transparent text-xs font-medium uppercase text-slate-700 outline-none placeholder:text-slate-400 placeholder:normal-case dark:text-slate-200"
        />
        <input
          type="number"
          min={0}
          value={couponDiscount || ""}
          onChange={(e) => onCouponDiscountChange(Number(e.target.value) || 0)}
          placeholder="₹"
          className="w-12 shrink-0 bg-transparent text-right text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
        />
      </label>
    </div>
  );
}
