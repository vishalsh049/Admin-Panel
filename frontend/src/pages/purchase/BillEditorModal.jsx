import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, ChevronDown, CopyPlus, FileUp, Loader2, Package, Plus, Save,
  Search, Trash2, UploadCloud, X,
} from "lucide-react";
import {
  createPurchaseBill, createVendor, fetchNextBillNumber, searchProducts,
  searchVendors, updatePurchaseBill, uploadBillAttachments,
} from "../../services/purchaseBillService";
import { GST_RATES, PAYMENT_MODES, UNITS, computeItem, computeTotals, inr, today } from "./constants";

const inputCls =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400";
const cellCls =
  "h-8 w-full rounded-md border border-transparent bg-transparent px-1.5 text-[13px] text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100";

const emptyItem = () => ({
  key: Math.random().toString(36).slice(2),
  product_id: null, product_name: "", sku: "", hsn: "", description: "",
  batch_number: "", expiry_date: "", unit: "pcs", quantity: 1, free_quantity: 0,
  purchase_price: 0, mrp: 0, selling_price: 0, discount_percent: 0, discount_amount: 0,
  gst_percent: 0, cess_percent: 0, stock: null,
});

const emptyHeader = () => ({
  bill_number: "", vendor_id: null, vendor_name: "", vendor_gstin: "", vendor_phone: "",
  vendor_email: "", vendor_state: "", billing_address: "", shipping_address: "",
  invoice_number: "", invoice_date: "", purchase_date: today(), due_date: "",
  warehouse: "Main", reference_number: "", purchase_order_ref: "", currency: "INR",
  exchange_rate: 1, payment_terms: "", gst_type: "intra", reverse_charge: false,
  remarks: "", internal_notes: "", bill_discount: 0, shipping_charges: 0,
  packing_charges: 0, other_charges: 0, tds_percent: 0, tds_amount: 0, status: "draft",
});

function Section({ title, icon: Icon, children, right }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
          {Icon && <Icon className="h-4 w-4" />} {title}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-[11px] font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Vendor picker with live search + inline quick-create
// ---------------------------------------------------------------------------
function VendorPicker({ header, setHeader }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", gstin: "", phone: "", state: "" });
  const ref = useRef(null);
  const qc = useQueryClient();

  const { data: vendors = [], isFetching } = useQuery({
    queryKey: ["vendors", term],
    queryFn: () => searchVendors(term),
    enabled: open,
  });

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (v) => {
    setHeader((h) => ({
      ...h,
      vendor_id: v.id, vendor_name: v.name, vendor_gstin: v.gstin || "",
      vendor_phone: v.phone || "", vendor_email: v.email || "", vendor_state: v.state || "",
      billing_address: v.billing_address || "", shipping_address: v.shipping_address || "",
      payment_terms: v.credit_days ? `${v.credit_days} days credit` : h.payment_terms,
      due_date: v.credit_days
        ? new Date(new Date(h.purchase_date).getTime() + v.credit_days * 864e5).toISOString().slice(0, 10)
        : h.due_date,
      _outstanding: v.outstanding, _rating: v.rating,
    }));
    setOpen(false);
    setTerm("");
  };

  const createMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: (v) => {
      toast.success(`Vendor "${v.name}" created`);
      qc.invalidateQueries({ queryKey: ["vendors"] });
      pick(v);
      setCreating(false);
      setNewVendor({ name: "", gstin: "", phone: "", state: "" });
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to create vendor"),
  });

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={open ? term : header.vendor_name}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
          placeholder="Search or select vendor…"
          className={`${inputCls} pl-8 font-medium`}
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-11 z-40 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)]">
          {isFetching && <p className="px-3.5 py-2 text-xs text-slate-400">Searching…</p>}
          {!isFetching && vendors.length === 0 && <p className="px-3.5 py-2 text-xs text-slate-400">No vendors found</p>}
          {vendors.map((v) => (
            <button key={v.id} onClick={() => pick(v)} className="flex w-full items-start justify-between gap-2 px-3.5 py-2 text-left transition hover:bg-violet-50">
              <span>
                <span className="block text-sm font-semibold text-slate-800">{v.name}</span>
                <span className="block text-xs text-slate-500">{[v.gstin, v.state].filter(Boolean).join(" · ") || "No GSTIN"}</span>
              </span>
              {Number(v.outstanding) > 0 && (
                <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">{inr(v.outstanding, { decimals: 0 })} due</span>
              )}
            </button>
          ))}
          <div className="border-t border-slate-100 px-3.5 py-2">
            {creating ? (
              <div className="space-y-2">
                <input autoFocus placeholder="Vendor name *" value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} className={inputCls} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="GSTIN" value={newVendor.gstin} onChange={(e) => setNewVendor({ ...newVendor, gstin: e.target.value })} className={inputCls} />
                  <input placeholder="Phone" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} className={inputCls} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => newVendor.name.trim() ? createMutation.mutate(newVendor) : toast.error("Vendor name is required")}
                    disabled={createMutation.isPending}
                    className="flex-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    {createMutation.isPending ? "Creating…" : "Create Vendor"}
                  </button>
                  <button onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} className="flex w-full items-center gap-2 rounded-lg py-1 text-sm font-semibold text-violet-700 transition hover:text-violet-900">
                <Plus className="h-4 w-4" /> Create new vendor{term ? ` "${term}"` : ""}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product search cell
