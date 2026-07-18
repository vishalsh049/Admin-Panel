import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ImagePlus } from "lucide-react";
import toast from "react-hot-toast";
import {
  getPost,
  createPost,
  updatePost,
  getCategories,
  getAuthors,
} from "../services/blogService";
import { slugify } from "../utils/slugify";
import { getImageUrl } from "../utils/getImageUrl";
import MediaPicker from "../components/MediaPicker";
import BlockEditor, { TEXT_BLOCK_TYPES, toStorageBlocks, fromStorageBlocks } from "../components/BlockEditor";
import SeoFieldsPanel from "../components/SeoFieldsPanel";

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  category_id: "",
  author_id: "",
  tags: "",
  tone: "",
  featured_image: "",
  status: "draft",
  is_featured: false,
  read_time: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
};

export default function BlogPostEditorForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [blocks, setBlocks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [cats, auths] = await Promise.all([getCategories(), getAuthors()]);
        setCategories(cats);
        setAuthors(auths);
      } catch (err) {
        toast.error("Failed to load categories/authors");
      }

      if (isEdit) {
        try {
          const post = await getPost(id);
          setForm({
            title: post.title || "",
            slug: post.slug || "",
            excerpt: post.excerpt || "",
            category_id: post.category_id || "",
            author_id: post.author_id || "",
            tags: (post.tags || []).join(", "),
            tone: post.tone || "",
            featured_image: post.featuredImage || "",
            status: post.status || "draft",
            is_featured: !!post.featured,
            read_time: post.readTime || "",
            seo_title: post.seo_title || "",
            seo_description: post.seo_description || "",
            seo_keywords: post.seo_keywords || "",
          });
          setBlocks(fromStorageBlocks(post.content));
          setSlugTouched(true);
        } catch (err) {
          toast.error(err.response?.data?.error || "Failed to load post");
        } finally {
          setLoading(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    if (name === "title" && !slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(value) }));
    }
  }

  function onSlugChange(e) {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        author_id: form.author_id || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        content: toStorageBlocks(blocks),
      };

      if (isEdit) {
        await updatePost(id, payload);
        toast.success("Post updated");
      } else {
        const { post } = await createPost(payload);
        toast.success("Post created");
        navigate(`/blog/edit/${post.id}`);
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
          <h1 className="text-lg font-semibold text-slate-900">{isEdit ? "Edit Post" : "Add Post"}</h1>
          <p className="text-sm text-slate-500">Build the article using content blocks below.</p>
        </div>
        <button type="submit" disabled={isSaving} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60">
          {isSaving ? "Saving…" : "Save Post"}
        </button>
      </div>

      {/* BASICS */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
          <input name="title" value={form.title} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Slug</label>
          <input value={form.slug} onChange={onSlugChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Read time (minutes)</label>
          <input type="number" name="read_time" value={form.read_time} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Excerpt</label>
          <textarea name="excerpt" value={form.excerpt} onChange={onChange} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
          <select name="category_id" value={form.category_id} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
            <option value="">Select category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Author</label>
          <select name="author_id" value={form.author_id} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
            <option value="">Select author…</option>
            {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Tags (comma separated)</label>
          <input name="tags" value={form.tags} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Featured image</label>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex h-[42px] w-full items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-500 hover:border-indigo-400"
          >
            {form.featured_image ? (
              <img src={getImageUrl(form.featured_image)} alt="" className="h-8 w-8 rounded object-cover" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {form.featured_image ? "Change image" : "Select image"}
          </button>
        </div>
        <div className="flex items-center gap-6 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={onChange} className="h-4 w-4" />
            Featured post
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.status === "published"}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? "published" : "draft" }))}
              className="h-4 w-4"
            />
            Published
          </label>
        </div>
      </div>

      {/* CONTENT BLOCKS */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Content Blocks</h2>
        <BlockEditor blocks={blocks} onChange={setBlocks} allowedTypes={TEXT_BLOCK_TYPES} />
      </div>

      {/* SEO */}
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

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(path) => {
          setForm((f) => ({ ...f, featured_image: path }));
          setPickerOpen(false);
        }}
      />
    </form>
  );
}
