import React, { useEffect, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { saveAs } from "file-saver";
import {
  emailInvoice, fetchInvoicePdfBlob, fetchInvoiceShareLink, fetchOrderInvoiceData, fetchOrderRefunds, generateCreditNote,
} from "../services/orderService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatLine = (...parts) => parts.filter(Boolean).join(", ");

export default function Invoice() {
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const printRef = useRef(null);

  // Orders reach this page via ?orderId= and fetch their own data (also
  // survives a refresh, unlike the Sale Bills state-only flow below).
  const [orderData, setOrderData] = useState(null);
  const [orderRefunds, setOrderRefunds] = useState([]);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!orderId) return;
    fetchOrderInvoiceData(orderId).then(setOrderData).catch(() => toast.error("Failed to load invoice data"));
    fetchOrderRefunds(orderId).then(setOrderRefunds).catch(() => {});
  }, [orderId]);

  const source = orderId ? orderData : location.state;

  const billing = source?.billing || {};
  const shipping = source?.shipping || {};
  const items = source?.items || [];

  const grandTotal = Number(source?.grandTotal) || 0;
  const subtotal = Number(source?.subtotal) || 0;
  const shippingCharge = Number(source?.shippingCharge) || 0;
  const discount = Number(source?.discount) || 0;

  const paymentMethod = source?.paymentMethod || "-";
  const date = source?.date || "-";

  // Orders carry their real backend invoice number; Sale Bills (no
  // orderId, no invoiceNumber in state) keep their existing scheme unchanged.
  const invoiceNumber = orderId
    ? source?.invoiceNumber || `INV-${id}`
    : `DD202627${String(id || 1).padStart(3, "0")}`;

  const taxableAmount = Number(source?.taxableAmount) || 0;
  const gstAmount = Number(source?.gstAmount) || 0;

  const generatePDF = async () => {
    const element = printRef.current;

    const options = {
      margin: 0,
      filename: `invoice-${id}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    };

    await html2pdf().set(options).from(element).save();
  };

  const doThermal = async () => {
    setBusy("thermal");
    try {
      const blob = await fetchInvoicePdfBlob(orderId, "thermal");
      saveAs(blob, `invoice-${orderId}-thermal.pdf`);
    } catch { toast.error("Thermal download failed"); } finally { setBusy(""); }
  };

  const doEmail = async () => {
    setBusy("email");
    try {
      const r = await emailInvoice({ id: orderId });
      toast.success(r.message || "Invoice emailed");
    } catch { toast.error("Failed to email invoice"); } finally { setBusy(""); }
  };

  const doWhatsApp = async () => {
    setBusy("whatsapp");
    try {
      const { url } = await fetchInvoiceShareLink(orderId);
      const phone = (shipping.phone || billing.phone || "").replace(/\D/g, "");
      const name = [billing.firstName, billing.lastName].filter(Boolean).join(" ");
      const message = `Hi ${name}, here's your invoice for Order #${orderId} (${invoiceNumber}): ${url}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    } catch { toast.error("Failed to generate share link"); } finally { setBusy(""); }
  };

  const doCreditNote = async (refundId) => {
    setBusy(`credit-${refundId}`);
    try {
      const blob = await generateCreditNote({ id: orderId, refundId });
      saveAs(blob, `credit-note-${orderId}-${refundId}.pdf`);
    } catch { toast.error("Failed to generate credit note"); } finally { setBusy(""); }
  };

  if (!source) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-red-500">
          Invoice Data Not Found
        </h2>

        <Link
          to={orderId ? `/orders/${orderId}` : "/sale-bills"}
          className="mt-5 inline-block bg-black text-white px-5 py-3 rounded-xl"
        >
          Go Back
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* TOP BAR */}
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2 mb-4 no-print">

        <Link
          to={orderId ? `/orders/${orderId}` : "/sale-bills"}
          className="text-sm font-semibold text-blue-600"
        >
          {orderId ? "Back to Order" : "Back to Sale Bills"}
        </Link>

        <div className="flex flex-wrap gap-2">
          {orderId && (
            <>
              <button onClick={doThermal} disabled={busy === "thermal"} className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                Thermal PDF
              </button>
              <button onClick={doEmail} disabled={busy === "email"} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                Email
              </button>
              <button onClick={doWhatsApp} disabled={busy === "whatsapp"} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                WhatsApp
              </button>
              {orderRefunds.map((r) => (
                <button
                  key={r.id}
                  onClick={() => doCreditNote(r.id)}
                  disabled={busy === `credit-${r.id}`}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  Credit Note (₹{Number(r.amount).toFixed(0)})
                </button>
              ))}
            </>
          )}
          <button
            onClick={generatePDF}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold transition-all"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* INVOICE */}
      <div
        ref={printRef}
         className="max-w-3xl mx-auto bg-white rounded-3xl px-5 py-2"
           >

        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-200 mb-3">

          <div>
            <img
              src="/logodd.png"
              alt="logo"
              className="w-48 h-24 object-contain"
            />
          </div>

          <div className="flex-1 text-right">
            <h1 className="text-xl md:text-xl font-bold tracking-[6px] text-gray-900">
              TAX INVOICE
            </h1>
          </div>
        </div>

        {/* ADDRESS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">

          {/* BILLING */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">

            <div className="bg-gray-50 border-b border-gray-200 px-4">
              <h3 className="text-xs font-medium uppercase tracking-wider pb-3">
                Billing Address
              </h3>
            </div>

            <div className=" px-4 text-gray-700 leading-6 pb-3">

              <p className="font-medium text-xs text-gray-900">
                {[billing?.firstName, billing?.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>

              <p className="text-xs">{billing?.address}</p>

              <p className="text-xs">
                {formatLine(
                  billing?.city,
                  billing?.state,
                  billing?.pincode
                )}
              </p>

              <p className="text-xs">{billing?.phone}</p>

              <p className="text-xs">{billing?.email}</p>

            </div>
          </div>

          {/* SHIPPING */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">

            <div className="bg-gray-50 border-b border-gray-200 px-4">
              <h3 className="text-xs font-medium uppercase tracking-wider pb-3">
                Shipping Address
              </h3>
            </div>

            <div className="pb-1 px-4 text-gray-700 leading-6">

              <p className="text-xs font-medium text-gray-900">
                {[shipping?.firstName, shipping?.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>

              <p className="text-xs">{shipping?.address}</p>

              <p className="text-xs">
                {formatLine(
                  shipping?.city,
                  shipping?.state,
                  shipping?.pincode
                )}
              </p>

              <p className="text-xs">{shipping?.phone}</p>

              <p className="text-xs">{shipping?.email}</p>

            </div>
          </div>
        </div>

        {/* Invoice, payment method */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 ">

          <div className="md:col-span-1 bg-gray-50 border border-gray-200 rounded-2xl px-4">
            <p className="text-xs uppercase text-gray-500  ">
              Invoice No.
            </p>

            <h4 className="font-medium text-xs text-gray-900 pb-2">
              {invoiceNumber}
            </h4>
          </div>

          <div className="md:col-span-1 bg-gray-50 border border-gray-200 rounded-2xl px-4">
            <p className="text-xs uppercase text-gray-500">
              Invoice Date
            </p>

            <h4 className="font-medium text-xs text-gray-900 pb-2">
              {date}
            </h4>
          </div>

          <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-2xl px-4">
            <p className="text-xs uppercase text-gray-500">
              Payment Method
            </p>

            <h4 className="font-medium text-xs text-gray-900 pb-2">
              {paymentMethod}
            </h4>
          </div>
        </div>

       {/* TABLE */}
<div className="overflow-x-auto mb-3">

  <table className="w-full border border-gray-200 border-collapse">

    <thead className="bg-gray-200 text-slate uppercase">

      <tr>

        <th className="border border-gray-300 px-3 pb-3 text-xs">
          #
        </th>

        <th className="border border-gray-300 px-3 pb-3 text-left text-xs">
          Product
        </th>

        <th className="border border-gray-300 px-3 pb-3 text-xs">
          SKU
        </th>

        <th className="border border-gray-300 px-3 pb-3 text-xs">
          HSN
        </th>

        <th className="border border-gray-300 px-3 pb-3 text-xs">
          Qty
        </th>

        <th className="border border-gray-300 px-3 pb-3 text-xs">
          Price
        </th>

        <th className="border border-gray-300 px-3 pb-3 text-xs">
          GST%
        </th>

        <th className="border border-gray-300 px-3 pb-3 text-xs">
          Tax
        </th>

        <th className="border border-gray-300 px-3 pb-3 text-xs">
          Total
        </th>

      </tr>

    </thead>

    <tbody>

      {items.map((item, index) => {

      const qty = Number(item.qty) || 0;
const rate = Number(item.rate) || 0;
const gst =
  item.gst === "" || item.gst === null || item.gst === undefined
    ? ""
    : Number(item.gst);

const taxable = qty * rate;
const total = Number(item.total) || 0;
const tax = total - taxable;

        return (

          <tr
            key={index}
            className="border border-gray-200"
          >

            <td className="border border-gray-200 px-3 pb-3 text-sm text-center">
              {index + 1}
            </td>

            <td className="border border-gray-200 px-3 pb-3 text-xs text-left">
              {item.description || "-"}
            </td>

            <td className="border border-gray-200 px-3 pb-3 text-xs text-center">
              {item.sku || "-"}
            </td>

            <td className="border border-gray-200 px-3 pb-3 text-xs text-center">
              {item.hsn || "-"}
            </td>

            <td className="border border-gray-200 px-3 pb-3 text-xs text-center">
              {qty}
            </td>

            <td className="border border-gray-200 px-3 pb-3 text-xs text-center">
              {formatCurrency(rate)}
            </td>

           <td className="border border-gray-200 px-3 pb-3 text-xs text-center">
  {gst === "" ? "-" : `${gst}%`}
</td>

            <td className="border border-gray-200 px-3 pb-3 text-xs text-center">
              {formatCurrency(tax)}
            </td>

            <td className="border border-gray-200 px-3 pb-3 text-xs text-center">
              {formatCurrency(total)}
            </td>

          </tr>
        );
      })}

    </tbody>

  </table>

</div>

        {/* SUMMARY */}
       <div className="flex justify-end mb-3">

  <div className="w-full border border-gray-200 rounded-2xl bg-gray-50 px-4">

     <div className="flex flex-wrap items-center justify-between pb-3 text-xs gap-4">

  <div className="flex items-center gap-1">
    <span>Subtotal</span>
    <span className="font-semibold">
      {formatCurrency(subtotal)}
    </span>
  </div>

  <div className="flex items-center gap-1">
    <span>Discount</span>
    <span className="font-semibold">
      {formatCurrency(discount)}
    </span>
  </div>

  <div className="flex items-center gap-1">
    <span>Taxable Amount</span>
    <span className="font-semibold">
      {formatCurrency(taxableAmount)}
    </span>
  </div>

  <div className="flex items-center gap-1">
    <span>Shipping</span>
    <span className="font-semibold">
      {formatCurrency(shippingCharge)}
    </span>
  </div>

  <div className="flex items-center gap-1">
    <span>GST</span>
    <span className="font-semibold">
      {formatCurrency(gstAmount)}
    </span>
  </div>

  <div className="flex items-center gap-1 text-xs font-semibold">
    <span>Total</span>
    <span>
      {formatCurrency(grandTotal)}
    </span>
  </div>

</div>

          </div>
        </div>

     {/* FOOTER */}
<div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-2">

          {/* SUPPLIER */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden pb-2">

            <div className="bg-gray-50 border-b border-gray-200 px-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider pb-2">
                Supplier Details
              </h3>
            </div>

            <div className="px-4 leading-6 text-gray-700">

              <p className="text-xs text-gray-900">
                Pingoria Enterprises
              </p>

              <p className="text-xs">Address: Sector-71, Mohali</p>

              <p className="text-xs">GSTIN: 03DPIPP8445E1ZR</p>

              <p className="text-xs">State: Punjab | State Code: 03</p>

              <p className="text-xs">
                Email: info@divyadarshnam.com
              </p>

            </div>
          </div>

            {/* TERMS & CONDITIONS */}

<div className="border border-gray-200 rounded-2xl overflow-hidden ">

  <div className="bg-gray-50 border-b border-gray-200 px-4">
    <h3 className="text-xs font-semibold uppercase tracking-wider pb-2">
      Terms & Conditions
    </h3>
  </div>

  <div className="px-4 text-gray-700 leading-6">

    <p className="text-xs">
      1. We do not accept returns or exchanges for custom or puja items.
    </p>

    <p className="text-xs">
      2. All prices are in INR (₹) including taxes unless stated otherwise.
    </p>

    <p className="text-xs">
      3. Goods once dispatched will not be taken back.
    </p>

    <p className="text-xs">
      4. Contact: info@divyadarshnam.com
    </p>

  </div>

</div>

       {/* SIGNATURE */}

<div className="md:col-span-2 border border-gray-200 rounded-2xl overflow-hidden">

  <div className="bg-gray-50 border-b border-gray-200 px-4 py-1">
    <h3 className="text-xs font-semibold uppercase tracking-wider pb-2">
      Authorized Signature
    </h3>
  </div>

  <div className="flex items-end justify-between px-4 py-4 min-h-[130px]">

    {/* LEFT SIDE */}
    <div className="w-[250px]">

      <div className="border-b border-black mb-1"></div>

      <p className="text-sm font-semibold">
        Authorized Signatory
      </p>

      <p className="text-sm text-gray-600">
        Pingoria Enterprises
      </p>

    </div>

    {/* RIGHT SIDE */}
    <div className="flex flex-col items-center">

      <img
        src="/signature.png"
        alt="signature"
        className="w-32 object-contain mb-2"
      />

      <p className="text-xs text-gray-500">
        Digitally Signed
      </p>

    </div>

  </div>

</div>


        </div>



      </div>
    </div>
  );
}
