import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeIndianRupee, CalendarClock, CalendarDays, Clock4, FileCheck2,
  FileClock, Landmark, TrendingUp, UsersRound,
} from "lucide-react";
import { inr, inrCompact } from "./constants";

// Count-up hook for the animated KPI values.
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef();
  useEffect(() => {
    const to = Number(target) || 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

function Sparkline({ points, stroke }) {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 96, h = 28;
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - ((p - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function KpiCard({ icon: Icon, label, value, isMoney, sub, delta, spark, gradient, sparkStroke, delay }) {
  const animated = useCountUp(value);
  const display = isMoney
    ? Math.abs(value) >= 100000
      ? inrCompact(animated)
      : inr(animated, { decimals: 0 })
    : Math.round(animated).toLocaleString("en-IN");

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className={`group relative overflow-hidden rounded-[18px] border border-white/25 p-2 text-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_80px_-34px_rgba(15,23,42,0.62)] ${gradient}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl transition-all duration-500 group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-white/75">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tracking-tight" title={isMoney ? inr(value) : undefined}>
            {display}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 backdrop-blur">
          <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
        </div>
      </div>
      <div className="relative flex items-end justify-between gap-2">
        <div className="min-w-0">
          {delta !== null && delta !== undefined ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                delta >= 0 ? "bg-white/20 text-white" : "bg-black/20 text-white/90"
              }`}
            >
              <TrendingUp className={`h-3 w-3 ${delta < 0 ? "rotate-180" : ""}`} />
              {Math.abs(delta).toFixed(1)}% vs last month
            </span>
          ) : (
            <span className="text-[11px] text-white/70">{sub}</span>
          )}
        </div>
        <Sparkline points={spark} stroke={sparkStroke} />
      </div>
    </motion.div>
  );
}

export default function KpiCards({ dashboard }) {
  const k = dashboard?.kpis || {};
  const monthly = dashboard?.monthly || [];
  const totalsSpark = monthly.map((m) => Number(m.total));
  const gstSpark = monthly.map((m) => Number(m.gst));
  const billsSpark = monthly.map((m) => Number(m.bills));

  const monthDelta =
    Number(k.prev_month_purchase) > 0
      ? ((Number(k.month_purchase) - Number(k.prev_month_purchase)) / Number(k.prev_month_purchase)) * 100
      : null;

  const cards = [
    { icon: BadgeIndianRupee, label: "Total Purchase", value: Number(k.total_purchase), isMoney: true, sub: `${k.total_bills || 0} bills`, spark: totalsSpark, gradient: "bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600", sparkStroke: "#e9d5ff" },
    { icon: CalendarDays, label: "Today's Purchase", value: Number(k.today_purchase), isMoney: true, sub: `${k.today_bills || 0} bills today`, spark: totalsSpark.slice(-6), gradient: "bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500", sparkStroke: "#bae6fd" },
   // { icon: CalendarClock, label: "This Month", value: Number(k.month_purchase), isMoney: true, delta: monthDelta, spark: totalsSpark, gradient: "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600", sparkStroke: "#c7d2fe" },
    { icon: FileClock, label: "Pending Bills", value: Number(k.pending_bills), sub: `${inrCompact(k.pending_amount)} outstanding`, spark: billsSpark, gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500", sparkStroke: "#fde68a" },
    { icon: FileCheck2, label: "Paid Bills", value: Number(k.paid_bills), sub: `${inrCompact(k.paid_amount)} settled`, spark: billsSpark, gradient: "bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600", sparkStroke: "#a7f3d0" },
    { icon: Clock4, label: "Overdue Bills", value: Number(k.overdue_bills), sub: `${inrCompact(k.overdue_amount)} overdue`, spark: billsSpark, gradient: "bg-gradient-to-br from-rose-600 via-red-600 to-orange-600", sparkStroke: "#fecdd3" },
   // { icon: Landmark, label: "GST Input Credit", value: Number(k.gst_input_credit), isMoney: true, sub: `${inrCompact(k.month_gst)} this month`, spark: gstSpark, gradient: "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600", sparkStroke: "#e9d5ff" },
    { icon: UsersRound, label: "Total Vendors", value: Number(k.total_vendors), sub: "active suppliers", spark: billsSpark, gradient: "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900", sparkStroke: "#cbd5e1" },
   // { icon: TrendingUp, label: "Avg Purchase Value", value: Number(k.avg_purchase_value), isMoney: true, sub: "per bill", spark: totalsSpark, gradient: "bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-600", sparkStroke: "#a5f3fc" },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-6">
      {cards.map((c, i) => (
        <KpiCard key={c.label} {...c} delay={i * 0.05} />
      ))}
    </div>
  );
}
