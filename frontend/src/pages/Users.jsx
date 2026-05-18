import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Gauge,
  LockKeyhole,
  MoreHorizontal,
  PencilLine,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  X,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { BASE_URL } from "../utils/api";

const DEFAULT_NEW_USER = {
  name: "",
  email: "",
  password: "",
  role: "sales",
};

const STANDARD_ROLES = ["admin", "sales", "inventory", "accounts"];
const PAGE_SIZE = 8;

const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    tone: "from-violet-500/20 via-fuchsia-500/15 to-indigo-500/20",
    chip: "bg-violet-500/12 text-violet-700 ring-violet-200/70",
  },
  sales: {
    label: "Sales",
    icon: UsersIcon,
    tone: "from-sky-500/20 via-cyan-500/15 to-teal-500/20",
    chip: "bg-sky-500/12 text-sky-700 ring-sky-200/70",
  },
  inventory: {
    label: "Inventory",
    icon: Gauge,
    tone: "from-emerald-500/20 via-teal-500/15 to-lime-500/20",
    chip: "bg-emerald-500/12 text-emerald-700 ring-emerald-200/70",
  },
  accounts: {
    label: "Accounts",
    icon: Activity,
    tone: "from-amber-500/20 via-orange-500/15 to-rose-500/20",
    chip: "bg-amber-500/12 text-amber-700 ring-amber-200/70",
  },
  custom: {
    label: "Custom",
    icon: Sparkles,
    tone: "from-slate-500/20 via-slate-400/15 to-slate-300/20",
    chip: "bg-slate-500/12 text-slate-700 ring-slate-200/70",
  },
};

const ROLE_GRADIENTS = [
  "from-violet-500/20 via-fuchsia-500/15 to-indigo-500/20",
  "from-sky-500/20 via-cyan-500/15 to-blue-500/20",
  "from-emerald-500/20 via-teal-500/15 to-lime-500/20",
  "from-amber-500/20 via-orange-500/15 to-rose-500/20",
  "from-pink-500/20 via-rose-500/15 to-fuchsia-500/20",
  "from-slate-500/20 via-zinc-400/15 to-slate-300/20",
];

