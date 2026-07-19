import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ImagePlus, Trash2, Monitor, Smartphone, Type, Palette, Target,
  CalendarClock, Loader2, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { createBanner, updateBanner } from "../../services/bannerService";
import { getImageUrl } from "../../utils/getImageUrl";
import MediaPicker from "../MediaPicker";
import BannerPreview from "./BannerPreview";
import { PLACEMENTS, DEVICES, TONES } from "./bannerConstants";

const DRAFT_KEY = "dd_banner_draft_v1";

const TABS = [
  { key: "content", label: "Content", icon: Type },
  { key: "design", label: "Design & Media", icon: Palette },
  { key: "targeting", label: "Placement & Device", icon: Target },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
];

const emptyForm = {
  placement: "home_hero",
  eyebrow: "",
  title: "",
  subtitle: "",
  description: "",
  cta_label: "",
  cta_url: "",
  open_new_tab: false,
  tone: TONES[0],
  image_path: "",
  mobile_image_path: "",
  device: "all",
  sort_order: 0,
  starts_at: "",
  ends_at: "",
  is_active: true,
};

function toDatetimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function bannerToForm(banner) {
  return {
    placement: banner.placement || "home_hero",
    eyebrow: banner.eyebrow || "",
    title: banner.title || "",
    subtitle: banner.subtitle || "",
    description: banner.description || "",
    cta_label: banner.cta_label || "",
    cta_url: banner.cta_url || "",
    open_new_tab: !!banner.open_new_tab,
    tone: banner.tone || TONES[0],
    image_path: banner.image_path || "",
    mobile_image_path: banner.mobile_image_path || "",
    device: banner.device || "all",
    sort_order: banner.sort_order ?? 0,
    starts_at: toDatetimeLocal(banner.starts_at),
    ends_at: toDatetimeLocal(banner.ends_at),
    is_active: banner.is_active !== undefined ? !!banner.is_active : true,
  };
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white/80 px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100 transition";
const labelCls = "mb-1.5 block text-xs font-semibold text-stone-600";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {hint && <span className="ml-1.5 font-normal text-stone-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function ImageField({ label, value, onPick, onClear }) {
  return (
    <Field label={label}>
      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-stone-200">
          <img src={getImageUrl(value)} alt="" className="h-28 w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-stone-900/50 opacity-0 backdrop-blur-[2px] transition group-hover:opacity-100">
            <button type="button" onClick={onPick} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 shadow hover:bg-amber-50">
              Replace
            </button>
            <button type="button" onClick={onClear} className="rounded-lg bg-white p-1.5 text-rose-600 shadow hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/60 text-stone-400 transition hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-600"
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-xs font-medium">Choose from Media Library</span>
        </button>
      )}
    </Field>
  );
}

