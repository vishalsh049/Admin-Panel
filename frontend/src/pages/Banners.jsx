import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Pencil, Trash2, Copy, Eye, EyeOff, GripVertical, X,
  Images, Radio, CalendarClock, Hourglass, Monitor, Smartphone, Home as HomeIcon,
  Download, Upload, ChevronLeft, ChevronRight, MousePointerClick, BarChart3,
  LayoutGrid, Sparkles, Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getBanners, updateBanner, deleteBanner, createBanner,
  duplicateBanner, bulkBannerAction, reorderBanners,
} from "../services/bannerService";
import { getImageUrl } from "../utils/getImageUrl";
import ConfirmModal from "../components/ConfirmModal";
import BannerFormModal from "../components/banners/BannerFormModal";
import BannerPreview from "../components/banners/BannerPreview";
import { PLACEMENTS, DEVICES, STATUS_META, bannerStatus, placementLabel } from "../components/banners/bannerConstants";

const PAGE_SIZE = 10;

const SORTS = [
  { key: "priority", label: "Priority" },
  { key: "latest", label: "Recently updated" },
  { key: "views", label: "Most viewed" },
  { key: "clicks", label: "Most clicked" },
];

function StatCard({ icon: Icon, label, value, accent, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-2xl border border-amber-100/70 bg-white/70 p-4 shadow-sm shadow-amber-900/[0.04] backdrop-blur transition hover:shadow-md hover:shadow-amber-900/[0.07]"
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-bold leading-tight text-stone-900">{value}</p>
          <p className="truncate text-[11px] font-medium text-stone-500">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-stone-100 last:border-0">
      <td className="px-4 py-4" colSpan={9}>
        <div className="flex animate-pulse items-center gap-4">
          <div className="h-12 w-20 rounded-xl bg-stone-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-stone-100" />
            <div className="h-2.5 w-1/4 rounded bg-stone-100" />
          </div>
          <div className="h-5 w-16 rounded-full bg-stone-100" />
          <div className="h-3 w-24 rounded bg-stone-100" />
        </div>
      </td>
    </tr>
  );
}

