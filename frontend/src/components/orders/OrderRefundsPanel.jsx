import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { addManualRefund, fetchOrderRefunds } from "../../services/orderService";

export default function OrderRefundsPanel({ orderId, readOnly }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ amount: "", reason: "", method: "manual" });
  const [showForm, setShowForm] = useState(false);

  const { data: refunds = [] } = useQuery({
    queryKey: ["order-refunds", orderId],
    queryFn: () => fetchOrderRefunds(orderId),
  });

  const addMutation = useMutation({
    mutationFn: addManualRefund,
    onSuccess: () => {
      toast.success("Refund recorded");
      setForm({ amount: "", reason: "", method: "manual" });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["order-refunds", orderId] });
      qc.invalidateQueries({ queryKey: ["order-timeline", orderId] });
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to record refund"),
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow dark:bg-slate-900 dark:shadow-none dark:border dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold dark:text-slate-100">Refunds</h3>
        {!readOnly && (
          <button onClick={() => setShowForm((v) => !v)} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
            {showForm ? "Cancel" : "+ Record Manual Refund"}
          </button>
        )}
      </div>

      {!readOnly && showForm && (
        <div className="mb-4 space-y-2 rounded-lg border border-slate-100 dark:border-slate-800 p-3">
          <div className="flex gap-2">
            <input
              type="number" min="1" placeholder="Amount"
              value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <select
              value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="manual">Manual / Cash</option>
              <option value="store_credit">Store Credit</option>
            </select>
          </div>
          <input
            placeholder="Reason"
            value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            disabled={!(Number(form.amount) > 0) || addMutation.isPending}
            onClick={() => addMutation.mutate({ id: orderId, ...form, amount: Number(form.amount) })}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {addMutation.isPending ? "Saving..." : "Save Refund"}
          </button>
        </div>
      )}

      {refunds.length === 0 ? (
        <p className="text-sm text-slate-400">No refunds recorded for this order.</p>
      ) : (
        <div className="space-y-2">
          {refunds.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-sm">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">₹{Number(r.amount).toFixed(2)} <span className="font-normal text-slate-400">· {r.method}</span></p>
                {r.reason && <p className="text-xs text-slate-500 dark:text-slate-400">{r.reason}</p>}
              </div>
              <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
