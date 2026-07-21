import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { inr } from "./constants";

export default function CartPanel({ items, onUpdateQty, onUpdateGst, onRemove }) {
  if (!items.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-slate-300 dark:text-slate-600">
        <ShoppingCart className="mb-2 h-10 w-10" />
        <p className="text-sm">Cart is empty — search or scan a product</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
      {items.map((it) => (
        <div
          key={it.key}
          className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{it.product_name}</p>
              <p className="text-[11px] text-slate-400">
                {it.sku || "—"} {it.variation_id ? "· variant" : ""} · {inr(it.unit_price, { decimals: 0 })} / {it.unit}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(it.key)}
              className="shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
              <button
                type="button"
                onClick={() => onUpdateQty(it.key, it.quantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200"
              >
                <Minus className="h-3 w-3" />
              </button>
              <input
                type="number"
                value={it.quantity}
                onChange={(e) => onUpdateQty(it.key, Number(e.target.value) || 0)}
                className="w-10 bg-transparent text-center text-sm font-semibold text-slate-800 outline-none dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => onUpdateQty(it.key, it.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>GST</span>
              <input
                type="number"
                value={it.gst_percent}
                onChange={(e) => onUpdateGst(it.key, Number(e.target.value) || 0)}
                className="w-12 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-right text-xs text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
              <span>%</span>
            </div>

            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {inr((it.unit_price * it.quantity * (1 - (it.discount_percent || 0) / 100)) * (1 + (it.gst_percent || 0) / 100))}
            </span>
          </div>

          {it.maxStock != null && it.quantity >= it.maxStock && (
            <p className="mt-1 text-[10px] font-medium text-amber-600">Max available stock reached</p>
          )}
        </div>
      ))}
    </div>
  );
}
