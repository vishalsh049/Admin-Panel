import { useState } from "react";
import { BASE_URL } from "../utils/api";
import ConfirmModal from "./ConfirmModal";

const STATUS_BADGES = {
  paid: "bg-green-100 text-green-700",
  created: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refund_initiated: "bg-blue-100 text-blue-700",
  partially_refunded: "bg-blue-100 text-blue-700",
  refunded: "bg-blue-100 text-blue-700",
  not_applicable: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS = {
  paid: "Paid",
  created: "Awaiting Payment",
  failed: "Payment Failed",
  refund_initiated: "Refund Initiated",
  partially_refunded: "Partially Refunded",
  refunded: "Refunded",
  not_applicable: "N/A",
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Payment panel for a single order: gateway ids, live status, refund + sync
// actions. `order` is the raw store_orders row from /api/store/admin/orders/:id.
export default function OrderPaymentSection({ order, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");

  const isOnline = order.paymentMethod === "razorpay";
  const statusKey = order.paymentStatus || (order.isPaid ? "paid" : "not_applicable");

  const callApi = async (path, body) => {
    const res = await fetch(`${BASE_URL}/api/store/payments/admin/${order.id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  };

  const handleSync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await callApi("sync");
      setMessage({ type: "success", text: data.message || "Payment state synced" });
      onChanged?.();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async () => {
    setConfirmRefund(false);
    setBusy(true);
    setMessage(null);
    try {
      const body = refundAmount.trim() ? { amount: Number(refundAmount) } : {};
      const data = await callApi("refund", body);
      setMessage({ type: "success", text: data.message || "Refund initiated" });
      setRefundAmount("");
      onChanged?.();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const canRefund =
    isOnline &&
    order.isPaid &&
    order.razorpayPaymentId &&
    !["refunded", "refund_initiated"].includes(order.paymentStatus);

  return (
    <div className="bg-white p-6 rounded-xl shadow mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Payment</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[statusKey] || STATUS_BADGES.not_applicable}`}>
          {STATUS_LABELS[statusKey] || statusKey}
        </span>
      </div>

      {message && (
        <div
          className={`mb-3 px-4 py-2.5 rounded-lg text-sm ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-12 text-sm">
        <div>
          <p className="font-semibold">Method:</p>
          <p className="capitalize">{isOnline ? "Online (Razorpay)" : order.paymentMethod || "cod"}</p>
        </div>
        <div>
          <p className="font-semibold">Paid:</p>
          <p>{order.isPaid ? `Yes${order.paidAt ? ` — ${new Date(order.paidAt).toLocaleString()}` : ""}` : "No"}</p>
        </div>
        {isOnline && (
          <>
            <div>
              <p className="font-semibold">Razorpay Order ID:</p>
              <p className="font-mono text-xs">{order.razorpayOrderId || "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Razorpay Payment ID:</p>
              <p className="font-mono text-xs">{order.razorpayPaymentId || "—"}</p>
            </div>
            {order.refundId && (
              <>
                <div>
                  <p className="font-semibold">Refund ID:</p>
                  <p className="font-mono text-xs">{order.refundId}</p>
                </div>
                <div>
                  <p className="font-semibold">Refund Amount:</p>
                  <p>₹{Number(order.refundAmount || 0).toFixed(2)}</p>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {isOnline && (
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
          <button
            onClick={handleSync}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Working..." : "Sync from Razorpay"}
          </button>
          {canRefund && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={Number(order.totalPrice)}
                placeholder={`Full (₹${Number(order.totalPrice).toFixed(2)})`}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-40"
              />
              <button
                onClick={() => setConfirmRefund(true)}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
              >
                Refund
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmRefund}
        title="Confirm Refund"
        confirmLabel="Refund"
        isBusy={busy}
        message={`Refund ${
          refundAmount.trim() ? `₹${Number(refundAmount).toFixed(2)}` : `the full ₹${Number(order.totalPrice).toFixed(2)}`
        } to the customer for order #${order.id}? This cannot be undone.`}
        onConfirm={handleRefund}
        onCancel={() => setConfirmRefund(false)}
      />
    </div>
  );
}
