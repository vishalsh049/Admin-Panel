import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud, X } from "lucide-react";
import { importPurchaseBills } from "../../services/purchaseBillService";
import { inr } from "./constants";

// Expected sheet columns (one row = one item; rows grouped by invoice+vendor):
const TEMPLATE_COLS = [
  "vendor_name", "invoice_number", "invoice_date", "purchase_date", "due_date", "warehouse",
  "gst_type", "product_name", "sku", "hsn", "quantity", "unit", "purchase_price",
  "discount_percent", "gst_percent",
];

function parseWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

const toDate = (v) => {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

// Group flat item rows into bills keyed by invoice_number + vendor_name.
function groupRows(rows) {
  const bills = new Map();
  const errors = [];
  rows.forEach((row, i) => {
    const vendor = String(row.vendor_name || "").trim();
    const product = String(row.product_name || "").trim();
    const qty = Number(row.quantity) || 0;
    if (!vendor) return errors.push({ row: i + 2, error: "vendor_name is required" });
    if (!product) return errors.push({ row: i + 2, error: "product_name is required" });
    if (qty <= 0) return errors.push({ row: i + 2, error: "quantity must be > 0" });

    const key = `${String(row.invoice_number || "").trim()}::${vendor}`;
    if (!bills.has(key)) {
      bills.set(key, {
        vendor_name: vendor,
        invoice_number: String(row.invoice_number || "").trim() || null,
        invoice_date: toDate(row.invoice_date) || null,
        purchase_date: toDate(row.purchase_date) || new Date().toISOString().slice(0, 10),
        due_date: toDate(row.due_date) || null,
        warehouse: String(row.warehouse || "Main").trim(),
        gst_type: String(row.gst_type || "intra").toLowerCase() === "inter" ? "inter" : "intra",
        items: [],
      });
    }
    bills.get(key).items.push({
      product_name: product,
      sku: String(row.sku || "").trim(),
      hsn: String(row.hsn || "").trim(),
      quantity: qty,
      unit: String(row.unit || "pcs").trim(),
      purchase_price: Number(row.purchase_price) || 0,
      discount_percent: Number(row.discount_percent) || 0,
      gst_percent: Number(row.gst_percent) || 0,
    });
  });
  return { bills: [...bills.values()], errors };
}

export default function ImportModal({ open, onClose }) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: importPurchaseBills,
    onSuccess: (res) => {
      setResult(res);
      qc.invalidateQueries({ queryKey: ["purchase-bills"] });
      qc.invalidateQueries({ queryKey: ["purchase-dashboard"] });
      if (res.created) toast.success(`${res.created} bill(s) imported as drafts`);
      if (res.errors?.length) toast.error(`${res.errors.length} bill(s) failed`);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Import failed"),
  });

  const handleFile = async (file) => {
    if (!file) return;
    setResult(null);
    try {
      const rows = await parseWorkbook(file);
      if (!rows.length) return toast.error("The sheet is empty");
      const { bills, errors } = groupRows(rows);
      setPreview(bills);
      setParseErrors(errors);
    } catch {
      toast.error("Could not read the file — use .xlsx, .xls or .csv");
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLS,
      ["Acme Traders", "INV-1001", "2026-07-01", "2026-07-01", "2026-07-31", "Main", "intra", "Sandalwood Mala", "SKU001", "3307", 10, "pcs", 120, 0, 5],
      ["Acme Traders", "INV-1001", "2026-07-01", "2026-07-01", "2026-07-31", "Main", "intra", "Dhoop Sticks", "SKU002", "3307", 24, "box", 45, 5, 12],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PurchaseBills");
    XLSX.writeFile(wb, "purchase-bills-import-template.xlsx");
  };

  const reset = () => { setPreview(null); setParseErrors([]); setResult(null); };
  if (!open) return null;

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 20, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/40 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 to-indigo-950 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold">Bulk Import Purchase Bills</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 transition hover:bg-white/20"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!preview && (
            <>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center transition hover:border-violet-300 hover:bg-violet-50/40">
                <UploadCloud className="h-8 w-8 text-violet-500" />
                <span className="text-sm font-semibold text-slate-700">Upload Excel / CSV file</span>
                <span className="text-xs text-slate-400">One row per item — rows with the same invoice + vendor merge into one bill</span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
              </label>
              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                <Download className="h-4 w-4" /> Download template
              </button>
            </>
          )}

          {preview && !result && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-slate-900">{preview.length}</span> bill(s) ready ·{" "}
                  <span className="font-bold text-slate-900">{preview.reduce((s, b) => s + b.items.length, 0)}</span> items
                  {parseErrors.length > 0 && <span className="ml-2 font-semibold text-rose-600">{parseErrors.length} row(s) skipped</span>}
                </p>
                <button onClick={reset} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Choose another file</button>
              </div>

              {parseErrors.length > 0 && (
                <div className="max-h-28 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {parseErrors.map((e, i) => (
                    <p key={i} className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Sheet row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}

              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-900 text-left text-[10px] font-semibold uppercase tracking-wider text-white/80">
                      <th className="px-3 py-2">Vendor</th><th className="px-3 py-2">Invoice</th>
                      <th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Items</th>
                      <th className="px-3 py-2 text-right">Est. Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((b, i) => {
                      const est = b.items.reduce((s, it) => {
                        const gross = it.quantity * it.purchase_price;
                        const taxable = gross * (1 - it.discount_percent / 100);
                        return s + taxable * (1 + it.gst_percent / 100);
                      }, 0);
                      return (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 font-medium text-slate-800">{b.vendor_name}</td>
                          <td className="px-3 py-2 text-slate-600">{b.invoice_number || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{b.purchase_date}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{b.items.length}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{inr(est)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => mutation.mutate(preview)}
                disabled={mutation.isPending || !preview.length}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Import {preview.length} bill(s) as drafts
              </button>
              <p className="text-center text-[11px] text-slate-400">Imported bills arrive as drafts — review and approve them to update stock & ledgers. Duplicate invoice numbers per vendor are rejected.</p>
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">{result.created} bill(s) imported successfully</p>
              </div>
              {result.errors?.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <p className="mb-1.5 font-bold">Failed bills:</p>
                  {result.errors.map((e, i) => <p key={i}>Bill {e.row}: {e.error}</p>)}
                </div>
              )}
              <button onClick={() => { reset(); onClose(); }} className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Done</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