function exportCsv(rows) {
  const cols = ["id", "placement", "title", "eyebrow", "subtitle", "cta_label", "cta_url", "device", "status", "sort_order", "starts_at", "ends_at", "view_count", "click_count", "is_active", "created_at", "updated_at"];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [cols.join(",")];
  rows.forEach((b) => lines.push(cols.map((c) => esc(c === "status" ? bannerStatus(b) : b[c])).join(",")));
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `banners-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [placementFilter, setPlacementFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [sort, setSort] = useState("priority");
  const [page, setPage] = useState(1);

  // selection & modals
  const [selected, setSelected] = useState(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [pendingDelete, setPendingDelete] = useState(null); // banner | { bulk: true }
  const [isBusy, setIsBusy] = useState(false);

  // drag & drop reorder
  const dragId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const importInputRef = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setBanners(await getBanners()); // all placements — filtering is client-side
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  }

  /* ── derived data ─────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const now = new Date();
    const by = (fn) => banners.filter(fn).length;
    return {
      total: banners.length,
      live: by((b) => bannerStatus(b, now) === "live"),
      scheduled: by((b) => bannerStatus(b, now) === "scheduled"),
      expired: by((b) => bannerStatus(b, now) === "expired"),
      hidden: by((b) => !b.is_active),
      homepage: by((b) => b.placement === "home_hero" || b.placement === "home_promo"),
      desktop: by((b) => (b.device || "all") !== "mobile"),
      mobile: by((b) => (b.device || "all") !== "desktop"),
    };
  }, [banners]);

  const filtered = useMemo(() => {
    const now = new Date();
    const q = search.trim().toLowerCase();
    let list = banners.filter((b) => {
      if (placementFilter !== "all" && b.placement !== placementFilter) return false;
      if (deviceFilter !== "all" && (b.device || "all") !== deviceFilter) return false;
      if (statusFilter !== "all" && bannerStatus(b, now) !== statusFilter) return false;
      if (q) {
        const hay = `${b.title || ""} ${b.eyebrow || ""} ${b.subtitle || ""} ${b.cta_label || ""} ${b.cta_url || ""} ${b.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === "priority") list = [...list].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    if (sort === "latest") list = [...list].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    if (sort === "views") list = [...list].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    if (sort === "clicks") list = [...list].sort((a, b) => (b.click_count || 0) - (a.click_count || 0));
    return list;
  }, [banners, search, placementFilter, statusFilter, deviceFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reordering only makes sense on an unfiltered, priority-sorted single placement.
  const canReorder = placementFilter !== "all" && sort === "priority" && !search && statusFilter === "all" && deviceFilter === "all";

  useEffect(() => { setPage(1); }, [search, placementFilter, statusFilter, deviceFilter, sort]);
  useEffect(() => { setSelected(new Set()); }, [placementFilter, statusFilter, deviceFilter, search]);

  /* ── actions ──────────────────────────────────────────────────── */

  function openCreate() { setEditingBanner(null); setEditorOpen(true); }
  function openEdit(banner) { setEditingBanner(banner); setEditorOpen(true); }

  async function toggleActive(banner) {
    try {
      await updateBanner(banner.id, { ...banner, is_active: !banner.is_active });
      toast.success(banner.is_active ? "Banner hidden" : "Banner activated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    }
  }

  async function handleDuplicate(banner) {
    try {
      await duplicateBanner(banner.id);
      toast.success("Duplicated as a hidden draft");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Duplicate failed");
    }
  }

  async function confirmDelete() {
    setIsBusy(true);
    try {
      if (pendingDelete?.bulk) {
        await bulkBannerAction([...selected], "delete");
        toast.success(`${selected.size} banner(s) deleted`);
        setSelected(new Set());
      } else {
        await deleteBanner(pendingDelete.id);
        toast.success("Banner deleted");
      }
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function bulkStatus(action) {
    try {
      await bulkBannerAction([...selected], action);
      toast.success(`${selected.size} banner(s) ${action === "activate" ? "activated" : "hidden"}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Bulk action failed");
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    const allSelected = pageRows.every((b) => selected.has(b.id));
    setSelected((prev) => {
      const next = new Set(prev);
      pageRows.forEach((b) => (allSelected ? next.delete(b.id) : next.add(b.id)));
      return next;
    });
  }

  async function handleDrop(targetId) {
    const sourceId = dragId.current;
    dragId.current = null;
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const ids = filtered.map((b) => b.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);

    // optimistic update, then persist
    setBanners((prev) => prev.map((b) => (ids.includes(b.id) ? { ...b, sort_order: ids.indexOf(b.id) } : b)));
    try {
      await reorderBanners(ids);
      toast.success("Order saved");
    } catch {
      toast.error("Failed to save order");
      load();
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const rows = JSON.parse(await file.text());
      if (!Array.isArray(rows)) throw new Error("Expected a JSON array");
      const valid = rows.filter((r) => r && r.placement);
      if (valid.length === 0) return toast.error("No valid banners in file (need a placement)");
      for (const row of valid) {
        // eslint-disable-next-line no-await-in-loop
        await createBanner({ ...row, id: undefined, view_count: undefined, click_count: undefined });
      }
      toast.success(`Imported ${valid.length} banner(s)`);
      load();
    } catch (err) {
      toast.error(err.message || "Import failed — expected a JSON array of banners");
    }
  }

  /* ── render ───────────────────────────────────────────────────── */

  const selectCls = "rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100 transition";

  return (
    <div className="-m-1 space-y-5 rounded-3xl bg-gradient-to-b from-[#FDF9F0] to-[#FBF7EF] p-1 sm:p-2">
      {/* ── sticky header ── */}
      <div className="sticky top-0 z-30 -mx-1 rounded-b-2xl border-b border-amber-100/80 bg-white/75 px-4 py-4 shadow-sm shadow-amber-900/[0.04] backdrop-blur-lg sm:-mx-2 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
              <Images className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-stone-900">Banner Management</h1>
              <p className="text-xs text-stone-500">Control every storefront banner — placements, scheduling, targeting & analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => importInputRef.current?.click()} className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50">
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
            <input ref={importInputRef} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
            <button type="button" onClick={() => exportCsv(selected.size > 0 ? banners.filter((b) => selected.has(b.id)) : filtered)} className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50">
              <Download className="h-3.5 w-3.5" /> Export {selected.size > 0 ? `(${selected.size})` : "CSV"}
            </button>
            <button type="button" onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/30 transition hover:brightness-105 active:scale-[0.97]">
              <Plus className="h-4 w-4" /> New Banner
            </button>
          </div>
        </div>
      </div>

      {/* ── stats ── */}
      <div className="grid grid-cols-2 gap-3 px-1 sm:grid-cols-4 xl:grid-cols-8">
        <StatCard icon={LayoutGrid} label="Total Banners" value={stats.total} accent="bg-amber-100 text-amber-700" delay={0} />
        <StatCard icon={Radio} label="Live Now" value={stats.live} accent="bg-emerald-100 text-emerald-700" delay={0.03} />
        <StatCard icon={CalendarClock} label="Scheduled" value={stats.scheduled} accent="bg-sky-100 text-sky-700" delay={0.06} />
        <StatCard icon={Hourglass} label="Expired" value={stats.expired} accent="bg-rose-100 text-rose-600" delay={0.09} />
        <StatCard icon={EyeOff} label="Hidden" value={stats.hidden} accent="bg-stone-200 text-stone-600" delay={0.12} />
        <StatCard icon={HomeIcon} label="Homepage" value={stats.homepage} accent="bg-orange-100 text-orange-700" delay={0.15} />
        <StatCard icon={Monitor} label="Desktop Reach" value={stats.desktop} accent="bg-indigo-100 text-indigo-700" delay={0.18} />
        <StatCard icon={Smartphone} label="Mobile Reach" value={stats.mobile} accent="bg-purple-100 text-purple-700" delay={0.21} />
      </div>

      {/* ── filter bar ── */}
      <div className="mx-1 rounded-2xl border border-amber-100/70 bg-white/70 p-3.5 shadow-sm shadow-amber-900/[0.04] backdrop-blur">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, subtitle, CTA, URL…"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-9 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100 transition"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Filter className="hidden h-4 w-4 text-stone-300 sm:block" />
          <select value={placementFilter} onChange={(e) => setPlacementFilter(e.target.value)} className={selectCls}>
            <option value="all">All placements</option>
            {PLACEMENTS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="all">All statuses</option>
            <option value="live">Live</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="inactive">Hidden</option>
          </select>
          <select value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)} className={selectCls}>
            <option value="all">All devices</option>
            {DEVICES.filter((d) => d.key !== "all").map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </select>
        </div>
        {placementFilter !== "all" && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
            <GripVertical className="h-3 w-3" />
            {canReorder ? "Drag rows to reorder banners within this placement." : "Clear search/status/device filters and sort by Priority to enable drag reordering."}
          </p>
        )}
      </div>

      {/* ── bulk action bar ── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300/60 bg-amber-50/90 px-4 py-2.5 shadow-sm backdrop-blur"
          >
            <p className="text-xs font-bold text-amber-800">{selected.size} selected</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => bulkStatus("activate")} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700">
                <Eye className="h-3.5 w-3.5" /> Activate
              </button>
              <button type="button" onClick={() => bulkStatus("deactivate")} className="flex items-center gap-1.5 rounded-lg bg-stone-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700">
                <EyeOff className="h-3.5 w-3.5" /> Hide
              </button>
              <button type="button" onClick={() => exportCsv(banners.filter((b) => selected.has(b.id)))} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button type="button" onClick={() => setPendingDelete({ bulk: true })} className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="rounded-lg px-2 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── table ── */}
      <div className="mx-1 overflow-hidden rounded-2xl border border-amber-100/70 bg-white/80 shadow-sm shadow-amber-900/[0.04] backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-stone-100 bg-gradient-to-r from-amber-50/80 to-transparent text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="w-10 px-4 py-3.5">
                  <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((b) => selected.has(b.id))} onChange={toggleSelectPage} className="h-4 w-4 rounded border-stone-300 accent-amber-500" />
                </th>
                <th className="px-3 py-3.5">Banner</th>
                <th className="px-3 py-3.5">Placement</th>
                <th className="px-3 py-3.5">Device</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-3 py-3.5">Schedule</th>
                <th className="px-3 py-3.5 text-right">Views</th>
                <th className="px-3 py-3.5 text-right">Clicks</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
                </>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                        <Sparkles className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-stone-700">{banners.length === 0 ? "No banners yet" : "No banners match your filters"}</p>
                        <p className="mt-0.5 text-xs text-stone-400">{banners.length === 0 ? "Create your first banner to light up the homepage." : "Try clearing the search or filters."}</p>
                      </div>
                      {banners.length === 0 && (
                        <button type="button" onClick={openCreate} className="mt-1 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/30 hover:brightness-105">
                          <Plus className="h-4 w-4" /> Create banner
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((banner) => {
                  const status = bannerStatus(banner);
                  const meta = STATUS_META[status];
                  const device = banner.device || "all";
                  return (
                    <tr
                      key={banner.id}
                      draggable={canReorder}
                      onDragStart={() => { dragId.current = banner.id; }}
                      onDragOver={(e) => { if (canReorder) { e.preventDefault(); setDragOverId(banner.id); } }}
                      onDragLeave={() => setDragOverId((d) => (d === banner.id ? null : d))}
                      onDrop={() => canReorder && handleDrop(banner.id)}
                      className={`group border-b border-stone-100 transition last:border-0 hover:bg-amber-50/40 ${dragOverId === banner.id ? "bg-amber-100/60" : ""} ${!banner.is_active ? "opacity-70" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canReorder && <GripVertical className="h-3.5 w-3.5 cursor-grab text-stone-300 group-hover:text-amber-500" />}
                          <input type="checkbox" checked={selected.has(banner.id)} onChange={() => toggleSelect(banner.id)} className="h-4 w-4 rounded border-stone-300 accent-amber-500" />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => { setPreviewBanner(banner); setPreviewDevice("desktop"); }} className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-stone-200 transition hover:ring-2 hover:ring-amber-400" title="Preview">
                            {banner.image_path ? (
                              <img src={getImageUrl(banner.image_path)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className={`h-full w-full bg-gradient-to-br ${banner.tone || "from-red-950 via-red-900 to-orange-800"}`} />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className={`max-w-[240px] truncate text-sm font-semibold ${banner.title ? "text-stone-800" : "italic text-stone-400"}`}>{banner.title || "Untitled banner"}</p>
                            <p className="max-w-[240px] truncate text-[11px] text-stone-400">
                              {banner.eyebrow || banner.subtitle || "—"} · #{banner.sort_order}
                              {banner.cta_label ? ` · ${banner.cta_label}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                          {placementLabel(banner.placement)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                          {device === "mobile" ? <Smartphone className="h-3.5 w-3.5" /> : device === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : (<><Monitor className="h-3.5 w-3.5" /><Smartphone className="h-3 w-3" /></>)}
                          <span className="capitalize">{device}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${meta.className}`}>{meta.label}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-stone-500">
                        {banner.starts_at || banner.ends_at ? (
                          <span>
                            {banner.starts_at ? new Date(banner.starts_at).toLocaleDateString() : "Now"}
                            {" → "}
                            {banner.ends_at ? new Date(banner.ends_at).toLocaleDateString() : "No end"}
                          </span>
                        ) : (
                          <span className="text-stone-300">Always on</span>
                        )}
                        <p className="mt-0.5 text-[10px] text-stone-300">Updated {new Date(banner.updated_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600"><BarChart3 className="h-3 w-3 text-stone-300" />{banner.view_count ?? 0}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600"><MousePointerClick className="h-3 w-3 text-stone-300" />{banner.click_count ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                          <button type="button" title={banner.is_active ? "Hide" : "Activate"} onClick={() => toggleActive(banner)} className={`rounded-lg p-1.5 transition ${banner.is_active ? "text-emerald-600 hover:bg-emerald-50" : "text-stone-400 hover:bg-stone-100"}`}>
                            {banner.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button type="button" title="Preview" onClick={() => { setPreviewBanner(banner); setPreviewDevice("desktop"); }} className="rounded-lg p-1.5 text-stone-400 transition hover:bg-amber-50 hover:text-amber-600">
                            <Search className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" title="Duplicate" onClick={() => handleDuplicate(banner)} className="rounded-lg p-1.5 text-stone-400 transition hover:bg-sky-50 hover:text-sky-600">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" title="Edit" onClick={() => openEdit(banner)} className="rounded-lg p-1.5 text-stone-400 transition hover:bg-amber-50 hover:text-amber-600">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" title="Delete" onClick={() => setPendingDelete(banner)} className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3">
            <p className="text-[11px] text-stone-400">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition hover:bg-stone-50 disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs font-semibold text-stone-600">{safePage} / {totalPages}</span>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition hover:bg-stone-50 disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── editor modal ── */}
      <BannerFormModal
        open={editorOpen}
        banner={editingBanner}
        defaultPlacement={placementFilter !== "all" ? placementFilter : "home_hero"}
        nextSortOrder={banners.filter((b) => b.placement === (placementFilter !== "all" ? placementFilter : "home_hero")).length}
        onClose={() => setEditorOpen(false)}
        onSaved={() => { setEditorOpen(false); load(); }}
      />

      {/* ── preview modal ── */}
      <AnimatePresence>
        {previewBanner && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm"
            onClick={() => setPreviewBanner(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl overflow-hidden rounded-3xl border border-amber-100 bg-[#FDFBF6] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-amber-100/80 px-5 py-3.5">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Banner preview</h3>
                  <p className="text-[11px] text-stone-400">{placementLabel(previewBanner.placement)} · {STATUS_META[bannerStatus(previewBanner)].label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
                    <button type="button" onClick={() => setPreviewDevice("desktop")} className={`rounded-md p-1.5 ${previewDevice === "desktop" ? "bg-white text-amber-600 shadow-sm" : "text-stone-400"}`}><Monitor className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setPreviewDevice("mobile")} className={`rounded-md p-1.5 ${previewDevice === "mobile" ? "bg-white text-amber-600 shadow-sm" : "text-stone-400"}`}><Smartphone className="h-3.5 w-3.5" /></button>
                  </div>
                  <button type="button" onClick={() => setPreviewBanner(null)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex justify-center bg-stone-100/60 p-6">
                <div className={`overflow-hidden rounded-2xl shadow-xl ring-1 ring-stone-200 ${previewDevice === "mobile" ? "w-[280px]" : "w-full"}`}>
                  <BannerPreview banner={previewBanner} device={previewDevice} className={previewDevice === "mobile" ? "min-h-[320px]" : "min-h-[260px]"} />
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-[11px] text-stone-400">
                  {previewBanner.view_count ?? 0} views · {previewBanner.click_count ?? 0} clicks
                  {previewBanner.cta_url ? ` · links to ${previewBanner.cta_url}` : ""}
                </p>
                <button type="button" onClick={() => { openEdit(previewBanner); setPreviewBanner(null); }} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/30 hover:brightness-105">
                  <Pencil className="h-3.5 w-3.5" /> Edit banner
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!pendingDelete}
        title={pendingDelete?.bulk ? `Delete ${selected.size} banner(s)?` : "Delete this banner?"}
        message={pendingDelete?.bulk ? "The selected banners will be permanently removed from the storefront." : "This will permanently remove the banner from the storefront."}
        confirmLabel="Delete"
        tone="danger"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
