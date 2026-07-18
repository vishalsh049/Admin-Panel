import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBox,
  FaChartBar,
  FaChartLine,
  FaRupeeSign,
  FaShoppingCart,
  FaUsers,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { exportToPDF, exportToExcel } from "../utils/exportReports";
import api from "../services/api";

/* ─── tiny sparkline used inside KPI cards ─── */
function Sparkline({ color = "#22c55e", up = true }) {
  const path = up
    ? "M0,18 C10,14 20,8 30,10 C40,12 50,6 60,4 C70,2 80,8 90,5 L90,24 L0,24 Z"
    : "M0,5 C10,8 20,14 30,12 C40,10 50,16 60,18 C70,20 80,14 90,18 L90,24 L0,24 Z";
  return (
    <svg width="90" height="24" viewBox="0 0 90 24" fill="none">
      <path d={path} fill={up ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"} />
      <path
        d={path.split("L")[0]}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

/* ─── avatar initials chip ─── */
const AVATAR_COLORS = ["#6366f1","#0ea5e9","#f59e0b","#ec4899","#14b8a6","#f97316"];
function Avatar({ name, idx }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
    >
      {initials}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) navigate("/");
  }, [navigate]);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("1M");
  const [selectedDate, setSelectedDate] = useState(
  new Date().toISOString().split("T")[0]
);

const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");

  useEffect(() => {
    setError("");
    api
      .get("/api/dashboard", { params: { period: filterPeriod, from: fromDate, to: toDate } })
      .then((res) => { setDashboardData(res.data); })
      .catch((err) => { console.error(err); setError("Failed to load dashboard data."); });
  }, [filterPeriod, selectedDate, fromDate, toDate]);

  if (loading && !dashboardData) return <div className="p-10 text-center text-slate-500 bg-slate-50 min-h-screen">Loading dashboard data…</div>;
  if (!dashboardData) return <div className="p-10 text-center text-red-600 bg-slate-50 min-h-screen">{error || "Failed to load dashboard"}</div>;

  /* ── data prep ── */
  const monthlySales = (dashboardData.monthlySales || []).map((item) => ({
    ...item,
    sales: Number(item.sales) || 0,
    expenses: Number(item.expenses) || 0,
    profit: Number.isFinite(Number(item.profit)) ? Number(item.profit) : (Number(item.sales) || 0) - (Number(item.expenses) || 0),
  }));
  console.log("Monthly Sales:", monthlySales);

  const kpis = {
    totalSales: Number(dashboardData.kpis?.totalSales) || 0,
    totalOrders: Number(dashboardData.kpis?.totalOrders) || 0,
    totalCustomers: Number(dashboardData.kpis?.totalCustomers) || 0,
    totalExpenses: Number(dashboardData.kpis?.totalExpenses) || Number(dashboardData.kpis?.expenses) || 0,
    profit: Number(dashboardData.kpis?.profit) || 0,
  };

  const currentMonthData = monthlySales[monthlySales.length - 1] || { name: "Current", sales: 0, expenses: 0, profit: 0 };
  const summary = dashboardData.summary || {};
  const apiPeriod = filterPeriod;
  const selectedSummary = summary[apiPeriod] || {
    sales: apiPeriod === "year" ? kpis.totalSales : currentMonthData.sales,
    orders: apiPeriod === "year" ? kpis.totalOrders : 0,
    expenses: apiPeriod === "year" ? kpis.totalExpenses : currentMonthData.expenses,
    profit: apiPeriod === "year" ? kpis.profit : currentMonthData.profit,
  };

 let chartData = [];

if (filterPeriod === "7D") {
  chartData = monthlySales.slice(-1);
}
else if (filterPeriod === "1M") {
  chartData = monthlySales.slice(-1);
}
else if (filterPeriod === "3M") {
  chartData = monthlySales.slice(-3);
}
else if (filterPeriod === "1Y") {
  chartData = monthlySales;
}

  const totalRevenue = chartData.reduce((s, m) => s + m.sales, 0);
  const totalExpenses = chartData.reduce((s, m) => s + m.expenses, 0);
  const totalProfit = chartData.reduce((s, m) => s + m.profit, 0);
  const profitMargin = totalRevenue === 0 ? 0 : Math.round((totalProfit / totalRevenue) * 100);

  const calcGrowth = () => {
    if (monthlySales.length < 2) return { salesGrowth: 0, profitGrowth: 0 };
    const cur = monthlySales[monthlySales.length - 1];
    const prev = monthlySales[monthlySales.length - 2];
    const salesGrowth = prev.sales === 0 ? (cur.sales > 0 ? 100 : 0) : Math.round(((cur.sales - prev.sales) / prev.sales) * 100);
    const profitGrowth = prev.profit === 0 ? (cur.profit > 0 ? 100 : 0) : Math.round(((cur.profit - prev.profit) / prev.profit) * 100);
    return { salesGrowth, profitGrowth };
  };
  const { salesGrowth, profitGrowth } = calcGrowth();

  const statusCounts = dashboardData.orderStatus || {};
  const completed = Number(statusCounts.completed) || 0;
const processing = Number(statusCounts.processing) || 0;
const failed = Number(statusCounts.failed) || 0;
const cancelled = Number(statusCounts.cancelled) || 0;

const totalStatusCount =
  completed + processing + failed + cancelled;

const orderStatusData = [
  {
    name: "Completed",
    value: completed,
    color: "#22c55e",
  },
  {
    name: "Processing",
    value: processing,
    color: "#facc15",
  },
  {
    name: "Failed",
    value: failed,
    color: "#f97316",
  },
  {
    name: "Cancelled",
    value: cancelled,
    color: "#ef4444",
  },
].filter((i) => i.value > 0);

  const activityFeed = dashboardData.activityFeed || [];
  const topProducts  = dashboardData.topProducts  || [];
  const topCustomers = dashboardData.topCustomers || [];

  /* ── today's date string ── */
  const todayStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="w-full min-h-screen text-slate-900 -mt-4">
      {/* ── Page header ── */}
      <div className="mb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
           
            <p className="text-sm px-2 text-slate-500">Here's what's happening with your business today.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* date pill */}
   <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm">

  {/* From Date */}
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-500 font-medium">
      From
    </span>

    <input
      type="date"
      value={fromDate}
      onChange={(e) => setFromDate(e.target.value)}
      className="border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none"
    />
  </div>

  {/* To Date */}
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-500 font-medium">
      To
    </span>

    <input
      type="date"
      value={toDate}
      onChange={(e) => setToDate(e.target.value)}
      className="border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none"
    />
  </div>

  {/* Reset Button */}
  <button
    onClick={() => {
      setFromDate("");
      setToDate("");
      setFilterPeriod("1M");
    }}
    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-[14px] font-semibold"
  >
    Reset
  </button>

