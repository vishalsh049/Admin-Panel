import { useEffect, useState } from "react";
import { Pencil, Trash2, ArrowUp, ArrowDown, ImagePlus } from "lucide-react";
import toast from "react-hot-toast";
import { getBanners, createBanner, updateBanner, deleteBanner } from "../services/bannerService";
import { getImageUrl } from "../utils/getImageUrl";
import MediaPicker from "../components/MediaPicker";
import ConfirmModal from "../components/ConfirmModal";

const PLACEMENTS = [
  { key: "home_hero", label: "Home Hero Slider" },
  { key: "home_promo", label: "Home Offer Banner" },
];

const TONES = [
  "from-red-950 via-red-900 to-orange-800",
  "from-orange-900 via-red-900 to-rose-950",
  "from-rose-950 via-orange-900 to-amber-800",
  "from-orange-700 via-red-800 to-red-950",
  "from-amber-600 to-orange-800",
];

const emptyForm = {
  eyebrow: "",
  title: "",
  subtitle: "",
  cta_label: "",
  cta_url: "",
  tone: TONES[0],
  image_path: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

export default function Banners() {
  const [placement, setPlacement] = useState("home_hero");
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement]);

  async function load() {
    setLoading(true);
    try {
      setBanners(await getBanners(placement));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function toDatetimeLocal(value) {
    if (!value) return "";
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEdit(banner) {
    setEditingId(banner.id);
    setForm({
      eyebrow: banner.eyebrow || "",
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      cta_label: banner.cta_label || "",
      cta_url: banner.cta_url || "",
      tone: banner.tone || TONES[0],
      image_path: banner.image_path || "",
      starts_at: toDatetimeLocal(banner.starts_at),
      ends_at: toDatetimeLocal(banner.ends_at),
      is_active: banner.is_active,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        placement,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };
      if (editingId) {
        await updateBanner(editingId, payload);
        toast.success("Banner updated");
      } else {
        await createBanner({ ...payload, sort_order: banners.length });
        toast.success("Banner created");
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    setIsBusy(true);
    try {
      await deleteBanner(pendingDelete.id);
      toast.success("Banner deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function moveBanner(banner, direction) {
    const sorted = [...banners].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((b) => b.id === banner.id);
    const target = sorted[index + direction];
    if (!target) return;
    try {
      await Promise.all([
        updateBanner(banner.id, { ...banner, sort_order: target.sort_order }),
        updateBanner(target.id, { ...target, sort_order: banner.sort_order }),
      ]);
      load();
    } catch {
      toast.error("Failed to reorder");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Banners</h1>
        <p className="text-sm text-slate-500">Manage the homepage hero slider and offer banner. Schedule dates are optional — banners outside their window are hidden automatically.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PLACEMENTS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => { setPlacement(p.key); resetForm(); }}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                placement === p.key ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900">{editingId ? "Edit Banner" : "New Banner"}</h2>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Eyebrow (small text above title)</label>
            <input name="eyebrow" value={form.eyebrow} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
            <input name="title" value={form.title} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Subtitle</label>
            <textarea name="subtitle" value={form.subtitle} onChange={onChange} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Button label</label>
              <input name="cta_label" value={form.cta_label} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Button link</label>
              <input name="cta_url" value={form.cta_url} onChange={onChange} placeholder="/shop?category=…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Background gradient</label>
            <select name="tone" value={form.tone} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
              {TONES.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
            </select>
            <div className={`mt-2 h-8 rounded-lg bg-gradient-to-r ${form.tone}`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Image (optional)</label>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex h-[42px] w-full items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-500 hover:border-indigo-400"
            >
              {form.image_path ? (
                <img src={getImageUrl(form.image_path)} alt="" className="h-8 w-8 rounded object-cover" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {form.image_path ? "Change image" : "Select image"}
            </button>
            {form.image_path && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, image_path: "" }))} className="mt-1 text-xs text-rose-500 hover:underline">
                Remove image
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Starts (optional)</label>
              <input type="datetime-local" name="starts_at" value={form.starts_at} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ends (optional)</label>
              <input type="datetime-local" name="ends_at" value={form.ends_at} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={onChange} className="h-4 w-4" />
            Visible on storefront
          </label>

          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60">
              {isSaving ? "Saving…" : editingId ? "Update" : "Add Banner"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="space-y-4 lg:col-span-2">
          {loading ? (
            <p className="rounded-2xl border border-gray-100 bg-white py-10 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
          ) : banners.length === 0 ? (
            <p className="rounded-2xl border border-gray-100 bg-white py-10 text-center text-sm text-slate-400 shadow-sm">No banners yet.</p>
          ) : (
            banners.map((banner) => (
              <div key={banner.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className={`bg-gradient-to-r px-5 py-4 text-amber-50 ${banner.tone || TONES[0]}`}>
                  {banner.eyebrow && <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">{banner.eyebrow}</p>}
                  <p className="text-lg font-semibold">{banner.title}</p>
                  {banner.subtitle && <p className="text-xs text-amber-100/90">{banner.subtitle}</p>}
                  {banner.cta_label && (
                    <span className="mt-2 inline-block rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-red-950">{banner.cta_label} → {banner.cta_url}</span>
                  )}
                </div>
                <div className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {!banner.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Hidden</span>}
                    {(banner.starts_at || banner.ends_at) && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                        {banner.starts_at ? new Date(banner.starts_at).toLocaleDateString() : "…"} – {banner.ends_at ? new Date(banner.ends_at).toLocaleDateString() : "…"}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => moveBanner(banner, -1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => moveBanner(banner, 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => startEdit(banner)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setPendingDelete(banner)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(path) => {
          setForm((f) => ({ ...f, image_path: path }));
          setPickerOpen(false);
        }}
      />

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this banner?"
        message="This will remove the banner from the homepage."
        confirmLabel="Delete"
        tone="danger"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
