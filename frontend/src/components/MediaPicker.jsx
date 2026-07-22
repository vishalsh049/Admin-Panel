import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, UploadCloud, Check, Loader2, ImageDown } from "lucide-react";
import toast from "react-hot-toast";
import { getMedia, uploadMedia } from "../services/mediaService";
import { getImageUrl } from "../utils/getImageUrl";

// Reusable "pick an image" modal — grid of existing Media Library assets plus
// an upload-new tab. Used anywhere a module needs an image field (site logo,
// blog featured image, banner image) instead of a bare <input type="file">.
// Also accepts images dragged straight from the desktop onto the modal.
export default function MediaPicker({ open, onClose, onSelect }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dragDepth = useRef(0);

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

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const { asset } = await uploadMedia(file);
        setAssets((prev) => [asset, ...prev]);
        uploaded += 1;
      } catch (err) {
        toast.error(err.response?.data?.error || `Failed to upload ${file.name}`);
      }
    }
    if (uploaded > 0) toast.success(uploaded === 1 ? "Image uploaded" : `${uploaded} images uploaded`);
    setUploading(false);
  }

  async function handleUpload(e) {
    await uploadFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onDragEnter(e) {
    e.preventDefault();
    if (e.dataTransfer.types?.includes("Files")) {
      dragDepth.current += 1;
      setIsDragging(true);
    }
  }
  function onDragOver(e) {
    e.preventDefault();
  }
  function onDragLeave(e) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }
  function onDrop(e) {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    uploadFiles(e.dataTransfer.files);
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-white/60 bg-white shadow-2xl"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-500 bg-indigo-50/90">
            <ImageDown className="h-8 w-8 text-indigo-500" />
            <p className="text-sm font-semibold text-indigo-600">Drop images to upload</p>
          </div>
        )}

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
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-14 text-center">
              <ImageDown className="h-7 w-7 text-slate-300" />
              <p className="text-sm text-slate-400">No media yet. Drag &amp; drop images here, or use Upload new.</p>
            </div>
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
