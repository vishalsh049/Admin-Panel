import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import { authHeaders } from "../utils/authHeader";

const NAV_ITEMS = [
  {
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ), label: "Dashboard", hasChevron: false,
  },
  {
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ), label: "Customers", hasChevron: true,
  },
  { label: "Orders", isActive: true, hasChevron: true,
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
      </svg>
    ),
  },
  {
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      </svg>
    ), label: "Products",
  },
  {
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ), label: "Inventory", hasChevron: true,
  },
  {
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ), label: "Invoices",
  },
  {
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ), label: "Reports", hasChevron: true,
  },
  {
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/>
      </svg>
    ), label: "Settings", hasChevron: true,
  },
];

const SUB_NAV = ["All Orders", "Pending Orders", "Completed Orders", "Cancelled Orders"];

function ChevronDown({ className = "w-3 h-3" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}

function ActionButtons({ orderId, navigate }) {
  return (
    <div className="flex items-center gap-2">
      <button
  onClick={() => navigate(`/orders/${orderId}`)}
  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors"
       >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <button className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-[#6c63ff] transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  );
}

export default function ShopHubDashboard() {
  const [searchOrder, setSearchOrder] = useState("");

  const [status, setStatus] = useState("All Status");

  const [storeOrders, setStoreOrders] = useState([]);

  const navigate = useNavigate();

useEffect(() => {
  fetchStoreOrders();
}, []);

const fetchStoreOrders = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/store/admin/orders`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success) setStoreOrders(data.data || []);
  } catch (err) {
    console.log(err);
  }
};

const updateStoreOrderStatus = async (orderId, newStatus) => {
  try {
    await fetch(`${BASE_URL}/api/store/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status: newStatus }),
    });
    fetchStoreOrders();
  } catch (err) {
    console.log(err);
  }
};

     const statuses = [
  "All Status",
  ...new Set(storeOrders.map((order) => order.status)),
];

const filteredStoreOrders = storeOrders.filter((order) => {
  const searchMatch =
    searchOrder === "" ||
    String(order.id).includes(searchOrder) ||
    (order.customerName || "").toLowerCase().includes(searchOrder.toLowerCase()) ||
    (order.customerEmail || "").toLowerCase().includes(searchOrder.toLowerCase());
  const statusMatch = status === "All Status" || order.status === status;
  return searchMatch && statusMatch;
});


  return (
    <div
  className="flex min-h-full w-full max-w-full"
  style={{
    fontFamily: "'DM Sans', sans-serif",
    
    color: "#1e293b"
  }}
>
      {/* MAIN */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* TOPBAR */}
        <header className="sticky top-0 z-20 flex items-center rounded-xl border-b border-slate-200 bg-white p-3">
         <div className="mx-auto flex w-full flex-col gap-4 px-2 lg:flex-row lg:items-center">

          <div className="flex-1">
            <h1 className="text-[18px] font-semibold leading-tight">Orders Dashboard</h1>
            <p className="text-[13px] tracking-wide text-slate-400">Manage and track all customer orders</p>
          </div>

          {/* Create New Order Button */}
          <button className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition-colors sm:w-auto"
            style={{ backgroundColor: "#6c63ff" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#5a52e0"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "#6c63ff"}>
            <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create New Order
            <span className="w-px h-5 bg-white/30 mx-0.5"/>
            <span className="text-xs">▾</span>
          </button>
          </div>
        </header>

        {/* CONTENT */}
       <main className="p-2 flex-1 w-full mx-auto">

          {/* FILTER BAR */}
          <div className="mb-2 grid grid-cols-1 gap-4 rounded-xl bg-white p-1 shadow-sm md:grid-cols-2 lg:grid-cols-5">
            {/* Search Order */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-48">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder="Search by order ID, customer..."
                  value={searchOrder} onChange={e => setSearchOrder(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 py-2 text-[13px] outline-none placeholder-slate-400 transition-colors"
                  style={{ fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#6c63ff"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}/>
              </div>
            </div>

            {/* Order Status */}
            <div className="flex flex-col gap-1.5">
              
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none cursor-pointer text-slate-700 min-w-30 transition-colors"
                style={{ fontFamily: "inherit" }}>
              {statuses.map((s) => (
              <option key={s}>{s}</option>
               ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-1.5">
          
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input type="text" placeholder="Select Date Range"
                 value="" 
                 readOnly
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-[13px] text-slate-700 outline-none "
                  style={{ fontFamily: "inherit" }}/>
              </div>
            </div>

            {/* Actions */}
            <div className="ml-auto flex flex-wrap gap-2">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium transition-colors hover:text-[#6c63ff]"
                onMouseEnter={e => e.currentTarget.style.borderColor = "#6c63ff"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-3.5 h-3.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filters
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-medium transition-colors"
                style={{ backgroundColor: "#6c63ff" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#5a52e0"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "#6c63ff"}>
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-3.5 h-3.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* ── WEBSITE ORDERS ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-[15px] font-bold">Website Orders</h2>
                <p className="text-xs text-slate-400 mt-0.5">Orders placed by customers on your website</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-3 py-1 rounded-full">{filteredStoreOrders.length} orders</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Order ID","Customer","Phone","Items","Total","Payment","Status","Date","Update Status","View"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStoreOrders.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-400 text-sm">
                        No website orders yet. Orders placed on the website will appear here.
                      </td>
                    </tr>
                  )}
                  {filteredStoreOrders.map((order, i) => (
                    <tr key={order.id} className={`hover:bg-slate-50 text-sm ${i < filteredStoreOrders.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">#{order.id}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-800">{order.customerName}</div>
                        <div className="text-xs text-slate-400">{order.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{order.customerPhone || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{Array.isArray(order.items) ? order.items.length : "—"} items</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">₹{Number(order.totalPrice).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 capitalize">{order.paymentMethod}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full capitalize font-medium
                          ${order.status === "pending" ? "bg-amber-100 text-amber-700" :
                            order.status === "processing" ? "bg-blue-100 text-blue-700" :
                            order.status === "shipped" ? "bg-purple-100 text-purple-700" :
                            order.status === "delivered" ? "bg-green-100 text-green-700" :
                            order.status === "cancelled" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <select
                          value={order.status}
                          onChange={e => updateStoreOrderStatus(order.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[12px] outline-none cursor-pointer text-slate-700"
                          style={{ fontFamily: "inherit" }}>
                          {["pending","processing","shipped","delivered","cancelled"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td><ActionButtons orderId={order.id} navigate={navigate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
