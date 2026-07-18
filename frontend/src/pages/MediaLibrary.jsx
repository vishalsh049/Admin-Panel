import { useEffect, useRef, useState } from "react";
import { UploadCloud, Trash2, Loader2, Search, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { getMedia, uploadMedia, updateMediaMeta, deleteMedia } from "../services/mediaService";
import { getImageUrl } from "../utils/getImageUrl";
import ConfirmModal from "../components/ConfirmModal";

export default function MediaLibrary() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", alt_text: "" });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAssets(searchValue = search) {
    setLoading(true);
    try {
      const data = await getMedia({ search: searchValue, limit: 100 });
      setAssets(data.assets || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load media");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { asset } = await uploadMedia(file);
      toast.success("Image uploaded");
      setAssets((prev) => [asset, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openEdit(asset) {
    setEditing(asset);
    setEditForm({ title: asset.title || "", alt_text: asset.alt_text || "" });
  }

  async function saveEdit() {
    setIsBusy(true);
    try {
      const { asset } = await updateMediaMeta(editing.id, editForm);
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? asset : a)));
      toast.success("Media details updated");
      setEditing(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmDelete() {
    setIsBusy(true);
    try {
      await deleteMedia(pendingDelete.id);
      setAssets((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      toast.success("Media deleted");
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
          <h1 className="text-lg font-semibold text-slate-900">Media Library</h1>
          <p className="text-sm text-slate-500">Upload and manage images used across the site.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload Image"}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="relative mb-5 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadAssets()}
            placeholder="Search by name, title, alt text…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : assets.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No media yet. Upload your first image above.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {assets.map((asset) => (
              <div key={asset.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="aspect-square">
                  <img src={getImageUrl(asset.path)} alt={asset.alt_text || asset.original_name || ""} className="h-full w-full object-cover" />
                </div>
                <div className="absolute inset-0 hidden flex-col justify-between bg-slate-900/50 p-2 group-hover:flex">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(asset)}
                      className="rounded-lg bg-white/90 p-1.5 text-slate-700 hover:bg-white"
                      title="Edit details"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(asset)}
                      className="rounded-lg bg-white/90 p-1.5 text-rose-600 hover:bg-white"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="truncate text-[11px] text-white/90">{asset.title || asset.original_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Edit media details</h2>
            <img src={getImageUrl(editing.path)} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Alt text</label>
                <input
                  type="text"
                  value={editForm.alt_text}
                  onChange={(e) => setEditForm((f) => ({ ...f, alt_text: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} disabled={isBusy} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} disabled={isBusy} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {isBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this image?"
        message="This will remove the image from the Media Library and delete the file."
        confirmLabel="Delete"
        tone="danger"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
