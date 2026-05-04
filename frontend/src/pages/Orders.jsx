import { useState } from "react";
import { BASE_URL } from "../utils/api";

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

const STATS = [
  {
    label: "Total Orders", value: "1,248", change: "↑ 12.5%", color: "#6c63ff",
    bgColor: "#eef2ff", strokeColor: "#6c63ff",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="#6c63ff" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
    sparkline: "0,28 13,22 26,26 39,14 52,18 65,10 80,14",
  },
  {
    label: "Total Revenue", value: "₹2,45,800", change: "↑ 18.6%", color: "#22c55e",
    bgColor: "#f0fdf4", strokeColor: "#22c55e",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="#22c55e" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
    sparkline: "0,30 13,24 26,28 39,16 52,20 65,8 80,12",
  },
  {
    label: "Pending Orders", value: "86", change: "↑ 8.3%", color: "#f59e0b",
    bgColor: "#fffbeb", strokeColor: "#f59e0b",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    sparkline: "0,20 13,26 26,18 39,24 52,14 65,20 80,12",
  },
  {
    label: "Completed Orders", value: "1,162", change: "↑ 14.2%", color: "#14b8a6",
    bgColor: "#f0fdfa", strokeColor: "#14b8a6",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="#14b8a6" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
    sparkline: "0,26 13,20 26,24 39,12 52,16 65,8 80,10",
  },
];

const ORDERS = [
  {
    id: "#ORD-1250", name: "Rohan Sharma", email: "rohan@mail.com", initial: "R",
    gradient: "linear-gradient(135deg,#667eea,#764ba2)",
    date: "Jun 20, 2024", time: "10:30 AM", items: "3 Items", amount: "₹2,450.00",
    status: "Pending", statusStyle: "bg-orange-50 text-orange-500", payment: "Paid", paymentStyle: "text-green-500",
  },
  {
    id: "#ORD-1249", name: "Priya Singh", email: "priya@mail.com", initial: "P",
    gradient: "linear-gradient(135deg,#f093fb,#f5576c)",
    date: "Jun 20, 2024", time: "09:15 AM", items: "1 Item", amount: "₹850.00",
    status: "Processing", statusStyle: "bg-blue-50 text-blue-500", payment: "Paid", paymentStyle: "text-green-500",
  },
  {
    id: "#ORD-1248", name: "Amit Patel", email: "amit@mail.com", initial: "A",
    gradient: "linear-gradient(135deg,#4facfe,#00f2fe)",
    date: "Jun 19, 2024", time: "08:45 PM", items: "5 Items", amount: "₹5,250.00",
    status: "Shipped", statusStyle: "bg-sky-50 text-sky-500", payment: "Paid", paymentStyle: "text-green-500",
  },
  {
    id: "#ORD-1247", name: "Neha Verma", email: "neha@mail.com", initial: "N",
    gradient: "linear-gradient(135deg,#43e97b,#38f9d7)",
    date: "Jun 19, 2024", time: "06:20 PM", items: "2 Items", amount: "₹1,150.00",
    status: "Delivered", statusStyle: "bg-green-50 text-green-600", payment: "Paid", paymentStyle: "text-green-500",
  },
  {
    id: "#ORD-1246", name: "Vikram Joshi", email: "vikram@mail.com", initial: "V",
    gradient: "linear-gradient(135deg,#fa709a,#fee140)",
    date: "Jun 19, 2024", time: "04:10 PM", items: "4 Items", amount: "₹3,650.00",
    status: "Cancelled", statusStyle: "bg-red-50 text-red-500", payment: "Refunded", paymentStyle: "text-slate-400",
  },
];

