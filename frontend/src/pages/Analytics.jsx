import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { FaRupeeSign, FaShoppingCart, FaUsers, FaBox } from "react-icons/fa";

/* ---------------- DATA (Backend-ready) ---------------- */

const revenueData = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 38000 },
  { month: "Mar", revenue: 52000 },
  { month: "Apr", revenue: 60000 },
  { month: "May", revenue: 72000 },
  { month: "Jun", revenue: 81000 },
];

const orderCustomerData = [
  { name: "Jan", orders: 120, customers: 80 },
  { name: "Feb", orders: 100, customers: 70 },
  { name: "Mar", orders: 140, customers: 95 },
  { name: "Apr", orders: 160, customers: 110 },
  { name: "May", orders: 190, customers: 130 },
  { name: "Jun", orders: 220, customers: 160 },
];

const topProducts = [
  { name: "Premium Saree", revenue: "₹32,000" },
  { name: "Kurta Set", revenue: "₹24,500" },
  { name: "Lehenga", revenue: "₹18,300" },
];

/* ---------------- ANALYTICS PAGE ---------------- */

export default function Analytics() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Analytics</h2>
        <p className="text-sm text-gray-500">
          Deep insights into your business performance
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Kpi title="Total Revenue" value="₹3,45,000" icon={<FaRupeeSign />} />
        <Kpi title="Total Orders" value="1,120" icon={<FaShoppingCart />} />
        <Kpi title="New Customers" value="480" icon={<FaUsers />} />
        <Kpi title="Products Sold" value="860" icon={<FaBox />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Revenue Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Top Products</h3>
          <div className="space-y-4">
            {topProducts.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span>{p.name}</span>
                <span className="font-medium">{p.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders vs Customers */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Orders vs Customers</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orderCustomerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="customers" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ---------------- REUSABLE KPI ---------------- */

function Kpi({ title, value, icon }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
          