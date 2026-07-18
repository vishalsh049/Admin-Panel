import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban, CheckCircle2, Clock3, Download, FileText, History, Loader2, Mail,
  Paperclip, Pencil, Printer, Trash2, UploadCloud, Wallet, X,
} from "lucide-react";
import {
  changeBillStatus, deleteBillAttachment, deleteBillPayment, fetchBillPdfBlob,
  fetchPurchaseBill, uploadBillAttachments,
} from "../../services/purchaseBillService";
import { BASE_URL } from "../../utils/api";
import { fmtDate, fmtDateTime, inr, paymentInfo, statusInfo } from "./constants";
import { printBill } from "./printBill";

const TIMELINE_COLORS = {
  created: "bg-violet-500", updated: "bg-sky-500", approved: "bg-emerald-500",
  rejected: "bg-rose-500", cancelled: "bg-slate-400", completed: "bg-teal-500",
  payment: "bg-emerald-500", payment_deleted: "bg-rose-400", submitted: "bg-amber-500",
  duplicated: "bg-indigo-400", attachment: "bg-fuchsia-400", attachment_deleted: "bg-slate-400",
  downloaded: "bg-slate-400", reverted: "bg-slate-400",
};

function Stat({ label, value, cls = "text-slate-900" }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

export default function BillViewModal({ billId, onClose, onEdit, onPay, isAdmin }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("details");
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-bill", billId],
    queryFn: () => fetchPurchaseBill(billId),
    enabled: !!billId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["purchase-bill", billId] });
    qc.invalidateQueries({ queryKey: ["purchase-bills"] });
    qc.invalidateQueries({ queryKey: ["purchase-dashboard"] });
  };

  const statusMutation = useMutation({
    mutationFn: changeBillStatus,
    onSuccess: (b) => { toast.success(`Bill ${statusInfo(b.status).label.toLowerCase()}`); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.error || "Status change failed"),
  });

  const uploadMutation = useMutation({
    mutationFn: (files) => uploadBillAttachments({ id: billId, files }),
    onSuccess: () => { toast.success("Files uploaded"); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.error || "Upload failed"),
  });

  const deleteAttMutation = useMutation({
    mutationFn: (attachmentId) => deleteBillAttachment({ id: billId, attachmentId }),
    onSuccess: () => { toast.success("Attachment removed"); invalidate(); },
  });

  const deletePayMutation = useMutation({
    mutationFn: (paymentId) => deleteBillPayment({ id: billId, paymentId }),
    onSuccess: () => { toast.success("Payment removed"); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to remove payment"),
  });

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const blob = await fetchBillPdfBlob(billId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data?.bill?.bill_number || "purchase-bill"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  };

  if (!billId) return null;
  const bill = data?.bill;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[85] flex justify-end bg-slate-950/45 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-white/20 bg-[#f6f7fb] shadow-2xl"
      >
        {isLoading || !bill ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{bill.bill_number}</h2>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo(bill.status).badge}`}>{statusInfo(bill.status).label}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paymentInfo(bill.payment_status).badge}`}>{paymentInfo(bill.payment_status).label}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/65">{bill.vendor_name} · {fmtDate(bill.purchase_date)}</p>
                </div>
                <button onClick={onClose} className="rounded-xl border border-white/20 bg-white/10 p-2 transition hover:bg-white/20"><X className="h-5 w-5" /></button>
              </div>
              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {bill.status === "pending" && isAdmin && (
                  <>
                    <button onClick={() => statusMutation.mutate({ id: bill.id, status: "approved" })} disabled={statusMutation.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => statusMutation.mutate({ id: bill.id, status: "rejected" })} disabled={statusMutation.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-500/90 px-3.5 text-xs font-semibold text-white transition hover:bg-rose-400">
                      <Ban className="h-4 w-4" /> Reject
                    </button>
                  </>
                )}
                {bill.status === "draft" && (
                  <button onClick={() => statusMutation.mutate({ id: bill.id, status: "pending" })} disabled={statusMutation.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-xs font-semibold text-white transition hover:bg-amber-400">
                    <Clock3 className="h-4 w-4" /> Submit for Approval
                  </button>
                )}
                {Number(bill.balance_amount) > 0 && !["cancelled", "rejected", "draft"].includes(bill.status) && (
                  <button onClick={() => onPay(bill)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3.5 text-xs font-semibold text-white transition hover:bg-white/25">
                    <Wallet className="h-4 w-4" /> Record Payment
                  </button>
                )}
                {!["cancelled"].includes(bill.status) && (
                  <button onClick={() => onEdit(data)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3.5 text-xs font-semibold text-white transition hover:bg-white/25">
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                )}
                <button onClick={() => printBill(data)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3.5 text-xs font-semibold text-white transition hover:bg-white/25">
                  <Printer className="h-4 w-4" /> Print
                </button>
                <button onClick={downloadPdf} disabled={pdfLoading} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3.5 text-xs font-semibold text-white transition hover:bg-white/25">
                  {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
                </button>
                {bill.vendor_email && (
                  <a
                    href={`mailto:${bill.vendor_email}?subject=${encodeURIComponent(`Purchase Bill ${bill.bill_number}`)}&body=${encodeURIComponent(`Dear ${bill.vendor_name},\n\nPlease find our purchase bill ${bill.bill_number} dated ${fmtDate(bill.purchase_date)} for ${inr(bill.grand_total)}.\n\nRegards`)}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3.5 text-xs font-semibold text-white transition hover:bg-white/25"
                  >
                    <Mail className="h-4 w-4" /> Email Vendor
                  </a>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200 bg-white px-4 pt-2">
              {[
                { key: "details", label: "Details", icon: FileText },
                { key: "payments", label: `Payments (${data.payments.length})`, icon: Wallet },
                { key: "attachments", label: `Files (${data.attachments.length})`, icon: Paperclip },
                { key: "timeline", label: "Timeline", icon: History },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 rounded-t-xl px-3.5 py-2.5 text-[13px] font-semibold transition ${
                    tab === t.key ? "border-b-2 border-violet-600 text-violet-700" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {tab === "details" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <Stat label="Grand Total" value={inr(bill.grand_total)} />
                    <Stat label="Paid" value={inr(bill.paid_amount)} cls="text-emerald-600" />
                    <Stat label="Balance" value={inr(bill.balance_amount)} cls={Number(bill.balance_amount) > 0 ? "text-rose-600" : "text-emerald-600"} />
                    <Stat label="GST Credit" value={inr(Number(bill.cgst) + Number(bill.sgst) + Number(bill.igst) + Number(bill.cess))} cls="text-violet-700" />
                    <Stat label="Invoice No" value={bill.invoice_number || "—"} />
                    <Stat label="Invoice Date" value={fmtDate(bill.invoice_date)} />
                    <Stat label="Due Date" value={fmtDate(bill.due_date)} />
                    <Stat label="Warehouse" value={bill.warehouse || "Main"} />
                    <Stat label="Vendor GSTIN" value={bill.vendor_gstin || "—"} />
                    <Stat label="GST Type" value={bill.gst_type === "inter" ? "Inter (IGST)" : "Intra (CGST+SGST)"} />
                    <Stat label="Created By" value={bill.created_by_name || "—"} />
                    <Stat label="Approved By" value={bill.approved_by_name || "—"} />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-slate-900 text-left text-[10px] font-semibold uppercase tracking-wider text-white/80">
                          <th className="px-3 py-2.5">Item</th>
                          <th className="px-3 py-2.5 text-right">Qty</th>
                          <th className="px-3 py-2.5 text-right">Rate</th>
                          <th className="px-3 py-2.5 text-right">Disc</th>
                          <th className="px-3 py-2.5 text-right">GST</th>
                          <th className="px-3 py-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((it) => (
                          <tr key={it.id} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-slate-800">{it.product_name}</p>
                              <p className="text-[11px] text-slate-400">
                                {[it.sku && `SKU ${it.sku}`, it.hsn && `HSN ${it.hsn}`, it.batch_number && `Batch ${it.batch_number}`, it.expiry_date && `Exp ${fmtDate(it.expiry_date)}`].filter(Boolean).join(" · ")}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{Number(it.quantity)}{Number(it.free_quantity) ? ` +${Number(it.free_quantity)}` : ""} {it.unit}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{inr(it.purchase_price)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{Number(it.discount_amount) ? inr(it.discount_amount) : "—"}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{inr(it.gst_amount)} <span className="text-[10px] text-slate-400">({Number(it.gst_percent)}%)</span></td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{inr(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="ml-auto w-full max-w-xs space-y-1 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                    {[
                      ["Subtotal", bill.subtotal], ["Item Discount", -bill.item_discount, true],
                      ["Bill Discount", -bill.bill_discount, true], ["Taxable", bill.taxable_amount],
                      ["CGST", bill.cgst, true], ["SGST", bill.sgst, true], ["IGST", bill.igst, true],
                      ["CESS", bill.cess, true], ["Shipping", bill.shipping_charges, true],
                      ["Packing", bill.packing_charges, true], ["Other", bill.other_charges, true],
                      ["TDS", -bill.tds_amount, true], ["Round Off", bill.round_off],
                    ]
                      .filter(([, v, hideZero]) => !hideZero || Number(v) !== 0)
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between text-slate-600">
                          <span>{k}</span><span className="tabular-nums">{inr(v)}</span>
                        </div>
                      ))}
                    <div className="mt-2 flex justify-between rounded-xl bg-slate-900 px-3 py-2 font-bold text-white">
                      <span>Grand Total</span><span className="tabular-nums">{inr(bill.grand_total)}</span>
                    </div>
                  </div>
                  {(bill.remarks || bill.internal_notes) && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      {bill.remarks && <p><span className="font-semibold text-slate-800">Remarks:</span> {bill.remarks}</p>}
                      {bill.internal_notes && <p className="mt-1"><span className="font-semibold text-slate-800">Internal:</span> {bill.internal_notes}</p>}
                    </div>
                  )}
                </div>
              )}

              {tab === "payments" && (
                <div className="space-y-2.5">
                  {data.payments.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No payments recorded yet.</p>}
                  {data.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{inr(p.amount)} <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-700">{p.mode}</span></p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {fmtDate(p.payment_date)}{p.transaction_number && ` · Txn ${p.transaction_number}`}{p.bank_name && ` · ${p.bank_name}`} · by {p.created_by_name || "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => window.confirm("Remove this payment? The bill balance will be restored.") && deletePayMutation.mutate(p.id)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tab === "attachments" && (
                <div className="space-y-3">
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-8 text-center transition hover:border-violet-300 hover:bg-violet-50/40">
                    <UploadCloud className="h-6 w-6 text-violet-500" />
                    <span className="text-sm font-medium text-slate-700">{uploadMutation.isPending ? "Uploading…" : "Click to upload invoice PDF / images"}</span>
                    <input type="file" multiple accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => e.target.files.length && uploadMutation.mutate(Array.from(e.target.files))} />
                  </label>
                  {data.attachments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <a href={`${BASE_URL}${a.file_path}`} target="_blank" rel="noreferrer" className="min-w-0 flex items-center gap-3">
                        {a.file_type?.startsWith("image/") ? (
                          <img src={`${BASE_URL}${a.file_path}`} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-500"><FileText className="h-5 w-5" /></span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-violet-700 hover:underline">{a.file_name}</span>
                          <span className="block text-xs text-slate-400">{(a.file_size / 1024).toFixed(0)} KB · {a.uploaded_by_name || "—"}</span>
                        </span>
                      </a>
                      <button onClick={() => deleteAttMutation.mutate(a.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tab === "timeline" && (
                <ol className="relative ml-3 space-y-4 border-l-2 border-slate-200 pl-5">
                  {data.timeline.length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
                  {data.timeline.map((t) => (
                    <li key={t.id} className="relative">
                      <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${TIMELINE_COLORS[t.action] || "bg-slate-400"}`} />
                      <p className="text-sm font-semibold capitalize text-slate-800">{t.action.replace(/_/g, " ")}</p>
                      {t.details && <p className="text-xs text-slate-500">{t.details}</p>}
                      <p className="mt-0.5 text-[11px] text-slate-400">{fmtDateTime(t.created_at)}{t.user_name && ` · ${t.user_name}`}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
