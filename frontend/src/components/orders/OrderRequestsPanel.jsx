import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { decideOrderRequest, fetchOrderRequests } from "../../services/orderService";

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  completed: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function OrderRequestsPanel({ orderId, onNeedsRefund, readOnly }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["order-requests", orderId],
    queryFn: () => fetchOrderRequests({ orderId }),
  });
  const requests = data?.data || [];

  const decideMutation = useMutation({
    mutationFn: decideOrderRequest,
    onSuccess: (r) => {
      toast.success("Request updated");
      if (r.needsGatewayRefund) onNeedsRefund?.();
      qc.invalidateQueries({ queryKey: ["order-requests", orderId] });
      qc.invalidateQueries({ queryKey: ["order-timeline", orderId] });
      qc.invalidateQueries({ queryKey: ["order-stats"] });
    },
    onError: () => toast.error("Failed to update request"),
  });

  if (requests.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow dark:bg-slate-900 dark:shadow-none dark:border dark:border-slate-800">
      <h3 className="text-lg font-semibold mb-3 dark:text-slate-100">Return / Exchange / Refund Requests</h3>
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">{r.type}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[r.status]}`}>{r.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.reason}</p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{new Date(r.created_at).toLocaleString("en-IN")}</p>
            {!readOnly && r.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => decideMutation.mutate({ id: orderId, requestId: r.id, status: "approved" })}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => decideMutation.mutate({ id: orderId, requestId: r.id, status: "rejected" })}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Reject
                </button>
              </div>
            )}
            {!readOnly && r.status === "approved" && (
              <button
                onClick={() => decideMutation.mutate({ id: orderId, requestId: r.id, status: "completed" })}
                className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
              >
                Mark Completed
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
