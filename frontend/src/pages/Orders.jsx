import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import axios from "axios";
import { BASE_URL } from "../utils/api";
import { FaEye, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

const PER_PAGE = 10;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 FETCH LIVE ORDERS
  const fetchOrders = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${BASE_URL}/api/orders`, {
        params: {
          page,
          search,
        },
      });

      setOrders(res.data.orders || []);
      setTotalOrders(parseInt(res.data.total || 0, 10));
    } catch (err) {
      console.error("Orders fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search]);

  // 🔹 EXPORT CSV
  const exportOrders = () => {
    const rows = [
      ["Order ID", "Customer", "Total", "Status", "Payment", "Date"],
      ...orders.map((o) => [
        o.id,
        `${o.billing.first_name} ${o.billing.last_name}`,
        o.total,
        o.status,
        o.payment_method_title,
        o.date_created,
      ]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      {/* TOP BAR */}
      <div className="flex justify-between items-center mb-4">
        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search orders"
          className="border rounded-lg px-4 py-2 w-64 text-sm"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />

        {/* EXPORT */}
        <button
          onClick={exportOrders}
          className="px-4 py-2 border rounded-lg text-blue-600 hover:bg-blue-50"
        >
          Export Orders
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden mb-24 pb-10">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-600">
            <tr>
              <th className="p-4 text-left">
                <input type="checkbox" />
              </th>
              <th className="p-4 text-left">Order</th>
              <th className="p-4 text-left">Customer</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Items</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">
                  Loading orders...
                </td>
              </tr>
            )}

            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            )}

            {orders.map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50 transition">
                {/* CHECKBOX */}
                <td className="p-4">
                  <input type="checkbox" />
                </td>

                {/* ORDER */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {o.status === "completed" ? (
                      <FaCheckCircle className="text-green-500" />
                    ) : (
                      <FaTimesCircle className="text-red-500" />
                    )}
                    <div>
                      <p className="font-semibold text-blue-600">
                        #{o.id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(o.date_created).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </td>

                {/* CUSTOMER */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold">
                      {o.billing.first_name?.[0]}
                      {o.billing.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-blue-600">
                        {o.billing.first_name} {o.billing.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {o.billing.city}, {o.billing.country}
                      </p>
                    </div>
                  </div>
                </td>

                {/* TOTAL */}
                <td className="p-4">
                  <p className="font-semibold">₹{o.total}</p>
                  <p className="text-xs text-gray-500">
                    {o.payment_method_title}
                  </p>
                </td>

                {/* ITEMS */}
                <td className="p-4">{o.line_items.length} items</td>

                {/* ACTION */}
                <td className="p-4">
                  <Link
  to={`/orders/${o.id}`}
  className="inline-flex items-center gap-2 text-blue-600 hover:underline z-10"
>
  <FaEye /> View
</Link>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FIXED BOTTOM BAR */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t px-6 py-3 flex justify-between items-center text-sm z-50">
        <span>Showing {orders.length} of {totalOrders} orders</span>

        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ‹
          </button>

          <button className="px-3 py-1 border rounded bg-blue-600 text-white">
            {page}
          </button>

          <button
            disabled={page * PER_PAGE >= totalOrders}
            onClick={() => setPage(page + 1)}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