function ChevronDown({ className = "w-3 h-3" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}

function ActionButtons() {
  return (
    <div className="flex items-center gap-2">
      <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
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
  const [activeSubNav, setActiveSubNav] = useState("All Orders");
  const [searchOrder, setSearchOrder] = useState("");
  const [status, setStatus] = useState("All Status");
  const [customer, setCustomer] = useState("All Customers");
  const [sortBy, setSortBy] = useState("Newest");

  return (
    <div
  className="flex min-h-screen"
  style={{
    fontFamily: "'DM Sans', sans-serif",
    
    color: "#1e293b"
  }}
>
      {/* MAIN */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* TOPBAR */}
        <header className="bg-white border-b border-slate-200 rounded-2xl flex items-center px-2 py-3 top-0 z-40">
         <div className="w-full mx-auto flex items-center gap-4 px-4">

          <div className="flex-1">
            <h1 className="text-[20px] font-bold leading-tight">Orders Dashboard</h1>
            <p className="text-[12.5px] text-slate-400">Manage and track all customer orders</p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 w-56">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search anything..."
              className="bg-transparent border-none outline-none text-[13px] w-full placeholder-slate-400"/>
            <span className="bg-slate-200 text-slate-400 text-[10px] rounded px-1.5 py-0.5">⌘K</span>
          </div>

          {/* Create Button */}
          <button className="flex items-center gap-2 text-white text-[13.5px] font-semibold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
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
       <main className="p-3 flex-1 w-full max-w-[1400px] mx-auto">

          {/* STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="text-[12.5px] text-slate-400 font-medium">{stat.label}</span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: stat.bgColor }}>
                    {stat.icon}
                  </div>
                </div>
                <div className="text-[24px] font-bold tracking-tight">{stat.value}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-green-500">{stat.change}</span>
                  <span className="text-[11.5px] text-slate-400">vs last month</span>
                  <svg className="ml-auto" width="80" height="32" viewBox="0 0 80 36">
                    <polyline fill="none" stroke={stat.strokeColor} strokeWidth="2" strokeLinejoin="round" points={stat.sparkline}/>
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* FILTER BAR */}
          <div className="bg-white rounded-2xl px-5 py-5 shadow-sm mb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Order */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-48">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder="Search by order ID, customer..."
                  value={searchOrder} onChange={e => setSearchOrder(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none placeholder-slate-400 transition-colors"
                  style={{ fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#6c63ff"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}/>
              </div>
            </div>

            {/* Order Status */}
            <div className="flex flex-col gap-1.5">
              
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none cursor-pointer text-slate-700 min-w-36 transition-colors"
                style={{ fontFamily: "inherit" }}>
                {["All Status","Pending","Processing","Shipped","Delivered","Cancelled"].map(s => (
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
                <input type="text" defaultValue="May 20, 2024 – Jun 20, 2024" readOnly
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none cursor-pointer text-slate-700 w-56"
                  style={{ fontFamily: "inherit" }}/>
              </div>
            </div>

            {/* Customer */}
            <div className="flex flex-col gap-1.5">
             
              <select value={customer} onChange={e => setCustomer(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none cursor-pointer text-slate-700 min-w-40"
                style={{ fontFamily: "inherit" }}>
                {["All Customers","Rohan Sharma","Priya Singh","Amit Patel"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 ml-auto">
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

          {/* ORDERS TABLE */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-[15px] font-bold">Orders List</h2>
              <div className="flex items-center gap-2 text-[13px] text-slate-400">
                Sort by:
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[13px] bg-slate-50 text-slate-700 outline-none cursor-pointer"
                  style={{ fontFamily: "inherit" }}>
                  {["Newest","Oldest","Amount (High)","Amount (Low)"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Order ID","Customer","Date","Items","Total Amount","Status","Payment","Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[12px] font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ORDERS.map((order, i) => (
                    <tr key={order.id} className={`hover:bg-slate-50/60 transition-colors ${i < ORDERS.length - 1 ? "border-b border-slate-50" : ""}`}>
                      <td className="px-4 py-3.5">
                        <a href="#" className="font-semibold text-[13.5px] hover:underline" style={{ color: "#6c63ff" }}>{order.id}</a>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0"
                            style={{ background: order.gradient }}>{order.initial}</div>
                          <div>
                            <div className="font-medium text-[13.5px]">{order.name}</div>
                            <div className="text-[11.5px] text-slate-400">{order.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[13.5px]">{order.date}</div>
                        <div className="text-[11.5px] text-slate-400">{order.time}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-400 text-[13.5px]">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                          </svg>
                          {order.items}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[13.5px]">{order.amount}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-semibold ${order.statusStyle}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 font-medium text-[13.5px] ${order.paymentStyle}`}>{order.payment}</td>
                      <td className="px-4 py-3.5"><ActionButtons /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <span className="text-[13px] text-slate-400">Showing 1 to 5 of 1,248 orders</span>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center text-sm transition-colors hover:text-[#6c63ff]">‹</button>
                <button className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-[13px]" style={{ backgroundColor: "#6c63ff" }}>1</button>
                {["2","3"].map(p => (
                  <button key={p} className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center text-[13px] transition-colors hover:text-[#6c63ff]">{p}</button>
                ))}
                <button className="w-8 h-8 flex items-center justify-center text-slate-400 text-[13px]">…</button>
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center text-[13px] transition-colors hover:text-[#6c63ff]">250</button>
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center text-sm transition-colors hover:text-[#6c63ff]">›</button>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
