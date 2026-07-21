import { useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Ban, Columns3, Copy, Eye, FileX2, Mail,
  MoreVertical, PauseCircle, PlayCircle, Printer, UserPlus,
} from "lucide-react";
import { fmtDate, inr, paymentInfo, statusInfo } from "./constants";

export const ALL_COLUMNS = [
  { key: "id", label: "Order #", sortable: true },
  { key: "customerName", label: "Customer" },
  { key: "customerPhone", label: "Phone", optional: true },
  { key: "itemCount", label: "Items" },
  { key: "totalPrice", label: "Total", sortable: true, money: true },
  { key: "paymentMethod", label: "Payment", optional: true },
  { key: "paymentStatus", label: "Payment Status" },
  { key: "status", label: "Status", sortable: true },
  { key: "assignedToName", label: "Assigned To", optional: true },
  { key: "isHold", label: "Hold", optional: true },
  { key: "created_at", label: "Date", sortable: true },
];

const DEFAULT_HIDDEN = ["customerPhone", "paymentMethod"];

function cellValue(order, col) {
  switch (col.key) {
    case "created_at": return fmtDate(order.created_at);
    case "customerPhone": return order.customerPhone || "—";
    case "paymentMethod": return (order.paymentMethod || "—").toUpperCase();
    default: return col.money ? inr(order[col.key]) : order[col.key] ?? "—";
  }
}

