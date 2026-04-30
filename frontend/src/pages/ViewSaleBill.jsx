import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Country, State } from "country-state-city";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";     
import { BASE_URL } from "../utils/api";

export default function ViewSaleBill() {

     const { id } = useParams();      
     const navigate = useNavigate();
     const [date, setDate] = useState("");
     const [paymentMethod, setPaymentMethod] = useState("Prepaid");
     const [shippingCharge, setShippingCharge] = useState(0);
     const [status, setStatus] = useState("Pending");
     const invoiceRef = useRef();

     const [billing, setBilling] = useState({

firstName: "",
lastName: "",
phone: "",
altPhone: "",
email: "",
address: "",
city: "",
company: "",
gstin: "",
country: "IN",
state: "",
pincode: "",
landmark: ""
});

const [shipping, setShipping] = useState({
firstName: "",
lastName: "",
phone: "",
altPhone: "",
email: "",
address: "",
city: "",
country: "",
state: "",
pincode: "",
company: "",
gstin: "",
landmark: ""
});

const [sameAddress, setSameAddress] = useState(false);
const [items, setItems] = useState([]);
const [discount, setDiscount] = useState(0);
const [discountType, setDiscountType] = useState("%");
const [apiResponse, setApiResponse] = useState(null);

// Copy Billing Address → Shipping Address
useEffect(() => {

if (sameAddress) {

setShipping({
firstName: billing.firstName,
lastName: billing.lastName,
phone: billing.phone,
altPhone: billing.altPhone,
email: billing.email,
address: billing.address,
landmark: billing.landmark,
city: billing.city,
country: billing.country,
state: billing.state,
pincode: billing.pincode,
company: billing.company,
gstin: billing.gstin
});

}

}, [billing, sameAddress]);

useEffect(() => {

  

if (!id) return;

fetch(`${BASE_URL}/api/sale-bills/${id}`)
.then(res => res.json())
.then(data => {

console.log("Fetched bill data:", data); // DEBUG

const bill = data.bill;

console.log("BILL DATA:", bill);
console.log("ITEMS DATA:", data.items);
console.log("ITEMS LENGTH:", data.items?.length || 0);

setApiResponse(data); // Store for debugging

setDate(
  bill.order_date
    ? bill.order_date.split("T")[0]
    : bill.date
    ? bill.date.split("T")[0]
    : ""
);

setStatus(bill.status || "");
setPaymentMethod(bill.paymentMethod || bill.payment_method || "");
setShippingCharge(bill.shippingCharge || bill.shipping_charge || 0);
setDiscount(bill.discount || 0);

const nameParts = (bill.billing_name || "").split(" ");

setBilling({
  firstName: nameParts[0] || "",
  lastName: nameParts.slice(1).join(" ") || "",
  phone: bill.billing_phone || "",
  email: bill.billing_email || "",
  address: bill.billing_address || bill.address || "",
  city: bill.billing_city || bill.city || "",
  state: bill.billing_state || bill.state || "",
  pincode: bill.billing_pincode || bill.pincode || "",
  country: "IN",
  landmark: "",
  company: "",
  gstin: ""
});

const shippingName = bill.shipping_name || "";
const shippingParts = shippingName.split(" ");

setShipping({
  firstName: nameParts[0] || "",
  lastName: nameParts.slice(1).join(" ") || "",
  phone: bill.shipping_phone || "",
  altPhone: "",
  email: bill.shipping_email || bill.billing_email || "", 
  address: bill.shipping_address || "",
  city: bill.shipping_city || "",
  state: bill.shipping_state || "",
  pincode: bill.shipping_pincode || "",
  country: "IN",
  landmark: "",
  company: "",
  gstin: ""
});

setItems(
(data.items || []).map(item => ({

  description: item.description || item.item_description || "Product",

  sku: item.sku || "",
  hsn: item.hsn || "",

  qty: Number(item.qty || item.quantity) || 1,

  rate: Number(item.rate) || 0,

  gst: Number(item.gst || item.gst_percent) || 0,

  total:
    Number(item.total) ||
    (Number(item.rate || 0) * Number(item.qty || item.quantity || 1))

}))
);

console.log("Items loaded:", data.items); // DEBUG

})
.catch(err => console.log(err));

}, [id]);

     const subtotal = items.reduce((sum, row) => {
     const rate = parseFloat(row.rate) || 0;
     const qty = parseFloat(row.qty) || 0;

  return sum + rate * qty;
}, 0);

let discountAmount = 0;

if (discountType === "%") {
  discountAmount = (subtotal * discount) / 100;
} else {
  discountAmount = parseFloat(discount) || 0;
}


// PRICE AFTER DISCOUNT


let totalGST = 0;
let taxableAmount = 0;

items.forEach(item => {

const price = (item.rate || 0) * (item.qty || 0);
const gstRate = parseFloat(item.gst) || 0;

// Apply discount proportionally
const itemDiscount = discountType === "%"
  ? price * discount / 100
  : subtotal > 0 ? (discount / subtotal) * price : 0;

const priceAfterDiscount = price - itemDiscount;

// GST calculation AFTER discount
const taxable = priceAfterDiscount / (1 + gstRate / 100);
const gstValue = priceAfterDiscount - taxable;

taxableAmount += taxable;
totalGST += gstValue;

});

// STATE CHECK
const sellerState = "PB"; // Punjab GST registration
const isSameState = billing.state === sellerState;

const cgst = isSameState ? totalGST / 2 : 0;
const sgst = isSameState ? totalGST / 2 : 0;
const igst = !isSameState ? totalGST : 0;


// GRAND TOTAL (GST already included)
const grandTotal = subtotal - discountAmount + Number(shippingCharge);


    const saveBill = async () => {

console.log("SAVE BUTTON CLICKED");

// CUSTOMER NAME
const customerName = billing.firstName + " " + billing.lastName;

if (!billing.firstName) {
  alert("Enter customer first name");
  return;
}

// PHONE
if (!billing.phone) {
  alert("Enter phone number");
  return;
}

if (!date) {
  alert("Select order date");
  return;
}

// ADDRESS
if (!billing.address) {
  alert("Enter billing address");
  return;
}

// ITEM VALIDATION
for (let i = 0; i < items.length; i++) {

  if (!items[i].description) {
    alert(`Item ${i + 1}: Description required`);
    return;
  }


  if (!items[i].qty || items[i].qty <= 0) {
    alert(`Item ${i + 1}: Quantity must be greater than 0`);
    return;
  }

  if (!items[i].rate || items[i].rate <= 0) {
    alert(`Item ${i + 1}: Rate must be greater than 0`);
    return;
  }

}
    };

const generateInvoice = async () => {
  const element = invoiceRef.current;

  if (!element) {
    alert("Invoice not loaded");
    return;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 0;

  // Handle multi-page if large
  if (imgHeight > 295) {
    let heightLeft = imgHeight;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 295;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 295;
    }
  } else {
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  }

  pdf.save(`Invoice_${id}.pdf`);
};

     return (
  <div className="">


               <div className="bg-white rounded-xl shadow-md p-6">

                    <div className="flex justify-between items-center mb-6">

<div className="flex gap-3">

<button
onClick={()=>navigate("/sale-bills")}
className="bg-gray-200 px-4 py-2 rounded-md text-sm"
>
← Back
</button>

<h2 className="text-2xl font-semibold">View Sale Bill</h2>

</div>

<button
onClick={() =>
  navigate(`/invoice/${id}`, {
    state: {
      billing,
      shipping,
      items,
      grandTotal,
      date,
      shippingCharge,
      subtotal,
      discount,
      paymentMethod,
      status
    }
  })
}
className="bg-green-600 text-white px-4 py-2 rounded-md text-sm"
>
Generate Invoice
</button>

</div>

                    {/* Order Details Section */}

                    <div className="grid grid-cols-3 gap-6 mb-6 items-start">

                         {/* GENERAL */}
                         <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">

                              <h3 className="font-semibold mb-3">General</h3>

                              <div className="mb-3">
                                   <label className="text-xs text-gray-600">Order Date</label>
                                   <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="border border-gray-300 px-3 py-2 rounded-md w-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   />
                              </div>

                              <div>
                                   <label className="text-xs text-gray-600">Status</label>
                                  
                                  
 <select
value={status}
disabled
className="border border-gray-300 px-3 py-2 rounded-md w-full text-sm bg-white"
>
<option value="pending">Pending</option>
<option value="processing">Processing</option>
<option value="completed">Completed</option>
<option value="on-hold">On Hold</option>
<option value="cancelled">Cancelled</option>
<option value="refunded">Refunded</option>
<option value="failed">Failed</option>
                                   </select>
 <div className="mt-3">
<label className="text-xs text-gray-600">Payment Method</label>

<select
value={paymentMethod}
disabled
className="border border-gray-300 px-3 py-2 rounded-md w-full text-sm bg-white"
>
<option value="Prepaid">Prepaid</option>
<option value="Cash on Delivery">Cash on Delivery</option>
<option value="Bank Transfer">Bank Transfer</option>
<option value="UPI">UPI</option>
</select>

</div>
                                   <div className="mt-4">

                                        <label className="text-xs text-gray-600">Weight (kg)</label>

                                        <input
                                             className="border border-gray-300 px-3 py-2 rounded-md w-full text-sm mb-2"
                                        />

                                        <div className="grid grid-cols-3 gap-2">

                                             <input
                                                  placeholder="Length"
                                                  className="border px-2 py-2 rounded text-sm"
                                             />

                                             <input
                                                  placeholder="Width"
                                                  className="border px-2 py-2 rounded text-sm"
                                             />

                                             <input
                                                  placeholder="Height"
                                                  className="border px-2 py-2 rounded text-sm"
                                             />

                                        </div>

                                   </div>
                              </div>

                         </div>


 {/* BILLING */}

<div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">

<h3 className="text-lg font-semibold text-gray-800 mb-4">Billing Details</h3>

<div className="grid grid-cols-2 gap-3">

<input
placeholder="First Name"
value={billing.firstName}
readOnly
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Last Name"
value={billing.lastName}
onChange={(e)=>setBilling({...billing, lastName:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Phone"
value={billing.phone}
onChange={(e)=>setBilling({...billing, phone:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Alternate Phone"
value={billing.altPhone}
onChange={(e)=>setBilling({...billing, altPhone:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Email"
value={billing.email}
onChange={(e)=>setBilling({...billing, email:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>

<input
placeholder="Address"
value={billing.address}
onChange={(e)=>setBilling({...billing, address:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>

<input
placeholder="Landmark"
value={billing.landmark}
onChange={(e)=>setBilling({...billing, landmark:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>

<select
value={billing.country}
onChange={(e)=>setBilling({...billing, country:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
>
<option value="">Select Country</option>
{Country.getAllCountries().map((c)=>(
<option key={c.isoCode} value={c.isoCode}>
{c.name}
</option>
))}
</select>


<select
value={billing.state}
onChange={(e)=>setBilling({...billing, state:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
>
<option value="">Select State</option>
{State.getStatesOfCountry(billing.country).map((s)=>(
<option key={s.isoCode} value={s.isoCode}>
{s.name}
</option>
))}
</select>

<input
placeholder="City"
value={billing.city}
onChange={(e)=>setBilling({...billing, city:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Pincode"
value={billing.pincode}
onChange={(e)=>setBilling({...billing, pincode:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Company Name"
value={billing.company}
onChange={(e)=>setBilling({...billing, company:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>

<input
placeholder="GSTIN Number"
value={billing.gstin}
onChange={(e)=>setBilling({...billing, gstin:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>

</div>

{/* Checkbox */}

<div className="mt-4 flex items-center gap-2">

<input
type="checkbox"
checked={sameAddress}
onChange={(e)=>setSameAddress(e.target.checked)}
/>

<label className="text-sm">
Shipping address same as Billing address
</label>

</div>

</div>


{/* SHIPPING */}

<div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">

<h3 className="font-semibold text-gray-700 mb-4">Shipping Address</h3>

<div className="grid grid-cols-2 gap-3">

<input
placeholder="First Name"
value={shipping.firstName}
onChange={(e)=>setShipping({...shipping, firstName:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Last Name"
value={shipping.lastName}
onChange={(e)=>setShipping({...shipping, lastName:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Phone"
value={shipping.phone || ""}
onChange={(e)=>setShipping({...shipping, phone:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Alternate Phone"
value={shipping.altPhone || ""}
onChange={(e)=>setShipping({...shipping, altPhone:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Email"
value={shipping.email || ""}
onChange={(e)=>setShipping({...shipping, email:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>

<input
placeholder="Address"
value={shipping.address}
onChange={(e)=>setShipping({...shipping, address:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>

<input
placeholder="Landmark"
value={shipping.landmark}
onChange={(e)=>setShipping({...shipping, landmark:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>

<select
value={shipping.country}
onChange={(e)=>setShipping({...shipping, country:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
>
<option value="">Select Country</option>
{Country.getAllCountries().map((c)=>(
<option key={c.isoCode} value={c.isoCode}>
{c.name}
</option>
))}
</select>


<select
value={shipping.state}
onChange={(e)=>setShipping({...shipping, state:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
>
<option value="">Select State</option>
{State.getStatesOfCountry(shipping.country).map((s)=>(
<option key={s.isoCode} value={s.isoCode}>
{s.name}
</option>
))}
</select>

<input
placeholder="City"
value={shipping.city}
onChange={(e)=>setShipping({...shipping, city:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Pincode"
value={shipping.pincode}
onChange={(e)=>setShipping({...shipping, pincode:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full"
/>

<input
placeholder="Company Name"
value={shipping.company || ""}
onChange={(e)=>setShipping({...shipping, company:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>

<input
placeholder="GSTIN Number"
value={shipping.gstin || ""}
onChange={(e)=>setShipping({...shipping, gstin:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full col-span-2"
/>


</div>

</div>

    </div>

                   {/* ===================================================== */}
{/* ================= ITEM TABLE SECTION ================= */}
{/* ===================================================== */}

<div ref={invoiceRef} className="mt-8 border-t pt-6">

{items.length === 0 ? (
<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
<p><strong>No items loaded.</strong> Please check the API response.</p>
{apiResponse && (
<details className="mt-2 cursor-pointer">
<summary className="font-medium">API Response Debug</summary>
<pre className="bg-white p-2 mt-2 rounded text-xs overflow-auto max-h-48">
{JSON.stringify(apiResponse, null, 2)}
</pre>
</details>
)}
</div>
) : (
<div className="border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
    <table className="w-full text-sm border-collapse">

      {/* ===================================================== */}
      {/* ================= TABLE HEADER ====================== */}
      {/* ===================================================== */}

      <thead className="bg-gray-100 text-gray-700 text-sm sticky top-0">
      <tr>
        <th className="p-3 min-w-[40px]">Sr</th>
<th className="p-3 min-w-[250px]">Item Description</th>
<th className="p-3 min-w-[100px]">SKU</th>
<th className="p-3 min-w-[100px]">HSN</th>
<th className="p-3 min-w-[70px]">Qty</th>
<th className="p-3 min-w-[100px]">Rate</th>
<th className="p-3 min-w-[80px]">GST %</th>
<th className="p-3 min-w-[100px]">Total</th>
</tr>
</thead>

      {/* ===================================================== */}
      {/* ================= TABLE BODY ======================== */}
      {/* ===================================================== */}

      <tbody>

        {items.map((row, index) => {

const total = row.total || 0;
          return (

            <tr key={index} className="border-t">

              {/* ---------- SR NUMBER ---------- */}
              <td className="p-2 text-center">
                {index + 1}
              </td>

              {/* ---------- ITEM DESCRIPTION ---------- */}
              <td className="p-2">
               <input
className="border p-2 w-full rounded"
placeholder="Item description"
value={row.description}
readOnly
/>
              </td>

              {/* ---------- SKU ---------- */}
              <td className="p-2">
               <input
className="border p-2 w-full rounded"
value={row.sku}
readOnly
/>
              </td>

              {/* ---------- HSN ---------- */}
              <td className="p-2">
               <input
className="border p-2 w-full rounded"
value={row.hsn}
readOnly    
/>
              </td>

              {/* ---------- QTY ---------- */}
              <td className="p-2">
                <input
type="number"
className="border p-2 w-full rounded text-center"
value={row.qty}
readOnly 
/>
              </td>

              {/* ---------- RATE ---------- */}
              <td className="p-2">
 <input
type="number"
className="border p-2 w-full rounded text-center"
value={row.rate}
readOnly
/>
              </td>

              {/* ---------- GST ---------- */}
              <td className="p-2">
              <input
type="number"
className="border p-2 w-full rounded text-center"
value={row.gst}
readOnly
/>
              </td>

              {/* ---------- TOTAL ---------- */}
             <td className="p-2 text-center font-medium">
                ₹{total.toFixed(2)}
              </td>

              {/* ===================================================== */}
              {/* ================= ACTION MENU ======================= */}
              {/* ===================================================== */}

            

            </tr>

          );

        })}

      </tbody>

    </table>

  </div>
)}
</div>


{/* ===================================================== */}
{/* ============ NOTES + ORDER SUMMARY SECTION ========== */}
{/* ===================================================== */}

<div className="grid grid-cols-3 gap-6 mt-6">

  {/* ================= NOTES LEFT SIDE ================= */}

  <div className="col-span-2">

    <label className="text-sm font-medium text-gray-700">
      Notes
    </label>

<textarea
placeholder="Add internal notes or delivery instructions..."
className="mt-2 w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
rows="3"
/>

  </div>


  {/* ================= ORDER SUMMARY ================= */}

  <div>

   <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-6">

      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Order Summary
      </h3>

      <div className="space-y-2 text-sm">

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center">

<span className="text-gray-600">Discount</span>

<div className="flex items-center gap-2">

<select
value={discountType}
onChange={(e)=>setDiscountType(e.target.value)}
className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
>
<option value="%">%</option>
<option value="₹">₹</option>
</select>

<input
type="number"
value={discount}
onChange={(e)=>setDiscount(Number(e.target.value))}
className="border border-gray-300 rounded-md px-3 py-1 w-20 text-right"
/>

</div>

</div>

        <div className="flex justify-between font-medium">
          <span>Taxable Amount</span>
          <span>₹{taxableAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
<span>Shipping</span>
<span>₹{Number(shippingCharge).toFixed(2)}</span>
</div>

      </div>

      <hr className="my-4"/>

      <h4 className="text-sm font-semibold mb-2">
        GST Breakdown
      </h4>

      {isSameState ? (
        <>
          <div className="flex justify-between text-sm">
            <span>CGST</span>
            <span>₹{cgst.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>SGST</span>
            <span>₹{sgst.toFixed(2)}</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between text-sm">
          <span>IGST</span>
          <span>₹{igst.toFixed(2)}</span>
        </div>
      )}

      <hr className="my-4"/>

     <div className="flex justify-between text-lg font-semibold bg-green-50 text-green-700 p-3 rounded-lg">
<span>Total Payable</span>
<span>₹{grandTotal.toFixed(2)}</span>
</div>
    </div>

  </div>

</div>     

               </div>
             </div>

     );
}
