import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wallet, X } from "lucide-react";
import { addBillPayment } from "../../services/purchaseBillService";
import { PAYMENT_MODES, inr, today } from "./constants";

const inputCls =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

export default function PaymentModal({ bill, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    amount: "", mode: "cash", payment_date: today(),
    transaction_number: "", reference_number: "", bank_name: "", notes: "",
  });

  useEffect(() => {
    if (bill) setForm((f) => ({ ...f, amount: Number(bill.balance_amount) || "" }));
  }, [bill]);

  const mutation = useMutation({
    mutationFn: (payload) => addBillPayment({ id: bill.id, ...payload }),
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["purchase-bills"] });
      qc.invalidateQueries({ queryKey: ["purchase-dashboard"] });
      qc.invalidateQueries({ queryKey: ["purchase-bill", bill.id] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to record payment"),
  });

  if (!bill) return null;

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 20, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="w-full max-w-md overflow-hidden rounded-[24px] border border-white/40 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <Wallet className="h-5 w-5" />
            <div>
              <h3 className="text-base font-semibold">Record Payment</h3>
              <p className="text-xs text-white/75">{bill.bill_number} · {bill.vendor_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 transition hover:bg-white/20"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3.5 p-5">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
            <span className="text-slate-500">Outstanding balance</span>
            <span className="font-bold text-rose-600">{inr(bill.balance_amount)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Amount *</span>
              <input type="number" min="0.01" step="any" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} autoFocus />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Mode</span>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className={inputCls}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Payment Date</span>
              <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Txn / UTR No</span>
              <input value={form.transaction_number} onChange={(e) => setForm({ ...form, transaction_number: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Reference No</span>
              <input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} className={inputCls} />
            </label>
            {["bank", "cheque"].includes(form.mode) && (
              <label className="col-span-2 block">
                <span className="mb-1 block text-[11px] font-medium text-slate-500">Bank Name</span>
                <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className={inputCls} />
              </label>
            )}
            <label className="col-span-2 block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Notes</span>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
            </label>
          </div>
          <button
            onClick={() => {
              if (!Number(form.amount)) return toast.error("Enter a payment amount");
              mutation.mutate(form);
            }}
            disabled={mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            Record Payment of {inr(form.amount || 0)}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
