import { useEffect, useState } from "react";
import { Pencil, Trash2, Star } from "lucide-react";
import toast from "react-hot-toast";
import { getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from "../services/bannerService";
import ConfirmModal from "../components/ConfirmModal";

const emptyForm = { name: "", location: "", text: "", rating: 5, is_active: true };

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setTestimonials(await getTestimonials());
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function startEdit(t) {
    setEditingId(t.id);
    setForm({ name: t.name, location: t.location || "", text: t.text, rating: t.rating || 5, is_active: t.is_active });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.text.trim()) return toast.error("Testimonial text is required");
    setIsSaving(true);
    try {
      if (editingId) {
        await updateTestimonial(editingId, form);
        toast.success("Testimonial updated");
      } else {
        await createTestimonial({ ...form, sort_order: testimonials.length });
        toast.success("Testimonial created");
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
      await deleteTestimonial(pendingDelete.id);
      toast.success("Testimonial deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Testimonials</h1>
        <p className="text-sm text-slate-500">Customer quotes shown in the homepage "What Our Customers Say" section.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900">{editingId ? "Edit Testimonial" : "New Testimonial"}</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Customer name</label>
            <input name="name" value={form.name} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Location</label>
            <input name="location" value={form.location} onChange={onChange} placeholder="City, State" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Testimonial</label>
            <textarea name="text" value={form.text} onChange={onChange} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Rating</label>
            <select name="rating" value={form.rating} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r > 1 ? "s" : ""}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={onChange} className="h-4 w-4" />
            Visible on storefront
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60">
              {isSaving ? "Saving…" : editingId ? "Update" : "Add Testimonial"}
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
          ) : testimonials.length === 0 ? (
            <p className="rounded-2xl border border-gray-100 bg-white py-10 text-center text-sm text-slate-400 shadow-sm">No testimonials yet.</p>
          ) : (
            testimonials.map((t) => (
              <div key={t.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-700">“{t.text}”</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="flex">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i <= (t.rating || 5) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                        ))}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{t.name}</span>
                      {t.location && <span className="text-xs text-slate-500">— {t.location}</span>}
                      {!t.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Hidden</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => startEdit(t)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setPendingDelete(t)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this testimonial?"
        message="This will remove the testimonial from the homepage."
        confirmLabel="Delete"
        tone="danger"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
