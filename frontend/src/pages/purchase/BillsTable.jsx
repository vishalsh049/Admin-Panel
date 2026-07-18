import { useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Ban, CheckCircle2, ChevronLeft, ChevronRight,
  Columns3, Copy, Download, Eye, FileX2, Mail, MoreVertical, Pencil, Printer, Trash2, Wallet,
} from "lucide-react";
import { fmtDate, fmtDateTime, inr, isOverdue, paymentInfo, statusInfo } from "./constants";

export const ALL_COLUMNS = [
  { key: "bill_number", label: "Bill No", sortable: true },
  { key: "vendor_name", label: "Vendor", sortable: true },
  { key: "vendor_gstin", label: "Vendor GST", optional: true },
  { key: "invoice_number", label: "Invoice No" },
  { key: "invoice_date", label: "Invoice Date", optional: true },
  { key: "purchase_date", label: "Purchase Date", sortable: true },
  { key: "due_date", label: "Due Date", sortable: true, optional: true },
  { key: "warehouse", label: "Warehouse", optional: true },
  { key: "items_count", label: "Items" },
  { key: "subtotal", label: "Subtotal", optional: true, money: true },
  { key: "gst", label: "GST", money: true },
  { key: "discount", label: "Discount", optional: true, money: true },
  { key: "shipping_charges", label: "Shipping", optional: true, money: true },
  { key: "round_off", label: "Round Off", optional: true, money: true },
  { key: "grand_total", label: "Grand Total", sortable: true, money: true },
  { key: "paid_amount", label: "Paid", money: true },
  { key: "balance_amount", label: "Balance", sortable: true, money: true },
  { key: "status", label: "Status", sortable: true },
  { key: "payment_status", label: "Payment", sortable: true },
  { key: "created_by_name", label: "Created By", optional: true },
  { key: "updated_at", label: "Last Updated", sortable: true, optional: true },
];

const DEFAULT_HIDDEN = ALL_COLUMNS.filter((c) => c.optional).map((c) => c.key);

function cellValue(bill, col) {
  switch (col.key) {
    case "gst": return inr(Number(bill.cgst) + Number(bill.sgst) + Number(bill.igst) + Number(bill.cess));
    case "discount": return inr(Number(bill.item_discount) + Number(bill.bill_discount));
    case "invoice_date": case "purchase_date": case "due_date": return fmtDate(bill[col.key]);
    case "updated_at": return fmtDateTime(bill.updated_at);
    default: return col.money ? inr(bill[col.key]) : bill[col.key] ?? "—";
  }
}

