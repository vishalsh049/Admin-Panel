{/* */}import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { inrCompact, inr, paymentInfo } from "./constants";

const PIE_COLORS = ["#f43f5e", "#f59e0b", "#10b981"];
const VENDOR_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"];

function Panel({ title, subtitle, children }) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.32)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  boxShadow: "0 18px 40px -22px rgba(15,23,42,0.35)",
  fontSize: 12,
};

export default function ChartsSection({ dashboard }) {
  const monthly = useMemo(
    () =>
      (dashboard?.monthly || []).map((m) => ({
        month: new Date(`${m.ym}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        total: Number(m.total),
        gst: Number(m.gst),
        bills: Number(m.bills),
      })),
    [dashboard]
  );

  const vendors = useMemo(
    () =>
      (dashboard?.topVendors || []).map((v) => ({
        name: v.vendor_name.length > 14 ? `${v.vendor_name.slice(0, 14)}…` : v.vendor_name,
        fullName: v.vendor_name,
        total: Number(v.total),
        bills: Number(v.bills),
      })),
    [dashboard]
  );

  const payments = useMemo(
    () =>
      (dashboard?.paymentSplit || []).map((p) => ({
        name: paymentInfo(p.payment_status).label,
        value: Number(p.count),
        total: Number(p.total),
        key: p.payment_status,
      })),
    [dashboard]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <div className="xl:col-span-1 lg:col-span-2">
     {/*    <Panel title="Monthly Purchase" subtitle="Last 12 months, with GST input credit">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="pbTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="pbGst" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={inrCompact} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip formatter={(v, n) => [inr(v), n === "total" ? "Purchase" : "GST"]} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#pbTotal)" name="total" />
              <Area type="monotone" dataKey="gst" stroke="#a855f7" strokeWidth={2} fill="url(#pbGst)" name="gst" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
         */}

       
      </div> 

    {/*   <Panel title="Top Vendors" subtitle="By total purchase value">
        {vendors.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendors} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tickFormatter={inrCompact} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => inr(v)} labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} contentStyle={tooltipStyle} />
              <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={16}>
                {vendors.map((_, i) => (
                  <Cell key={i} fill={VENDOR_COLORS[i % VENDOR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No vendor data yet</div>
        )}
      </Panel>
      */}

    {/*   <Panel title="Payment Status" subtitle="Bill count by payment state">
        {payments.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={payments} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={3} strokeWidth={2}>
                {payments.map((p, i) => (
                  <Cell
                    key={p.key}
                    fill={p.key === "paid" ? PIE_COLORS[2] : p.key === "partial" ? PIE_COLORS[1] : PIE_COLORS[0]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v, n, e) => [`${v} bills · ${inrCompact(e?.payload?.total)}`, n]} contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No bills yet</div>
        )}
      </Panel>
      */}
    </div>
  );
}
