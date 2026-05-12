import { useState, useEffect } from "react";
import { FaEllipsisV } from "react-icons/fa";
import { Country, State } from "country-state-city";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";

export default function AddSaleBill() {


     const navigate = useNavigate();
     const [customer, setCustomer] = useState("");
     const [date, setDate] = useState("");
     const [orderId, setOrderId] = useState("");
     const [paymentMethod, setPaymentMethod] = useState("Prepaid");
     const [shippingCharge, setShippingCharge] = useState(0);
     const [status, setStatus] = useState("Pending");

     const [openMenu, setOpenMenu] = useState(null);

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

// Close menu when clicking outside

     useEffect(() => {

          const closeMenu = () => setOpenMenu(null);

          window.addEventListener("click", closeMenu);

          return () => window.removeEventListener("click", closeMenu);

     }, []);

     const [products, setProducts] = useState([]);

     const [items, setItems] = useState([
          {
               description: "",
               sku: "",
               hsn: "",
               qty: 1,
               rate: 0,
               gst: 0,
               category: "",
               discount: 0,
               total: 0
          }
     ]);

     const [discount, setDiscount] = useState(0);
     const [discountType, setDiscountType] = useState("%");
     
     

     const addRow = () => {
          setItems([...items, {
               description: "",
               sku: "",
               hsn: "",
               qty: 1,
               rate: 0,
               gst: 0,
               category: "",
               discount: 0,
               total: 0
          }]);
     };

     const insertRow = (index) => {

      const newRow = {
description: "",
sku: "",
hsn: "",
qty: 1,
rate: 0,
gst: 0,
discount: 0,
category: "",
total: 0
};

          const updated = [...items];

          updated.splice(index + 1, 0, newRow);

          setItems(updated);

     };

   const deleteRow = (index) => {

if(items.length === 1){
alert("At least one item required");
return;
}

const updated = [...items];
updated.splice(index, 1);
setItems(updated);

};

     const duplicateRow = (index) => {

          const updated = [...items];

        const rowCopy = {
description: items[index].description,
sku: items[index].sku,
hsn: items[index].hsn,
qty: items[index].qty,
rate: items[index].rate,
gst: items[index].gst,
discount: items[index].discount,
category: items[index].category,
total: items[index].total
};
          updated.splice(index + 1, 0, rowCopy);

          setItems(updated);

     };

     const handleChange = (index, field, value) => {

          const updated = [...items];
          updated[index][field] = value;

          const rate = parseFloat(updated[index].rate) || 0;
          const qty = parseFloat(updated[index].qty) || 0;
          const gst = parseFloat(updated[index].gst) || 0;
          const discount = parseFloat(updated[index].discount) || 0;

     const base = rate * qty;
const discountAmount = base * discount / 100;
const priceAfterDiscount = base - discountAmount;

// price already includes GST
updated[index].total = priceAfterDiscount;

          setItems(updated);
     };

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
const priceAfterDiscount = subtotal - discountAmount;

let totalGST = 0;
let taxableAmount = 0;

items.forEach(item => {

const price = (item.rate || 0) * (item.qty || 0);
const gstRate = parseFloat(item.gst) || 0;

// Apply discount proportionally
const itemDiscount = discountType === "%"
? price * discount / 100
: (discount / subtotal) * price;

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
console.log("Current items state:", items);
console.log("Items count:", items.length);
console.log("Items details:", JSON.stringify(items, null, 2));

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

if (!items[i].description || items[i].description.trim() === "") {
  items[i].description = "Product";
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

const billData = {

  customer: customerName,
  phone: billing.phone,
  email: billing.email,
  address: billing.address,
  city: billing.city,
  state: billing.state,
  pincode: billing.pincode,

  shipping: {
    firstName: shipping.firstName,
    lastName: shipping.lastName,
    phone: shipping.phone,
    email: shipping.email,
    address: shipping.address,
    city: shipping.city,
    state: shipping.state,
    pincode: shipping.pincode
  },

  date: date,
  status: status,
  paymentMethod: paymentMethod,
  subtotal: subtotal,
  discount: discount,
  shippingCharge: shippingCharge, 
  cgst: cgst,
  sgst: sgst,
  igst: igst,
  total: grandTotal,
  items: items
};

console.log("=== BILL DATA BEING SENT ===");
console.log("Bill Data:", billData);
console.log("Items in billData:", billData.items);
console.log("Items count in billData:", billData.items.length);
console.log("=== END BILL DATA ===");

          try {
console.log("Sending bill data:", billData);
               const res = await fetch(`${BASE_URL}/api/sale-bills`, {
                    method: "POST",
                    headers: {
                         "Content-Type": "application/json"
                    },
                    body: JSON.stringify(billData)
               });

               const data = await res.json();

               console.log("=== BACKEND RESPONSE ===");
               console.log("Response status:", res.status);
               console.log("Response data:", data);
               const savedBillId = data.billId || data.id || data?.bill?.id;

               console.log("New Bill ID:", savedBillId);
               console.log("Success:", data.success);
               console.log("=== END RESPONSE ===");

             if (data.success) {
             alert("Bill Saved Successfully - ID: " + savedBillId);
               } else {
                 alert("Failed to save bill");
              }

             navigate("/sale-bills");

          } catch (error) {

               console.error("Error saving bill:", error);

          }

     };

const fetchOrder = async () => {

if (!orderId) {
alert("Enter Order ID");
return;
}

try {

const res = await fetch(`${BASE_URL}/api/orders/${orderId}`);

if (!res.ok) {
  throw new Error("Order not found");
}

const response = await res.json();
const order = response.data;


// ORDER DATE
setDate(order.date ? order.date.split("T")[0] : "");

// PAYMENT METHOD
setPaymentMethod(order.paymentMethod || "Prepaid");
setStatus(order.status || "Pending");

setShippingCharge(parseFloat(order.shippingCharge) || 0);
setDiscount(Number(order.discount) || 0);
setDiscountType("₹");


// BILLING DATA
setBilling({
firstName: order.billing?.firstName || "",
lastName: order.billing?.lastName || "",
phone: order.billing?.phone || "",
altPhone: order.billing?.altPhone || "",
email: order.billing?.email || "",
address: order.billing?.address || "",
city: order.billing?.city || "",
company: order.billing?.company || "",
gstin: order.billing?.gstin || "",
country: order.billing?.country || "IN",
state: order.billing?.state || "",
pincode: order.billing?.pincode || "",
landmark: order.billing?.landmark || ""
});


// SHIPPING DATA
setShipping({
firstName: order.shipping?.firstName || "",
lastName: order.shipping?.lastName || "",
phone: order.shipping?.phone || "",
altPhone: order.shipping?.altPhone || "",
email: order.shipping?.email || "",
address: order.shipping?.address || "",
city: order.shipping?.city || "",
company: order.shipping?.company || "",
gstin: order.shipping?.gstin || "",
country: order.shipping?.country || "IN",
state: order.shipping?.state || "",
pincode: order.shipping?.pincode || "",
landmark: order.shipping?.landmark || ""
});


// ITEMS
const loadedItems = order.items.map(item => {

const qty = parseFloat(item.qty) || 1;

// ORIGINAL price before coupon
const rate = item.line_subtotal
  ? parseFloat(item.line_subtotal) / qty
  : parseFloat(item.price) || 0;

return {
description: item.name || item.product_name || "Product",
sku: item.sku || "",
hsn: item.hsn || "",
qty: qty,
rate: rate,
gst: item.gst ?? 0,
discount: 0,
category: "",
total: rate * qty
};

});

console.log("=== ORDER ITEMS LOADED ===");
console.log("Items from order:", loadedItems);
console.log("Items count:", loadedItems.length);
console.log("=== END ORDER ITEMS ===");

setItems(loadedItems);

alert("Order loaded successfully - Items: " + loadedItems.length);

} catch (error) {

alert("Order not found. You can create bill manually.");

}

};

     const selectProduct = (index, id) => {

          const product = products.find(p => p.id == id)

          if (!product) return

          const updated = [...items]

          updated[index].description = product.name
          updated[index].sku = product.sku
          updated[index].hsn = product.hsn
          updated[index].rate = product.price
          updated[index].gst = product.gst

          setItems(updated)

     }

     return (

          <div className="">

               <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">

                    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                         <h2 className="text-2xl font-semibold break-words">Create Sale Bill</h2>

                         <div className="text-sm text-gray-500 break-words">
                              Create New Sale Bill
                         </div>
                    </div>

                    {/* Customer Section */}

                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                         <div>
                              <label className="text-sm text-gray-600">Order ID</label>

                              <div className="flex flex-col gap-2 sm:flex-row">
                                   <input
                                        type="text"
                                        className="mt-1 border border-gray-300 px-3 py-2 rounded-md w-full text-sm"
                                        placeholder="Enter Order ID"
                                        value={orderId}
                                        onChange={(e) => setOrderId(e.target.value)}
                                   />

                                   <button
                                        type="button"
                                        onClick={fetchOrder}
                                        className="mt-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white sm:mt-0"
                                   >
                                        Fetch
                                   </button>

                              </div>
                         </div>

                        



                    </div>

                    {/* Order Details Section */}

                    <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3 xl:items-start">

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
onChange={(e)=>setStatus(e.target.value)}
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
onChange={(e)=>setPaymentMethod(e.target.value)}
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

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

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

<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

<input
placeholder="First Name"
value={billing.firstName}
onChange={(e)=>setBilling({...billing, firstName:e.target.value})}
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
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
/>

<input
placeholder="Address"
value={billing.address}
onChange={(e)=>setBilling({...billing, address:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
/>

<input
placeholder="Landmark"
value={billing.landmark}
onChange={(e)=>setBilling({...billing, landmark:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
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
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
/>

<input
placeholder="GSTIN Number"
value={billing.gstin}
onChange={(e)=>setBilling({...billing, gstin:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
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

<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

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
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
/>

<input
placeholder="Address"
value={shipping.address}
onChange={(e)=>setShipping({...shipping, address:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
/>

<input
placeholder="Landmark"
value={shipping.landmark}
onChange={(e)=>setShipping({...shipping, landmark:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
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
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
/>

<input
placeholder="GSTIN Number"
value={shipping.gstin || ""}
onChange={(e)=>setShipping({...shipping, gstin:e.target.value})}
className="border px-3 py-2 rounded-md text-sm w-full sm:col-span-2"
/>


</div>

</div>

    </div>

                   {/* ===================================================== */}
{/* ================= ITEM TABLE SECTION ================= */}
{/* ===================================================== */}

<div className="mt-8 border-t pt-6">

  {/* ---------- TABLE CARD ---------- */}
  <div className="responsive-table border border-gray-200 rounded-xl shadow-sm overflow-x-auto overflow-y-visible">

    <table className="w-full min-w-[980px] text-sm">

      {/* ===================================================== */}
      {/* ================= TABLE HEADER ====================== */}
      {/* ===================================================== */}

      <thead className="bg-gray-100 text-gray-700 text-sm">
      <tr>
        <th className="p-3 w-12">Sr</th>
<th className="p-3 w-[320px]">Item Description</th>
<th className="p-3 w-[160px]">SKU</th>
<th className="p-3 w-[120px]">HSN</th>
<th className="p-3 w-[90px]">Qty</th>
<th className="p-3 w-[120px]">Rate</th>
<th className="p-3 w-[90px]">GST %</th>
<th className="p-3 w-[120px]">Total</th>
<th className="p-3 w-[70px]">Action</th>
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
onChange={(e)=>handleChange(index,"description",e.target.value)}
/>
              </td>

              {/* ---------- SKU ---------- */}
              <td className="p-2">
               <input
className="border p-2 w-full min-w-[10rem] rounded"
value={row.sku}
onChange={(e)=>handleChange(index,"sku",e.target.value)}
/>
              </td>

              {/* ---------- HSN ---------- */}
              <td className="p-2">
               <input
className="border p-2 w-full min-w-[8rem] rounded"
value={row.hsn}
onChange={(e)=>handleChange(index,"hsn",e.target.value)}
/>
              </td>

              {/* ---------- QTY ---------- */}
              <td className="p-2">
                <input
type="number"
className="border p-2 w-full min-w-[5rem] rounded text-center"
value={row.qty}
onChange={(e)=>handleChange(index,"qty",e.target.value)}
/>
              </td>

              {/* ---------- RATE ---------- */}
              <td className="p-2">
 <input
type="number"
className="border p-2 w-full min-w-[7rem] rounded text-center"
value={row.rate}
onChange={(e)=>handleChange(index,"rate",e.target.value)}
/>
              </td>

              {/* ---------- GST ---------- */}
              <td className="p-2">
<select
className="border p-2 w-full min-w-[5rem] rounded text-center"
value={row.gst}
onChange={(e)=>handleChange(index,"gst",e.target.value)}
>
<option value="0">0%</option>
<option value="3">3%</option>
<option value="5">5%</option>
<option value="12">12%</option>
<option value="18">18%</option>
<option value="28">28%</option>
</select>
              </td>

              {/* ---------- TOTAL ---------- */}
             <td className="p-2 text-center font-medium">
                ₹{total.toFixed(2)}
              </td>

              {/* ===================================================== */}
              {/* ================= ACTION MENU ======================= */}
              {/* ===================================================== */}

              <td className="relative text-center">

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(openMenu === index ? null : index);
                  }}
                  className="text-gray-600 hover:text-black"
                >
                  <FaEllipsisV />
                </button>

                {/* Dropdown Menu */}

                {openMenu === index && (

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-6 w-44 bg-white shadow-md rounded-lg border z-50"
                  >

                    {/* Delete Row */}
                    <button
                      onClick={() => {
                        deleteRow(index);
                        setOpenMenu(null);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
                    >
                      Delete Row
                    </button>

                    {/* Insert Row */}
                    <button
                      onClick={() => {
                        insertRow(index);
                        setOpenMenu(null);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Insert Row Below
                    </button>

                    {/* Duplicate Row */}
                    <button
                      onClick={() => {
                        duplicateRow(index);
                        setOpenMenu(null);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Duplicate Row
                    </button>

                  </div>

                )}

              </td>

            </tr>

          );

        })}

      </tbody>

    </table>

  </div>
</div>


{/* ===================================================== */}
{/* ================= ADD ITEM BUTTON =================== */}
{/* ===================================================== */}

<button
  onClick={addRow}
  className="mt-4 bg-blue-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm shadow"
>
  + Add Item
</button>


{/* ===================================================== */}
{/* ============ NOTES + ORDER SUMMARY SECTION ========== */}
{/* ===================================================== */}

<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

  {/* ================= NOTES LEFT SIDE ================= */}

  <div className="xl:col-span-2">

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

   <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm xl:sticky xl:top-6">

      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Order Summary
      </h3>

      <div className="space-y-2 text-sm">

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

<span className="text-gray-600">Discount</span>

<div className="flex items-center gap-2 self-end sm:self-auto">

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
className="border border-gray-300 rounded-md px-3 py-1 w-20 max-w-full text-right"
/>

</div>

</div>

        <div className="flex justify-between font-medium">
          <span>Taxable Amount</span>
          <span>₹{taxableAmount.toFixed(2)}</span>
        </div>

       <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Shipping</span>
            <input
            type="number"
             value={shippingCharge}
                onChange={(e) => setShippingCharge(Number(e.target.value))}
               className="border border-gray-300 rounded-md px-3 py-1 w-full sm:w-24 text-right"
              />
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

                    {/* Save Button */}

                    <div className="mt-8 flex flex-col gap-4 border-t pt-6 sm:flex-row">
                         <button
                              type="button"
                              onClick={saveBill}
                              className="rounded-lg bg-green-600 px-6 py-3 text-white sm:w-auto"
                         >
                              Save Bill
                         </button>

                         <button
                              onClick={() => window.location.href = "/sale-bills"}
                              className="rounded-lg bg-gray-400 px-6 py-3 text-white sm:w-auto"
                         >
                              Cancel
                         </button>

                    </div>

               </div>

          </div>

     );
}