</div>

            {/* period tabs */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {["7D", "1M", "3M", "1Y"].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPeriod(p)}
                  className={`px-4 py-2 text-sm font-semibold transition-all ${
                    filterPeriod === p
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-2">
        <KpiCard
          title="TOTAL SALES"
          value={`₹${totalRevenue.toLocaleString("en-IN")}`}
          badge={`${salesGrowth > 0 ? "+" : ""}${salesGrowth}%`}
          sub="vs last month"
          up={salesGrowth >= 0}
          iconBg="bg-blue-500"
          icon={<FaChartLine className="text-white text-base" />}
        />
        <KpiCard
          title="ORDERS"
          value={Number(selectedSummary.orders || kpis.totalOrders).toLocaleString("en-IN")}
          badge={`+22%`}
          sub="vs last month"
          up
          iconBg="bg-indigo-500"
          icon={<FaShoppingCart className="text-white text-base" />}
        />
        <KpiCard
          title="CUSTOMERS"
          value={kpis.totalCustomers.toLocaleString("en-IN")}
          badge="Live"
          sub="Website customers"
          up
          iconBg="bg-purple-500"
          icon={<FaUsers className="text-white text-base" />}
          noBadgeArrow
        />
        <KpiCard
          title="EXPENSES"
          value={`₹${totalExpenses.toLocaleString("en-IN")}`}
          badge={totalExpenses > 0 ? "Tracked" : "No expenses"}
          sub=""
          up={false}
          iconBg="bg-red-500"
          icon={<FaChartBar className="text-white text-base" />}
          noBadgeArrow
        />
        <KpiCard
          title="NET PROFIT"
          value={`₹${totalProfit.toLocaleString("en-IN")}`}
          badge={`${profitGrowth > 0 ? "+" : ""}${profitGrowth}%`}
          sub="vs last month"
          up={totalProfit >= 0}
          iconBg={totalProfit >= 0 ? "bg-emerald-500" : "bg-red-500"}
          icon={<FaRupeeSign className="text-white text-base" />}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 mb-2">
        {/* Revenue Analytics */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Revenue Analytics</h3>
              <p className="text-xs text-slate-400 mt-0.5">Overview of your financial performance</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              This Month
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>

          {/* summary stats */}
          <div className="grid grid-cols-4 gap-2 my-3">
            {[
              { label: "REVENUE",       val: `₹${totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,  color: "text-slate-800" },
              { label: "EXPENSES",      val: `₹${totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "text-red-600"   },
              { label: "NET PROFIT",    val: `₹${totalProfit.toLocaleString("en-IN",   { maximumFractionDigits: 0 })}`,  color: "text-slate-800" },
              { label: "PROFIT MARGIN", val: `${profitMargin}%`,                                                          color: "text-amber-600" },
            ].map((s, i) => (
              <div key={s.label} className={`text-center ${i > 0 ? "border-l border-slate-100" : ""}`}>
                <p className="text-[10px] font-semibold text-slate-400 tracking-wide mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* legend */}
          <div className="flex gap-5 mb-4">
            {[["#22c55e","Revenue"],["#ef4444","Expenses"],["#6366f1","Profit"]].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                {l}
              </div>
            ))}
          </div>

          {/* area chart */}
          <div className="h-40 w-full">
            {console.log("Chart Data", chartData)}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} tick={{ fill: "#94a3b8", fontSize: 11 }} width={60} />
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="sales"    stroke="#22c55e" strokeWidth={2} fill="url(#gRevenue)"  name="Revenue"  dot={false} />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#gExpenses)" name="Expenses" dot={false} />
                <Area type="monotone" dataKey="profit"   stroke="#6366f1" strokeWidth={2} fill="url(#gProfit)"   name="Profit"   dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-base px-2 font-bold text-slate-900">Order Status</h3>
          <p className="text-xs px-2 text-slate-400 mb-2">Distribution of your order states</p>

          {orderStatusData.length > 0 ? (
            <>
             <div className="flex items-start gap-2">
                {/* donut */}
                <div className="relative flex-shrink-0">
                  <PieChart width={130} height={130}>
                    <Pie data={orderStatusData} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={3}>
                      {orderStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-slate-900">{totalStatusCount}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Total Orders</span>
                  </div>
                </div>

     {/* legend */}
 <div className="grid grid-cols-2 gap-1  flex-1">
  {orderStatusData.map((item) => (
    <div
      key={item.name}
      className="bg-slate-50 rounded-xl px-2 py-3 border border-slate-100"
    >
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-semibold"
          style={{ color: item.color }}
        >
          {item.name}
        </span>

        <span
          className="text-sm font-bold"
          style={{ color: item.color }}
        >
          {item.value}
        </span>
      </div>
    </div>
  ))}
</div>
              </div>

              {/* Weekly growth strip */}
              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">Weekly Growth</p>
                    <p className="text-2xl font-bold text-emerald-600">+8%</p>
                    <p className="text-xs text-slate-400">vs last week</p>
                  </div>
                  <svg width="80" height="36" viewBox="0 0 80 36">
                    <path d="M0,28 C15,22 30,12 45,15 C60,18 70,8 80,5" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <button
                onClick={() => navigate("/orders")}
                className="mt-4 w-full flex items-center justify-between text-indigo-600 text-sm font-semibold hover:text-indigo-700 transition-colors"
              >
                View All Orders
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </>
          ) : (
            <EmptyState title="No order status data" subtitle="Orders will be tracked here once you start processing." />
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Activity Feed */}
        <BottomCard
          title="Activity Feed"
          onViewAll={() => navigate("/orders")}
          empty={activityFeed.length === 0}
          emptyTitle="No recent activity"
          emptySubtitle="Create completed orders to see activity here."
        >
          {activityFeed.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/orders/${item.id}`)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <FaShoppingCart className="text-indigo-500 text-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{item.text}</p>
                <p className="text-xs text-slate-400">{item.status}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{item.time}</span>
            </div>
          ))}
        </BottomCard>

        {/* Top Products */}
        <BottomCard
          title="Top Products"
          onViewAll={() => navigate("/products")}
          empty={topProducts.length === 0}
          emptyTitle="No products data"
          emptySubtitle="Your top selling products will appear here once you have sales."
        >
          {topProducts.map((product, index) => (
            <div
              key={`${product.name}-${index}`}
              onClick={() => navigate(product.id ? `/products/${product.id}` : "/products")}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <FaBox className="text-amber-500 text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
              </div>
              <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                ₹{Number(product.sales || 0).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </BottomCard>

        {/* Top Customers */}
        <BottomCard
          title="Top Customers"
          onViewAll={() => navigate("/customers")}
          empty={topCustomers.length === 0}
          emptyTitle="No customers data"
          emptySubtitle="Your top customers will show here once you have completed orders."
        >
          {topCustomers.map((customer, index) => (
            <div
              key={`${customer.name}-${index}`}
              onClick={() => navigate("/customers")}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <Avatar name={customer.name} idx={index} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{customer.name}</p>
              </div>
              <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                ₹{Number(customer.amount || 0).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </BottomCard>
      </div>

      {/* ── Export popup ── */}
      {showExportPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[320px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-center text-slate-900">Select Export Type</h3>
            <button
              onClick={() => {
                exportToPDF("Sales and Expenses Report", ["Period","Sales","Expenses","Profit"],
                  chartData.map((item) => [item.name, `₹${item.sales}`, `₹${item.expenses}`, `₹${item.profit}`]));
                setShowExportPopup(false);
              }}
              className="w-full mb-3 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 font-semibold transition-all"
            >Export as PDF</button>
            <button
              onClick={() => {
                exportToExcel("Sales and Expenses Report", ["Period","Sales","Expenses","Profit"],
                  chartData.map((item) => [item.name, item.sales, item.expenses, item.profit]));
                setShowExportPopup(false);
              }}
              className="w-full mb-3 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 font-semibold transition-all"
            >Export as Excel</button>
            <button
              onClick={() => setShowExportPopup(false)}
              className="w-full px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold transition-all"
            >Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({ title, value, badge, sub, up, iconBg, icon, noBadgeArrow = false }) {
  const badgeUp   = "bg-emerald-50 text-emerald-700";
  const badgeDown = "bg-red-50 text-red-600";
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-semibold text-slate-400 tracking-widest">{title}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-slate-900 mb-1">{value}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${up ? badgeUp : badgeDown}`}>
            {!noBadgeArrow && (up ? <FaArrowUp className="text-[9px]" /> : <FaArrowDown className="text-[9px]" />)}
            {badge}
          </span>
          {sub && <span className="text-xs text-slate-400">{sub}</span>}
        </div>
        <Sparkline up={up} color={up ? "#22c55e" : "#ef4444"} />
      </div>
    </div>
  );
}

/* ── Bottom section card ── */
function BottomCard({ title, onViewAll, empty, emptyTitle, emptySubtitle, children }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <button onClick={onViewAll} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
      </div>
      {empty ? (
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto">{children}</div>
      )}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="text-center py-10 px-2">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}
