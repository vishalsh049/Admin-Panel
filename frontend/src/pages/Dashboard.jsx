  import { useEffect, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import {
    FaShoppingCart,
    FaUsers,
    FaChartLine,
    FaChartBar,
    FaBox,
    FaRupeeSign,
  } from "react-icons/fa";
  import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
  } from "recharts";
  import { exportToPDF, exportToExcel } from "../utils/exportReports";
  import { BASE_URL } from "../utils/api";

  export default function Dashboard() {
    const navigate = useNavigate();

    useEffect(() => {
      const user = localStorage.getItem("user");

      if (!user) {
        navigate("/");
      }
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
          if (!res.ok) {
            throw new Error(`Dashboard request failed: ${res.status}`);
          }
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
      return <div className="p-10 text-center text-gray-500">Loading dashboard data...</div>;
    }

    if (!dashboardData) {
      return <div className="p-10 text-center text-red-500">{error || "Failed to load dashboard"}</div>;
    }

    const monthlySales = (dashboardData.monthlySales || []).map((item) => ({
      ...item,
      sales: Number(item.sales) || 0,
      expenses: Number(item.expenses) || 0,
      profit:
        Number.isFinite(Number(item.profit))
          ? Number(item.profit)
          : (Number(item.sales) || 0) - (Number(item.expenses) || 0),
    }));

    const kpis = {
      totalSales: Number(dashboardData.kpis?.totalSales) || 0,
      totalOrders: Number(dashboardData.kpis?.totalOrders) || 0,
      totalCustomers: Number(dashboardData.kpis?.totalCustomers) || 0,
      totalExpenses:
        Number(dashboardData.kpis?.totalExpenses) ||
        Number(dashboardData.kpis?.expenses) ||
        0,
      profit: Number(dashboardData.kpis?.profit) || 0,
    };

    const currentMonthData = monthlySales[monthlySales.length - 1] || {
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
        share:
          totalStatusCount
            ? Math.round((((Number(statusCounts.completed) || Number(statusCounts.Completed) || 0)) / totalStatusCount) * 100)
            : 0,
      },
      {
        name: "Pending",
        value: Number(statusCounts.pending) || Number(statusCounts.Pending) || 0,
        share:
          totalStatusCount
            ? Math.round((((Number(statusCounts.pending) || Number(statusCounts.Pending) || 0)) / totalStatusCount) * 100)
            : 0,
      },
      {
        name: "Cancelled",
        value: Number(statusCounts.cancelled) || Number(statusCounts.Cancelled) || 0,
        share:
          totalStatusCount
            ? Math.round((((Number(statusCounts.cancelled) || Number(statusCounts.Cancelled) || 0)) / totalStatusCount) * 100)
            : 0,
      },
    ].filter((item) => item.value > 0);

    const activityFeed = dashboardData.activityFeed || [];
    const topProducts = dashboardData.topProducts || [];
    const topCustomers = dashboardData.topCustomers || [];
    const COLORS = ["#22c55e", "#facc15", "#ef4444"];

    const calculateGrowth = () => {
      if (monthlySales.length < 2) {
        return { salesGrowth: 0, profitGrowth: 0 };
      }

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

    {/* main return */}
    
    return (
      <div className="w-full min-h-screen">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Dashboard</h1>
              <p className="text-sm text-gray-600 font-medium">Welcome back! Here's your business overview</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-0.5">
                <FilterBtn label="Today" active={filterPeriod === "today"} onClick={() => setFilterPeriod("today")} />
                <FilterBtn label="This Month" active={filterPeriod === "month"} onClick={() => setFilterPeriod("month")} />
                <FilterBtn label="This Year" active={filterPeriod === "year"} onClick={() => setFilterPeriod("year")} />
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowExportPopup(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Export
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-medium text-xs hover:bg-purple-700 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 justify-items-center">
          <KpiCard
            title="Total Sales"
            value={`Rs ${totalRevenue.toLocaleString("en-IN")}`}
            growth={`${salesGrowth > 0 ? "+" : ""}${salesGrowth}%`}
            icon={<FaChartBar />}
            iconBg="bg-green-500"
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
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-80 shadow-xl">
              <h3 className="text-lg font-semibold mb-4 text-center">Select Export Type</h3>

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
                className="w-full mb-3 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
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
                className="w-full mb-3 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Export as Excel
              </button>

              <button
                onClick={() => setShowExportPopup(false)}
                className="w-full px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 w-full mt-6">
          <div className="xl:col-span-2 bg-white rounded-2xl p-8 shadow-md border border-gray-100  transition-all duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Revenue & Expenses</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {filterPeriod === "today"
                    ? "Today's breakdown"
                    : filterPeriod === "month"
                      ? "This month's summary"
                      : "Last 6 months overview"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-xl border border-slate-200">
              <SummaryStat label="Revenue" value={`Rs ${totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} color="text-green-600" />
              <SummaryStat label="Expenses" value={`Rs ${totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} color="text-red-600" withDivider />
              <SummaryStat label="Net Profit" value={`Rs ${totalProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} color="text-blue-600" withDivider />
              <SummaryStat label="Profit Margin" value={`${profitMargin}%`} color="text-amber-600" withDivider />
            </div>

            <div className="flex gap-8 text-sm text-gray-600 mb-8 flex-wrap">
              <LegendSwatch colorClass="from-emerald-500 to-green-600" label="Revenue" />
              <LegendSwatch colorClass="from-rose-500 to-red-600" label="Expenses" />
              <LegendSwatch colorClass="from-blue-500 to-indigo-600" label="Profit" />
            </div>

            <div className="h-96 w-full overflow-hidden rounded-lg bg-gray-50 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData} barGap={15} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#DC2626" />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6B7280", fontSize: 13, fontWeight: 500 }}
                    interval={0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `Rs ${value}`}
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value) => [`Rs ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Bar dataKey="sales" fill="url(#revenueGradient)" radius={[8, 8, 0, 0]} name="sales" barSize={45} />
                  <Bar dataKey="expenses" fill="url(#expenseGradient)" radius={[8, 8, 0, 0]} name="expenses" barSize={45} />
                  <Bar dataKey="profit" fill="url(#profitGradient)" radius={[8, 8, 0, 0]} name="profit" barSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 transition-all duration-300">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900">Order Status</h3>
              <p className="text-sm text-gray-600 mt-1">Distribution of your order states</p>
            </div>

            <div className="flex flex-col items-center">
              {orderStatusData.length > 0 ? (
                <>
                  <PieChart width={220} height={220}>
                    <Pie data={orderStatusData} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={4}>
                      {orderStatusData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>

                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-lg font-bold fill-gray-700"
                    >
                      {totalStatusCount}
                    </text>
                  </PieChart>

                  <div className="w-full mt-8 space-y-4">
                    {orderStatusData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                          <span className="text-gray-700 font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{item.value}</p>
                          <p className="text-xs text-gray-500">{item.share}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState title="No order status data available" subtitle="Orders will be tracked here once you start processing them." />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10 items-stretch">
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
    );
  }

  function KpiCard({ title, value, growth, icon, iconBg, up }) {
    const isPercent = growth.includes("%");

    const bgColorMap = {
      "bg-green-500": "from-green-500 to-green-600",
      "bg-blue-500": "from-blue-500 to-blue-600",
      "bg-purple-500": "from-purple-500 to-purple-600",
      "bg-red-500": "from-red-500 to-red-600",
      "bg-amber-500": "from-amber-500 to-amber-600",
      "bg-emerald-500": "from-emerald-500 to-emerald-600",
    };

    const gradient = bgColorMap[iconBg] || "from-gray-500 to-gray-600";

    return (
      <div className="w-full max-w-[240px] bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden group cursor-pointer transform hover:-translate-y-0.5">
        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${gradient} opacity-8 rounded-full -mr-8 -mt-8 group-hover:opacity-12 transition-all duration-500 blur-lg`} />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-tight mb-1">{title}</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{value}</h3>
            </div>

            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md bg-gradient-to-br ${gradient} group-hover:shadow-lg transition-all duration-300 flex-shrink-0 ml-2`}>
              <span className="text-lg">{icon}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-md ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {isPercent ? (up ? "Up" : "Down") : ""} {growth}
            </span>
            {isPercent && <span className="text-xs text-gray-500">vs last month</span>}
          </div>

          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${up ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-red-500 to-pink-500"}`}
              style={{ width: isPercent ? "70%" : "50%" }}
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
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
          active
            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
            : "bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent"
        }`}
      >
        {label}
      </button>
    );
  }

  function Card({ title, children }) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300">
        <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
        <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
          {children}
        </div>
      </div>
    );
  }

  function ListRow({ icon, label, value, onClick }) {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${onClick ? "cursor-pointer" : ""}`}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center text-indigo-600">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 font-medium truncate">{label}</p>
        </div>
        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{value}</span>
      </div>
    );
  }

  function SummaryStat({ label, value, color, withDivider = false }) {
    return (
      <div className={`text-center ${withDivider ? "border-l border-gray-300" : ""}`}>
        <p className="text-xs font-semibold text-gray-600 mb-1">{label.toUpperCase()}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </div>
    );
  }

  function LegendSwatch({ colorClass, label }) {
    return (
      <div className="flex items-center gap-2">
        <span className={`w-4 h-4 rounded-sm bg-gradient-to-r ${colorClass}`} />
        <span className="font-medium">{label}</span>
      </div>
    );
  }

  function EmptyState({ title, subtitle }) {
    return (
      <div className="text-center py-12">
        <p className="text-base text-gray-700 font-semibold">{title}</p>
        <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
      </div>
    );
  }