// Tabbed banner editor with live preview. Create mode autosaves a draft to
// localStorage (same pattern as the product editor — no server-side drafts).
export default function BannerFormModal({ open, banner, defaultPlacement, nextSortOrder = 0, onClose, onSaved }) {
  const isEdit = !!banner?.id;
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("content");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [picker, setPicker] = useState(null); // "desktop" | "mobile" | null
  const draftRestored = useRef(false);

  useEffect(() => {
    if (!open) return;
    setTab("content");
    setPreviewDevice("desktop");
    if (isEdit) {
      setForm(bannerToForm(banner));
    } else {
      let draft = null;
      try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { /* corrupt draft */ }
      if (draft?.title || draft?.eyebrow || draft?.subtitle) {
        setForm({ ...emptyForm, ...draft, sort_order: nextSortOrder });
        draftRestored.current = true;
        toast("Unsaved draft restored", { icon: "📝" });
      } else {
        setForm({ ...emptyForm, placement: defaultPlacement || "home_hero", sort_order: nextSortOrder });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, banner?.id]);

  // Draft autosave — create mode only, so an accidental close never loses work.
  useEffect(() => {
    if (!open || isEdit) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* storage full */ }
    }, 400);
    return () => clearTimeout(t);
  }, [form, open, isEdit]);

  const scheduleError = useMemo(() => {
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      return "End date must be after the start date";
    }
    return null;
  }, [form.starts_at, form.ends_at]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setTab("content"); return toast.error("Title is required"); }
    if (scheduleError) { setTab("schedule"); return toast.error(scheduleError); }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        sort_order: Number(form.sort_order) || 0,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };
      if (isEdit) {
        await updateBanner(banner.id, payload);
        toast.success("Banner updated");
      } else {
        await createBanner(payload);
        localStorage.removeItem(DRAFT_KEY);
        toast.success("Banner created");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setForm({ ...emptyForm, placement: defaultPlacement || "home_hero", sort_order: nextSortOrder });
    draftRestored.current = false;
    toast.success("Draft discarded");
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-900/50 p-3 backdrop-blur-sm sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-amber-100/80 bg-[#FDFBF6] shadow-2xl shadow-stone-900/20"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-amber-100/80 bg-white/70 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/30">
              <Sparkles className="h-4.5 w-4.5" size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-900">{isEdit ? "Edit Banner" : "Create Banner"}</h2>
              <p className="text-xs text-stone-500">{isEdit ? `#${banner.id} · last updated ${new Date(banner.updated_at).toLocaleString()}` : "Changes autosave as a local draft"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEdit && draftRestored.current && (
              <button type="button" onClick={discardDraft} className="rounded-lg px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-50">
                Discard draft
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600">
              <X className="h-4.5 w-4.5" size={18} />
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_380px]">
          {/* form */}
          <form id="banner-form" onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
            {/* tabs */}
            <div className="mb-5 flex flex-wrap gap-1.5 rounded-2xl bg-stone-100/80 p-1.5">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    tab === key ? "bg-white text-amber-700 shadow-sm" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {tab === "content" && (
                  <>
                    <Field label="Eyebrow" hint="small text above the title">
                      <input name="eyebrow" value={form.eyebrow} onChange={onChange} placeholder="e.g. Limited Time" className={inputCls} />
                    </Field>
                    <Field label="Title *">
                      <input name="title" value={form.title} onChange={onChange} placeholder="Banner headline" className={inputCls} />
                    </Field>
                    <Field label="Subtitle">
                      <textarea name="subtitle" value={form.subtitle} onChange={onChange} rows={2} placeholder="Short supporting line" className={inputCls} />
                    </Field>
                    <Field label="Internal description" hint="admin-only note, never shown on the store">
                      <textarea name="description" value={form.description} onChange={onChange} rows={2} placeholder="e.g. Diwali campaign 2026, runs with the poshak sale" className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="CTA button text">
                        <input name="cta_label" value={form.cta_label} onChange={onChange} placeholder="Shop the Offer" className={inputCls} />
                      </Field>
                      <Field label="CTA target URL">
                        <input name="cta_url" value={form.cta_url} onChange={onChange} placeholder="/shop?category=…" className={inputCls} />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2.5 text-sm text-stone-700">
                      <input type="checkbox" name="open_new_tab" checked={form.open_new_tab} onChange={onChange} className="h-4 w-4 rounded border-stone-300 accent-amber-500" />
                      Open link in a new tab
                    </label>
                  </>
                )}

                {tab === "design" && (
                  <>
                    <Field label="Background gradient">
                      <div className="grid grid-cols-3 gap-2">
                        {TONES.map((tone) => (
                          <button
                            key={tone}
                            type="button"
                            title={tone}
                            onClick={() => setForm((f) => ({ ...f, tone }))}
                            className={`h-11 rounded-xl bg-gradient-to-r transition ${tone} ${
                              form.tone === tone ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-[#FDFBF6]" : "opacity-80 hover:opacity-100"
                            }`}
                          />
                        ))}
                      </div>
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <ImageField
                        label="Desktop image (optional)"
                        value={form.image_path}
                        onPick={() => setPicker("desktop")}
                        onClear={() => setForm((f) => ({ ...f, image_path: "" }))}
                      />
                      <ImageField
                        label="Mobile image (optional)"
                        value={form.mobile_image_path}
                        onPick={() => setPicker("mobile")}
                        onClear={() => setForm((f) => ({ ...f, mobile_image_path: "" }))}
                      />
                    </div>
                    <p className="rounded-xl bg-amber-50/80 px-4 py-3 text-xs leading-relaxed text-amber-800">
                      If no mobile image is set, the desktop image is used everywhere. Uploads are managed in the shared Media Library (drag &amp; drop supported there).
                    </p>
                  </>
                )}

                {tab === "targeting" && (
                  <>
                    <Field label="Placement" hint="where on the site this banner appears">
                      <select name="placement" value={form.placement} onChange={onChange} className={inputCls}>
                        {PLACEMENTS.map((p) => (
                          <option key={p.key} value={p.key}>{p.label}{p.live ? "" : " (not yet rendered on storefront)"}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Device targeting">
                      <div className="flex gap-2">
                        {DEVICES.map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, device: d.key }))}
                            className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                              form.device === d.key
                                ? "border-amber-400 bg-amber-50 text-amber-700 shadow-sm"
                                : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Priority" hint="lower number shows first">
                      <input type="number" name="sort_order" value={form.sort_order} onChange={onChange} min={0} className={inputCls} />
                    </Field>
                    <label className="flex items-center gap-2.5 text-sm text-stone-700">
                      <input type="checkbox" name="is_active" checked={form.is_active} onChange={onChange} className="h-4 w-4 rounded border-stone-300 accent-amber-500" />
                      Active (visible on storefront within its schedule)
                    </label>
                  </>
                )}

                {tab === "schedule" && (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Publish from" hint="optional">
                        <input type="datetime-local" name="starts_at" value={form.starts_at} onChange={onChange} className={inputCls} />
                      </Field>
                      <Field label="Expire at" hint="optional">
                        <input type="datetime-local" name="ends_at" value={form.ends_at} onChange={onChange} className={inputCls} />
                      </Field>
                    </div>
                    {scheduleError && <p className="text-xs font-medium text-rose-600">{scheduleError}</p>}
                    <p className="rounded-xl bg-amber-50/80 px-4 py-3 text-xs leading-relaxed text-amber-800">
                      Scheduling is automatic — the storefront only serves banners inside their window. Leave both empty to always show the banner while it is active.
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </form>

          {/* live preview */}
          <div className="hidden flex-col border-l border-amber-100/80 bg-stone-50/60 lg:flex">
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Live preview</p>
              <div className="flex gap-1 rounded-lg bg-stone-200/70 p-1">
                <button type="button" onClick={() => setPreviewDevice("desktop")} className={`rounded-md p-1.5 transition ${previewDevice === "desktop" ? "bg-white text-amber-600 shadow-sm" : "text-stone-400"}`}>
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setPreviewDevice("mobile")} className={`rounded-md p-1.5 transition ${previewDevice === "mobile" ? "bg-white text-amber-600 shadow-sm" : "text-stone-400"}`}>
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-start justify-center overflow-y-auto px-5 pb-5">
              <div className={`overflow-hidden rounded-2xl shadow-lg shadow-stone-900/10 ring-1 ring-stone-200 ${previewDevice === "mobile" ? "w-[240px]" : "w-full"}`}>
                <BannerPreview banner={form} device={previewDevice} className={previewDevice === "mobile" ? "min-h-[280px]" : "min-h-[210px]"} />
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-amber-100/80 bg-white/70 px-6 py-4 backdrop-blur">
          <p className="hidden text-xs text-stone-400 sm:block">
            {isEdit ? `Placement: ${PLACEMENTS.find((p) => p.key === form.placement)?.label || form.placement}` : "Draft autosaves locally until you publish"}
          </p>
          <div className="flex gap-2.5">
            <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50">
              Cancel
            </button>
            <button
              type="submit"
              form="banner-form"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create banner"}
            </button>
          </div>
        </div>
      </motion.div>

      <MediaPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        onSelect={(path) => {
          setForm((f) => (picker === "mobile" ? { ...f, mobile_image_path: path } : { ...f, image_path: path }));
          setPicker(null);
        }}
      />
    </div>,
    document.body
  );
}
