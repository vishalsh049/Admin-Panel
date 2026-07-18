import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  BarChart3, ChevronDown, FileSpreadsheet, Plus, ShieldCheck, Sparkles,
} from "lucide-react";
import KpiCards from "./purchase/KpiCards";
import ChartsSection from "./purchase/ChartsSection";
import FilterBar from "./purchase/FilterBar";
import BillsTable from "./purchase/BillsTable";
import BillEditorModal from "./purchase/BillEditorModal";
import BillViewModal from "./purchase/BillViewModal";
import PaymentModal from "./purchase/PaymentModal";
import ImportModal from "./purchase/ImportModal";
import ConfirmModal from "../components/ConfirmModal";
import { printBillList, printBill } from "./purchase/printBill";
import {
  changeBillStatus, deletePurchaseBill, duplicatePurchaseBill,
  exportPurchaseBillsCsv, fetchBillPdfBlob, fetchPurchaseBill, fetchPurchaseBills,
  fetchPurchaseDashboard, fetchPurchaseMeta, searchVendors,
} from "../services/purchaseBillService";
import { fmtDate, inr } from "./purchase/constants";

const DEFAULT_FILTERS = { page: 1, limit: 20, search: "" };

export default function PurchaseBill() {
  const qc = useQueryClient();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  }, []);
  const isAdmin = (user?.role || "admin").toLowerCase() === "admin";

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState({ by: "id", dir: "desc" });
  const [selected, setSelected] = useState([]);
  const [showCharts, setShowCharts] = useState(true);
  const [editor, setEditor] = useState({ open: false, data: null });
  const [viewId, setViewId] = useState(null);
  const [payBill, setPayBill] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Translate UI filters → API params ("__overdue" is a virtual payment filter)
  const apiFilters = useMemo(() => {
    const f = { ...filters, sort_by: sort.by, sort_dir: sort.dir };
    if (f.payment_status === "__overdue") { f.payment_status = ""; f.overdue = "1"; }
    return f;
  }, [filters, sort]);

  const { data: dashboard } = useQuery({
    queryKey: ["purchase-dashboard"],
    queryFn: fetchPurchaseDashboard,
  });

  const { data: listData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["purchase-bills", apiFilters],
    queryFn: () => fetchPurchaseBills(apiFilters),
    placeholderData: keepPreviousData,
  });

  const { data: vendors = [] } = useQuery({ queryKey: ["vendors", ""], queryFn: () => searchVendors("") });
  const { data: meta } = useQuery({ queryKey: ["purchase-meta"], queryFn: fetchPurchaseMeta });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["purchase-bills"] });
    qc.invalidateQueries({ queryKey: ["purchase-dashboard"] });
    qc.invalidateQueries({ queryKey: ["purchase-meta"] });
  };

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseBill,
    onSuccess: () => { toast.success("Bill deleted"); setSelected([]); invalidateAll(); },
    onError: (e) => toast.error(e.response?.data?.error || "Delete failed"),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicatePurchaseBill,
    onSuccess: (b) => { toast.success(`Duplicated as ${b.bill_number} (draft)`); invalidateAll(); },
    onError: (e) => toast.error(e.response?.data?.error || "Duplicate failed"),
  });

  const statusMutation = useMutation({
    mutationFn: changeBillStatus,
    onSuccess: () => { toast.success("Status updated"); invalidateAll(); },
    onError: (e) => toast.error(e.response?.data?.error || "Status change failed"),
  });

  const bills = listData?.bills || [];
  const pagination = listData?.pagination || { page: 1, totalPages: 1, total: 0, limit: 20 };

  // ---- Exports -------------------------------------------------------------
  const exportCsv = async () => {
    try {
      const blob = await exportPurchaseBillsCsv(apiFilters);
      saveAs(blob, `purchase-bills-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch { toast.error("Export failed"); }
  };

  const exportExcel = async () => {
    try {
      // Pull everything matching the filters (not just the current page)
      const full = await fetchPurchaseBills({ ...apiFilters, page: 1, limit: 100 });
      let all = full.bills;
      for (let p = 2; p <= full.pagination.totalPages && p <= 50; p++) {
        const next = await fetchPurchaseBills({ ...apiFilters, page: p, limit: 100 });
        all = all.concat(next.bills);
      }
      const rows = all.map((b) => ({
        "Bill No": b.bill_number, Vendor: b.vendor_name, "Vendor GST": b.vendor_gstin,
        "Invoice No": b.invoice_number, "Invoice Date": fmtDate(b.invoice_date),
        "Purchase Date": fmtDate(b.purchase_date), "Due Date": fmtDate(b.due_date),
        Warehouse: b.warehouse, Items: b.items_count, Subtotal: Number(b.subtotal),
        Discount: Number(b.item_discount) + Number(b.bill_discount),
        CGST: Number(b.cgst), SGST: Number(b.sgst), IGST: Number(b.igst), CESS: Number(b.cess),
        Shipping: Number(b.shipping_charges), "Round Off": Number(b.round_off),
        "Grand Total": Number(b.grand_total), Paid: Number(b.paid_amount),
        Balance: Number(b.balance_amount), Status: b.status, Payment: b.payment_status,
        "Created By": b.created_by_name,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchase Bills");
      XLSX.writeFile(wb, `purchase-bills-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch { toast.error("Excel export failed"); }
  };

  // ---- Row actions ---------------------------------------------------------
  const onAction = async (action, bill) => {
    switch (action) {
      case "view": setViewId(bill.id); break;
      case "edit": {
        try {
          const detail = await fetchPurchaseBill(bill.id);
          setEditor({ open: true, data: detail });
        } catch { toast.error("Failed to load bill"); }
        break;
      }
      case "print": {
        try { printBill(await fetchPurchaseBill(bill.id)); }
        catch { toast.error("Failed to load bill"); }
        break;
      }
      case "pdf": {
        try {
          const blob = await fetchBillPdfBlob(bill.id);
          saveAs(blob, `${bill.bill_number}.pdf`);
        } catch { toast.error("PDF download failed"); }
        break;
      }
      case "duplicate": duplicateMutation.mutate(bill.id); break;
      case "approve": statusMutation.mutate({ id: bill.id, status: "approved" }); break;
      case "markPaid": setPayBill(bill); break;
      case "email":
        window.location.href = `mailto:${bill.vendor_email}?subject=${encodeURIComponent(`Purchase Bill ${bill.bill_number}`)}&body=${encodeURIComponent(`Dear ${bill.vendor_name},\n\nRegarding purchase bill ${bill.bill_number} dated ${fmtDate(bill.purchase_date)} for ${inr(bill.grand_total)}.\n\nRegards`)}`;
        break;
      case "cancel":
        setConfirm({
          title: "Cancel this bill?",
          message: `${bill.bill_number} will be cancelled. Applied stock and vendor ledger entries will be reversed.`,
          onConfirm: () => statusMutation.mutate({ id: bill.id, status: "cancelled" }),
        });
        break;
      case "delete":
        setConfirm({
          title: "Delete this bill?",
          message: `${bill.bill_number} and all its items, payments and attachments will be permanently deleted. Stock changes will be reversed.`,
          onConfirm: () => deleteMutation.mutate(bill.id),
        });
        break;
      default: break;
    }
  };

  const bulkDelete = () =>
    setConfirm({
      title: `Delete ${selected.length} bill(s)?`,
      message: "All selected bills, their payments and attachments will be permanently removed. Stock will be reversed for approved bills.",
      onConfirm: async () => {
        for (const id of selected) {
          await deletePurchaseBill(id).catch((e) => toast.error(e.response?.data?.error || `Failed to delete #${id}`));
        }
        setSelected([]);
        invalidateAll();
        toast.success("Selected bills deleted");
      },
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="relative space-y-2"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50/90 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-violet-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> PURCHASE MANAGEMENT
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Stock, GST & vendor ledger integrated
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Create, approve and track supplier bills — inventory and ledgers update automatically.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Bulk Import
          </button>
          <button
            onClick={() => setShowCharts((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-700"
          >
            <BarChart3 className="h-4 w-4" /> Analytics
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCharts ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => setEditor({ open: true, data: null })}
            className="group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white shadow-[0_20px_55px_-22px_rgba(99,102,241,0.72)] transition-all duration-300 hover:-translate-y-1"
          >
            <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.28)_48%,transparent_72%)] transition-transform duration-700 group-hover:translate-x-[120%]" />
            <Plus className="relative h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            <span className="relative">New Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <KpiCards dashboard={dashboard} />

      {/* Charts */}
      {showCharts && <ChartsSection dashboard={dashboard} />}

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        vendors={vendors}
        meta={meta}
        onExportCsv={exportCsv}
        onExportExcel={exportExcel}
        onPrint={() => printBillList(bills, listData?.totals)}
        onRefresh={() => { refetch(); qc.invalidateQueries({ queryKey: ["purchase-dashboard"] }); }}
        refreshing={isFetching}
      />

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50/90 px-4 py-2.5">
          <p className="text-sm font-semibold text-violet-800">{selected.length} bill(s) selected</p>
          <div className="flex gap-2">
            <button onClick={() => setSelected([])} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">Clear</button>
            <button onClick={bulkDelete} className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700">Delete Selected</button>
          </div>
        </div>
      )}

      {/* Table */}
      <BillsTable
        bills={bills}
        loading={isLoading}
        pagination={pagination}
        totals={listData?.totals}
        sort={sort}
        onSortChange={setSort}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        selected={selected}
        onSelectedChange={setSelected}
        onAction={onAction}
        isAdmin={isAdmin}
        searchTerm={filters.search}
      />

      {/* Modals */}
      <BillEditorModal
        open={editor.open}
        editData={editor.data}
        isAdmin={isAdmin}
        onClose={() => setEditor({ open: false, data: null })}
      />
      {viewId && (
        <BillViewModal
          billId={viewId}
          isAdmin={isAdmin}
          onClose={() => setViewId(null)}
          onEdit={(detail) => { setViewId(null); setEditor({ open: true, data: detail }); }}
          onPay={(bill) => setPayBill(bill)}
        />
      )}
      {payBill && <PaymentModal bill={payBill} onClose={() => setPayBill(null)} />}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
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
