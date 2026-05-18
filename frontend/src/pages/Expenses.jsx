import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  ArrowUpRight,
  BadgeIndianRupee,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  CircleEllipsis,
  Download,
  Eye,
  FileStack,
  Filter,
  MapPin,
  MoreHorizontal,
  PencilLine,
  Receipt,
  Search,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { BASE_URL } from "../utils/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const ALL_COLUMNS = {
  expenseId: "Expense ID",
  date: "Date",
  vendor: "Vendor",
  purchasePerson: "Purchase Person",
  place: "Place of Purchase",
  paidThrough: "Paid Through",
  total: "Total Amount",
  paid: "Paid",
  pending: "Pending",
  status: "Status",
};

const statusToneMap = {
  PAID: {
    pill: "border-emerald-200/80 bg-emerald-50/90 text-emerald-700 shadow-[0_12px_30px_-20px_rgba(16,185,129,0.9)]",
    dot: "bg-emerald-500",
  },
  PARTIAL: {
    pill: "border-amber-200/80 bg-amber-50/90 text-amber-700 shadow-[0_12px_30px_-20px_rgba(245,158,11,0.9)]",
    dot: "bg-amber-500",
  },
  UNPAID: {
    pill: "border-rose-200/80 bg-rose-50/90 text-rose-700 shadow-[0_12px_30px_-20px_rgba(244,63,94,0.75)]",
    dot: "bg-rose-500",
  },
};

const pageTransition = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
}

function getStatusMeta(statusValue) {
  const key = (statusValue || "Unpaid").toUpperCase().trim();
  return {
    key,
    label: key.charAt(0) + key.slice(1).toLowerCase(),
    ...(statusToneMap[key] || statusToneMap.UNPAID),
  };
}

function Sparkline({ values, stroke, fill }) {
  const width = 160;
  const height = 56;
  const safeValues = values.length ? values : [0];
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = max - min || 1;
  const stepX = safeValues.length > 1 ? width / (safeValues.length - 1) : width;

  const points = safeValues
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full">
      <defs>
        <linearGradient id={`fill-${stroke.replace(/[^a-z0-9]/gi, "")}`} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill={`url(#fill-${stroke.replace(/[^a-z0-9]/gi, "")})`} points={areaPoints} />
      <polyline
        fill="none"
        points={points}
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SummaryCard({ title, value, subtitle, icon, accent, chartValues }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl"
    >
      <div className={`absolute inset-x-6 top-0 h-24 rounded-full blur-3xl ${accent}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-slate-700 shadow-[0_10px_30px_-16px_rgba(99,102,241,0.65)]">
          {icon}
        </div>
      </div>
      <div className="relative mt-5 rounded-2xl border border-slate-100/80 bg-slate-50/80 px-3 py-2">
        <Sparkline values={chartValues} stroke="#6366f1" fill="#818cf8" />
      </div>
    </motion.div>
  );
}

function StatusPill({ status }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${meta.pill}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot} animate-pulse`} />
      {meta.label}
    </span>
  );
}

function ActionIconButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.28)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:text-slate-900 ${className}`}
    >
      {children}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5 md:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-40 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.18)]"
          >
            <div className="skeleton-shimmer h-full rounded-[22px]" />
          </div>
        ))}
      </div>
      <div className="rounded-[32px] border border-white/70 bg-white/75 p-5 shadow-[0_20px_70px_-26px_rgba(15,23,42,0.2)]">
        <div className="skeleton-shimmer h-14 rounded-2xl" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-shimmer h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [openRowMenu, setOpenRowMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("expense_columns");
    return saved ? JSON.parse(saved) : Object.keys(ALL_COLUMNS);
  });

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenRowMenu(null);
    };

    if (openRowMenu !== null) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [openRowMenu]);

  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/expenses`)
      .then((res) => setExpenses(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const deleteExpense = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/api/expenses/${id}`);
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const exportSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one expense");
      return;
    }

    try {
      let exportRows = [];

      for (let id of selectedIds) {
        const res = await axios.get(`${BASE_URL}/api/expenses/${id}`);
        const expense = res.data;

        if (expense.ExpenseItems && expense.ExpenseItems.length > 0) {
          expense.ExpenseItems.forEach((item) => {
            exportRows.push({
              Date: new Date(expense.date).toLocaleDateString("en-GB"),
              Vendor: expense.vendorName,
              "Purchase Person": expense.purchasePersonName,
              Place: expense.place,
              "Paid Through": expense.paidThrough,
              Item: item.notes,
              "Item Amount": item.amount,
              "Total Amount": expense.totalAfterGst,
              Paid: expense.amountPaid,
              Pending: expense.amountPending,
              Status: expense.status,
            });
          });
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const fileData = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(fileData, "Expenses_With_Items.xlsx");
    } catch (error) {
      console.error(error);
      alert("Export failed");
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowMenu(false);
    };

    if (showMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMenu]);

  const toggleColumn = (key) => {
    const updated = columns.includes(key)
      ? columns.filter((column) => column !== key)
      : [...columns, key];

    setColumns(updated);
    localStorage.setItem("expense_columns", JSON.stringify(updated));
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesMonth = !monthFilter || expense.date.slice(0, 7) === monthFilter;
    const matchesSearch =
      !search ||
      expense.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
      expense.purchasePersonName?.toLowerCase().includes(search.toLowerCase()) ||
      `exp-${expense.id}`.includes(search.toLowerCase());

    return matchesMonth && matchesSearch;
  });

  const analytics = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.totalAfterGst || 0), 0);
    const totalPaid = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amountPaid || 0), 0);
    const totalPending = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amountPending || 0), 0);
    const monthlyExpenses = filteredExpenses
      .filter((expense) => expense.date)
      .reduce((acc, expense) => {
        const key = expense.date.slice(0, 7);
        acc[key] = (acc[key] || 0) + Number(expense.totalAfterGst || 0);
        return acc;
      }, {});

    const monthlyKeys = Object.keys(monthlyExpenses).sort();
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentMonthExpenses = monthlyExpenses[currentMonthKey] || 0;

    const transactionSeries = filteredExpenses
      .slice()
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
      .slice(-7)
      .map((expense) => Number(expense.totalAfterGst || 0));

    const pendingRatio = totalExpenses > 0 ? Math.round((totalPending / totalExpenses) * 100) : 0;

    return {
      totalExpenses,
      totalPaid,
      totalPending,
      currentMonthExpenses,
      totalRecords: filteredExpenses.length,
      recentTransactions: filteredExpenses.slice(0, 3),
      transactionSeries,
      monthlySeries: monthlyKeys.slice(-7).map((key) => monthlyExpenses[key]),
      paidSeries: filteredExpenses.slice(0, 7).map((expense) => Number(expense.amountPaid || 0)).reverse(),
      pendingSeries: filteredExpenses.slice(0, 7).map((expense) => Number(expense.amountPending || 0)).reverse(),
      pendingRatio,
    };
  }, [filteredExpenses]);

  const menuItems = [
    { label: "Sort by", action: () => {} },
    { label: "Import", action: () => {} },
    {
      label: "Export",
      action: () => {
        exportSelected();
        setShowMenu(false);
      },
    },
    { label: "Refresh List", action: () => {} },
  ];

  return (
    <motion.div
      {...pageTransition}
      className="relative min-h-[82vh] overflow-hidden rounded-[34px] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(248,250,252,0.88)_100%)] p-4 shadow-[0_35px_120px_-35px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6 lg:p-8"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-44 w-44 rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-10 right-20 h-40 w-40 rounded-full bg-violet-200/30 blur-3xl" />
      </div>

      <div className="relative">
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 shadow-[0_16px_40px_-24px_rgba(99,102,241,0.8)]">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              Expense Control Center
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Expenses</h2>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur">
                  <FileStack className="h-4 w-4 text-indigo-500" />
                  {analytics.totalRecords} records
                </div>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                Track every vendor payment, monitor pending balances, and review expense activity from one refined workspace.
              </p>
            </div>
          </div>

          <div className="relative flex flex-wrap gap-3">
            <Link
              to="/expenses/add"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/50 bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_24px_40px_-20px_rgba(79,70,229,0.8)] transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_30px_50px_-20px_rgba(79,70,229,0.9)]"
            >
              <Receipt className="h-4 w-4 transition group-hover:rotate-6" />
              Add Expense
            </Link>

            <ActionIconButton
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="rounded-2xl"
            >
              <CircleEllipsis className="h-5 w-5" />
            </ActionIconButton>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-[24px] border border-white/70 bg-white/88 p-2 shadow-[0_30px_70px_-30px_rgba(15,23,42,0.45)] backdrop-blur-2xl"
                >
                  <div className="mb-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">View preferences</p>
                    <p className="mt-1 text-sm text-slate-600">Pick visible columns for your expense grid.</p>
                  </div>

                  <div className="mb-2 space-y-1">
                    {Object.entries(ALL_COLUMNS).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-2.5 transition hover:bg-slate-50"
                      >
                        <span className="text-sm font-medium text-slate-600">{label}</span>
                        <input
                          type="checkbox"
                          checked={columns.includes(key)}
                          onChange={() => toggleColumn(key)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="h-px bg-slate-200/80" />

                  <div className="mt-2 space-y-1">
                    {menuItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        {item.label}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                title="Total Expenses"
                value={formatCurrency(analytics.totalExpenses)}
                subtitle="Aggregate spend across the filtered list"
                icon={<BadgeIndianRupee className="h-5 w-5 text-indigo-600" />}
                accent="bg-indigo-300/30"
                chartValues={analytics.monthlySeries}
              />
              <SummaryCard
                title="Paid Amount"
                value={formatCurrency(analytics.totalPaid)}
                subtitle="Cleared payouts already settled"
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                accent="bg-emerald-300/30"
                chartValues={analytics.paidSeries}
              />
              <SummaryCard
                title="Pending Amount"
                value={formatCurrency(analytics.totalPending)}
                subtitle={`${analytics.pendingRatio}% of total spend remains open`}
                icon={<WalletCards className="h-5 w-5 text-rose-600" />}
                accent="bg-rose-300/30"
                chartValues={analytics.pendingSeries}
              />
              <SummaryCard
                title="Monthly Expenses"
                value={formatCurrency(analytics.currentMonthExpenses)}
                subtitle="Current month outflow snapshot"
                icon={<CalendarRange className="h-5 w-5 text-sky-600" />}
                accent="bg-sky-300/30"
                chartValues={analytics.monthlySeries}
              />
              <motion.div
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl"
              >
                <div className="absolute inset-x-6 top-0 h-24 rounded-full bg-violet-300/20 blur-3xl" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Recent Transactions</p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{analytics.recentTransactions.length}</p>
                      <p className="mt-2 text-sm text-slate-500">Latest vendor activity at a glance</p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-violet-600 shadow-[0_10px_30px_-16px_rgba(139,92,246,0.65)]">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {analytics.recentTransactions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                        No transactions available in this view.
                      </div>
                    ) : (
                      analytics.recentTransactions.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-100/80 bg-slate-50/80 px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-700">{expense.vendorName || `EXP-${String(expense.id).padStart(3, "0")}`}</p>
                            <p className="text-xs text-slate-500">{formatDate(expense.date)}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(expense.totalAfterGst)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="mb-6 rounded-[28px] border border-white/70 bg-white/72 p-4 shadow-[0_20px_70px_-28px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:p-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="group relative block w-full sm:w-auto">
                    <CalendarRange className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-500" />
                    <input
                      type="month"
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="h-12 w-full rounded-full border border-white/70 bg-white/80 pl-11 pr-4 text-sm text-slate-700 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.22)] outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 sm:w-[220px]"
                    />
                  </label>

                  <label className="group relative block w-full xl:w-[360px]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-500" />
                    <input
                      type="text"
                      placeholder="Search by expense ID, vendor or person..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-12 w-full rounded-full border border-white/70 bg-white/80 pl-11 pr-4 text-sm text-slate-700 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.22)] outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/85 px-4 py-2 text-sm font-medium text-slate-600">
                    <Filter className="h-4 w-4 text-indigo-500" />
                    {filteredExpenses.length} matching expenses
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/85 px-4 py-2 text-sm font-medium text-slate-600">
                    <Download className="h-4 w-4 text-violet-500" />
                    {selectedIds.length} selected
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/70 bg-white/72 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Expense Ledger</p>
                  <p className="text-xs text-slate-500">A polished operational view for finance and admin teams.</p>
                </div>
                <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-500 sm:inline-flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live overview
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="relative overflow-hidden px-6 py-16 text-center">
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/2 top-8 h-48 w-48 -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
                    <div className="absolute bottom-8 left-12 h-28 w-28 rounded-full bg-sky-200/30 blur-2xl" />
                    <div className="absolute right-12 top-12 h-28 w-28 rounded-full bg-violet-200/30 blur-2xl" />
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="relative mx-auto max-w-xl"
                  >
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/80 bg-white/80 shadow-[0_25px_60px_-24px_rgba(79,70,229,0.35)]">
                      <Receipt className="h-10 w-10 text-indigo-500" />
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">No expenses found</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Try adjusting your month or search filters, or create a new expense to start building this ledger.
                    </p>
                    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <Link
                        to="/expenses/add"
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_24px_40px_-20px_rgba(79,70,229,0.8)] transition hover:-translate-y-0.5"
                      >
                        <Receipt className="h-4 w-4" />
                        Create first expense
                      </Link>
                      <button
                        onClick={() => {
                          setMonthFilter("");
                          setSearch("");
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                      >
                        <Search className="h-4 w-4" />
                        Reset filters
                      </button>
                    </div>
                  </motion.div>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto xl:block">
                    <table className="w-full min-w-[1280px] border-separate border-spacing-0 text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50/90">
                          <th className="border-b border-slate-200/70 px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(filteredExpenses.map((expense) => expense.id));
                                } else {
                                  setSelectedIds([]);
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          {columns.includes("expenseId") && <th className="border-b border-slate-200/70 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Expense ID</th>}
                          {columns.includes("date") && <th className="border-b border-slate-200/70 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Date</th>}
                          {columns.includes("vendor") && <th className="border-b border-slate-200/70 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Vendor</th>}
                          {columns.includes("purchasePerson") && <th className="border-b border-slate-200/70 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Purchase Person</th>}
                          {columns.includes("place") && <th className="border-b border-slate-200/70 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Place</th>}
                          {columns.includes("paidThrough") && <th className="border-b border-slate-200/70 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Paid Through</th>}
                          {columns.includes("total") && <th className="border-b border-slate-200/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Total</th>}
                          {columns.includes("paid") && <th className="border-b border-slate-200/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Paid</th>}
                          {columns.includes("pending") && <th className="border-b border-slate-200/70 px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Pending</th>}
                          {columns.includes("status") && <th className="border-b border-slate-200/70 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Status</th>}
                          <th className="border-b border-slate-200/70 px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((expense, index) => {
                          const total = Number(expense.totalAfterGst || 0);
                          const paid = Number(expense.amountPaid || 0);
                          const pending = Number(expense.amountPending || 0);

                          return (
                            <motion.tr
                              key={expense.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.02, duration: 0.22 }}
                              onClick={async () => {
                                try {
                                  const res = await axios.get(`${BASE_URL}/api/expenses/${expense.id}`);
                                  setSelectedExpense(res.data);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="group cursor-pointer transition duration-200 hover:bg-white/55"
                            >
                              <td
                                className="border-b border-slate-100/90 px-4 py-4 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(expense.id)}
                                  onChange={(event) => {
                                    if (event.target.checked) {
                                      setSelectedIds([...selectedIds, expense.id]);
                                    } else {
                                      setSelectedIds(selectedIds.filter((id) => id !== expense.id));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>

                              {columns.includes("expenseId") && (
                                <td className="border-b border-slate-100/90 px-4 py-4">
                                  <div className="inline-flex rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 font-semibold text-slate-700 shadow-sm">
                                    EXP-{String(expense.id).padStart(3, "0")}
                                  </div>
                                </td>
                              )}

                              {columns.includes("date") && <td className="border-b border-slate-100/90 px-4 py-4 text-slate-600">{formatDate(expense.date)}</td>}
                              {columns.includes("vendor") && <td className="border-b border-slate-100/90 px-4 py-4 font-medium text-slate-800">{expense.vendorName || "-"}</td>}
                              {columns.includes("purchasePerson") && <td className="border-b border-slate-100/90 px-4 py-4 text-slate-600">{expense.purchasePersonName || "-"}</td>}
                              {columns.includes("place") && <td className="border-b border-slate-100/90 px-4 py-4 text-slate-600">{expense.place || "-"}</td>}
                              {columns.includes("paidThrough") && <td className="border-b border-slate-100/90 px-4 py-4 text-slate-600">{expense.paidThrough}</td>}
                              {columns.includes("total") && <td className="border-b border-slate-100/90 px-4 py-4 text-right font-semibold text-slate-900">{formatCurrency(total)}</td>}
                              {columns.includes("paid") && <td className="border-b border-slate-100/90 px-4 py-4 text-right"><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{formatCurrency(paid)}</span></td>}
                              {columns.includes("pending") && <td className="border-b border-slate-100/90 px-4 py-4 text-right"><span className="inline-flex rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">{formatCurrency(pending)}</span></td>}
                              {columns.includes("status") && (
                                <td className="border-b border-slate-100/90 px-4 py-4">
                                  <StatusPill status={expense.status} />
                                </td>
                              )}

                              <td
                                className="border-b border-slate-100/90 px-4 py-4 text-center"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <ActionIconButton
                                    onClick={async () => {
                                      try {
                                        const res = await axios.get(`${BASE_URL}/api/expenses/${expense.id}`);
                                        setSelectedExpense(res.data);
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    className="hover:border-sky-200 hover:text-sky-600"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </ActionIconButton>

                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      const rect = event.currentTarget.getBoundingClientRect();

                                      setMenuPosition({
                                        top: rect.bottom + window.scrollY,
                                        left: rect.left + window.scrollX,
                                      });

                                      setOpenRowMenu(openRowMenu === expense.id ? null : expense.id);
                                    }}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.28)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 p-4 xl:hidden">
                    {filteredExpenses.map((expense, index) => {
                      const total = Number(expense.totalAfterGst || 0);
                      const paid = Number(expense.amountPaid || 0);
                      const pending = Number(expense.amountPending || 0);

                      return (
                        <motion.div
                          key={expense.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.22 }}
                          onClick={async () => {
                            try {
                              const res = await axios.get(`${BASE_URL}/api/expenses/${expense.id}`);
                              setSelectedExpense(res.data);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="rounded-[26px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="inline-flex rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                                EXP-{String(expense.id).padStart(3, "0")}
                              </div>
                              <p className="mt-3 text-base font-semibold text-slate-900">{expense.vendorName || "-"}</p>
                              <p className="mt-1 text-sm text-slate-500">{formatDate(expense.date)}</p>
                            </div>
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(expense.id)}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setSelectedIds([...selectedIds, expense.id]);
                                  } else {
                                    setSelectedIds(selectedIds.filter((id) => id !== expense.id));
                                  }
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const rect = event.currentTarget.getBoundingClientRect();

                                  setMenuPosition({
                                    top: rect.bottom + window.scrollY,
                                    left: rect.left + window.scrollX,
                                  });

                                  setOpenRowMenu(openRowMenu === expense.id ? null : expense.id);
                                }}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-sm"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50/80 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Purchase Person</p>
                              <p className="mt-2 text-sm font-medium text-slate-700">{expense.purchasePersonName || "-"}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50/80 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Place</p>
                              <p className="mt-2 text-sm font-medium text-slate-700">{expense.place || "-"}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50/80 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Paid Through</p>
                              <p className="mt-2 text-sm font-medium text-slate-700">{expense.paidThrough || "-"}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50/80 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                              <div className="mt-2">
                                <StatusPill status={expense.status} />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">Total</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(total)}</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Paid</p>
                              <p className="mt-2 text-sm font-semibold text-emerald-700">{formatCurrency(paid)}</p>
                            </div>
                            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-rose-400">Pending</p>
                              <p className="mt-2 text-sm font-semibold text-rose-700">{formatCurrency(pending)}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-end">
                            <ActionIconButton
                              onClick={async (event) => {
                                event.stopPropagation();
                                try {
                                  const res = await axios.get(`${BASE_URL}/api/expenses/${expense.id}`);
                                  setSelectedExpense(res.data);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="hover:border-sky-200 hover:text-sky-600"
                            >
                              <Eye className="h-4 w-4" />
                            </ActionIconButton>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <AnimatePresence>
          {openRowMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.18 }}
              className="fixed z-[9999] w-44 overflow-hidden rounded-[24px] border border-white/80 bg-white/92 p-2 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.42)] backdrop-blur-2xl"
              style={{
                top: menuPosition.top,
                left: menuPosition.left - 150,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to={`/expenses/edit/${openRowMenu}`}
                className="flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50/80"
              >
                <PencilLine className="h-4 w-4" />
                Edit
              </Link>

              <button
                onClick={async () => {
                  try {
                    const res = await axios.get(`${BASE_URL}/api/expenses/${openRowMenu}`);
                    setSelectedExpense(res.data);
                    setOpenRowMenu(null);
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-medium text-sky-600 transition hover:bg-sky-50/80"
              >
                <Eye className="h-4 w-4" />
                View
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Delete this expense?")) {
                    deleteExpense(openRowMenu);
                    setOpenRowMenu(null);
                  }
                }}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50/80"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedExpense && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExpense(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                onClick={(e) => e.stopPropagation()}
                className="responsive-modal-panel w-full max-w-6xl rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,250,252,0.94)_100%)] p-5 shadow-[0_35px_100px_-30px_rgba(15,23,42,0.45)] sm:p-6 lg:p-8"
              >
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
                      <Receipt className="h-3.5 w-3.5" />
                      Expense Details
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                      EXP-{String(selectedExpense.id).padStart(3, "0")}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">Detailed payment, vendor, and item breakdown.</p>
                  </div>

                  <button
                    onClick={() => setSelectedExpense(null)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-500 shadow-sm transition hover:text-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-[24px] border border-slate-100 bg-white/80 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)]">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-600">
                            <CalendarRange className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Date</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{selectedExpense.date || "-"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-slate-100 bg-white/80 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)]">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-600">
                            <WalletCards className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Paid Through</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{selectedExpense.paidThrough || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-[24px] border border-slate-100 bg-white/80 p-5">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Vendor</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{selectedExpense.vendorName || "-"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-slate-100 bg-white/80 p-5">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-violet-50 p-2.5 text-violet-600">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Purchase Person</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{selectedExpense.purchasePersonName || "-"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-slate-100 bg-white/80 p-5">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-600">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Place</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{selectedExpense.place || "-"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-slate-100 bg-white/80 p-5">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-600">
                            <FileStack className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Invoice No</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{selectedExpense.invoiceNo || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-semibold text-slate-800">Notes</p>
                      <div className="rounded-[24px] border border-slate-100 bg-white/75 p-5 text-sm leading-6 text-slate-600">
                        {selectedExpense.notes || "No notes available"}
                      </div>
                    </div>

                    {selectedExpense.ExpenseItems && selectedExpense.ExpenseItems.length > 0 && (
                      <div>
                        <p className="mb-3 text-sm font-semibold text-slate-800">Items</p>
                        <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white/80">
                          {selectedExpense.ExpenseItems.map((item, index) => (
                            <div
                              key={index}
                              className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                            >
                              <div className="max-w-[75%]">
                                <p className="text-sm font-semibold text-slate-800">
                                  {item.category?.name || item.account?.name || item.categoryName || "Account"}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">{item.notes || "-"}</p>
                              </div>
                              <div className="rounded-full bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800">
                                {formatCurrency(item.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[28px] border border-white/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-[0_28px_70px_-30px_rgba(15,23,42,0.8)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Amount Summary</p>
                      <p className="mt-4 text-3xl font-semibold tracking-tight">{formatCurrency(selectedExpense.totalAfterGst)}</p>
                      <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                          <span className="text-sm text-slate-300">Amount Paid</span>
                          <span className="text-sm font-semibold text-emerald-300">{formatCurrency(selectedExpense.amountPaid)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                          <span className="text-sm text-slate-300">Amount Pending</span>
                          <span className="text-sm font-semibold text-rose-300">{formatCurrency(selectedExpense.amountPending)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                          <span className="text-sm text-slate-300">Status</span>
                          <StatusPill status={selectedExpense.status} />
                        </div>
                      </div>
                    </div>

                    {selectedExpense.receiptImage && (
                      <div className="rounded-[24px] border border-slate-100 bg-white/80 p-5">
                        <p className="mb-3 text-sm font-semibold text-slate-800">Receipt Image</p>
                        <img
                          src={`${BASE_URL}/uploads/${selectedExpense.receiptImage}`}
                          alt="receipt"
                          className="max-h-72 w-full rounded-[20px] border border-slate-100 object-cover"
                        />
                      </div>
                    )}

                    {selectedExpense.invoicePdf && (
                      <div className="rounded-[24px] border border-slate-100 bg-white/80 p-5">
                        <p className="mb-3 text-sm font-semibold text-slate-800">Invoice PDF</p>
                        <a
                          href={`${BASE_URL}/uploads/${selectedExpense.invoicePdf}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                        >
                          <Eye className="h-4 w-4" />
                          View Invoice PDF
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
