import { Fragment, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ExternalLink, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, seedMenuFromCategories } from "../services/menuService";
import { getCategories as getProductCategories } from "../services/categoryService";
import { getCategories as getBlogCategories } from "../services/blogService";
import ConfirmModal from "../components/ConfirmModal";

const LOCATIONS = [
  { key: "header", label: "Header Menu", supportsChildren: true },
  { key: "footer_quick_links", label: "Footer — Quick Links", supportsChildren: false },
  { key: "footer_policies", label: "Footer — Policies", supportsChildren: false },
];

const emptyForm = {
  label: "",
  link_type: "custom_url",
  url: "",
  category_id: "",
  blog_category_id: "",
  parent_id: "",
  is_active: true,
};

export default function Menus() {
  const [location, setLocation] = useState("header");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productCategories, setProductCategories] = useState([]);
  const [blogCategories, setBlogCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const activeLocationMeta = LOCATIONS.find((l) => l.key === location);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => {
    getProductCategories().then(setProductCategories).catch(() => {});
    getBlogCategories().then(setBlogCategories).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      setItems(await getMenuItems(location));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load menu items");
    } finally {
      setLoading(false);
    }
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      label: item.label,
      link_type: item.link_type,
      url: item.url || "",
      category_id: item.category_id || "",
      blog_category_id: item.blog_category_id || "",
      parent_id: item.parent_id || "",
      is_active: item.is_active,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.label.trim()) return toast.error("Label is required");
    if (form.link_type === "custom_url" && !form.url.trim()) return toast.error("URL is required");
    if (form.link_type === "category" && !form.category_id) return toast.error("Select a category");
    if (form.link_type === "blog_category" && !form.blog_category_id) return toast.error("Select a blog category");

    setIsSaving(true);
    try {
      const payload = { ...form, location, parent_id: form.parent_id || null };
      if (editingId) {
        await updateMenuItem(editingId, payload);
        toast.success("Menu item updated");
      } else {
        await createMenuItem({ ...payload, sort_order: items.filter((i) => (i.parent_id || null) === (payload.parent_id || null)).length });
        toast.success("Menu item created");
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
      await deleteMenuItem(pendingDelete.id);
      toast.success("Menu item deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmSeedFromCategories() {
    setIsSeeding(true);
    try {
      const result = await seedMenuFromCategories(location);
      toast.success(
        result.created > 0
          ? `Added ${result.created} categor${result.created === 1 ? "y" : "ies"} to the menu (${result.skipped} already linked)`
          : "Every active top-level category is already in this menu"
      );
      setShowSeedConfirm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to populate menu from categories");
    } finally {
      setIsSeeding(false);
    }
  }

  async function moveItem(item, direction) {
    const siblings = items
      .filter((i) => (i.parent_id || null) === (item.parent_id || null))
      .sort((a, b) => a.sort_order - b.sort_order);
    const index = siblings.findIndex((i) => i.id === item.id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const a = siblings[index];
    const b = siblings[targetIndex];
    try {
      await Promise.all([
        updateMenuItem(a.id, { ...a, sort_order: b.sort_order }),
        updateMenuItem(b.id, { ...b, sort_order: a.sort_order }),
      ]);
      load();
    } catch (err) {
      toast.error("Failed to reorder");
    }
  }

  const topLevel = items.filter((i) => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (id) => items.filter((i) => i.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);

  function renderRow(item, isChild = false) {
    return (
      <tr key={item.id} className="hover:bg-indigo-50/60">
        <td className={`px-4 py-3 font-medium text-slate-800 ${isChild ? "pl-10" : ""}`}>
          {isChild && <span className="mr-1.5 text-slate-300">↳</span>}
          {item.label}
          {!item.is_active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Hidden</span>}
        </td>
        <td className="px-4 py-3 text-slate-500">
          <a href={item.resolvedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-indigo-600">
            {item.resolvedUrl} <ExternalLink className="h-3 w-3" />
          </a>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={() => moveItem(item, -1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => moveItem(item, 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><ArrowDown className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => startEdit(item)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setPendingDelete(item)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Menus</h1>
            <p className="text-sm text-slate-500">Manage the header navigation and footer link columns shown on the storefront.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSeedConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Sparkles className="h-3.5 w-3.5" /> Populate from Categories
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.key}
              type="button"
              onClick={() => { setLocation(loc.key); resetForm(); }}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                location === loc.key ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900">{editingId ? "Edit Item" : "New Item"}</h2>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Label</label>
            <input name="label" value={form.label} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>

          {activeLocationMeta?.supportsChildren && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Parent (for a submenu item)</label>
              <select name="parent_id" value={form.parent_id} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
                <option value="">None (top-level item)</option>
                {topLevel.filter((i) => i.id !== editingId).map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Link type</label>
            <select name="link_type" value={form.link_type} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
              <option value="custom_url">Custom URL</option>
              <option value="category">Product Category</option>
              <option value="blog_category">Blog Category</option>
            </select>
          </div>

          {form.link_type === "custom_url" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">URL</label>
              <input name="url" value={form.url} onChange={onChange} placeholder="/shop or https://…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
            </div>
          )}

          {form.link_type === "category" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Product Category</label>
              <select name="category_id" value={form.category_id} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
                <option value="">Select category…</option>
                {productCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {form.link_type === "blog_category" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Blog Category</label>
              <select name="blog_category_id" value={form.blog_category_id} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
                <option value="">Select blog category…</option>
                {blogCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={onChange} className="h-4 w-4" />
            Visible on storefront
          </label>

          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60">
              {isSaving ? "Saving…" : editingId ? "Update" : "Add Item"}
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
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : topLevel.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-400">No items yet.</td></tr>
              ) : (
                topLevel.map((item) => (
                  <Fragment key={item.id}>
                    {renderRow(item)}
                    {activeLocationMeta?.supportsChildren && childrenOf(item.id).map((child) => renderRow(child, true))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this menu item?"
        message="Items with submenu children cannot be deleted until the children are removed first."
        confirmLabel="Delete"
        tone="danger"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmModal
        open={showSeedConfirm}
        title="Populate this menu from categories?"
        message={`Adds every active, top-level product category to "${activeLocationMeta?.label}" that isn't already linked. Existing items are left untouched — safe to run more than once.`}
        confirmLabel="Populate"
        tone="info"
        isBusy={isSeeding}
        onConfirm={confirmSeedFromCategories}
        onCancel={() => setShowSeedConfirm(false)}
      />
    </div>
  );
}
