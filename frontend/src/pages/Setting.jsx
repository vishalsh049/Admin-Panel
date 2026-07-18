import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus } from "lucide-react";
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
};

export default function Settings() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerField, setPickerField] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSiteSettings();
        setForm({ ...emptyForm, ...data });
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

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateSiteSettings(form);
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
        <h2 className="mb-1 text-base font-semibold text-slate-900">Announcement Bar</h2>
        <p className="mb-4 text-sm text-slate-500">The scrolling text strip shown at the top of every storefront page.</p>

        <input
          name="announcement_bar_text"
          value={form.announcement_bar_text || ""}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
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
