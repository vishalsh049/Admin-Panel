import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";

const STATUS_FILTERS = [
  { value: "all", label: "All Payments" },
  { value: "paid", label: "Paid" },
  { value: "created", label: "Awaiting Payment" },
  { value: "failed", label: "Failed" },
  { value: "refund_initiated", label: "Refund Initiated" },
  { value: "partially_refunded", label: "Partially Refunded" },
  { value: "refunded", label: "Refunded" },
];

const STATUS_BADGES = {
  paid: "bg-green-100 text-green-700",
  created: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refund_initiated: "bg-blue-100 text-blue-700",
  partially_refunded: "bg-blue-100 text-blue-700",
  refunded: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS = {
  paid: "Paid",
  created: "Awaiting Payment",
  failed: "Failed",
  refund_initiated: "Refund Initiated",
  partially_refunded: "Partially Refunded",
  refunded: "Refunded",
};

export default function Payments() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: String(page), limit: "20", status });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`${BASE_URL}/api/store/payments/admin/list?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to fetch payments");
      setRows(data.data || []);
      setMeta({ total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, debouncedSearch]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-3xl font-semibold">Payments</h2>
          <p className="text-sm text-slate-500 mt-1">
            Online (Razorpay) payments across all website orders — {meta.total} total
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by order id, payment id, customer name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {STATUS_FILTERS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment ID</th>
              <th className="p-3">Refund</th>
              <th className="p-3">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="p-8 text-center text-slate-400">Loading payments...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-slate-400">No online payments found.</td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-slate-50">
                <td className="p-3 font-medium">#{row.id}</td>
                <td className="p-3">
                  <p className="font-medium">{row.customerName}</p>
                  <p className="text-xs text-slate-400">{row.customerEmail}</p>
                </td>
                <td className="p-3 font-semibold">₹{Number(row.totalPrice).toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[row.paymentStatus] || "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[row.paymentStatus] || row.paymentStatus}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs">{row.razorpayPaymentId || "—"}</td>
                <td className="p-3 text-xs">
                  {row.refundId ? `₹${Number(row.refundAmount || 0).toFixed(2)}` : "—"}
                </td>
                <td className="p-3 text-xs text-slate-500">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => navigate(`/orders/${row.id}`)}
                    className="text-indigo-600 hover:underline text-xs font-medium"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={meta.page <= 1}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {meta.page} of {meta.pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={meta.page >= meta.pages}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