function hashString(value = "") {
  return Array.from(String(value)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function toTitleCase(value = "") {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDisplayName(user) {
  return user?.name?.trim() || user?.email?.split("@")[0] || "User";
}

function getInitial(user) {
  return (getDisplayName(user).charAt(0) || "U").toUpperCase();
}

function getStatusValue(user) {
  const raw = user?.status ?? user?.isActive ?? user?.active ?? "active";
  if (typeof raw === "boolean") return raw ? "active" : "inactive";
  const normalized = String(raw).toLowerCase();
  return ["inactive", "disabled", "blocked", "false", "no", "0"].includes(normalized)
    ? "inactive"
    : "active";
}

function isActiveUser(user) {
  return getStatusValue(user) === "active";
}

function getRoleKey(role) {
  const normalized = String(role || "").toLowerCase();
  return ROLE_CONFIG[normalized] ? normalized : "custom";
}

function getRoleMeta(role) {
  const normalized = String(role || "").toLowerCase();
  const preset = ROLE_CONFIG[normalized];
  if (preset) return preset;

  const gradientIndex = hashString(normalized) % ROLE_GRADIENTS.length;
  return {
    label: toTitleCase(role || "Custom"),
    icon: Sparkles,
    tone: ROLE_GRADIENTS[gradientIndex],
    chip: "bg-slate-500/12 text-slate-700 ring-slate-200/70",
  };
}

function getSearchableText(user) {
  return [user?.name, user?.email, user?.role, user?.id, getStatusValue(user)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="h-5 w-40 rounded-full skeleton-shimmer" />
            <div className="h-11 w-64 rounded-2xl skeleton-shimmer" />
            <div className="h-4 w-[28rem] max-w-full rounded-full skeleton-shimmer" />
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-[18rem] max-w-full rounded-2xl skeleton-shimmer" />
            <div className="h-12 w-12 rounded-2xl skeleton-shimmer" />
            <div className="h-12 w-40 rounded-2xl skeleton-shimmer" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[26px] border border-white/70 bg-white/65 p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.22)]"
            >
              <div className="h-3 w-24 rounded-full skeleton-shimmer" />
              <div className="mt-4 h-9 w-24 rounded-xl skeleton-shimmer" />
              <div className="mt-4 h-2 w-full rounded-full skeleton-shimmer" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/70 bg-white/65 p-5 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.26)] backdrop-blur-xl">
        <div className="h-5 w-52 rounded-full skeleton-shimmer" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((__, colIndex) => (
                <div key={colIndex} className="h-16 rounded-[20px] skeleton-shimmer" />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RoleChip({ role }) {
  const meta = getRoleMeta(role);
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${meta.chip} shadow-[0_10px_25px_-18px_rgba(15,23,42,0.22)] transition duration-300 hover:-translate-y-0.5`}
    >
      <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${meta.tone} text-slate-800`}>
        <Icon className="h-3 w-3" />
      </span>
      {meta.label}
    </span>
  );
}

function StatusChip({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ring-1 ring-inset shadow-[0_10px_25px_-18px_rgba(15,23,42,0.18)] transition duration-300 ${
        active
          ? "border-emerald-200/70 bg-emerald-500/10 text-emerald-700 ring-emerald-200/70"
          : "border-slate-200/70 bg-slate-500/10 text-slate-600 ring-slate-200/70"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          active ? "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" : "bg-slate-400"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function TableCellAvatar({ user }) {
  const initial = getInitial(user);
  const gradientIndex = hashString(String(user?.id || user?.email || user?.name || "")) % 6;
  const palette = [
    "from-violet-500 to-fuchsia-500",
    "from-sky-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-slate-600 to-slate-400",
  ];
  const gradient = palette[gradientIndex];

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-[0_14px_28px_-16px_rgba(15,23,42,0.35)] ring-2 ring-white">
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient}`} />
      <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
      <span className="relative text-sm font-semibold text-white">{initial}</span>
    </div>
  );
}

function FloatingField({ label, type = "text", value, onChange, placeholder, autoComplete, rightSlot }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="relative">
      <input
        type={inputType}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder=" "
        className="peer w-full rounded-2xl border border-white/70 bg-white/70 px-4 pb-3 pt-6 text-sm text-slate-900 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] outline-none transition duration-300 placeholder-transparent focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
      />
      <label className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all duration-200 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-500 peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:tracking-[0.18em] peer-focus:text-violet-600 peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:-translate-y-0 peer-not-placeholder-shown:text-[11px] peer-not-placeholder-shown:font-semibold peer-not-placeholder-shown:tracking-[0.18em] peer-not-placeholder-shown:text-slate-500">
        {label}
      </label>
      {placeholder ? (
        <span className="pointer-events-none absolute bottom-2 left-4 text-[11px] text-slate-400">
          {placeholder}
        </span>
      ) : null}
      {isPassword ? (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      ) : rightSlot ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
      ) : null}
    </div>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="peer w-full appearance-none rounded-2xl border border-white/70 bg-white/70 px-4 pb-3 pt-6 text-sm text-slate-900 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] outline-none transition duration-300 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
      >
        {children}
      </select>
      <label className="pointer-events-none absolute left-4 top-3 text-[11px] font-semibold tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function MiniGraph() {
  const bars = [32, 45, 54, 38, 68, 58, 74, 82];
  return (
    <div className="flex h-20 items-end gap-2 rounded-2xl border border-white/70 bg-gradient-to-b from-white/80 to-slate-50/70 p-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.22)]">
      {bars.map((height, index) => (
        <div key={index} className="flex h-full flex-1 items-end">
          <div
            className="w-full rounded-t-full bg-gradient-to-t from-violet-500 via-fuchsia-500 to-indigo-400 shadow-[0_12px_26px_-14px_rgba(91,79,207,0.55)] transition-all duration-300 hover:scale-y-110"
            style={{ height: `${height}%`, opacity: 0.58 + index * 0.04 }}
          />
        </div>
      ))}
    </div>
  );
}

function CircularProgress({ value }) {
  const radius = 44;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-28 w-28">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 96 96">
        <circle
          cx="48"
          cy="48"
          r={normalizedRadius}
          stroke="rgba(226,232,240,0.9)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx="48"
          cy="48"
          r={normalizedRadius}
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">{value}%</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Live
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, accent, gradient }) {
  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-white/70 bg-white/65 p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-[0_24px_70px_-38px_rgba(91,79,207,0.22)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {value}
          </h3>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 ${accent} text-white shadow-[0_14px_35px_-18px_rgba(91,79,207,0.55)]`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description, onClear }) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/70 px-6 py-16 text-center shadow-[0_18px_60px_-36px_rgba(15,23,42,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_18px_45px_-24px_rgba(91,79,207,0.55)]">
        <UsersIcon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
      >
        Clear filters
      </button>
    </div>
  );
}

function ActionMenu({ user, onEdit, onReset, onDelete }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!event.target.closest(`[data-user-menu="${user.id}"]`)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [user.id]);

  return (
    <div className="relative inline-flex" data-user-menu={user.id}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-slate-600 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
        aria-label="More actions"
      >
        <MoreHorizontal className="h-4.5 w-4.5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-2xl border border-white/70 bg-white/92 p-1 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
          >
            <PencilLine className="h-4 w-4" />
            Edit user
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReset();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reset password
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete user
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="responsive-modal-panel w-full max-w-[560px] rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_32px_100px_-48px_rgba(15,23,42,0.4)] backdrop-blur-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">{children}</div>

        <div className="mt-6">{footer}</div>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [newUser, setNewUser] = useState(DEFAULT_NEW_USER);
  const [customRole, setCustomRole] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [editCustomRole, setEditCustomRole] = useState("");
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${BASE_URL}/api/users`);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (fetchError) {
      console.log(fetchError.response?.data || fetchError);
      setUsers([]);
      setError(fetchError.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => getSearchableText(user).includes(query));
  }, [users, searchTerm]);

  const totalUsers = users.length;
  const activeUsers = users.filter(isActiveUser).length;
  const inactiveUsers = Math.max(totalUsers - activeUsers, 0);
  const uniqueRoles = new Set(
    users.map((user) => String(user?.role || "").toLowerCase()).filter(Boolean)
  );
  const activeRate = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const openAddModal = () => {
    setNewUser(DEFAULT_NEW_USER);
    setCustomRole("");
    setShowNewPassword(false);
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    const roleKey = getRoleKey(user.role);
    setEditUser({
      ...user,
      role: roleKey,
      password: "",
    });
    setEditCustomRole(roleKey === "custom" ? user.role : "");
    setShowEditModal(true);
  };

  const openResetModal = (user) => {
    setResetUser(user);
    setNewPassword("");
    setShowResetPassword(false);
    setShowResetModal(true);
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/users/${id}`);
      fetchUsers();
    } catch (deleteError) {
      console.log(deleteError.response?.data || deleteError);
      alert(deleteError.response?.data?.message || "Failed to delete user");
    }
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("Fill all fields");
      return;
    }
    if (newUser.role === "custom" && !customRole.trim()) {
      alert("Enter custom role");
      return;
    }

    try {
      await axios.post(`${BASE_URL}/api/users`, {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role === "custom" ? customRole : newUser.role,
      });
      alert("User created successfully");
      setShowAddModal(false);
      setNewUser(DEFAULT_NEW_USER);
      setCustomRole("");
      fetchUsers();
    } catch (requestError) {
      console.log(requestError.response?.data || requestError);
      alert(requestError.response?.data?.message || "Failed to create user");
    }
  };

  const resetPassword = async () => {
    if (!newPassword) {
      alert("Enter new password");
      return;
    }

    try {
      await axios.put(`${BASE_URL}/api/users/reset-password/${resetUser.id}`, {
        password: newPassword,
      });
      alert("Password updated successfully");
      setShowResetModal(false);
      setResetUser(null);
      setNewPassword("");
      fetchUsers();
    } catch (requestError) {
      console.log(requestError.response?.data || requestError);
      alert(requestError.response?.data?.message || "Failed to update password");
    }
  };

  const updateUser = async () => {
    if (!editUser) return;
    if (editUser.role === "custom" && !editCustomRole.trim()) {
      alert("Enter custom role");
      return;
    }

    try {
      await axios.put(`${BASE_URL}/api/users/${editUser.id}`, {
        name: editUser.name,
        email: editUser.email,
        role: editUser.role === "custom" ? editCustomRole : editUser.role,
        password: editUser.password || undefined,
      });
      alert("User updated successfully");
      setShowEditModal(false);
      setEditUser(null);
      setEditCustomRole("");
      fetchUsers();
    } catch (requestError) {
      console.log(requestError.response?.data || requestError);
      alert(requestError.response?.data?.message || "Failed to update user");
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative space-y-2">
        {loading ? (
          <PageSkeleton />
        ) : (
          <>
            <section className="rounded-[32px] border border-white/70 p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.26)] backdrop-blur-xl sm:p-6 lg:p-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-[0_12px_26px_-18px_rgba(91,79,207,0.45)]">
                      <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_6px_rgba(139,92,246,0.12)]" />
                      Live CRM module
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-[0_12px_26px_-18px_rgba(15,23,42,0.25)]">
                      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                      {totalUsers} accounts
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-3xl">
                      Users
                    </h1>
                    <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_18px_40px_-22px_rgba(139,92,246,0.6)]">
                      <span className="h-2 w-2 rounded-full bg-white/95 shadow-[0_0_0_6px_rgba(255,255,255,0.12)]" />
                      {activeUsers} active now
                    </span>
                  </div>

                  <p className="max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                    A premium enterprise view for account management, role governance, password control,
                    and secure team operations.
                  </p>
                </div>

                <div className="flex flex-col gap-3 xl:w-[520px]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search users, email, role, or ID..."
                        className="w-full rounded-2xl border border-white/70 bg-white/70 px-11 py-3 text-sm text-slate-900 shadow-[0_14px_36px_-22px_rgba(15,23,42,0.35)] outline-none transition duration-300 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-slate-700 shadow-[0_14px_36px_-22px_rgba(15,23,42,0.28)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_48px_-26px_rgba(15,23,42,0.34)] focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                        aria-label="Notifications"
                      >
                        <Bell className="h-4.5 w-4.5" />
                        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border border-white bg-rose-500 shadow-[0_0_0_6px_rgba(244,63,94,0.14)]" />
                      </button>

                      <button
                        type="button"
                        onClick={openAddModal}
                        className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-[0_18px_50px_-22px_rgba(91,79,207,0.65)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-26px_rgba(91,79,207,0.72)] focus:outline-none focus:ring-4 focus:ring-violet-500/20"
                      >
                        <UserPlus className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                        Add New User
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={UsersIcon}
                  title="Total Users"
                  value={totalUsers}
                  subtitle="All verified accounts in your workspace"
                  gradient="from-violet-500/10 via-fuchsia-500/10 to-indigo-500/5"
                  accent="bg-gradient-to-br from-violet-500 to-fuchsia-500"
                />
                <StatCard
                  icon={CheckCircle2}
                  title="Active Users"
                  value={activeUsers}
                  subtitle={`${activeRate}% of the platform is active`}
                  gradient="from-emerald-500/10 via-teal-500/10 to-cyan-500/5"
                  accent="bg-gradient-to-br from-emerald-500 to-teal-500"
                />
                <StatCard
                  icon={ShieldCheck}
                  title="Role Types"
                  value={uniqueRoles.size}
                  subtitle="Unique role clusters currently configured"
                  gradient="from-amber-500/10 via-orange-500/10 to-rose-500/5"
                  accent="bg-gradient-to-br from-amber-500 to-orange-500"
                />
                <StatCard
                  icon={AlertCircle}
                  title="Inactive Users"
                  value={inactiveUsers}
                  subtitle="Accounts needing attention or reactivation"
                  gradient="from-slate-500/10 via-zinc-500/10 to-stone-500/5"
                  accent="bg-gradient-to-br from-slate-700 to-slate-500"
                />
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <section className="rounded-[32px] border border-white/70 bg-white/65 p-5 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.26)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Enterprise data grid
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                      Team Users
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Secure profile control, role governance, and password management in one polished view.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                      {filteredUsers.length} visible
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600">
                      Page {currentPage} of {pageCount}
                    </span>
                  </div>
                </div>

                {error ? (
                  <div className="mt-6 rounded-[26px] border border-rose-200/70 bg-rose-50/80 px-5 py-6 text-rose-700 shadow-[0_18px_50px_-36px_rgba(244,63,94,0.35)]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Unable to load users</p>
                        <p className="mt-1 text-sm leading-6 text-rose-700/80">{error}</p>
                      </div>
                    </div>
                  </div>
                ) : pagedUsers.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState
                      title={searchTerm ? "No users match your search" : "No users found"}
                      description={
                        searchTerm
                          ? "Try another keyword to surface the right account faster."
                          : "There are no user accounts available in this workspace yet."
                      }
                      onClear={() => setSearchTerm("")}
                    />
                  </div>
                ) : (
                  <div className="responsive-table mt-6 overflow-x-auto">
                    <table className="min-w-[1080px] w-full border-separate border-spacing-y-3 text-sm">
                      <thead>
                        <tr>
                          <th className="sticky top-0 z-10 bg-white/80 px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-xl">
                            User
                          </th>
                          <th className="sticky top-0 z-10 bg-white/80 px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-xl">
                            Email
                          </th>
                          <th className="sticky top-0 z-10 bg-white/80 px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-xl">
                            Password
                          </th>
                          <th className="sticky top-0 z-10 bg-white/80 px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-xl">
                            Role
                          </th>
                          <th className="sticky top-0 z-10 bg-white/80 px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-xl">
                            Status
                          </th>
                          <th className="sticky top-0 z-10 bg-white/80 px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-xl">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {pagedUsers.map((user) => {
                          const roleMeta = getRoleMeta(user.role);
                          const roleKey = getRoleKey(user.role);
                          const active = isActiveUser(user);
                          const roleLabel =
                            roleKey === "custom" && !STANDARD_ROLES.includes(String(user.role || "").toLowerCase())
                              ? toTitleCase(user.role)
                              : roleMeta.label;

                          return (
                            <tr key={user.id} className="group transition-all duration-300 hover:-translate-y-0.5">
                              <td className="rounded-l-[24px] border border-white/70 bg-white/75 px-5 py-4 align-middle shadow-[0_14px_36px_-30px_rgba(15,23,42,0.22)] transition-all duration-300 group-hover:bg-white/92 group-hover:shadow-[0_18px_50px_-32px_rgba(15,23,42,0.26)]">
                                <div className="flex items-center gap-3">
                                  <TableCellAvatar user={user} />
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-950">
                                      {getDisplayName(user)}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">ID: {user.id}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="border-y border-white/70 bg-white/75 px-5 py-4 align-middle text-slate-700 transition-all duration-300 group-hover:bg-white/92">
                                <div className="max-w-[280px] truncate">{user.email}</div>
                              </td>

                              <td className="border-y border-white/70 bg-white/75 px-5 py-4 align-middle text-center transition-all duration-300 group-hover:bg-white/92">
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-semibold tracking-[0.16em] text-emerald-700">
                                  <LockKeyhole className="h-3.5 w-3.5" />
                                  ••••••
                                </span>
                              </td>

                              <td className="border-y border-white/70 bg-white/75 px-5 py-4 align-middle text-center transition-all duration-300 group-hover:bg-white/92">
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ring-1 ring-inset shadow-[0_10px_25px_-18px_rgba(15,23,42,0.18)] ${roleMeta.chip}`}
                                >
                                  <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${roleMeta.tone} text-slate-800`}>
                                    <roleMeta.icon className="h-3 w-3" />
                                  </span>
                                  {roleLabel}
                                </span>
                              </td>

                              <td className="border-y border-white/70 bg-white/75 px-5 py-4 align-middle text-center transition-all duration-300 group-hover:bg-white/92">
                                <StatusChip active={active} />
                              </td>

                              <td className="rounded-r-[24px] border border-white/70 bg-white/75 px-5 py-4 align-middle transition-all duration-300 group-hover:bg-white/92">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(user)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-violet-700 shadow-[0_14px_30px_-22px_rgba(91,79,207,0.35)] transition duration-300 hover:-translate-y-0.5 hover:bg-violet-50 hover:shadow-[0_18px_40px_-22px_rgba(91,79,207,0.5)]"
                                    aria-label="Edit user"
                                  >
                                    <PencilLine className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openResetModal(user)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-sky-700 shadow-[0_14px_30px_-22px_rgba(14,165,233,0.3)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-[0_18px_40px_-22px_rgba(14,165,233,0.45)]"
                                    aria-label="Reset password"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                  <ActionMenu
                                    user={user}
                                    onEdit={() => openEditModal(user)}
                                    onReset={() => openResetModal(user)}
                                    onDelete={() => deleteUser(user.id)}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredUsers.length > 0 ? (
                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      Showing {Math.min(filteredUsers.length, (currentPage - 1) * PAGE_SIZE + 1)}-
                      {Math.min(filteredUsers.length, currentPage * PAGE_SIZE)} of {filteredUsers.length} users
                    </p>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-4 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Prev
                      </button>

                      {Array.from({ length: pageCount }).map((_, index) => {
                        const num = index + 1;
                        const activePage = num === currentPage;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setPage(num)}
                            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border px-3 text-sm font-semibold transition duration-300 ${
                              activePage
                                ? "border-violet-200/80 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_16px_36px_-20px_rgba(91,79,207,0.65)]"
                                : "border-white/70 bg-white/75 text-slate-700 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.22)] hover:-translate-y-0.5 hover:bg-white"
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
                        disabled={currentPage === pageCount}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-4 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </>
        )}
      </div>

      {showAddModal ? (
        <ModalShell
          title="Add New User"
          subtitle="Create a polished enterprise account with secure role assignment."
          onClose={() => setShowAddModal(false)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addUser}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_50px_-22px_rgba(91,79,207,0.65)] transition hover:-translate-y-0.5"
              >
                <UserPlus className="h-4 w-4" />
                Create User
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <FloatingField
              label="Full Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              autoComplete="off"
            />
            <FloatingField
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              autoComplete="new-email"
            />
            <FloatingField
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              autoComplete="new-password"
            />
            <SelectField
              label="Role"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="sales">Sales</option>
              <option value="inventory">Inventory</option>
              <option value="accounts">Accounts</option>
              <option value="custom">Other Role</option>
            </SelectField>
            {newUser.role === "custom" ? (
              <FloatingField
                label="Custom Role"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                autoComplete="off"
              />
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {showResetModal && resetUser ? (
        <ModalShell
          title="Reset Password"
          subtitle={`Update the password for ${getDisplayName(resetUser)}.`}
          onClose={() => setShowResetModal(false)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetPassword}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_50px_-22px_rgba(91,79,207,0.65)] transition hover:-translate-y-0.5"
              >
                <RefreshCw className="h-4 w-4" />
                Update Password
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600">
              Resetting password for <span className="font-semibold text-slate-900">{getDisplayName(resetUser)}</span>
            </div>
            <FloatingField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </ModalShell>
      ) : null}

      {showEditModal && editUser ? (
        <ModalShell
          title="Edit User"
          subtitle="Refine user details without changing business logic."
          onClose={() => setShowEditModal(false)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={updateUser}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_50px_-22px_rgba(91,79,207,0.65)] transition hover:-translate-y-0.5"
              >
                <PencilLine className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <FloatingField
              label="Full Name"
              value={editUser.name}
              onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
            />
            <FloatingField
              label="Email"
              type="email"
              value={editUser.email}
              onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
            />
            <FloatingField
              label="Password (optional)"
              type="password"
              value={editUser.password || ""}
              onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
              placeholder="Leave blank to keep current password"
            />
            <SelectField
              label="Role"
              value={editUser.role}
              onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="sales">Sales</option>
              <option value="inventory">Inventory</option>
              <option value="accounts">Accounts</option>
              <option value="custom">Other Role</option>
            </SelectField>
            {editUser.role === "custom" ? (
              <FloatingField
                label="Custom Role"
                value={editCustomRole}
                onChange={(e) => setEditCustomRole(e.target.value)}
              />
            ) : null}
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
