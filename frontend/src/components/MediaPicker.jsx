import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, UploadCloud, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { getMedia, uploadMedia } from "../services/mediaService";
import { getImageUrl } from "../utils/getImageUrl";

// Reusable "pick an image" modal — grid of existing Media Library assets plus
// an upload-new tab. Used anywhere a module needs an image field (site logo,
// blog featured image, banner image) instead of a bare <input type="file">.
export default function MediaPicker({ open, onClose, onSelect }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadAssets(searchValue = search) {
    setLoading(true);
    try {
      const data = await getMedia({ search: searchValue, limit: 60 });
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

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-white/60 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Select an image</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadAssets()}
            placeholder="Search media…"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload new"}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
          ) : assets.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No media yet. Upload your first image.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelect(asset.path, asset)}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-400"
                  title={asset.title || asset.original_name}
                >
                  <img src={getImageUrl(asset.path)} alt={asset.alt_text || asset.original_name || ""} className="h-full w-full object-cover" />
                  <span className="absolute inset-0 hidden items-center justify-center bg-indigo-600/40 group-hover:flex">
                    <Check className="h-6 w-6 text-white" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
