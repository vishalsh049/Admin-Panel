import { useState } from "react";
import {
  ChevronDown, FileSpreadsheet, FileText, Printer, RefreshCw, RotateCcw, Search, SlidersHorizontal,
} from "lucide-react";
import { BILL_STATUSES, PAYMENT_STATUSES } from "./constants";

const inputCls =
  "h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const EMPTY = {
  search: "", vendor_id: "", status: "", payment_status: "", warehouse: "",
  gst_type: "", created_by: "", date_from: "", date_to: "", due_from: "", due_to: "", overdue: "",
};

export default function FilterBar({ filters, onChange, vendors, meta, onExportCsv, onExportExcel, onPrint, onRefresh, refreshing }) {
  const [expanded, setExpanded] = useState(false);
  const set = (patch) => onChange({ ...filters, ...patch, page: 1 });
  const activeCount = Object.keys(EMPTY).filter((k) => filters[k]).length;

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.32)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search || ""}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search bill no, invoice no, vendor, reference…"
            className={`${inputCls} pl-9`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold shadow-sm transition ${
              expanded || activeCount
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>

          <button
            onClick={() => onChange({ ...filters, ...EMPTY, page: 1 })}
            title="Reset filters"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

          <button onClick={onExportExcel} title="Export Excel" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden xl:inline">Excel</span>
          </button>
          <button onClick={onExportCsv} title="Export CSV" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-100">
            <FileText className="h-4 w-4" />
            <span className="hidden xl:inline">CSV</span>
          </button>
          <button onClick={onPrint} title="Print list" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700">
            <Printer className="h-4 w-4" />
            <span className="hidden xl:inline">Print</span>
          </button>
          <button onClick={onRefresh} title="Refresh" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 md:grid-cols-3 xl:grid-cols-5">
          <Field label="Vendor">
            <select value={filters.vendor_id || ""} onChange={(e) => set({ vendor_id: e.target.value })} className={inputCls}>
              <option value="">All vendors</option>
              {(vendors || []).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={filters.status || ""} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
              <option value="">All statuses</option>
              {BILL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment">
            <select value={filters.payment_status || ""} onChange={(e) => set({ payment_status: e.target.value })} className={inputCls}>
              <option value="">All payments</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
              <option value="__overdue">Overdue only</option>
            </select>
          </Field>
          <Field label="Warehouse">
            <select value={filters.warehouse || ""} onChange={(e) => set({ warehouse: e.target.value })} className={inputCls}>
              <option value="">All warehouses</option>
              {(meta?.warehouses || []).map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </Field>
          <Field label="GST Type">
            <select value={filters.gst_type || ""} onChange={(e) => set({ gst_type: e.target.value })} className={inputCls}>
              <option value="">All GST types</option>
              <option value="intra">Intra-state (CGST+SGST)</option>
              <option value="inter">Inter-state (IGST)</option>
            </select>
          </Field>
          <Field label="Created By">
            <select value={filters.created_by || ""} onChange={(e) => set({ created_by: e.target.value })} className={inputCls}>
              <option value="">Anyone</option>
              {(meta?.creators || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name || `User #${c.id}`}</option>
              ))}
            </select>
          </Field>
          <Field label="Purchase From">
            <input type="date" value={filters.date_from || ""} onChange={(e) => set({ date_from: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Purchase To">
            <input type="date" value={filters.date_to || ""} onChange={(e) => set({ date_to: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Due From">
            <input type="date" value={filters.due_from || ""} onChange={(e) => set({ due_from: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Due To">
            <input type="date" value={filters.due_to || ""} onChange={(e) => set({ due_to: e.target.value })} className={inputCls} />
          </Field>
        </div>
      )}
    </div>
  );
}
