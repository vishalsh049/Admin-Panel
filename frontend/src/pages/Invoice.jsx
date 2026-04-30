import React, { useRef } from "react";
import { useParams, Link } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useLocation } from "react-router-dom";

export default function Invoice() {


  const location = useLocation();

const billing = location.state?.billing || {};
const shipping = location.state?.shipping || {};
const items = location.state?.items || [];
const grandTotal = location.state?.grandTotal || 0;
const date = location.state?.date || "";

const shippingCharge = location.state?.shippingCharge || 0;
const subtotal = location.state?.subtotal || 0;
const discount = location.state?.discount || 0;
const paymentMethod = location.state?.paymentMethod || "";
const status = location.state?.status || "";

  // ✅ GET ORDER ID FROM URL
  const { id } = useParams();
  const printRef = useRef();

  const amountInWords = `Rupees ${Math.round(grandTotal)} Only`;
  const safeSubtotal = Number(subtotal) || 0;
const safeDiscount = Number(discount) || 0;
const safeShipping = Number(shippingCharge) || 0;
const safeGrandTotal = Number(grandTotal) || 0;

const gstAmount =
  safeGrandTotal - safeShipping - (safeSubtotal - safeDiscount);

  // 🔹 PDF FUNCTION
  
const generatePDF = async () => {
  const element = printRef.current;

  if (!element) {
    alert("Invoice not loaded yet");
    return;
  }

  // 🔥 Hide buttons before PDF
  const noPrintElements = document.querySelectorAll(".no-print");
  noPrintElements.forEach(el => el.style.display = "none");

 const canvas = await html2canvas(element, {
  scale: 3,
  useCORS: true,
  scrollY: 0,
   backgroundColor: "#ffffff", 
  windowWidth: element.scrollWidth,
  windowHeight: element.scrollHeight
});

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const imgWidth = 210; // A4 width
const pageHeight = 297;

const imgHeight = (canvas.height * imgWidth) / canvas.width;
let heightLeft = imgHeight;
let position = 0;

pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
heightLeft -= pageHeight;

while (heightLeft > 0) {
  position = heightLeft - imgHeight;
  pdf.addPage();
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
}

  pdf.save(`invoice-${id}.pdf`);

  // 🔥 Show buttons again after PDF
  noPrintElements.forEach(el => el.style.display = "block");
};

if (!location.state) {
  return (
    <div className="p-10 text-center">
      <h2 className="text-xl font-semibold text-red-600">
        Invoice data not found
      </h2>

      <Link
        to="/sale-bills"
        className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded"
      >
        Go Back
      </Link>
    </div>
  );
}

  return (
    <div
  ref={printRef}
  className="print-area mx-auto p-6 rounded-2xl"
style={{
  width: "794px",   // ✅ EXACT A4 WIDTH
  background: "#fff",
  border: "2px solid #d4af37",
  boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
  fontSize: "11px",   // ✅ CONTROL SIZE
  lineHeight: "1.3"
}}
>

      {/* 🔙 BACK BUTTON */}
      <div className="flex justify-between mb-6 no-print">
        <Link to={`/sale-bills`} className="text-blue-600">
          ← Back to Order
        </Link>

       <button
         onClick={generatePDF} 
         className="bg-green-600 text-white px-4 py-2 rounded invoice-btn no-print"
         >
          Download PDF
        </button>
      </div>

      {/* 🔹 HEADER */}
 <div className="flex justify-between items-center mb-4 border-b pb-4">

  <div className="flex items-center gap-4">
    <img src="/logo.png" style={{ height: "55px" }} />

  </div>

  <div>
    <h1 className="text-2xl font-serif tracking-wide text-gray-800">
      TAX INVOICE
    </h1>
  </div>

</div>

      {/* 🔹 BILLING + SHIPPING */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div className="border p-2 rounded text-xs">
          <p className="font-bold">Billing Address</p>
         <p>{billing?.firstName} {billing?.lastName}</p>
         <p>{billing?.address}</p>
         <p>{billing?.phone}</p>
         <p>{billing?.email}</p>
        </div>

        <div className="border p-2 rounded text-xs">
          <p className="font-bold">Shipping Address</p>
          <p>{shipping?.firstName} {shipping?.lastName}</p>
          <p>{shipping?.address}</p>
          <p>{shipping?.phone}</p>
          <p>{shipping?.state}</p>
          <p>{shipping?.phone}</p>
        </div>     

      </div>

      {/* ✅ INVOICE INFO */}
<div className="flex justify-between items-center mb-4 border rounded-lg p-2 text-xs">
  <p><b>Invoice No:</b> INV-{Date.now()}</p>
  <p><b>Order ID:</b> {id}</p>
  <p><b>Date:</b> {date}</p>
</div>

      {/* 🔹 ITEMS TABLE */}
     <table 
  className="w-full text-sm border rounded-xl overflow-hidden"
  style={{ tableLayout: "fixed", pageBreakInside: "avoid" }}
>
  <thead style={{ background: "#0f172a", color: "#fff" }}>
    <tr>
      <th className="border p-[4px]">#</th>
      <th 
  className="border p-[4px] text-left"
  style={{ width: "40%" }}   // 🔥 control width
>
  Product
</th>
      <th className="border p-[4px] text-[10px] text-center">Qty</th>
      <th className="border p-[4px] text-[10px]">Price</th>
      <th className="border p-[4px] text-[10px]">Tax</th>
      <th className="border p-[4px] text-[10px]">Total</th>
    </tr>
  </thead>

     <tbody>
  {items?.map((item, i) => {
    const base = item.qty * item.rate;
    const tax = (base * item.gst) / 100;

    return (
      <tr key={i} style={{ height: "26px" }}>
        <td className="border p-[4px] text-center align-middle text-[10px]">{i + 1}</td>

       <td 
  className="border p-[4px] align-middle text-[10px]"
  style={{
    whiteSpace: "nowrap",      // ✅ single line
    overflow: "hidden",        // ✅ hide extra text
    textOverflow: "ellipsis"   // ✅ show ...
  }}
>
  {item.description}
</td>

       <td className="border p-[4px] text-center align-middle text-[10px]">
  {item.qty}
</td>

<td className="border p-[4px] text-center align-middle text-[10px]">
  ₹{item.rate}
</td>

<td className="border p-[4px] text-center align-middle text-[10px]">
  ₹{tax.toFixed(2)}
</td>

<td className="border p-[4px] text-center align-middle text-[10px]">
  ₹{(base + tax).toFixed(2)}
</td>
      </tr>
    );
  })}
</tbody>
      </table>

      {/* 🔹 ORDER SUMMARY */}
<div className="mt-6">
  <div
  style={{
    width: "260px",
    marginLeft: "auto",
    border: "1px solid #ddd",
    padding: "8px",
    fontSize: "11px"
  }}
>

    <div className="flex justify-between mb-2">
      <span>Subtotal</span>
      <span>₹{safeSubtotal.toFixed(2)}</span>
    </div>

    <div className="flex justify-between mb-2">
      <span>Discount</span>
      <span>₹{safeDiscount.toFixed(2)}</span>
    </div>

    <div className="flex justify-between mb-2 font-semibold">
      <span>Taxable Amount</span>
      <span>₹{(safeSubtotal - safeDiscount).toFixed(2)}</span>
    </div>

    <div className="flex justify-between mb-2">
      <span>Shipping</span>
      <span>₹{safeShipping.toFixed(2)}</span>
    </div>

    <div className="flex justify-between mb-2">
      <span>GST</span>
      <span>₹{gstAmount.toFixed(2)}</span>
    </div>

    <hr className="my-3" />

    <div className="flex justify-between font-bold text-green-600 text-sm">
      <span>Total Payable</span>
      <span>₹{safeGrandTotal.toFixed(2)}</span>
    </div>

  </div>
</div>

{/* 🔹 SUPPLIER + BANK SIDE BY SIDE */}
<div className="mt-6 grid grid-cols-2 gap-3 text-xs">

  {/* ✅ LEFT - SUPPLIER */}
  <div className="border">
    <div className="bg-[#dbe5f1] font-bold px-2 py-1">
      SUPPLIER DETAILS
    </div>

    <div className="px-2 py-1">Pingoria Enterprises</div>
    <div className="px-2 py-1">Address: Sector-71, Mohali</div>
    <div className="px-2 py-1">GSTIN: 03DPIPP8445E1ZR</div>
    <div className="px-2 py-1">
      State: Punjab | State Code: 03
    </div>
    <div className="px-2 py-1">
      Email: info@divyadarshnam.com | Phone: +91-8386977271
    </div>
  </div>

  {/* ✅ RIGHT - BANK */}
  <div className="border">
    <div className="bg-[#dbe5f1] font-bold px-2 py-1">
      BANK DETAILS FOR PAYMENT
    </div>

    <table className="w-full text-xs">
      <tr>
        <td className="border p-1">Bank: Kotak Mahindra Bank</td>
      </tr>
      <tr>
        <td className="border p-1">A/C: 3247602211</td>
      </tr>
      <tr>
        <td className="border p-1">IFSC: KKBK0004089</td>
      </tr>
      <tr>
        <td className="border p-1">Branch: Sector 70, Mohali</td>
      </tr>
    </table>
  </div>

</div>

{/* 🔹 TERMS + SIGNATURE */}
  <div className="w-full border mt-4 text-xs flex">

  {/* LEFT - TERMS */}
  <div style={{ width: "65%", borderRight: "1px solid #ddd" }}>
    <div className="bg-[#dbe5f1] font-bold px-2 py-[3px]">
      TERMS & CONDITIONS
    </div>

    <div style={{ padding: "8px", fontSize: "11px" }}>
      <p>1. We do not accept returns or exchanges for custom or puja items.</p>
      <p>2. All prices are in INR (₹) including taxes unless stated.</p>
      <p>3. Goods once dispatched will not be taken back.</p>
      <p>4. Contact: info@divyadarshnam.com</p>
    </div>
  </div>

  {/* RIGHT - SIGNATURE */}
  <div style={{ width: "35%", textAlign: "center" }}>
    <div className="bg-[#dbe5f1] font-bold px-2 py-[3px]">
      FOR Pingoria ENTERPRISES
    </div>

    <div style={{ padding: "20px 0" }}>
      <img src="/signature.png" style={{ height: "45px" }} />
      <p style={{ fontSize: "11px", fontWeight: "bold" }}>
        Authorized Signatory
      </p>
    </div>
  </div>

</div>

    </div>
  );
}
