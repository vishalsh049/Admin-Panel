import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Banknote, Smartphone, CreditCard, Wallet, Receipt } from "lucide-react";
import { PAYMENT_METHODS, inr } from "./constants";

const ICONS = { cash: Banknote, upi: Smartphone, card: CreditCard, wallet: Wallet, credit: Receipt };

export default function PaymentModal({ open, grandTotal, onClose, onConfirm, submitting }) {
  const [tenders, setTenders] = useState([{ method: "cash", amount: grandTotal, reference_number: "" }]);
  const [cashGiven, setCashGiven] = useState(grandTotal);

  useEffect(() => {
    if (open) {
      setTenders([{ method: "cash", amount: grandTotal, reference_number: "" }]);
      setCashGiven(grandTotal);
    }
  }, [open, grandTotal]);

  if (!open) return null;

  const paid = tenders.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const remaining = Math.round((grandTotal - paid) * 100) / 100;
  const isSettled = Math.abs(remaining) < 0.01;
  const cashTender = tenders.find((t) => t.method === "cash");
  const changeDue = cashTender ? Math.max(0, Math.round((cashGiven - cashTender.amount) * 100) / 100) : 0;

  function updateTender(idx, patch) {
    setTenders((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }

  function addTender() {
    setTenders((prev) => [...prev, { method: "upi", amount: Math.max(0, remaining), reference_number: "" }]);
  }

  function removeTender(idx) {
    setTenders((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleConfirm() {
    if (!isSettled) return;
    onConfirm(tenders.map((t) => ({ ...t, amount: Number(t.amount) || 0 })));
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Take Payment</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center justify-between rounded-2xl bg-indigo-50 px-4 py-3 dark:bg-indigo-900/30">
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Amount Due</span>
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{inr(grandTotal)}</span>
          </div>

          <div className="space-y-2">
            {tenders.map((t, idx) => {
              const Icon = ICONS[t.method] || Banknote;
              return (
                <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <select
                    value={t.method}
                    onChange={(e) => updateTender(idx, { method: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={t.amount}
                    onChange={(e) => updateTender(idx, { amount: e.target.value })}
                    className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  {t.method !== "cash" && (
                    <input
                      value={t.reference_number}
                      onChange={(e) => updateTender(idx, { reference_number: e.target.value })}
                      placeholder="Ref. no."
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                    />
                  )}
                  {tenders.length > 1 && (
                    <button type="button" onClick={() => removeTender(idx)} className="shrink-0 text-slate-300 hover:text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addTender}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" /> Split payment
            </button>
          </div>

          {cashTender && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-900">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Cash tendered</label>
              <input
                type="number"
                value={cashGiven}
                onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${isSettled ? "text-emerald-600" : "text-rose-600"}`}>
              {isSettled ? "Fully paid" : remaining > 0 ? `Remaining: ${inr(remaining)}` : `Overpaid by ${inr(-remaining)}`}
            </span>
            {changeDue > 0 && isSettled && (
              <span className="font-semibold text-slate-700 dark:text-slate-200">Change due: {inr(changeDue)}</span>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isSettled || submitting}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Processing…" : "Complete Sale"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
