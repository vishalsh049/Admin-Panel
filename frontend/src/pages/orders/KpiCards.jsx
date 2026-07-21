import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeIndianRupee, CalendarDays, Clock4, PackageCheck, PauseCircle, ShoppingBag, Truck, Wallet,
} from "lucide-react";
import { inr, inrCompact } from "./constants";

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

function KpiCard({ icon: Icon, label, value, isMoney, sub, spark, gradient, sparkStroke, delay }) {
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
      className={`group relative overflow-hidden rounded-[18px] border border-white/25 p-2 text-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_80px_-34px_rgba(15,23,42,0.62)] dark:border-white/10 ${gradient}`}
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
          <Icon style={{ width: 18, height: 18 }} />
        </div>
      </div>
      <div className="relative flex items-end justify-between gap-2">
        <span className="text-[11px] text-white/70">{sub}</span>
        <Sparkline points={spark} stroke={sparkStroke} />
      </div>
    </motion.div>
  );
}

export default function KpiCards({ stats }) {
  const k = stats?.kpis || {};
  const monthly = stats?.monthly || [];
  const totalsSpark = monthly.map((m) => Number(m.total));
  const ordersSpark = monthly.map((m) => Number(m.orders));

  const cards = [
    { icon: BadgeIndianRupee, label: "Revenue", value: Number(k.total_revenue), isMoney: true, sub: `${k.total_orders || 0} orders`, spark: totalsSpark, gradient: "bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600", sparkStroke: "#e9d5ff" },
    { icon: CalendarDays, label: "Today", value: Number(k.today_orders), sub: `${inrCompact(k.today_revenue)} today`, spark: ordersSpark.slice(-6), gradient: "bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500", sparkStroke: "#bae6fd" },
    { icon: ShoppingBag, label: "Pending", value: Number(k.pending_orders), sub: "awaiting action", spark: ordersSpark, gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500", sparkStroke: "#fde68a" },
    { icon: Truck, label: "Shipped", value: Number(k.shipped_orders), sub: "in transit", spark: ordersSpark, gradient: "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600", sparkStroke: "#e9d5ff" },
    { icon: PackageCheck, label: "Delivered", value: Number(k.delivered_orders), sub: "completed", spark: ordersSpark, gradient: "bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600", sparkStroke: "#a7f3d0" },
    { icon: Wallet, label: "Pending COD", value: Number(k.pending_cod_count), sub: `${inrCompact(k.pending_cod_amount)} to collect`, spark: ordersSpark, gradient: "bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-600", sparkStroke: "#a5f3fc" },
    { icon: PauseCircle, label: "On Hold", value: Number(k.on_hold_orders), sub: "needs attention", spark: ordersSpark, gradient: "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900", sparkStroke: "#cbd5e1" },
    { icon: Clock4, label: "Requests", value: Number(k.open_requests), sub: "return/exchange/refund", spark: ordersSpark, gradient: "bg-gradient-to-br from-rose-600 via-red-600 to-orange-600", sparkStroke: "#fecdd3" },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {cards.map((c, i) => (
        <KpiCard key={c.label} {...c} delay={i * 0.05} />
      ))}
    </div>
  );
}
