import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus, Plus, Trash2, ChevronUp, ChevronDown, Megaphone } from "lucide-react";
import { getSiteSettings, updateSiteSettings } from "../services/siteSettingsService";
import { getImageUrl } from "../utils/getImageUrl";
import MediaPicker from "../components/MediaPicker";

const emptyForm = {
  site_name: "",
  logo_path: "",
  favicon_path: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  social_facebook: "",
  social_instagram: "",
  social_youtube: "",
  social_whatsapp: "",
  announcement_bar_text: "",
  extra: {},
};

let nextAnnouncementKey = 1;

export default function Settings() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerField, setPickerField] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSiteSettings();
        const extra = data.extra && typeof data.extra === "object" ? data.extra : {};
        const savedAnnouncements = Array.isArray(extra.announcements) ? extra.announcements : null;
        const announcements = savedAnnouncements && savedAnnouncements.length > 0
          ? savedAnnouncements.map((a) => ({ _key: nextAnnouncementKey++, text: a?.text || "", is_active: a?.is_active !== false }))
          : data.announcement_bar_text
            ? [{ _key: nextAnnouncementKey++, text: data.announcement_bar_text, is_active: true }]
            : [];
        setForm({ ...emptyForm, ...data, extra: { ...extra, announcements } });
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function addAnnouncement() {
    setForm((f) => ({
      ...f,
      extra: {
        ...f.extra,
        announcements: [...(f.extra?.announcements || []), { _key: nextAnnouncementKey++, text: "", is_active: true }],
      },
    }));
  }

  function updateAnnouncement(key, patch) {
    setForm((f) => ({
      ...f,
      extra: {
        ...f.extra,
        announcements: (f.extra?.announcements || []).map((a) => (a._key === key ? { ...a, ...patch } : a)),
      },
    }));
  }

  function removeAnnouncement(key) {
    setForm((f) => ({
      ...f,
      extra: { ...f.extra, announcements: (f.extra?.announcements || []).filter((a) => a._key !== key) },
    }));
  }

  function moveAnnouncement(key, dir) {
    setForm((f) => {
      const list = [...(f.extra?.announcements || [])];
      const i = list.findIndex((a) => a._key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return f;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...f, extra: { ...f.extra, announcements: list } };
    });
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const announcements = (form.extra?.announcements || [])
        .map((a) => ({ text: (a.text || "").trim(), is_active: a.is_active !== false }))
        .filter((a) => a.text);
      await updateSiteSettings({ ...form, extra: { ...form.extra, announcements } });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading settings…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Site Settings</h1>
          <p className="text-sm text-slate-500">Controls the site name, logo, contact info and social links shown across the storefront.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* SITE IDENTITY */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Site Identity</h2>
        <p className="mb-4 text-sm text-slate-500">Site name and logo shown in the storefront header and footer.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Site Name</label>
            <input
              name="site_name"
              value={form.site_name || ""}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Logo</label>
            <button
              type="button"
              onClick={() => setPickerField("logo_path")}
              className="flex h-[42px] w-full items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-500 hover:border-indigo-400"
            >
              {form.logo_path ? (
                <img src={getImageUrl(form.logo_path)} alt="Logo" className="h-8 w-8 rounded object-contain" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {form.logo_path ? "Change logo" : "Select logo"}
            </button>
          </div>
        </div>
      </div>

      {/* CONTACT INFO */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Contact Information</h2>
        <p className="mb-4 text-sm text-slate-500">Shown in the storefront footer and contact page.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Contact Email</label>
            <input
              name="contact_email"
              value={form.contact_email || ""}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Contact Phone</label>
            <input
              name="contact_phone"
              value={form.contact_phone || ""}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
            <textarea
              name="contact_address"
              value={form.contact_address || ""}
              onChange={onChange}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SOCIAL LINKS */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Social Links</h2>
        <p className="mb-4 text-sm text-slate-500">Full URLs, shown as icons in the storefront footer.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Facebook</label>
            <input
              name="social_facebook"
              value={form.social_facebook || ""}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Instagram</label>
            <input
              name="social_instagram"
              value={form.social_instagram || ""}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">YouTube</label>
            <input
              name="social_youtube"
              value={form.social_youtube || ""}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">WhatsApp</label>
            <input
              name="social_whatsapp"
              value={form.social_whatsapp || ""}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ANNOUNCEMENT BAR */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Megaphone className="h-4 w-4 text-indigo-500" /> Announcement Bar
            </h2>
            <p className="text-sm text-slate-500">
              Auto-scrolling ticker shown at the top of every storefront page. Add as many messages as you like — only active ones are shown, in this order.
            </p>
          </div>
          <button
            type="button"
            onClick={addAnnouncement}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
          >
            <Plus className="h-3.5 w-3.5" /> Add message
          </button>
        </div>

        {(form.extra?.announcements || []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
            No announcement messages yet. Add one to show the scrolling bar.
          </p>
        ) : (
          <div className="space-y-2">
            {form.extra.announcements.map((a, i) => (
              <div key={a._key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex shrink-0 flex-col text-slate-300">
                  <button type="button" disabled={i === 0} onClick={() => moveAnnouncement(a._key, -1)}
                    className="hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-slate-300">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" disabled={i === form.extra.announcements.length - 1} onClick={() => moveAnnouncement(a._key, 1)}
                    className="hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-slate-300">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={a.text}
                  onChange={(e) => updateAnnouncement(a._key, { text: e.target.value })}
                  placeholder="e.g. Free Shipping on all orders above ₹299"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500">
                  <input
                    type="checkbox"
                    checked={a.is_active !== false}
                    onChange={(e) => updateAnnouncement(a._key, { is_active: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-indigo-500"
                  />
                  Active
                </label>
                <button type="button" onClick={() => removeAnnouncement(a._key)} className="shrink-0 rounded-lg p-1.5 text-rose-500 hover:bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <MediaPicker
        open={!!pickerField}
        onClose={() => setPickerField(null)}
        onSelect={(path) => {
          setForm((f) => ({ ...f, [pickerField]: path }));
          setPickerField(null);
        }}
      />
    </div>
  );
}
