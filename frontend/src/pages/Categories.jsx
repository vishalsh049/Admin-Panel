import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search, ImagePlus, Trash2 } from "lucide-react";
import * as categoryService from "../services/categoryService";
import { getImageUrl } from "../utils/getImageUrl";
import { slugify } from "../utils/slugify";
import ConfirmModal from "../components/ConfirmModal";
import SeoFieldsPanel from "../components/SeoFieldsPanel";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  parent_id: "",
  status: "Active",
  image: "",
  banner: "",
  icon: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  sort_order: 0,
  is_featured: false,
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [uploading, setUploading] = useState({ image: false, banner: false, icon: false });

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch categories error:", err);
      toast.error("Failed to load categories");
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q) || (c.slug || "").toLowerCase().includes(q));
  }, [categories, search]);

  const treeData = useMemo(() => {
    const map = {};
    const tree = [];
    filteredCategories.forEach((item) => { map[item.id] = { ...item, children: [] }; });
    filteredCategories.forEach((item) => {
      if (item.parent_id && map[item.parent_id]) map[item.parent_id].children.push(map[item.id]);
      else tree.push(map[item.id]);
    });
    const sortRec = (nodes) => {
      nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      nodes.forEach((n) => sortRec(n.children));
      return nodes;
    };
    return sortRec(tree);
  }, [filteredCategories]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSlugTouched(false);
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setSlugTouched(true);
    setForm({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      parent_id: category.parent_id || "",
      status: category.status || "Active",
      image: category.image || "",
      banner: category.banner || "",
      icon: category.icon || "",
      seo_title: category.seo_title || "",
      seo_description: category.seo_description || "",
      seo_keywords: category.seo_keywords || "",
      sort_order: category.sort_order || 0,
      is_featured: !!category.is_featured,
    });
  };

  const handleNameChange = (value) => {
    setForm((f) => ({ ...f, name: value, slug: slugTouched ? f.slug : slugify(value) }));
  };

  const handleUpload = async (field, file) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [field]: true }));
    try {
      const data = await categoryService.uploadCategoryImage(file);
      setForm((f) => ({ ...f, [field]: data.path }));
    } catch (error) {
      toast.error(error.response?.data?.error || "Upload failed");
    } finally {
      setUploading((u) => ({ ...u, [field]: false }));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...form, parent_id: form.parent_id ? Number(form.parent_id) : null };
      if (editingId) {
        await categoryService.updateCategory(editingId, payload);
        toast.success("Category updated");
      } else {
        await categoryService.createCategory(payload);
        toast.success("Category added");
      }
      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsBusy(true);
    try {
      await categoryService.deleteCategory(pendingDelete.id);
      toast.success("Category deleted");
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || "Delete failed");
    } finally {
      setIsBusy(false);
      setPendingDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    setIsBusy(true);
    try {
      await categoryService.bulkDeleteCategories(selected);
      toast.success("Selected categories deleted");
      setSelected([]);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || "Bulk delete failed");
    } finally {
      setIsBusy(false);
      setPendingBulkDelete(false);
    }
  };

  const renderTree = (nodes, level = 0) =>
    nodes.map((node) => (
      <React.Fragment key={node.id}>
        <tr className="group hover:bg-indigo-50/60">
          <td className="py-3 pl-4">
            <input type="checkbox" checked={selected.includes(node.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, node.id] : prev.filter((id) => id !== node.id))} />
          </td>
          <td className="py-3 pr-3">
            <div className="flex items-start gap-3">
              {node.image ? (
                <img src={getImageUrl(node.image)} alt="" className="h-9 w-9 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-300">
                  <ImagePlus className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-gray-900" style={{ paddingLeft: `${level * 16}px` }}>
                    {level > 0 && "↳ "}{node.name}
                  </span>
                  {node.parent_id ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">Sub</span>
                  ) : (
                    <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700 border border-gray-100">Main</span>
                  )}
                  {node.is_featured && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">Featured</span>
                  )}
                </div>
                {node.description ? <p className="mt-1 line-clamp-1 text-xs text-gray-500">{node.description}</p> : null}
              </div>
            </div>
          </td>
          <td className="py-3 pr-3">
            <span className="inline-flex max-w-[200px] items-center rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-700 border border-gray-100 truncate">{node.slug || "-"}</span>
          </td>
          <td className="py-3 pr-3 text-xs text-gray-600">{node.productCount ?? 0}</td>
          <td className="py-3 pr-3">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${node.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
              {node.status || "Active"}
            </span>
          </td>
          <td className="py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(node)} type="button" className="inline-flex items-center justify-center rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50/70 transition">
                Edit
              </button>
              <button onClick={() => setPendingDelete(node)} type="button" className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50/70 transition">
                Delete
              </button>
            </div>
          </td>
        </tr>
        {node.children.length > 0 && renderTree(node.children, level + 1)}
      </React.Fragment>
    ));

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your product categories and nested subcategories.</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.length > 0 && (
            <button onClick={() => setPendingBulkDelete(true)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              <Trash2 className="h-4 w-4" /> Delete ({selected.length})
            </button>
          )}
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm">
            <div className="text-xs text-gray-500">Total categories</div>
            <div className="text-lg font-semibold text-gray-900">{categories.length}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit category" : "Add new category"}</h2>
            <p className="mt-1 text-sm text-gray-600">Create a new category (optional parent for subcategories).</p>
          </div>

          <FormField label="Name">
            <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} className={fieldClass} placeholder="e.g. Puja Items" />
          </FormField>

          <FormField label="Slug">
            <input value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }} className={fieldClass} placeholder="e.g. puja-items" />
          </FormField>

          <FormField label="Parent category">
            <select value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))} className={fieldClass}>
              <option value="">None</option>
              {categories.filter((c) => c.id !== editingId).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Sort Order">
              <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} className={fieldClass} />
            </FormField>
            <FormField label="Status">
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={fieldClass}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          </div>

          <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
            Featured category (shown on homepage)
          </label>

          <FormField label="Description">
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${fieldClass} min-h-[90px]`} placeholder="Short description (optional)" />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <ImageField label="Image" value={form.image} uploading={uploading.image} onUpload={(f) => handleUpload("image", f)} />
            <ImageField label="Banner" value={form.banner} uploading={uploading.banner} onUpload={(f) => handleUpload("banner", f)} />
            <ImageField label="Icon" value={form.icon} uploading={uploading.icon} onUpload={(f) => handleUpload("icon", f)} />
          </div>

          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">SEO</div>
            <SeoFieldsPanel
              seoTitle={form.seo_title}
              seoDescription={form.seo_description}
              seoKeywords={form.seo_keywords}
              fallbackTitle={form.name}
              onChange={(name, value) => setForm((f) => ({ ...f, [name]: value }))}
            />
          </div>

          <div className="mt-5 flex gap-3">
            <button onClick={handleSave} disabled={isSaving} className="flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-60" type="button">
              {isSaving ? "Saving..." : editingId ? "Update Category" : "Add Category"}
            </button>
            {editingId && (
              <button onClick={resetForm} type="button" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            )}
          </div>
        </section>

        <section className="col-span-12 lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-5 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Category list</h2>
              <p className="mt-1 text-sm text-gray-600">Nested structure is displayed with indentation.</p>
            </div>
            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3"></th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Slug</th>
                  <th className="px-3 py-3 font-semibold">Products</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {renderTree(treeData)}
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-10 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="text-gray-900 font-semibold">No categories found</div>
                        <div className="mt-1 text-sm text-gray-600">Add your first category from the form on the left.</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        message="This will be blocked if any products still use this category."
        confirmLabel="Delete"
        isBusy={isBusy}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmModal
        open={pendingBulkDelete}
        title={`Delete ${selected.length} selected categories?`}
        message="Categories still in use by products will block the whole batch."
        confirmLabel="Delete"
        isBusy={isBusy}
        onConfirm={handleBulkDelete}
        onCancel={() => setPendingBulkDelete(false)}
      />
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  );
}

function ImageField({ label, value, uploading, onUpload }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center hover:bg-gray-100">
        {value ? (
          <img src={getImageUrl(value)} alt="" className="h-full w-full rounded-xl object-cover" />
        ) : (
          <span className="text-[11px] text-gray-400">{uploading ? "..." : "Upload"}</span>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files[0])} />
      </label>
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition";
