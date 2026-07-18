import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getPage, createPage, updatePage } from "../services/pagesService";
import { slugify } from "../utils/slugify";
import BlockEditor, { PAGE_BLOCK_TYPES, toStorageBlocks, fromStorageBlocks } from "../components/BlockEditor";
import SeoFieldsPanel from "../components/SeoFieldsPanel";

const emptyForm = {
  title: "",
  slug: "",
  status: "draft",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
};

export default function PageEditorForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [blocks, setBlocks] = useState([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const page = await getPage(id);
        setForm({
          title: page.title || "",
          slug: page.slug || "",
          status: page.status || "draft",
          seo_title: page.seo_title || "",
          seo_description: page.seo_description || "",
          seo_keywords: page.seo_keywords || "",
        });
        setBlocks(fromStorageBlocks(page.blocks));
        setSlugTouched(true);
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load page");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "title" && !slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(value) }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");

    setIsSaving(true);
    try {
      const payload = { ...form, blocks: toStorageBlocks(blocks) };
      if (isEdit) {
        await updatePage(id, payload);
        toast.success("Page updated");
      } else {
        const { page } = await createPage(payload);
        toast.success("Page created");
        navigate(`/pages/edit/${page.id}`);
        return;
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{isEdit ? "Edit Page" : "Add Page"}</h1>
          <p className="text-sm text-slate-500">Build the page from content blocks — hero, text, images, CTA banners, FAQs.</p>
        </div>
        <button type="submit" disabled={isSaving} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60">
          {isSaving ? "Saving…" : "Save Page"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
          <input name="title" value={form.title} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Slug (URL: /pages/&lt;slug&gt;)</label>
          <input
            value={form.slug}
            onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.status === "published"}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? "published" : "draft" }))}
            className="h-4 w-4"
          />
          Published
        </label>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Content Blocks</h2>
        <BlockEditor blocks={blocks} onChange={setBlocks} allowedTypes={PAGE_BLOCK_TYPES} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">SEO</h2>
        <SeoFieldsPanel
          seoTitle={form.seo_title}
          seoDescription={form.seo_description}
          seoKeywords={form.seo_keywords}
          fallbackTitle={form.title}
          onChange={(name, value) => setForm((f) => ({ ...f, [name]: value }))}
        />
      </div>
    </form>
  );
}
