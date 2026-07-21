import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, PlayCircle, Trash2, PauseCircle } from "lucide-react";
import toast from "react-hot-toast";
import { fetchPosSales, voidPosSale } from "../../services/posService";
import { inr, fmtDateTime } from "./constants";

export default function HoldResumeDrawer({ open, onClose, onResume }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchPosSales({ status: "held", limit: 50 });
      setSales(data.sales || []);
    } catch {
      toast.error("Failed to load held sales");
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscard(id) {
    try {
      await voidPosSale({ id, reason: "Held sale discarded" });
      toast.success("Held sale discarded");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to discard");
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <PauseCircle className="h-4 w-4 text-amber-500" /> Held Orders
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-sm text-slate-400">Loading…</p>
          ) : sales.length === 0 ? (
            <p className="mt-10 text-center text-sm text-slate-400">No held sales right now</p>
          ) : (
            <div className="space-y-2">
              {sales.map((s) => (
                <div key={s.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{s.sale_number}</span>
                    <span className="text-xs text-slate-400">{fmtDateTime(s.created_at)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {s.customer_name || "Walk-in"} · {s.items_count} item{s.items_count === 1 ? "" : "s"}
                    </span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{inr(s.grand_total)}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onResume(s)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <PlayCircle className="h-3.5 w-3.5" /> Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDiscard(s.id)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
