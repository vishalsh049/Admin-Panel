import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { inr } from "./constants";

export default function VariantPickerModal({ product, onSelect, onClose }) {
  const variations = (product.variations || []).filter((v) => v.status !== "inactive");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{product.name} — choose an option</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-3">
          {variations.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-400">No active variants available</p>
          ) : (
            variations.map((v) => {
              const outOfStock = !v.in_stock;
              const label = (product.attributes || [])
                .flatMap((attr) => attr.values.filter((val) => v.attribute_value_ids?.includes(val.id)).map((val) => val.value))
                .join(" / ") || v.sku;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onSelect(v)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100">{label}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{outOfStock ? "Out of stock" : `${v.stock} in stock`}</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{inr(v.price, { decimals: 0 })}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
