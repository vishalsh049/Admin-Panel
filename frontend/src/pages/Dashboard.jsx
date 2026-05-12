import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBox, FaChartBar, FaChartLine, FaRupeeSign, FaShoppingCart, FaUsers } from "react-icons/fa";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { exportToPDF, exportToExcel } from "../utils/exportReports";
import { BASE_URL } from "../utils/api";

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
  const [filterPeriod, setFilterPeriod] = useState("month");

  const loadDashboard = () => {
    setLoading(true);
    setError("");

    fetch(`${BASE_URL}/api/dashboard`)
      .then((res) => {
        if (!res.ok) throw new Error(`Dashboard request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard API error:", err);
        setError("Failed to load dashboard data.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500 bg-slate-50 min-h-screen">
        Loading dashboard data...
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-10 text-center text-red-600 bg-slate-50 min-h-screen">
        {error || "Failed to load dashboard"}
      </div>
    );
  }

  const monthlySales = (dashboardData.monthlySales || []).map((item) => ({
    ...item,
    sales: Number(item.sales) || 0,
    expenses: Number(item.expenses) || 0,
    profit:
      Number.isFinite(Number(item.profit)) ? Number(item.profit) : (Number(item.sales) || 0) - (Number(item.expenses) || 0),
  }));

  const kpis = {
    totalSales: Number(dashboardData.kpis?.totalSales) || 0,
    totalOrders: Number(dashboardData.kpis?.totalOrders) || 0,
    totalCustomers: Number(dashboardData.kpis?.totalCustomers) || 0,
    totalExpenses: Number(dashboardData.kpis?.totalExpenses) || Number(dashboardData.kpis?.expenses) || 0,
    profit: Number(dashboardData.kpis?.profit) || 0,
  };

  const currentMonthData =
    monthlySales[monthlySales.length - 1] || {
      name: "Current Month",
      sales: 0,
      expenses: 0,
      profit: 0,
    };

  const summary = dashboardData.summary || {};
  const selectedSummary =
    summary[filterPeriod] || {
      sales: filterPeriod === "year" ? kpis.totalSales : currentMonthData.sales,
      orders: filterPeriod === "year" ? kpis.totalOrders : 0,
      expenses: filterPeriod === "year" ? kpis.totalExpenses : currentMonthData.expenses,
      profit: filterPeriod === "year" ? kpis.profit : currentMonthData.profit,
    };

  const filteredData =
    filterPeriod === "year"
      ? monthlySales
      : [
          {
            name: filterPeriod === "today" ? "Today" : currentMonthData.name,
            sales: Number(selectedSummary.sales) || 0,
            expenses: Number(selectedSummary.expenses) || 0,
            profit: Number(selectedSummary.profit) || 0,
          },
        ];

  const statusCounts = dashboardData.orderStatus || {};
  const totalStatusCount =
    (Number(statusCounts.completed) || Number(statusCounts.Completed) || 0) +
    (Number(statusCounts.pending) || Number(statusCounts.Pending) || 0) +
    (Number(statusCounts.cancelled) || Number(statusCounts.Cancelled) || 0);

  const orderStatusData = [
    {
      name: "Completed",
      value: Number(statusCounts.completed) || Number(statusCounts.Completed) || 0,
      share: totalStatusCount
        ? Math.round(
            (((Number(statusCounts.completed) || Number(statusCounts.Completed) || 0)) / totalStatusCount) * 100
          )
        : 0,
    },
    {
      name: "Pending",
      value: Number(statusCounts.pending) || Number(statusCounts.Pending) || 0,
      share: totalStatusCount
        ? Math.round(
            (((Number(statusCounts.pending) || Number(statusCounts.Pending) || 0)) / totalStatusCount) * 100
          )
        : 0,
    },
    {
      name: "Cancelled",
      value: Number(statusCounts.cancelled) || Number(statusCounts.Cancelled) || 0,
      share: totalStatusCount
        ? Math.round(
            (((Number(statusCounts.cancelled) || Number(statusCounts.Cancelled) || 0)) / totalStatusCount) * 100
          )
        : 0,
    },
  ].filter((item) => item.value > 0);

  const activityFeed = dashboardData.activityFeed || [];
  const topProducts = dashboardData.topProducts || [];
  const topCustomers = dashboardData.topCustomers || [];
  const COLORS = ["#22c55e", "#facc15", "#ef4444"];

  const calculateGrowth = () => {
    if (monthlySales.length < 2) return { salesGrowth: 0, profitGrowth: 0 };

    const currentMonth = monthlySales[monthlySales.length - 1];
    const lastMonth = monthlySales[monthlySales.length - 2];

    const salesGrowth =
      lastMonth.sales === 0
        ? currentMonth.sales > 0
          ? 100
          : 0
        : Math.round(((currentMonth.sales - lastMonth.sales) / lastMonth.sales) * 100);

    const profitGrowth =
      lastMonth.profit === 0
        ? currentMonth.profit > 0
          ? 100
          : 0
        : Math.round(((currentMonth.profit - lastMonth.profit) / lastMonth.profit) * 100);

    return { salesGrowth, profitGrowth };
  };

  const { salesGrowth, profitGrowth } = calculateGrowth();
  const totalRevenue = filteredData.reduce((sum, month) => sum + month.sales, 0);
  const totalExpenses = filteredData.reduce((sum, month) => sum + month.expenses, 0);
  const totalProfit = filteredData.reduce((sum, month) => sum + month.profit, 0);
  const profitMargin = totalRevenue === 0 ? 0 : Math.round((totalProfit / totalRevenue) * 100);

  return (
    <div className="w-full min-h-screen text-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
      
      </div>

      <div className="relative">
        <div className="mb-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold mb-2 tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-sm sm:text-[15px] text-slate-500 font-medium">
                Welcome back! Here's your business overview
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-1 bg-white/70 rounded-2xl border border-slate-200 shadow-[0_0_0_1px_rgba(15,23,42,0.03)] backdrop-blur p-1">
                <FilterBtn label="Today" active={filterPeriod === "today"} onClick={() => setFilterPeriod("today")} />
                <FilterBtn label="This Month" active={filterPeriod === "month"} onClick={() => setFilterPeriod("month")} />
                <FilterBtn label="This Year" active={filterPeriod === "year"} onClick={() => setFilterPeriod("year")} />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowExportPopup(true)}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.99] transition-all duration-200 shadow-[0_12px_30px_-15px_rgba(16,185,129,0.55)] border border-white/40"
                >
                  Export
                </button>
                <button
                  className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold text-sm hover:from-purple-600 hover:to-purple-700 active:scale-[0.99] transition-all duration-200 shadow-[0_12px_30px_-15px_rgba(139,92,246,0.45)] border border-white/40"
                >
                  Import
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 justify-items-stretch">
          <KpiCard
            title="Total Sales"
            value={`Rs ${totalRevenue.toLocaleString("en-IN")}`}
            growth={`${salesGrowth > 0 ? "+" : ""}${salesGrowth}%`}
            icon={<FaChartBar />}
            iconBg="bg-emerald-500"
            up={salesGrowth >= 0}
          />

          <KpiCard
            title="Orders"
            value={Number(selectedSummary.orders || kpis.totalOrders).toLocaleString("en-IN")}
            growth={`${Number(selectedSummary.orders || kpis.totalOrders)} records`}
            icon={<FaShoppingCart />}
            iconBg="bg-blue-500"
            up
          />

          <KpiCard
            title="Customers"
            value={kpis.totalCustomers.toLocaleString("en-IN")}
            growth="Live WooCommerce customers"
            icon={<FaUsers />}
            iconBg="bg-purple-500"
            up
          />

          <KpiCard
            title="Expenses"
            value={`Rs ${totalExpenses.toLocaleString("en-IN")}`}
            growth={totalExpenses > 0 ? "Tracked expenses" : "No expenses found"}
            icon={<FaChartLine />}
            iconBg="bg-red-500"
            up={false}
          />

          <KpiCard
            title="Net Profit"
            value={`Rs ${totalProfit.toLocaleString("en-IN")}`}
            growth={`${profitGrowth > 0 ? "+" : ""}${profitGrowth}%`}
            icon={<FaRupeeSign />}
            iconBg={totalProfit >= 0 ? "bg-emerald-500" : "bg-red-500"}
            up={totalProfit >= 0}
          />
        </div>

        {showExportPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
            <div className="responsive-modal-panel w-full max-w-[340px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-900">Select Export Type</h3>

              <button
                onClick={() => {
                  exportToPDF(
                    "Sales and Expenses Report",
                    ["Period", "Sales", "Expenses", "Profit"],
                    filteredData.map((item) => [
                      item.name,
                      `Rs ${item.sales}`,
                      `Rs ${item.expenses}`,
                      `Rs ${item.profit}`,
                    ])
                  );
                  setShowExportPopup(false);
                }}
                className="w-full mb-3 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 font-semibold transition-all"
              >
                Export as PDF
              </button>

              <button
                onClick={() => {
                  exportToExcel(
                    "Sales and Expenses Report",
                    ["Period", "Sales", "Expenses", "Profit"],
                    filteredData.map((item) => [item.name, item.sales, item.expenses, item.profit])
                  );
                  setShowExportPopup(false);
                }}
                className="w-full mb-3 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 font-semibold transition-all"
              >
                Export as Excel
              </button>

              <button
                onClick={() => setShowExportPopup(false)}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 w-full mt-6">
          <div className="xl:col-span-2 bg-white/70 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-[0_35px_90px_-60px_rgba(99,102,241,0.28)] backdrop-blur">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Revenue & Expenses</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {filterPeriod === "today"
                    ? "Today's breakdown"
                    : filterPeriod === "month"
                      ? "This month's summary"
                      : "Last 6 months overview"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl border border-slate-200">
              <SummaryStat
                label="Revenue"
                value={`Rs ${totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                color="text-emerald-700"
              />
              <SummaryStat
                label="Expenses"
                value={`Rs ${totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                color="text-rose-700"
                withDivider
              />
              <SummaryStat
                label="Net Profit"
                value={`Rs ${totalProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                color="text-sky-700"
                withDivider
              />
              <SummaryStat label="Profit Margin" value={`${profitMargin}%`} color="text-amber-700" withDivider />
            </div>

            <div className="flex gap-6 text-sm text-slate-600 mb-6 flex-wrap">
              <LegendSwatch colorClass="from-emerald-500 to-green-600" label="Revenue" />
              <LegendSwatch colorClass="from-rose-500 to-red-600" label="Expenses" />
              <LegendSwatch colorClass="from-sky-500 to-indigo-600" label="Profit" />
            </div>

            <div className="h-96 w-full overflow-hidden rounded-2xl bg-white border border-slate-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredData}
                  barGap={14}
                  margin={{ top: 14, right: 16, left: 0, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#475569", fontSize: 12, fontWeight: 650 }}
                    interval={0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `Rs ${value}`}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    width={74}
                  />
                  <Tooltip
                    formatter={(value) => [`Rs ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`]}
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid rgba(15,23,42,0.08)",
                      background: "rgba(255,255,255,0.96)",
                      boxShadow: "0 22px 60px rgba(2,6,23,0.10)",
                    }}
                    labelStyle={{ color: "#0f172a" }}
                    itemStyle={{ color: "#0f172a" }}
                  />
                  <Bar dataKey="sales" fill="url(#revenueGradient)" radius={[10, 10, 0, 0]} name="sales" barSize={45} />
                  <Bar dataKey="expenses" fill="url(#expenseGradient)" radius={[10, 10, 0, 0]} name="expenses" barSize={45} />
                  <Bar dataKey="profit" fill="url(#profitGradient)" radius={[10, 10, 0, 0]} name="profit" barSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/70 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-[0_35px_90px_-60px_rgba(139,92,246,0.25)] backdrop-blur">
            <div className="mb-6">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Order Status</h3>
              <p className="text-sm text-slate-500 mt-1">Distribution of your order states</p>
            </div>

            <div className="flex flex-col items-center">
              {orderStatusData.length > 0 ? (
                <>
                  <PieChart width={230} height={230}>
                    <Pie
                      data={orderStatusData}
                      dataKey="value"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-lg font-bold fill-slate-800"
                    >
                      {totalStatusCount}
                    </text>
                  </PieChart>

                  <div className="w-full mt-8 space-y-3">
                    {orderStatusData.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/80 hover:bg-white transition-colors border border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                          <span className="text-slate-800 font-semibold">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-slate-900">{item.value}</p>
                          <p className="text-xs text-slate-500">{item.share}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No order status data available"
                  subtitle="Orders will be tracked here once you start processing them."
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8 items-stretch">
          <Card title="Activity Feed">
            {activityFeed.length > 0 ? (
              activityFeed.map((item) => (
                <ListRow
                  key={item.id}
                  icon={<FaShoppingCart />}
                  label={`${item.text} (${item.status})`}
                  value={item.time}
                  onClick={() => navigate(`/orders/${item.id}`)}
                />
              ))
            ) : (
              <EmptyState title="No recent activity" subtitle="Create completed orders to see activity here." />
            )}
          </Card>

          <Card title="Top Products">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <ListRow
                  key={`${product.name}-${index}`}
                  icon={<FaBox />}
                  label={product.name}
                  value={`Rs ${Number(product.sales || 0).toLocaleString("en-IN")}`}
                  onClick={() => navigate(product.id ? `/products/${product.id}` : "/products")}
                />
              ))
            ) : (
              <EmptyState title="No products data" subtitle="Your top selling products will appear here once you have sales." />
            )}
          </Card>

          <Card title="Top Customers">
            {topCustomers.length > 0 ? (
              topCustomers.map((customer, index) => (
                <ListRow
                  key={`${customer.name}-${index}`}
                  icon={<FaUsers />}
                  label={customer.name}
                  value={`Rs ${Number(customer.amount || 0).toLocaleString("en-IN")}`}
                  onClick={() => navigate(`/customers`)}
                />
              ))
            ) : (
              <EmptyState title="No customers data" subtitle="Your top customers will show here once you have completed orders." />
            )}
          </Card>
        </div>
      </div>
    </div>
  );

  function KpiCard({ title, value, growth, icon, iconBg, up }) {
    const isPercent = growth.includes("%");

    const bgColorMap = {
      "bg-green-500": "from-emerald-500 to-green-600",
      "bg-blue-500": "from-sky-500 to-indigo-600",
      "bg-purple-500": "from-purple-500 to-indigo-600",
      "bg-red-500": "from-rose-500 to-red-600",
      "bg-amber-500": "from-amber-500 to-amber-600",
      "bg-emerald-500": "from-emerald-500 to-emerald-600",
    };

    const gradient = bgColorMap[iconBg] || "from-slate-400 to-slate-500";

    return (
      <div className="relative bg-white/70 rounded-2xl p-4 border border-slate-200 hover:border-slate-300 transition-all duration-300 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.18)] overflow-hidden group backdrop-blur">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-25 rounded-full -mr-10 -mt-10 blur-2xl transition-opacity duration-500 group-hover:opacity-45`} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-white/70 to-transparent" />

        <div className="relative z-10">
          <div className="flex justify-between items-start gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight mb-1">{title}</p>
              <h3 className="text-2xl font-extrabold text-slate-900 leading-tight truncate" title={value}>
                {value}
              </h3>
            </div>

            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br ${gradient} transition-transform duration-300 flex-shrink-0 group-hover:scale-[1.04]`}
            >
              <span className="text-lg">{icon}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-lg ${
                up ? "bg-emerald-400/15 text-emerald-700" : "bg-rose-400/15 text-rose-700"
              }`}
            >
              {isPercent ? (up ? "Up" : "Down") : ""}
              {!isPercent ? " " : ""} {growth}
            </span>

            {isPercent && <span className="text-xs text-slate-500">vs last month</span>}
          </div>

          <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                up ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-rose-400 to-pink-600"
              }`}
              style={{ width: isPercent ? "70%" : "45%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  function FilterBtn({ label, active, onClick }) {
    return (
      <button
        onClick={onClick}
        className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 ${
          active
            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_18px_40px_-25px_rgba(99,102,241,0.65)] border border-white/50"
            : "bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent"
        }`}
      >
        {label}
      </button>
    );
  }

  function Card({ title, children }) {
    return (
      <div className="bg-white/70 rounded-3xl p-6 sm:p-7 border border-slate-200 hover:border-slate-300 transition-all duration-300 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.14)] backdrop-blur">
        <h3 className="text-lg font-extrabold text-slate-900 mb-5">{title}</h3>
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">{children}</div>
      </div>
    );
  }

  function ListRow({ icon, label, value, onClick }) {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors ${
          onClick ? "cursor-pointer" : ""
        } border border-slate-200`}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/15 to-purple-500/15 rounded-xl flex items-center justify-center text-indigo-700">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 font-semibold truncate">{label}</p>
        </div>
        <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">{value}</span>
      </div>
    );
  }

  function SummaryStat({ label, value, color, withDivider = false }) {
    return (
      <div className={`text-center ${withDivider ? "border-l border-slate-200" : ""} px-1`}>
        <p className="text-xs font-semibold text-slate-500 mb-1">{label.toUpperCase()}</p>
        <p className={`text-xl font-extrabold ${color}`}>{value}</p>
      </div>
    );
  }

  function LegendSwatch({ colorClass, label }) {
    return (
      <div className="flex items-center gap-2">
        <span className={`w-4 h-4 rounded-md bg-gradient-to-r ${colorClass}`} />
        <span className="font-semibold text-slate-700">{label}</span>
      </div>
    );
  }

  function EmptyState({ title, subtitle }) {
    return (
      <div className="text-center py-12 px-2">
        <p className="text-base text-slate-800 font-bold">{title}</p>
        <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
      </div>
    );
  }
}
