import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Search, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { fetchPosSales, fetchPosSale, returnPosSale } from "../../services/posService";
import { PAYMENT_METHODS, inr, fmtDateTime } from "./constants";

export default function ReturnsModal({ open, onClose, onDone }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [qtyByItem, setQtyByItem] = useState({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await fetchPosSales({ search: query.trim(), limit: 20 });
      setResults((data.sales || []).filter((s) => ["completed", "partially_refunded"].includes(s.status)));
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function openSale(id) {
    try {
      const data = await fetchPosSale(id);
      setSale(data.sale);
      setItems(data.items);
      setQtyByItem({});
    } catch {
      toast.error("Failed to load sale");
    }
  }

  function reset() {
    setSale(null);
    setItems([]);
    setQtyByItem({});
    setResults([]);
    setQuery("");
    setReason("");
  }

  async function handleSubmit() {
    const lines = Object.entries(qtyByItem)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([sale_item_id, quantity]) => ({ sale_item_id: Number(sale_item_id), quantity: Number(quantity) }));
    if (!lines.length) return toast.error("Enter a quantity to return");

    setSubmitting(true);
    try {
      await returnPosSale({ id: sale.id, items: lines, reason, refund_method: refundMethod });
      toast.success("Return processed");
      reset();
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Return failed");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-3xl border border-white/60 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Undo2 className="h-4 w-4 text-rose-500" /> Returns &amp; Refunds
          </h2>
          <button type="button" onClick={() => { reset(); onClose(); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!sale ? (
            <>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Sale number or customer phone"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <button type="submit" disabled={searching} className="rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                  Search
                </button>
              </form>

              <div className="mt-3 space-y-2">
                {results.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openSale(s.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{s.sale_number}</span>
                      <span className="ml-2 text-xs text-slate-400">{fmtDateTime(s.created_at)}</span>
                    </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{inr(s.grand_total)}</span>
                  </button>
                ))}
                {!searching && query && results.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400">No returnable sales found</p>
                )}
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={reset} className="mb-3 text-xs font-semibold text-indigo-600">← Search again</button>
              <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {sale.sale_number} · {sale.customer_name || "Walk-in"}
              </p>

              <div className="space-y-2">
                {items.map((it) => {
                  const returnable = Number(it.quantity) - Number(it.returned_quantity);
                  return (
                    <div key={it.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{it.product_name}</p>
                        <p className="text-[11px] text-slate-400">Returnable: {returnable} of {Number(it.quantity)}</p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={returnable}
                        disabled={returnable <= 0}
                        value={qtyByItem[it.id] || ""}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(returnable, Number(e.target.value) || 0));
                          setQtyByItem((prev) => ({ ...prev, [it.id]: v }));
                        }}
                        placeholder="0"
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {PAYMENT_METHODS.filter((m) => m.value !== "credit").map((m) => (
                    <option key={m.value} value={m.value}>Refund via {m.label}</option>
                  ))}
                </select>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </>
          )}
        </div>

        {sale && (
          <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-rose-700 disabled:opacity-60"
            >
              {submitting ? "Processing…" : "Process Return"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
