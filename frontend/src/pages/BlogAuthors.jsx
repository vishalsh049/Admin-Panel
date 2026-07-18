import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { getAuthors, createAuthor, updateAuthor, deleteAuthor } from "../services/blogService";
import ConfirmModal from "../components/ConfirmModal";

const emptyForm = { name: "", role: "", bio: "", initials: "" };

export default function BlogAuthors() {
  const [authors, setAuthors] = useState([]);
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
      setAuthors(await getAuthors());
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load authors");
    } finally {
      setLoading(false);
    }
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function startEdit(author) {
    setEditingId(author.id);
    setForm({ name: author.name, role: author.role || "", bio: author.bio || "", initials: author.initials || "" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Author name is required");
    setIsSaving(true);
    try {
      if (editingId) {
        await updateAuthor(editingId, form);
        toast.success("Author updated");
      } else {
        await createAuthor(form);
        toast.success("Author created");
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
      await deleteAuthor(pendingDelete.id);
      toast.success("Author deleted");
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
        <h1 className="text-lg font-semibold text-slate-900">Blog Authors</h1>
        <p className="text-sm text-slate-500">Authors that can be assigned to blog posts.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900">{editingId ? "Edit Author" : "New Author"}</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <input name="name" value={form.name} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
            <input name="role" value={form.role} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Initials (shown as avatar)</label>
            <input name="initials" value={form.initials} onChange={onChange} maxLength={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Bio</label>
            <textarea name="bio" value={form.bio} onChange={onChange} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60">
              {isSaving ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Initials</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : authors.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No authors yet.</td></tr>
              ) : (
                authors.map((author) => (
                  <tr key={author.id} className="hover:bg-indigo-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{author.name}</td>
                    <td className="px-4 py-3 text-slate-600">{author.role}</td>
                    <td className="px-4 py-3 text-slate-600">{author.initials}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEdit(author)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setPendingDelete(author)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this author?"
        message="Authors that still have posts assigned cannot be deleted."
        confirmLabel="Delete"
        tone="danger"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