// ---------------------------------------------------------------------------
function ProductCell({ item, onPick, onNameChange }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data: products = [], isFetching } = useQuery({
    queryKey: ["product-search", term],
    queryFn: () => searchProducts(term),
    enabled: open && term.length >= 1,
  });

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative min-w-[180px]" ref={ref}>
      <input
        value={open ? term : item.product_name}
        onFocus={() => { setOpen(true); setTerm(item.product_name); }}
        onChange={(e) => { setTerm(e.target.value); onNameChange(e.target.value); }}
        placeholder="Type to search products…"
        className={cellCls}
      />
      {open && term.length >= 1 && (
        <div className="absolute left-0 top-9 z-40 max-h-60 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)]">
          {isFetching && <p className="px-3 py-1.5 text-xs text-slate-400">Searching…</p>}
          {!isFetching && products.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-slate-400">No products — the typed name will be used as-is</p>
          )}
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => { onPick(p); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition hover:bg-violet-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-slate-800">{p.name}</span>
                <span className="block text-[11px] text-slate-500">{[p.sku, p.hsn].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-slate-500">stk {p.stock}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main editor modal
// ---------------------------------------------------------------------------
export default function BillEditorModal({ open, onClose, editData, isAdmin }) {
  const qc = useQueryClient();
  const [header, setHeader] = useState(emptyHeader());
  const [items, setItems] = useState([emptyItem()]);
  const [payment, setPayment] = useState({ amount: "", mode: "cash", payment_date: today(), transaction_number: "", reference_number: "", bank_name: "", notes: "" });
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const isEdit = !!editData?.bill?.id;

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      const b = editData.bill;
      setHeader({
        ...emptyHeader(),
        ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== null)),
        reverse_charge: !!b.reverse_charge,
        invoice_date: b.invoice_date?.slice(0, 10) || "",
        purchase_date: b.purchase_date?.slice(0, 10) || today(),
        due_date: b.due_date?.slice(0, 10) || "",
      });
      setItems(
        (editData.items || []).map((it) => ({
          ...emptyItem(), ...it,
          expiry_date: it.expiry_date?.slice(0, 10) || "",
          key: `db-${it.id}`,
        }))
      );
    } else {
      setHeader(emptyHeader());
      setItems([emptyItem()]);
      fetchNextBillNumber()
        .then((n) => setHeader((h) => ({ ...h, bill_number: n })))
        .catch(() => {});
    }
    setPayment({ amount: "", mode: "cash", payment_date: today(), transaction_number: "", reference_number: "", bank_name: "", notes: "" });
    setFiles([]);
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => computeTotals(items, header), [items, header]);

  const setItem = (key, patch) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () => setItems((rows) => [...rows, emptyItem()]);
  const removeRow = (key) => setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  const duplicateRow = (key) =>
    setItems((rows) => {
      const idx = rows.findIndex((r) => r.key === key);
      return [...rows.slice(0, idx + 1), { ...rows[idx], key: Math.random().toString(36).slice(2) }, ...rows.slice(idx + 1)];
    });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const bill = isEdit
        ? await updatePurchaseBill({ id: editData.bill.id, ...payload })
        : await createPurchaseBill(payload);
      if (files.length) {
        await uploadBillAttachments({ id: bill.id, files }).catch(() =>
          toast.error("Bill saved but attachment upload failed")
        );
      }
      return bill;
    },
    onSuccess: (bill) => {
      toast.success(`Bill ${bill.bill_number} ${isEdit ? "updated" : "saved"}`);
      qc.invalidateQueries({ queryKey: ["purchase-bills"] });
      qc.invalidateQueries({ queryKey: ["purchase-dashboard"] });
      qc.invalidateQueries({ queryKey: ["purchase-bill", bill.id] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to save bill"),
  });

  const save = (status) => {
    if (!header.vendor_name.trim()) return toast.error("Select or enter a vendor");
    const validItems = items.filter((it) => it.product_name.trim() && Number(it.quantity) > 0);
    if (!validItems.length) return toast.error("Add at least one item with quantity");
    saveMutation.mutate({
      ...header,
      status,
      items: validItems,
      payment: !isEdit && Number(payment.amount) > 0 ? payment : undefined,
    });
  };

  // Ctrl+Enter adds a row; Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addRow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex flex-col bg-slate-950/45 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-white/20 bg-[#f6f7fb] shadow-2xl sm:m-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">Purchase Bills</p>
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? `Edit ${editData.bill.bill_number}` : "New Purchase Bill"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => save(isEdit ? header.status : "draft")}
                disabled={saveMutation.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEdit ? "Save Changes" : "Save Draft"}
              </button>
              {!isEdit && (
                <button
                  onClick={() => save(isAdmin ? "approved" : "pending")}
                  disabled={saveMutation.isPending}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isAdmin ? "Save & Approve" : "Submit for Approval"}
                </button>
              )}
              <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[1fr_320px]">
            <div className="min-w-0 space-y-4">
              {/* Vendor + bill info */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Vendor Information" icon={Building2}>
                  <div className="space-y-3">
                    <VendorPicker header={header} setHeader={setHeader} />
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="GSTIN"><input value={header.vendor_gstin} onChange={(e) => setHeader({ ...header, vendor_gstin: e.target.value.toUpperCase() })} className={inputCls} /></Field>
                      <Field label="State"><input value={header.vendor_state} onChange={(e) => setHeader({ ...header, vendor_state: e.target.value })} className={inputCls} /></Field>
                      <Field label="Phone"><input value={header.vendor_phone} onChange={(e) => setHeader({ ...header, vendor_phone: e.target.value })} className={inputCls} /></Field>
                      <Field label="Email"><input value={header.vendor_email} onChange={(e) => setHeader({ ...header, vendor_email: e.target.value })} className={inputCls} /></Field>
                    </div>
                    <Field label="Billing Address">
                      <textarea rows={2} value={header.billing_address} onChange={(e) => setHeader({ ...header, billing_address: e.target.value })} className={`${inputCls} h-auto py-1.5`} />
                    </Field>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="GST Type">
                        <select value={header.gst_type} onChange={(e) => setHeader({ ...header, gst_type: e.target.value })} className={inputCls}>
                          <option value="intra">Intra-state (CGST+SGST)</option>
                          <option value="inter">Inter-state (IGST)</option>
                        </select>
                      </Field>
                      <Field label="Reverse Charge">
                        <select value={header.reverse_charge ? "1" : "0"} onChange={(e) => setHeader({ ...header, reverse_charge: e.target.value === "1" })} className={inputCls}>
                          <option value="0">No</option>
                          <option value="1">Yes</option>
                        </select>
                      </Field>
                    </div>
                    {header._outstanding !== undefined && Number(header._outstanding) !== 0 && (
                      <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                        Outstanding balance with this vendor: {inr(header._outstanding)}
                      </p>
                    )}
                  </div>
                </Section>

                <Section title="Bill Information" icon={Package}>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Bill Number"><input value={header.bill_number} disabled className={inputCls} /></Field>
                    <Field label="Invoice Number"><input value={header.invoice_number} onChange={(e) => setHeader({ ...header, invoice_number: e.target.value })} className={inputCls} /></Field>
                    <Field label="Purchase Date"><input type="date" value={header.purchase_date} onChange={(e) => setHeader({ ...header, purchase_date: e.target.value })} className={inputCls} /></Field>
                    <Field label="Invoice Date"><input type="date" value={header.invoice_date} onChange={(e) => setHeader({ ...header, invoice_date: e.target.value })} className={inputCls} /></Field>
                    <Field label="Due Date"><input type="date" value={header.due_date} onChange={(e) => setHeader({ ...header, due_date: e.target.value })} className={inputCls} /></Field>
                    <Field label="Warehouse"><input value={header.warehouse} onChange={(e) => setHeader({ ...header, warehouse: e.target.value })} className={inputCls} /></Field>
                    <Field label="PO Reference"><input value={header.purchase_order_ref} onChange={(e) => setHeader({ ...header, purchase_order_ref: e.target.value })} className={inputCls} /></Field>
                    <Field label="Reference No"><input value={header.reference_number} onChange={(e) => setHeader({ ...header, reference_number: e.target.value })} className={inputCls} /></Field>
                    <Field label="Currency">
                      <select value={header.currency} onChange={(e) => setHeader({ ...header, currency: e.target.value })} className={inputCls}>
                        {["INR", "USD", "EUR", "GBP", "AED", "CNY"].map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Exchange Rate"><input type="number" min="0" step="0.0001" value={header.exchange_rate} onChange={(e) => setHeader({ ...header, exchange_rate: e.target.value })} className={inputCls} disabled={header.currency === "INR"} /></Field>
                    <Field label="Payment Terms" className="col-span-2"><input value={header.payment_terms} onChange={(e) => setHeader({ ...header, payment_terms: e.target.value })} className={inputCls} placeholder="e.g. 30 days credit" /></Field>
                    <Field label="Remarks" className="col-span-2"><input value={header.remarks} onChange={(e) => setHeader({ ...header, remarks: e.target.value })} className={inputCls} placeholder="Printed on the bill" /></Field>
                    <Field label="Internal Notes" className="col-span-2"><input value={header.internal_notes} onChange={(e) => setHeader({ ...header, internal_notes: e.target.value })} className={inputCls} placeholder="Visible to your team only" /></Field>
                  </div>
                </Section>
              </div>

              {/* Items grid */}
              <Section
                title={`Products (${items.length})`}
                icon={Package}
                right={
                  <div className="flex items-center gap-2">
                    <span className="hidden text-[11px] text-slate-400 md:block">Ctrl+Enter adds a row</span>
                    <button onClick={addRow} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700">
                      <Plus className="h-3.5 w-3.5" /> Add Product
                    </button>
                  </div>
                }
              >
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {["#", "Product", "SKU", "HSN", "Batch", "Expiry", "Qty", "Free", "Unit", "Price", "MRP", "Disc %", "GST %", "Taxable", "Total", ""].map((h, i) => (
                          <th key={i} className="border-b border-slate-200 px-2 py-2.5 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => {
                        const c = computeItem(it);
                        return (
                          <tr key={it.key} className="group hover:bg-violet-50/40">
                            <td className="border-b border-slate-100 px-2 py-1 text-slate-400">{idx + 1}</td>
                            <td className="border-b border-slate-100 px-1 py-1">
                              <ProductCell
                                item={it}
                                onNameChange={(name) => setItem(it.key, { product_name: name, product_id: null })}
                                onPick={(p) =>
                                  setItem(it.key, {
                                    product_id: p.id, product_name: p.name, sku: p.sku || "",
                                    hsn: p.hsn || "", purchase_price: Number(p.cost_price) || Number(p.regular_price) || 0,
                                    mrp: Number(p.regular_price) || 0, selling_price: Number(p.sale_price) || Number(p.regular_price) || 0,
                                    stock: p.stock,
                                  })
                                }
                              />
                              {it.product_id && it.stock !== null && (
                                <p className="px-1.5 text-[10px] text-slate-400">
                                  Stock: {it.stock} → {Number(it.stock) + Number(it.quantity || 0) + Number(it.free_quantity || 0)} after purchase
                                </p>
                              )}
                            </td>
                            <td className="border-b border-slate-100 px-1 py-1"><input value={it.sku} onChange={(e) => setItem(it.key, { sku: e.target.value })} className={`${cellCls} w-20`} /></td>
                            <td className="border-b border-slate-100 px-1 py-1"><input value={it.hsn} onChange={(e) => setItem(it.key, { hsn: e.target.value })} className={`${cellCls} w-20`} /></td>
                            <td className="border-b border-slate-100 px-1 py-1"><input value={it.batch_number} onChange={(e) => setItem(it.key, { batch_number: e.target.value })} className={`${cellCls} w-20`} /></td>
                            <td className="border-b border-slate-100 px-1 py-1"><input type="date" value={it.expiry_date} onChange={(e) => setItem(it.key, { expiry_date: e.target.value })} className={`${cellCls} w-32`} /></td>
                            <td className="border-b border-slate-100 px-1 py-1"><input type="number" min="0" step="any" value={it.quantity} onChange={(e) => setItem(it.key, { quantity: e.target.value })} className={`${cellCls} w-16 text-right`} /></td>
                            <td className="border-b border-slate-100 px-1 py-1"><input type="number" min="0" step="any" value={it.free_quantity} onChange={(e) => setItem(it.key, { free_quantity: e.target.value })} className={`${cellCls} w-14 text-right`} /></td>
                            <td className="border-b border-slate-100 px-1 py-1">
                              <select value={it.unit} onChange={(e) => setItem(it.key, { unit: e.target.value })} className={`${cellCls} w-[70px]`}>
                                {UNITS.map((u) => <option key={u}>{u}</option>)}
                              </select>
                            </td>
                            <td className="border-b border-slate-100 px-1 py-1"><input type="number" min="0" step="any" value={it.purchase_price} onChange={(e) => setItem(it.key, { purchase_price: e.target.value })} className={`${cellCls} w-20 text-right`} /></td>
                            <td className="border-b border-slate-100 px-1 py-1"><input type="number" min="0" step="any" value={it.mrp} onChange={(e) => setItem(it.key, { mrp: e.target.value })} className={`${cellCls} w-20 text-right`} /></td>
                            <td className="border-b border-slate-100 px-1 py-1"><input type="number" min="0" max="100" step="any" value={it.discount_percent} onChange={(e) => setItem(it.key, { discount_percent: e.target.value, discount_amount: 0 })} className={`${cellCls} w-16 text-right`} /></td>
                            <td className="border-b border-slate-100 px-1 py-1">
                              <select value={it.gst_percent} onChange={(e) => setItem(it.key, { gst_percent: e.target.value })} className={`${cellCls} w-[70px]`}>
                                {GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}
                              </select>
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right font-medium tabular-nums text-slate-600">{inr(c.taxable)}</td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right font-semibold tabular-nums text-slate-900">{inr(c.total)}</td>
                            <td className="border-b border-slate-100 px-1 py-1">
                              <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                                <button title="Duplicate row" onClick={() => duplicateRow(it.key)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-violet-100 hover:text-violet-700"><CopyPlus className="h-3.5 w-3.5" /></button>
                                <button title="Remove row" onClick={() => removeRow(it.key)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-100 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Attachments */}
              <Section title="Attachments" icon={FileUp}>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setDragOver(false);
                    setFiles((f) => [...f, ...Array.from(e.dataTransfer.files)].slice(0, 8));
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
                    dragOver ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <UploadCloud className="h-7 w-7 text-violet-500" />
                  <p className="text-sm font-medium text-slate-700">Drag & drop invoice PDF or images</p>
                  <label className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-50">
                    Browse files
                    <input type="file" multiple accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files)].slice(0, 8))} />
                  </label>
                  <p className="text-[11px] text-slate-400">Up to 8 files · 10 MB each · PDF, PNG, JPG, WEBP</p>
                </div>
                {files.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                        <span className="truncate text-slate-700">{f.name} <span className="text-xs text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span></span>
                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            {/* Summary sidebar */}
            <div className="space-y-4">
              <Section title="Summary">
                <div className="space-y-1.5 text-sm">
                  {[
                    ["Subtotal", inr(totals.subtotal)],
                    ["Item Discount", `- ${inr(totals.itemDiscount)}`],
                    ["Taxable Amount", inr(totals.taxable)],
                    header.gst_type === "intra" ? ["CGST", inr(totals.cgst)] : null,
                    header.gst_type === "intra" ? ["SGST", inr(totals.sgst)] : null,
                    header.gst_type === "inter" ? ["IGST", inr(totals.igst)] : null,
                    totals.cess ? ["CESS", inr(totals.cess)] : null,
                  ].filter(Boolean).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-slate-600">
                      <span>{k}</span><span className="font-medium tabular-nums text-slate-800">{v}</span>
                    </div>
                  ))}
                  <div className="my-2 border-t border-dashed border-slate-200" />
                  {[
                    ["Bill Discount", "bill_discount"], ["Shipping Charges", "shipping_charges"],
                    ["Packing Charges", "packing_charges"], ["Other Charges", "other_charges"],
                  ].map(([label, key]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">{label}</span>
                      <input type="number" min="0" step="any" value={header[key]}
                        onChange={(e) => setHeader({ ...header, [key]: e.target.value })}
                        className="h-8 w-24 rounded-lg border border-slate-200 px-2 text-right text-sm tabular-nums outline-none focus:border-violet-400" />
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">TDS %</span>
                    <input type="number" min="0" max="30" step="any" value={header.tds_percent}
                      onChange={(e) => setHeader({ ...header, tds_percent: e.target.value })}
                      className="h-8 w-24 rounded-lg border border-slate-200 px-2 text-right text-sm tabular-nums outline-none focus:border-violet-400" />
                  </div>
                  {totals.tds > 0 && (
                    <div className="flex items-center justify-between text-slate-600"><span>TDS Amount</span><span className="tabular-nums">- {inr(totals.tds)}</span></div>
                  )}
                  <div className="flex items-center justify-between text-slate-600"><span>Round Off</span><span className="tabular-nums">{inr(totals.roundOff)}</span></div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-950 to-indigo-950 px-3.5 py-3 text-white">
                    <span className="text-sm font-semibold">Grand Total</span>
                    <span className="text-lg font-bold tabular-nums">{inr(totals.grand)}</span>
                  </div>
                </div>
              </Section>

              {!isEdit && (
                <Section title="Payment (optional)">
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Amount Paid">
                        <input type="number" min="0" step="any" value={payment.amount}
                          onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                          placeholder="0.00" className={inputCls} />
                      </Field>
                      <Field label="Mode">
                        <select value={payment.mode} onChange={(e) => setPayment({ ...payment, mode: e.target.value })} className={inputCls}>
                          {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                        </select>
                      </Field>
                      <Field label="Payment Date">
                        <input type="date" value={payment.payment_date} onChange={(e) => setPayment({ ...payment, payment_date: e.target.value })} className={inputCls} />
                      </Field>
                      <Field label="Txn / UTR No">
                        <input value={payment.transaction_number} onChange={(e) => setPayment({ ...payment, transaction_number: e.target.value })} className={inputCls} />
                      </Field>
                    </div>
                    {["bank", "cheque"].includes(payment.mode) && (
                      <Field label="Bank Name">
                        <input value={payment.bank_name} onChange={(e) => setPayment({ ...payment, bank_name: e.target.value })} className={inputCls} />
                      </Field>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setPayment({ ...payment, amount: totals.grand })} className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
                        Full {inr(totals.grand, { decimals: 0 })}
                      </button>
                      <button onClick={() => setPayment({ ...payment, amount: "" })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-500">Clear</button>
                    </div>
                    {Number(payment.amount) > 0 && (
                      <p className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                        <span>Balance after payment</span>
                        <span className="font-bold text-rose-600 tabular-nums">{inr(Math.max(0, totals.grand - Number(payment.amount)))}</span>
                      </p>
                    )}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