function ActionsMenu({ bill, onAction, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [alignTop, setAlignTop] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = [
    { key: "view", label: "View", icon: Eye },
    !["cancelled"].includes(bill.status) && { key: "edit", label: "Edit", icon: Pencil },
    { key: "print", label: "Print", icon: Printer },
    { key: "pdf", label: "Download PDF", icon: Download },
    { key: "duplicate", label: "Duplicate Bill", icon: Copy },
    bill.status === "pending" && isAdmin && { key: "approve", label: "Approve", icon: CheckCircle2, cls: "text-emerald-600" },
    Number(bill.balance_amount) > 0 && !["cancelled", "rejected", "draft"].includes(bill.status) &&
      { key: "markPaid", label: "Mark Paid", icon: Wallet, cls: "text-emerald-600" },
    bill.vendor_email && { key: "email", label: "Email Vendor", icon: Mail },
    !["cancelled"].includes(bill.status) && { key: "cancel", label: "Cancel Bill", icon: Ban, cls: "text-amber-600" },
    { key: "delete", label: "Delete", icon: Trash2, cls: "text-rose-600" },
  ].filter(Boolean);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setAlignTop(window.innerHeight - rect.bottom < items.length * 38 + 20);
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className={`absolute right-0 z-30 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] ${alignTop ? "bottom-9" : "top-9"}`}>
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => { setOpen(false); onAction(it.key, bill); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium transition hover:bg-violet-50 ${it.cls || "text-slate-700"}`}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols + 2 }).map((_, i) => (
        <td key={i} className="border-b border-slate-100 px-4 py-4">
          <div className="h-3.5 animate-pulse rounded-full bg-slate-200/80" style={{ width: `${45 + ((i * 17) % 40)}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function BillsTable({
  bills, loading, pagination, totals, sort, onSortChange, onPageChange,
  selected, onSelectedChange, onAction, isAdmin, searchTerm,
}) {
  const [hidden, setHidden] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pb-hidden-cols"));
      return Array.isArray(saved) ? saved : DEFAULT_HIDDEN;
    } catch { return DEFAULT_HIDDEN; }
  });
  const [colMenu, setColMenu] = useState(false);
  const colRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (colRef.current && !colRef.current.contains(e.target)) setColMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggleCol = (key) => {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next);
    localStorage.setItem("pb-hidden-cols", JSON.stringify(next));
  };

  const visible = ALL_COLUMNS.filter((c) => !hidden.includes(c.key));
  const allChecked = bills.length > 0 && bills.every((b) => selected.includes(b.id));

  const toggleAll = () =>
    onSelectedChange(allChecked ? selected.filter((id) => !bills.some((b) => b.id === id)) : [...new Set([...selected, ...bills.map((b) => b.id)])]);

  const highlight = (text) => {
    const t = String(text ?? "—");
    if (!searchTerm || !t.toLowerCase().includes(searchTerm.toLowerCase())) return t;
    const i = t.toLowerCase().indexOf(searchTerm.toLowerCase());
    return (
      <>
        {t.slice(0, i)}
        <mark className="rounded bg-amber-200/80 px-0.5">{t.slice(i, i + searchTerm.length)}</mark>
        {t.slice(i + searchTerm.length)}
      </>
    );
  };

  const sortIcon = (col) => {
    if (!col.sortable) return null;
    if (sort.by !== col.key) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="overflow-hidden rounded-[26px] border border-white/75 bg-white/80 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.24)] backdrop-blur-xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <p className="text-sm text-slate-600">
          {loading ? "Loading…" : (
            <>
              <span className="font-semibold text-slate-900">{pagination.total}</span> bills
              {selected.length > 0 && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{selected.length} selected</span>}
            </>
          )}
        </p>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-slate-500 md:block">
            Total <span className="font-semibold text-slate-800">{inr(totals?.grand_total)}</span>
            <span className="mx-1.5 text-slate-300">|</span>
            Balance <span className="font-semibold text-rose-600">{inr(totals?.balance)}</span>
          </p>
          <div className="relative" ref={colRef}>
            <button onClick={() => setColMenu((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700">
              <Columns3 className="h-4 w-4" /> Columns
            </button>
            {colMenu && (
              <div className="absolute right-0 top-10 z-30 max-h-80 w-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)]">
                {ALL_COLUMNS.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2.5 px-3.5 py-1.5 text-[13px] text-slate-700 hover:bg-violet-50">
                    <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => toggleCol(c.key)} className="h-3.5 w-3.5 rounded accent-violet-600" />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="w-10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-4 py-3">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-3.5 w-3.5 rounded accent-violet-500" />
              </th>
              {visible.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.sortable && onSortChange({ by: c.key, dir: sort.by === c.key && sort.dir === "desc" ? "asc" : "desc" })}
                  className={`whitespace-nowrap bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/80 ${c.sortable ? "cursor-pointer select-none hover:text-white" : ""} ${c.money ? "text-right" : ""}`}
                >
                  <span className={`inline-flex items-center gap-1 ${c.money ? "justify-end" : ""}`}>{c.label}{sortIcon(c)}</span>
                </th>
              ))}
              <th className="sticky right-0 z-10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-4 py-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/80">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={visible.length} />)
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={visible.length + 2}>
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100">
                      <FileX2 className="h-7 w-7 text-violet-500" />
                    </div>
                    <p className="text-base font-semibold text-slate-800">No purchase bills found</p>
                    <p className="max-w-sm text-sm text-slate-500">Adjust your filters, or create your first purchase bill to get started.</p>
                  </div>
                </td>
              </tr>
            ) : (
              bills.map((bill) => {
                const st = statusInfo(bill.status);
                const ps = paymentInfo(bill.payment_status);
                const overdue = isOverdue(bill);
                const checked = selected.includes(bill.id);
                return (
                  <tr key={bill.id} className={`group transition-colors ${checked ? "bg-violet-50/70" : "hover:bg-violet-50/40"}`}>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <input
                        type="checkbox" checked={checked}
                        onChange={() => onSelectedChange(checked ? selected.filter((id) => id !== bill.id) : [...selected, bill.id])}
                        className="h-3.5 w-3.5 rounded accent-violet-600"
                      />
                    </td>
                    {visible.map((c) => (
                      <td key={c.key} className={`whitespace-nowrap border-b border-slate-100 px-4 py-3.5 ${c.money ? "text-right font-medium tabular-nums" : ""}`}>
                        {c.key === "bill_number" ? (
                          <button onClick={() => onAction("view", bill)} className="font-semibold text-violet-700 hover:underline">
                            {highlight(bill.bill_number)}
                          </button>
                        ) : c.key === "vendor_name" ? (
                          <span className="font-medium text-slate-800">{highlight(bill.vendor_name)}</span>
                        ) : c.key === "invoice_number" ? (
                          <span className="text-slate-600">{highlight(bill.invoice_number)}</span>
                        ) : c.key === "status" ? (
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.badge}`}>{st.label}</span>
                        ) : c.key === "payment_status" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ps.badge}`}>{ps.label}</span>
                            {overdue && <span className="inline-flex rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">Overdue</span>}
                          </span>
                        ) : c.key === "balance_amount" ? (
                          <span className={Number(bill.balance_amount) > 0 ? "text-rose-600" : "text-emerald-600"}>{inr(bill.balance_amount)}</span>
                        ) : (
                          <span className="text-slate-600">{cellValue(bill, c)}</span>
                        )}
                      </td>
                    ))}
                    <td className={`sticky right-0 border-b border-slate-100 px-4 py-3.5 text-right backdrop-blur ${checked ? "bg-violet-50/90" : "bg-white/90 group-hover:bg-violet-50/80"}`}>
                      <div className="flex justify-end">
                        <ActionsMenu bill={bill} onAction={onAction} isAdmin={isAdmin} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
        <p className="text-xs text-slate-500">
          Page <span className="font-semibold text-slate-800">{pagination.page}</span> of {pagination.totalPages}
          <span className="mx-1.5 text-slate-300">·</span>{pagination.total} bills
        </p>
        <div className="flex items-center gap-1.5">
          <button
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition enabled:hover:border-violet-300 enabled:hover:text-violet-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
            let p = pagination.page - 2 + i;
            if (pagination.page < 3) p = i + 1;
            else if (pagination.page > pagination.totalPages - 2) p = pagination.totalPages - 4 + i;
            if (p < 1 || p > pagination.totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-8 rounded-lg px-2 text-sm font-semibold shadow-sm transition ${
                  p === pagination.page
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition enabled:hover:border-violet-300 enabled:hover:text-violet-700 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
