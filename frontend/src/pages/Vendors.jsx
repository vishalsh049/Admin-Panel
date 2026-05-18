import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChevronRight,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useVendors } from "../context/VendorContext";

const container = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

function VendorAvatar({ name }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "V";

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-sm font-semibold text-white shadow-[0_20px_45px_-18px_rgba(99,102,241,0.65)]">
      <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-br from-white/18 via-transparent to-transparent" />
      <span className="relative">{initials}</span>
    </div>
  );
}

function PremiumCTA() {
  return (
    <Link
      to="/vendors/add"
      className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white shadow-[0_20px_55px_-22px_rgba(99,102,241,0.72)] ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-24px_rgba(99,102,241,0.78)]"
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.28)_48%,transparent_72%)] translate-x-[-120%] transition-transform duration-700 group-hover:translate-x-[120%]" />
      <Plus className="relative h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
      <span className="relative">New Vendor</span>
      <ArrowUpRight className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, hint, accentClass }) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.32)] backdrop-blur-xl">
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${accentClass}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-600">{hint}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-slate-700 shadow-[0_12px_32px_-18px_rgba(15,23,42,0.25)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function VendorMobileCard({ vendor }) {
  const fullName =
    `${vendor.vendorDetails?.firstName || ""} ${vendor.vendorDetails?.lastName || ""}`.trim() ||
    "Unnamed Vendor";

  return (
    <motion.div
      variants={item}
      className="rounded-[26px] border border-white/75 bg-white/80 p-5 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.28)] backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <VendorAvatar name={fullName} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-950">{fullName}</p>
            <p className="mt-1 text-xs text-slate-500">Vendor ID #{String(vendor.id).slice(-6)}</p>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          <BadgeCheck className="h-3.5 w-3.5" />
          Active
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Company
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {vendor.vendorDetails?.company || "Not provided"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Mail className="h-4 w-4 text-violet-500" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Email</span>
            </div>
            <p className="mt-2 break-all text-sm text-slate-700">
              {vendor.vendorDetails?.email || "Not provided"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Phone className="h-4 w-4 text-sky-500" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Phone</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              {vendor.vendorDetails?.phone || "Not provided"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Link
          to={`/vendors/${vendor.id}`}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_18px_40px_-24px_rgba(99,102,241,0.38)]"
        >
          View Details
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}

export default function Vendors() {
  const vendorContext = useVendors();
  const vendors = vendorContext?.vendors || [];

  const vendorNames = vendors.map((vendor) => {
    const details = vendor.vendorDetails || {};
    return `${details.firstName || ""} ${details.lastName || ""}`.trim() || "Unnamed Vendor";
  });

  const totalVendors = vendors.length;
  const withCompany = vendors.filter((vendor) => vendor.vendorDetails?.company).length;
  const withEmail = vendors.filter((vendor) => vendor.vendorDetails?.email).length;
  const latestVendor = vendorNames[vendors.length - 1] || "No vendors yet";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-[32px] border border-white/65 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),rgba(244,247,255,0.88)_42%,rgba(240,244,255,0.84)_100%)] p-4 shadow-[0_36px_120px_-70px_rgba(76,81,191,0.42)] backdrop-blur-2xl sm:p-6 lg:p-8"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-12 h-56 w-56 rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-60 w-60 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <motion.section variants={item} className="relative">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/76 p-6 shadow-[0_28px_80px_-58px_rgba(15,23,42,0.30)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50/90 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-violet-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Vendor Intelligence
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Enterprise workspace
                </div>
              </div>

              <div className="max-w-3xl">
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-[2.8rem]">
                  Vendor management built like a premium SaaS CRM.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Centralize supplier records, surface relationship context, and keep operational details inside a polished workspace designed for executive clarity and fast decision-making.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="group relative flex h-14 flex-1 items-center overflow-hidden rounded-[22px] border border-white/80 bg-white/82 px-4 shadow-[0_18px_46px_-28px_rgba(15,23,42,0.20)] backdrop-blur-xl transition-all duration-300 hover:border-violet-200 hover:shadow-[0_22px_50px_-26px_rgba(99,102,241,0.26)] focus-within:border-violet-300 focus-within:shadow-[0_0_0_6px_rgba(99,102,241,0.08)]">
                  <div className="pointer-events-none absolute inset-y-1 left-1 w-12 rounded-[18px] bg-gradient-to-b from-white/80 to-white/10 opacity-70" />
                  <Search className="relative mr-3 h-4 w-4 shrink-0 text-slate-400 transition-all duration-300 group-focus-within:scale-110 group-focus-within:text-violet-600" />
                  <input
                    type="text"
                    placeholder="Search vendors, company, email..."
                    className="relative w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>

                <PremiumCTA />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-4 text-white shadow-[0_24px_55px_-32px_rgba(15,23,42,0.75)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
                    Latest Vendor
                  </p>
                  <p className="mt-2 truncate text-base font-semibold">{latestVendor}</p>
                  <p className="mt-1 text-xs text-white/60">Most recently added supplier profile</p>
                </div>

                <div className="rounded-[22px] border border-white/80 bg-white/82 px-5 py-4 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Contact Coverage
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{withEmail} vendors with email</p>
                  <p className="mt-1 text-xs text-slate-500">Ready for outreach and operations</p>
                </div>

                <div className="rounded-[22px] border border-white/80 bg-white/82 px-5 py-4 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Company Linked
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{withCompany} vendor companies</p>
                  <p className="mt-1 text-xs text-slate-500">Structured records for account mapping</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard
              icon={Building2}
              label="Total Vendors"
              value={totalVendors}
              hint="Your full supplier portfolio in one place."
              accentClass="bg-violet-500/12"
            />
            <StatCard
              icon={UsersRound}
              label="Relationship Health"
              value={`${totalVendors === 0 ? 0 : Math.round((withEmail / totalVendors) * 100)}%`}
              hint="Profiles with direct email visibility."
              accentClass="bg-sky-500/12"
            />
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={item}
        className="relative mt-6 overflow-hidden rounded-[30px] border border-white/70 bg-white/72 shadow-[0_28px_90px_-62px_rgba(15,23,42,0.30)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />

        {vendors.length === 0 ? (
          <div className="relative flex min-h-[560px] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center sm:px-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-200/30 via-violet-200/18 to-fuchsia-200/24 blur-3xl" />
            </div>

            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 1.2, 0, -1.2, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="relative mb-10 flex h-36 w-36 items-center justify-center rounded-[36px] border border-white/85 bg-gradient-to-br from-white via-violet-50 to-indigo-50 shadow-[0_35px_90px_-38px_rgba(99,102,241,0.34)]"
            >
              <div className="absolute inset-4 rounded-[28px] bg-gradient-to-br from-indigo-500/10 via-violet-500/12 to-fuchsia-500/10 blur-2xl" />
              <div className="absolute -right-3 -top-3 rounded-full border border-white/80 bg-white/90 p-3 shadow-[0_20px_48px_-24px_rgba(99,102,241,0.45)]">
                <Sparkles className="h-5 w-5 text-violet-600" />
              </div>
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_24px_55px_-22px_rgba(99,102,241,0.55)]">
                <Building2 className="h-10 w-10" />
              </div>
            </motion.div>

            <div className="relative max-w-2xl">
              <h3 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.35rem]">
                Build your vendor network from a world-class command center
              </h3>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Add your first vendor to start organizing supplier identities, contact channels, company details, and operational records inside a refined CRM-grade workspace.
              </p>
            </div>

            <div className="relative mt-9 flex flex-col items-center gap-4 sm:flex-row">
              <PremiumCTA />
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/82 px-4 py-3 text-sm text-slate-600 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.20)]">
                <Mail className="h-4 w-4 text-violet-600" />
                Centralize contacts, banking, tax, and supplier details
              </div>
            </div>

            <div className="relative mt-10 grid w-full max-w-3xl gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/76 px-5 py-5 text-left shadow-[0_18px_44px_-28px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Unified Profiles
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Keep every supplier’s identity, company, and communication details together.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/76 px-5 py-5 text-left shadow-[0_18px_44px_-28px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Operational Clarity
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Move from scattered spreadsheets into one polished source of truth.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/76 px-5 py-5 text-left shadow-[0_18px_44px_-28px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  CRM-grade Experience
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  A premium workspace designed to feel fast, elegant, and enterprise-ready.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 lg:p-6">
            <div className="mb-5 flex flex-col gap-4 rounded-[26px] border border-white/75 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.72)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  Vendor Directory
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  Enterprise supplier grid
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-white/65">
                  Review your vendors with a cleaner CRM-style layout, stronger hierarchy, and quick access to detailed records.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:min-w-[20rem]">
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Total
                  </p>
                  <p className="mt-1 text-xl font-semibold">{totalVendors}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    With Email
                  </p>
                  <p className="mt-1 text-xl font-semibold">{withEmail}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:hidden">
              {vendors.map((vendor) => (
                <VendorMobileCard key={vendor.id} vendor={vendor} />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-[28px] border border-white/75 bg-white/78 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.24)] backdrop-blur-xl lg:block">
              <div className="responsive-table">
                <table className="w-full min-w-[980px] border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78 first:rounded-tl-[26px]">
                        Vendor
                      </th>
                      <th className="bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78">
                        Company
                      </th>
                      <th className="bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78">
                        Contact
                      </th>
                      <th className="bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78">
                        Status
                      </th>
                      <th className="bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78 last:rounded-tr-[26px]">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {vendors.map((vendor, index) => {
                      const fullName =
                        `${vendor.vendorDetails?.firstName || ""} ${vendor.vendorDetails?.lastName || ""}`.trim() ||
                        "Unnamed Vendor";

                      const isLast = index === vendors.length - 1;

                      return (
                        <tr
                          key={vendor.id}
                          className="group transition-all duration-300"
                        >
                          <td className={`border-b border-slate-100/90 bg-white/78 px-6 py-5 align-top transition-colors duration-300 group-hover:bg-violet-50/45 ${isLast ? "rounded-bl-[26px]" : ""}`}>
                            <div className="flex items-center gap-4">
                              <VendorAvatar name={fullName} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {fullName}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                  <span>Vendor ID #{String(vendor.id).slice(-6)}</span>
                                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                                  <span className="truncate">
                                    {vendor.vendorDetails?.gstTreatment || "Standard profile"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="border-b border-slate-100/90 bg-white/78 px-6 py-5 align-top transition-colors duration-300 group-hover:bg-violet-50/45">
                            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                              <Building2 className="h-4 w-4 text-violet-500" />
                              <span className="truncate">
                                {vendor.vendorDetails?.company || "Not provided"}
                              </span>
                            </div>
                          </td>

                          <td className="border-b border-slate-100/90 bg-white/78 px-6 py-5 align-top transition-colors duration-300 group-hover:bg-violet-50/45">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <Mail className="h-4 w-4 shrink-0 text-violet-500" />
                                <span className="truncate">
                                  {vendor.vendorDetails?.email || "Not provided"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="h-4 w-4 shrink-0 text-sky-500" />
                                <span>{vendor.vendorDetails?.phone || "Not provided"}</span>
                              </div>
                            </div>
                          </td>

                          <td className="border-b border-slate-100/90 bg-white/78 px-6 py-5 align-top transition-colors duration-300 group-hover:bg-violet-50/45">
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm">
                              <BadgeCheck className="h-4 w-4" />
                              Active Vendor
                            </span>
                          </td>

                          <td className={`border-b border-slate-100/90 bg-white/78 px-6 py-5 text-right align-top transition-colors duration-300 group-hover:bg-violet-50/45 ${isLast ? "rounded-br-[26px]" : ""}`}>
                            <Link
                              to={`/vendors/${vendor.id}`}
                              className="group/link inline-flex items-center gap-2 rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_20px_42px_-26px_rgba(99,102,241,0.35)]"
                            >
                              View Details
                              <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