function ActionsMenu({ order, onAction, readOnly }) {
  const [open, setOpen] = useState(false);
  const [alignTop, setAlignTop] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = [
    { key: "view", label: "View Details", icon: Eye },
    { key: "printInvoice", label: "Print Invoice", icon: Printer },
    { key: "emailInvoice", label: "Email Invoice", icon: Mail },
    !readOnly && { key: "assign", label: "Assign Staff", icon: UserPlus },
    !readOnly && { key: "duplicate", label: "Duplicate / Reorder", icon: Copy },
    !readOnly && (order.isHold
      ? { key: "unhold", label: "Release Hold", icon: PlayCircle, cls: "text-emerald-600 dark:text-emerald-400" }
      : { key: "hold", label: "Put on Hold", icon: PauseCircle, cls: "text-amber-600 dark:text-amber-400" }),
    !readOnly && order.status !== "cancelled" && { key: "cancel", label: "Cancel Order", icon: Ban, cls: "text-rose-600 dark:text-rose-400" },
  ].filter(Boolean);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setAlignTop(window.innerHeight - rect.bottom < items.length * 38 + 20);
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-violet-500/50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className={`absolute right-0 z-30 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-800 ${alignTop ? "bottom-9" : "top-9"}`}>
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => { setOpen(false); onAction(it.key, order); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium transition hover:bg-violet-50 dark:hover:bg-violet-500/10 ${it.cls || "text-slate-700 dark:text-slate-200"}`}
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
        <td key={i} className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <div className="h-3.5 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-700/60" style={{ width: `${45 + ((i * 17) % 40)}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function OrdersTable({
  orders, loading, pagination, sort, onSortChange, onPageChange,
  selected, onSelectedChange, onAction, searchTerm, readOnly,
}) {
  const [hidden, setHidden] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("orders-hidden-cols"));
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
    localStorage.setItem("orders-hidden-cols", JSON.stringify(next));
  };

  const visible = ALL_COLUMNS.filter((c) => !hidden.includes(c.key));
  const allChecked = orders.length > 0 && orders.every((o) => selected.includes(o.id));

  const toggleAll = () =>
    onSelectedChange(allChecked ? selected.filter((id) => !orders.some((o) => o.id === id)) : [...new Set([...selected, ...orders.map((o) => o.id)])]);

  const highlight = (text) => {
    const t = String(text ?? "—");
    if (!searchTerm || !t.toLowerCase().includes(searchTerm.toLowerCase())) return t;
    const i = t.toLowerCase().indexOf(searchTerm.toLowerCase());
    return (
      <>
        {t.slice(0, i)}
        <mark className="rounded bg-amber-200/80 px-0.5 dark:bg-amber-500/40 dark:text-slate-900">{t.slice(i, i + searchTerm.length)}</mark>
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
    <div className="overflow-hidden rounded-[26px] border border-white/75 bg-white/80 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {loading ? "Loading…" : (
            <>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{pagination.total}</span> orders
              {selected.length > 0 && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">{selected.length} selected</span>}
            </>
          )}
        </p>
        <div className="relative" ref={colRef}>
          <button onClick={() => setColMenu((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Columns3 className="h-4 w-4" /> Columns
          </button>
          {colMenu && (
            <div className="absolute right-0 top-10 z-30 max-h-80 w-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-800">
              {ALL_COLUMNS.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2.5 px-3.5 py-1.5 text-[13px] text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-500/10">
                  <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => toggleCol(c.key)} className="h-3.5 w-3.5 rounded accent-violet-600" />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              {!readOnly && (
                <th className="w-10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-4 py-3">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-3.5 w-3.5 rounded accent-violet-500" />
                </th>
              )}
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
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={visible.length + (readOnly ? 1 : 2)}>
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/20 dark:to-indigo-500/20">
                      <FileX2 className="h-7 w-7 text-violet-500 dark:text-violet-300" />
                    </div>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-100">No orders found</p>
                    <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">Adjust your filters, or wait for new orders to arrive from the storefront.</p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const st = statusInfo(order.status);
                const ps = paymentInfo(order.paymentStatus);
                const checked = selected.includes(order.id);
                return (
                  <tr key={order.id} className={`group transition-colors ${checked ? "bg-violet-50/70 dark:bg-violet-500/10" : "hover:bg-violet-50/40 dark:hover:bg-slate-800/60"}`}>
                    {!readOnly && (
                      <td className="border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
                        <input
                          type="checkbox" checked={checked}
                          onChange={() => onSelectedChange(checked ? selected.filter((id) => id !== order.id) : [...selected, order.id])}
                          className="h-3.5 w-3.5 rounded accent-violet-600"
                        />
                      </td>
                    )}
                    {visible.map((c) => (
                      <td key={c.key} className={`whitespace-nowrap border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 dark:text-slate-300 ${c.money ? "text-right font-medium tabular-nums" : ""}`}>
                        {c.key === "id" ? (
                          <button onClick={() => onAction("view", order)} className="font-semibold text-violet-700 hover:underline dark:text-violet-400">
                            #{highlight(order.id)}
                          </button>
                        ) : c.key === "customerName" ? (
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-100">{highlight(order.customerName)}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">{order.customerEmail}</div>
                          </div>
                        ) : c.key === "status" ? (
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.badge}`}>{st.label}</span>
                        ) : c.key === "paymentStatus" ? (
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ps.badge}`}>{ps.label}</span>
                        ) : c.key === "isHold" ? (
                          order.isHold ? <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">Hold</span> : <span className="text-slate-300 dark:text-slate-600">—</span>
                        ) : c.key === "assignedToName" ? (
                          order.assignedToName || <span className="text-slate-300 dark:text-slate-600">Unassigned</span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">{cellValue(order, c)}</span>
                        )}
                      </td>
                    ))}
                    <td className={`sticky right-0 border-b border-slate-100 px-4 py-3.5 text-right backdrop-blur dark:border-slate-800 ${checked ? "bg-violet-50/90 dark:bg-slate-800/90" : "bg-white/90 group-hover:bg-violet-50/80 dark:bg-slate-900/90 dark:group-hover:bg-slate-800/90"}`}>
                      <div className="flex justify-end">
                        <ActionsMenu order={order} onAction={onAction} readOnly={readOnly} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:flex-row">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Page <span className="font-semibold text-slate-800 dark:text-slate-200">{pagination.page}</span> of {pagination.pages}
          <span className="mx-1.5 text-slate-300 dark:text-slate-700">·</span>{pagination.total} orders
        </p>
        <div className="flex items-center gap-1.5">
          <button
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            className="flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 shadow-sm transition enabled:hover:border-violet-300 enabled:hover:text-violet-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Prev
          </button>
          {Array.from({ length: Math.min(5, pagination.pages) }).map((_, i) => {
            let p = pagination.page - 2 + i;
            if (pagination.page < 3) p = i + 1;
            else if (pagination.page > pagination.pages - 2) p = pagination.pages - 4 + i;
            if (p < 1 || p > pagination.pages) return null;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-8 rounded-lg px-2 text-sm font-semibold shadow-sm transition ${
                  p === pagination.page
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => onPageChange(pagination.page + 1)}
            className="flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 shadow-sm transition enabled:hover:border-violet-300 enabled:hover:text-violet-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
