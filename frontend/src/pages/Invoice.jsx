import React, { useRef } from "react";
import html2pdf from "html2pdf.js";
import { Link, useLocation, useParams } from "react-router-dom";

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
  const printRef = useRef(null);

  const billing = location.state?.billing || {};
  const shipping = location.state?.shipping || {};
  const items = location.state?.items || [];

  const grandTotal = Number(location.state?.grandTotal) || 0;
  const subtotal = Number(location.state?.subtotal) || 0;
  const shippingCharge = Number(location.state?.shippingCharge) || 0;
  const discount = Number(location.state?.discount) || 0;

  const paymentMethod = location.state?.paymentMethod || "-";
  const date = location.state?.date || "-";

  const invoiceNumber = `INV-${id}`;

  const taxableAmount = subtotal - discount;
  const gstAmount = grandTotal - shippingCharge - taxableAmount;

  const amountInWords = `Rupees ${Math.round(
    grandTotal
  )} Only`;

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

  if (!location.state) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-red-500">
          Invoice Data Not Found
        </h2>

        <Link
          to="/sale-bills"
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
      <div className="max-w-3xl mx-auto flex items-center justify-between mb-4 no-print">

        <Link
          to="/sale-bills"
          className="text-sm font-semibold text-blue-600"
        >
          Back to Order
        </Link>

        <button
          onClick={generatePDF}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold transition-all"
        >
          Download PDF
        </button>
      </div>

      {/* INVOICE */}
      <div
        ref={printRef}
        className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm px-5 py-2"
      >

        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-200 mb-3">

          <div>
            <img
              src="/logo.png"
              alt="logo"
              className="w-24 h-24 object-contain"
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

            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <h3 className="text-xs font-medium uppercase tracking-wider">
                Billing Address
              </h3>
            </div>

            <div className="py-2 px-4 text-gray-700 leading-6">

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

            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <h3 className="text-xs font-medium uppercase tracking-wider">
                Shipping Address
              </h3>
            </div>

            <div className="py-2 px-4 text-gray-700 leading-6">

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">

          <div className="md:col-span-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
            <p className="text-xs uppercase text-gray-500 ">
              Invoice No.
            </p>

            <h4 className="font-medium text-xs text-gray-900">
              {invoiceNumber}
            </h4>
          </div>

          <div className="md:col-span-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
            <p className="text-xs uppercase text-gray-500">
              Invoice Date
            </p>

            <h4 className="font-medium text-xs text-gray-900">
              {date}
            </h4>
          </div>

          <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
            <p className="text-xs uppercase text-gray-500">
              Payment Method
            </p>

            <h4 className="font-medium text-xs text-gray-900">
              {paymentMethod}
            </h4>
          </div>
        </div>

       {/* TABLE */}
<div className="overflow-x-auto mb-3">

  <table className="w-full border border-gray-200 border-collapse">

    <thead className="bg-slate-900 text-white">

      <tr>

        <th className="border border-gray-300 px-3 py-2 text-xs">
          #
        </th>

        <th className="border border-gray-300 px-3 py-2 text-left text-xs">
          Product
        </th>

        <th className="border border-gray-300 px-3 py-2 text-xs">
          SKU
        </th>

        <th className="border border-gray-300 px-3 py-2 text-xs">
          HSN
        </th>

        <th className="border border-gray-300 px-3 py-2 text-xs">
          Qty
        </th>

        <th className="border border-gray-300 px-3 py-2 text-xs">
          Price
        </th>

        <th className="border border-gray-300 px-3 py-2 text-xs">
          GST%
        </th>

        <th className="border border-gray-300 px-3 py-2 text-xs">
          Tax
        </th>

        <th className="border border-gray-300 px-3 py-2 text-xs">
          Total
        </th>

      </tr>

    </thead>

    <tbody>

      {items.map((item, index) => {

        const qty = Number(item.qty) || 0;
        const rate = Number(item.rate) || 0;
        const gst = Number(item.gst) || 0;

        const base = qty * rate;
        const tax = (base * gst) / 100;
        const total = base + tax;

        return (

          <tr
            key={index}
            className="border border-gray-200"
          >

            <td className="border border-gray-200 px-3 py-2 text-sm text-center">
              {index + 1}
            </td>

            <td className="border border-gray-200 px-3 py-2 text-xs text-left">
              {item.description || "-"}
            </td>

            <td className="border border-gray-200 px-3 py-2 text-xs text-center">
              {item.sku || "-"}
            </td>

            <td className="border border-gray-200 px-3 py-2 text-xs text-center">
              {item.hsn || "-"}
            </td>

            <td className="border border-gray-200 px-3 py-2 text-xs text-center">
              {qty}
            </td>

            <td className="border border-gray-200 px-3 py-2 text-xs text-center">
              {formatCurrency(rate)}
            </td>

            <td className="border border-gray-200 px-3 py-2 text-xs text-center">
              {gst}%
            </td>

            <td className="border border-gray-200 px-3 py-2 text-xs text-center">
              {formatCurrency(tax)}
            </td>

            <td className="border border-gray-200 px-3 py-2 text-xs text-center">
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

          <div className="w-full md:w-[380px] border border-gray-200 rounded-2xl bg-gray-50 px-4 py-2">

            <div className="space-y-1">

              <div className="flex justify-between text-xs">
                <span>Subtotal</span>

                <span>
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span>Discount</span>

                <span className="font-small">
                  {formatCurrency(discount)}
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span>Taxable Amount</span>

                <span>
                  {formatCurrency(taxableAmount)}
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span>Shipping</span>

                <span>
                  {formatCurrency(shippingCharge)}
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span>GST</span>

                <span>
                  {formatCurrency(gstAmount)}
                </span>
              </div>

              <div className="border-t border-gray-300 pt-1 flex justify-between text-sm font-semibold">
                <span>Total</span>

                <span>
                  {formatCurrency(grandTotal)}
                </span>
              </div>

            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">

          {/* SUPPLIER */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">

            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                Supplier Details
              </h3>
            </div>

            <div className="px-4 py-2 leading-6 text-gray-700">

              <p className="text-sm text-gray-900">
                Pingoria Enterprises
              </p>

              <p className="text-sm">Address: Sector-71, Mohali</p>

              <p className="text-sm">GSTIN: 03DPIPP8445E1ZR</p>

              <p className="text-sm">State: Punjab | State Code: 03</p>

              <p className="text-sm">
                Email: info@divyadarshnam.com
              </p>

            </div>
          </div>

            {/* TERMS & CONDITIONS */}

<div className="border border-gray-200 rounded-2xl overflow-hidden">

  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
    <h3 className="text-xs font-semibold uppercase tracking-wider">
      Terms & Conditions
    </h3>
  </div>

  <div className="px-4 py-2 text-gray-700 leading-6">

    <p className="text-sm">
      1. We do not accept returns or exchanges for custom or puja items.
    </p>

    <p className="text-sm">
      2. All prices are in INR (₹) including taxes unless stated otherwise.
    </p>

    <p className="text-sm">
      3. Goods once dispatched will not be taken back.
    </p>

    <p className="text-sm">
      4. Contact: info@divyadarshnam.com
    </p>

  </div>

</div>

       {/* SIGNATURE */}

<div className="md:col-span-2 border border-gray-200 rounded-2xl overflow-hidden">

  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
    <h3 className="text-xs font-semibold uppercase tracking-wider">
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