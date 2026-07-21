import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveAs } from "file-saver";
import { ShieldCheck, Sparkles, X } from "lucide-react";
import KpiCards from "./orders/KpiCards";
import FilterBar from "./orders/FilterBar";
import OrdersTable from "./orders/OrdersTable";
import ConfirmModal from "../components/ConfirmModal";
import {
  assignOrder, bulkUpdateStatus, duplicateOrder, exportOrdersCsv, fetchOrders,
  fetchOrderStats, fetchOrderTags, fetchStaffList, holdOrder, updateOrderStatus,
} from "../services/orderService";
import { ORDER_STATUSES } from "./orders/constants";

const DEFAULT_FILTERS = { page: 1, limit: 20, search: "" };

function AssignModal({ order, staff, onClose, onAssign, isBusy }) {
  const [staffId, setStaffId] = useState(order.assignedTo || "");
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Assign Order #{order.id}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="mt-4 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Unassigned</option>
          {(staff || []).map((s) => (
            <option key={s.id} value={s.id}>{s.name || s.email}</option>
          ))}
        </select>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={isBusy} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Cancel</button>
          <button
            onClick={() => onAssign(staffId ? Number(staffId) : null)}
            disabled={isBusy}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
          >
            {isBusy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isReadOnly = useMemo(() => {
    try { return (JSON.parse(localStorage.getItem("user"))?.role || "").toLowerCase() === "support"; }
    catch { return false; }
  }, []);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState({ by: "created_at", dir: "desc" });
  const [selected, setSelected] = useState([]);
  const [assignTarget, setAssignTarget] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const apiFilters = useMemo(() => ({ ...filters, sort: `${sort.by}:${sort.dir}` }), [filters, sort]);

  const { data: stats } = useQuery({ queryKey: ["order-stats"], queryFn: fetchOrderStats });
  const { data: listData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["orders", apiFilters],
    queryFn: () => fetchOrders(apiFilters),
    placeholderData: keepPreviousData,
  });
  const { data: tags = [] } = useQuery({ queryKey: ["order-tags"], queryFn: fetchOrderTags });
  const { data: staff = [] } = useQuery({ queryKey: ["order-staff"], queryFn: fetchStaffList });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["order-stats"] });
  };

  const statusMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => { toast.success("Status updated"); invalidateAll(); },
    onError: (e) => toast.error(e.response?.data?.message || "Status update failed"),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: bulkUpdateStatus,
    onSuccess: (r) => { toast.success(r.message || "Orders updated"); setSelected([]); invalidateAll(); },
    onError: (e) => toast.error(e.response?.data?.message || "Bulk update failed"),
  });

  const holdMutation = useMutation({
    mutationFn: holdOrder,
    onSuccess: (_r, vars) => { toast.success(vars.isHold ? "Order put on hold" : "Hold released"); invalidateAll(); },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to update hold state"),
  });

  const assignMutation = useMutation({
    mutationFn: assignOrder,
    onSuccess: () => { toast.success("Assignment updated"); setAssignTarget(null); invalidateAll(); },
    onError: (e) => toast.error(e.response?.data?.message || "Assignment failed"),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateOrder,
    onSuccess: (r) => { toast.success(`Duplicated as order #${r.data.id}`); invalidateAll(); },
    onError: (e) => toast.error(e.response?.data?.message || "Duplicate failed"),
  });

  const orders = listData?.data || [];
  const pagination = { page: listData?.page || 1, pages: listData?.pages || 1, total: listData?.total || 0 };

  const exportCsv = async () => {
    try {
      const blob = await exportOrdersCsv(apiFilters);
      saveAs(blob, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch { toast.error("Export failed"); }
  };

  const onAction = (action, order) => {
    switch (action) {
      case "view": navigate(`/orders/${order.id}`); break;
      case "assign": setAssignTarget(order); break;
      case "duplicate": duplicateMutation.mutate(order.id); break;
      case "hold": holdMutation.mutate({ id: order.id, isHold: true, reason: "" }); break;
      case "unhold": holdMutation.mutate({ id: order.id, isHold: false }); break;
      case "printInvoice":
      case "emailInvoice":
        navigate(`/invoice/${order.id}?orderId=${order.id}`);
        break;
      case "cancel":
        setConfirm({
          title: "Cancel this order?",
          message: `Order #${order.id} will be marked cancelled.`,
          onConfirm: () => statusMutation.mutate({ id: order.id, status: "cancelled" }),
        });
        break;
      default: break;
    }
  };

  const bulkStatus = (status) =>
    setConfirm({
      title: `Update ${selected.length} order(s) to "${status}"?`,
      message: "This will update the status for every selected order and log it in each order's timeline.",
      onConfirm: () => bulkStatusMutation.mutate({ orderIds: selected, status }),
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="relative space-y-2"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50/90 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-violet-700 shadow-sm dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" /> ORDER MANAGEMENT
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Payments &amp; shipping integrated
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Track, manage and fulfill every website order from one dashboard.</p>
        </div>
      </div>

      <KpiCards stats={stats} />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        tags={tags}
        staff={staff}
        onExportCsv={exportCsv}
        onPrint={() => window.print()}
        onRefresh={() => { refetch(); qc.invalidateQueries({ queryKey: ["order-stats"] }); }}
        refreshing={isFetching}
      />

      {!isReadOnly && selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50/90 px-4 py-2.5 dark:border-violet-500/30 dark:bg-violet-500/10">
          <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">{selected.length} order(s) selected</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelected([])} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Clear</button>
            {ORDER_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => bulkStatus(s.value)}
                className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
              >
                Mark {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <OrdersTable
        orders={orders}
        loading={isLoading}
        pagination={pagination}
        sort={sort}
        onSortChange={setSort}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        selected={selected}
        onSelectedChange={setSelected}
        onAction={onAction}
        searchTerm={filters.search}
        readOnly={isReadOnly}
      />

      {assignTarget && (
        <AssignModal
          order={assignTarget}
          staff={staff}
          isBusy={assignMutation.isPending}
          onClose={() => setAssignTarget(null)}
          onAssign={(assignedTo) => assignMutation.mutate({ id: assignTarget.id, assignedTo })}
        />
      )}

      {confirm && (
        <ConfirmModal
          open
          title={confirm.title}
          message={confirm.message}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </motion.div>
  );
}
