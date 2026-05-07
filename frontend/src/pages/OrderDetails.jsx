import { FaArrowLeft } from "react-icons/fa";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/api";

export default function OrderDetails() {
  const { id } = useParams();
  
  const [order, setOrder] = useState(null);

  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/orders/${id}`)
      .then((res) => {
        const o = res.data?.data;
        if (!o) return;

        // 🔁 Map WooCommerce order → your structure
        setOrder({
          id: o.id,
          date: new Date(o.date).toLocaleDateString(),
          status: o.status,
          payment: o.paymentMethod,

          customer: {
            name: `${o.billing.firstName} ${o.billing.lastName}`,
            email: o.billing.email,
            phone: o.billing.phone,
            address: o.billing.address,
            city: o.billing.city,
            country: o.billing.country,
            postal: o.billing.pincode,
          },

          items: o.items.map((i) => ({
          name: i.name,
          qty: i.qty,
          price: Number(i.price),
          })),

shipping: parseFloat(o.shipping_total || 0),

total:
  Number(o.items.reduce((sum, i) => sum + Number(i.line_total || 0), 0)) +
  Number(o.shipping_total || 0),

        });
      })
      .catch((err) => {
        console.error("Order details error:", err);
      });
  }, [id]);

  if (!order) {
    return <p className="text-gray-500">Loading order details...</p>;
  }

  // ---------- Calculate totals ----------
  const totalItems = order.items.length;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      {/* 🔹 Back + Invoice buttons */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/orders" className="flex items-center gap-2 text-blue-600">
          <FaArrowLeft /> Back to Orders
        </Link>

        {/* ✅ Invoice Button */}
        <Link
          to={`/invoice/${order.id}`}
          state={{
     billing: {
      firstName: order.customer.name?.split(" ")[0],
      lastName: order.customer.name?.split(" ")[1] || "",
      address: order.customer.address,
      phone: order.customer.phone,
      email: order.customer.email,
    },

     shipping: {
      firstName: order.customer.name?.split(" ")[0],
      lastName: order.customer.name?.split(" ")[1] || "",
      address: order.customer.address,
      phone: order.customer.phone,
      state: order.customer.country,
    },

    items: order.items.map((i) => ({
      description: i.name,
      qty: i.qty,
      rate: i.price,
      gst: 18,
    })),

    subtotal: order.total - order.shipping,
    shippingCharge: order.shipping,
    discount: 0,
    grandTotal: order.total,
    paymentMethod: order.payment,
    status: order.status,
    date: order.date,
    }}
    className="bg-green-600 text-white px-4 py-2 rounded"
    >
     View Invoice
    </Link>
      </div>

      <h2 className="text-3xl font-semibold mb-4">Order Details</h2>

      {/* -------- Order Summary -------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-4">
        <p><b>Order ID:</b> {order.id}</p>
        <p><b>Order Date:</b> {order.date}</p>
        <p>
          <b>Status:</b>{" "}
          <span className="text-green-600">{order.status}</span>
        </p>
       <p><b>Payment Method:</b> {order.payment}</p>
      <p><b>Shipping:</b> ₹{Number(order.shipping).toFixed(2)}</p>
       <p><b>Total Order Items:</b> {totalItems}</p>
        <p><b>Total Quantity:</b> {totalQuantity}</p>
      </div>

      {/* -------- Customer Details -------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-4">
        <h3 className="text-lg font-semibold mb-3">Customer Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
          <div>
            <p className="font-semibold">Name:</p>
            <p>{order.customer.name}</p>
          </div>

          <div>
            <p className="font-semibold">Email:</p>
            <p>{order.customer.email}</p>
          </div>

          <div>
            <p className="font-semibold">Phone Number:</p>
            <p>{order.customer.phone}</p>
          </div>

          <div>
            <p className="font-semibold">Country / Region:</p>
            <p>{order.customer.country}</p>
          </div>

          <div className="md:col-span-2">
            <p className="font-semibold">Full Address:</p>
            <p>{order.customer.address}</p>
          </div>

          <div>
            <p className="font-semibold">City:</p>
            <p>{order.customer.city}</p>
          </div>

          <div>
            <p className="font-semibold">Postal Code:</p>
            <p>{order.customer.postal}</p>
          </div>
        </div>
      </div>

      {/* -------- Items table -------- */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">Order Items</h3>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">Qty</th>
              <th className="p-2 text-left">Price</th>
              <th className="p-2 text-left">Subtotal</th>
            </tr>
          </thead>

          <tbody>
            {order.items.map((i, index) => (
              <tr key={index} className="border-b">
                <td className="p-2">{i.name}</td>
                <td className="p-2">{i.qty}</td>
                <td className="p-2">₹{i.price}</td>
                <td className="p-2">₹{i.price * i.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>

       <div className="flex justify-end mt-4">
  <div className="w-[260px] space-y-2">

    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">Items Subtotal:</span>
      <span className="font-medium">
        ₹{order.total - order.shipping}
      </span>
    </div>

    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">Shipping:</span>
      <span className="font-medium">
        ₹{order.shipping}
      </span>
    </div>

    <div className="border-t pt-2 flex items-center justify-between text-lg font-bold">
      <span>Grand Total:</span>
      <span>₹{order.total}</span>
    </div>

  </div>
</div>
      </div>
    </>
  );
}
