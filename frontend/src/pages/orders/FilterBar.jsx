import { useState } from "react";
import {
  ChevronDown, FileText, Printer, RefreshCw, RotateCcw, Search, SlidersHorizontal,
} from "lucide-react";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "./constants";

const inputCls =
  "h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-500/20";

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const EMPTY = {
  search: "", status: "", paymentStatus: "", paymentMethod: "", tag: "", assignedTo: "", isHold: "",
  dateFrom: "", dateTo: "",
};

export default function FilterBar({ filters, onChange, tags, staff, onExportCsv, onPrint, onRefresh, refreshing }) {
  const [expanded, setExpanded] = useState(false);
  const set = (patch) => onChange({ ...filters, ...patch, page: 1 });
  const activeCount = Object.keys(EMPTY).filter((k) => filters[k]).length;

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search || ""}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search order #, customer, email, phone, AWB…"
            className={`${inputCls} pl-9`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold shadow-sm transition ${
              expanded || activeCount
                ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300"
                : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-violet-500/40"
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
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <span className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

          <button onClick={onExportCsv} title="Export CSV" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
            <FileText className="h-4 w-4" />
            <span className="hidden xl:inline">CSV</span>
          </button>
          <button onClick={onPrint} title="Print list" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Printer className="h-4 w-4" />
            <span className="hidden xl:inline">Print</span>
          </button>
          <button onClick={onRefresh} title="Refresh" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:grid-cols-3 xl:grid-cols-5">
          <Field label="Status">
            <select value={filters.status || ""} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment Status">
            <select value={filters.paymentStatus || ""} onChange={(e) => set({ paymentStatus: e.target.value })} className={inputCls}>
              <option value="">All payment statuses</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment Method">
            <select value={filters.paymentMethod || ""} onChange={(e) => set({ paymentMethod: e.target.value })} className={inputCls}>
              <option value="">All methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Tag">
            <select value={filters.tag || ""} onChange={(e) => set({ tag: e.target.value })} className={inputCls}>
              <option value="">All tags</option>
              {(tags || []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Assigned Staff">
            <select value={filters.assignedTo || ""} onChange={(e) => set({ assignedTo: e.target.value })} className={inputCls}>
              <option value="">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {(staff || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name || s.email}</option>
              ))}
            </select>
          </Field>
          <Field label="Hold Status">
            <select value={filters.isHold || ""} onChange={(e) => set({ isHold: e.target.value })} className={inputCls}>
              <option value="">All orders</option>
              <option value="1">On hold only</option>
            </select>
          </Field>
          <Field label="Order From">
            <input type="date" value={filters.dateFrom || ""} onChange={(e) => set({ dateFrom: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Order To">
            <input type="date" value={filters.dateTo || ""} onChange={(e) => set({ dateTo: e.target.value })} className={inputCls} />
          </Field>
        </div>
      )}
    </div>
  );
}
