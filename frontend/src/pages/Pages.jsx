import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { getPages, updatePage, deletePage } from "../services/pagesService";
import ConfirmModal from "../components/ConfirmModal";

export default function Pages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setPages(await getPages());
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load pages");
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(page) {
    try {
      const nextStatus = page.status === "published" ? "draft" : "published";
      await updatePage(page.id, { ...page, status: nextStatus });
      toast.success(nextStatus === "published" ? "Page published" : "Page moved to draft");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    }
  }

  async function confirmDelete() {
    setIsBusy(true);
    try {
      await deletePage(pendingDelete.id);
      setPages((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      toast.success("Page deleted");
      setPendingDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Pages</h1>
          <p className="text-sm text-slate-500">Custom pages (landing, festival, offers…) built from content blocks, served at /pages/&lt;slug&gt; on the storefront.</p>
        </div>
        <Link
          to="/pages/add"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Page
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : pages.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No pages yet. Add your first page.</td></tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="hover:bg-indigo-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{page.title}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="inline-flex items-center gap-1">/pages/{page.slug} <ExternalLink className="h-3 w-3" /></span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => togglePublish(page)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        page.status === "published"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {page.status === "published" ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link to={`/pages/edit/${page.id}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button type="button" onClick={() => setPendingDelete(page)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
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

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this page?"
        message="Any menu links pointing to it will stop working until you update them."
        confirmLabel="Delete"
        tone="danger"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
