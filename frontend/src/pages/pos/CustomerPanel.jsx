import { useEffect, useRef, useState } from "react";
import { User, Search, UserPlus, X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { searchCustomers, createCustomer } from "../../services/posService";

export default function CustomerPanel({ customer, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(query.trim() ? await searchCustomers(query.trim()) : []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.phone.trim() && !form.email.trim()) return toast.error("Phone or email is required");
    setSaving(true);
    try {
      const created = await createCustomer(form);
      toast.success("Customer added");
      onSelect(created);
      setShowCreate(false);
      setOpen(false);
      setForm({ name: "", phone: "", email: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{customer?.name || "Walk-in Customer"}</p>
          {customer?.phone && <p className="truncate text-[11px] text-slate-400">{customer.phone}</p>}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {!showCreate ? (
            <>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name / phone / email"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="button"
                onClick={() => { onSelect(null); setOpen(false); }}
                className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <User className="h-3.5 w-3.5" /> Walk-in Customer (no account)
              </button>

              <div className="max-h-48 overflow-y-auto">
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onSelect(c); setOpen(false); }}
                    className="flex w-full flex-col items-start rounded-lg px-2 py-2 text-left text-xs hover:bg-indigo-50 dark:hover:bg-slate-700"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</span>
                    <span className="text-slate-400">{[c.phone, c.email].filter(Boolean).join(" · ")}</span>
                  </button>
                ))}
                {query && results.length === 0 && (
                  <p className="px-2 py-2 text-xs text-slate-400">No matches</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setForm((f) => ({ ...f, name: query })); setShowCreate(true); }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-300 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
              >
                <UserPlus className="h-3.5 w-3.5" /> New customer
              </button>
            </>
          ) : (
            <form onSubmit={handleCreate} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">New customer</p>
                <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name *"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email (optional)"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Add customer"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
