import React, { useState, useEffect } from "react";
import { BASE_URL } from "../utils/api";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);

  const buildTree = (data) => {
    const map = {};
    const tree = [];

    data.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });

    data.forEach((item) => {
      if (item.parent_id) {
        map[item.parent_id]?.children.push(map[item.id]);
      } else {
        tree.push(map[item.id]);
      }
    });

    return tree;
  };

  const treeData = buildTree(Array.isArray(categories) ? categories : []);

  // 🔥 FETCH
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/categories`);

      const data = await res.json(); // ✅ always read data

      console.log("API DATA:", data); // optional

      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ❌ DELETE CATEGORY
const handleDelete = async (id) => {
  if (!window.confirm("Delete this category?")) return;

  try {
    const res = await fetch(`${BASE_URL}/api/categories/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Delete failed");
      return;
    }

    alert("Category Deleted ✅");

    fetchCategories();
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
};

// ✏️ EDIT CATEGORY
const handleEdit = (category) => {
  setEditingId(category.id);

  setName(category.name || "");
  setSlug(category.slug || "");
  setDescription(category.description || "");
  setParentId(category.parent_id || "");
};

  // ➕ ADD CATEGORY
  const handleAdd = async () => {
    if (!name.trim()) return alert("Name required");

    try {
      const url = editingId
  ? `${BASE_URL}/api/categories/${editingId}`
  : `${BASE_URL}/api/categories`;

const method = editingId ? "PUT" : "POST";

const res = await fetch(url, {
  method,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name,
    slug,
    description: description || "",
    parent_id: parentId ? Number(parentId) : null,
  }),
});

      const data = await res.json();
      console.log("Backend response:", data);

      if (!res.ok) {
        alert(data.error || "Failed to add category");
        return;
      }

      alert(
      editingId
    ? "Category Updated ✅"
    : "Category Added ✅"
);

      // reset form
      setName("");
      setSlug("");
      setDescription("");
      setParentId("");
      setEditingId(null);

   fetchCategories();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const renderTree = (nodes, level = 0) => {
    return nodes.map((node) => (
      <React.Fragment key={node.id}>
        <tr className="group hover:bg-indigo-50/60">
          <td className="py-3 pr-3">
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-gray-100 bg-white text-xs text-gray-500"
                  title={`Level ${level}`}
                >
                  {level}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="truncate font-medium text-gray-900"
                    style={{ paddingLeft: `${level * 16}px` }}
                  >
                    {level > 0 && "↳ "}
                    {node.name}
                  </span>
                  {node.parent_id ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">
                      Sub
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700 border border-gray-100">
                      Main
                    </span>
                  )}
                </div>

                {node.description ? (
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                    {node.description}
                  </p>
                ) : null}
              </div>
            </div>
          </td>

          <td className="py-3 pr-3">
            <span className="inline-flex max-w-[240px] items-center rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-700 border border-gray-100 truncate">
              {node.slug || "-"}
            </span>
          </td>

          <td className="py-3 pr-3">
            <span className="text-xs text-gray-600">
              {node.parent_id ? "Subcategory" : "Main"}
            </span>
          </td>

          <td className="py-3">
            <div className="flex items-center gap-2">
             <button
             onClick={() => handleEdit(node)}
            className="inline-flex items-center justify-center rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50/70 transition"
            type="button"
                >
              Edit
          </button>

            <button
  onClick={() => handleDelete(node.id)}
  className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50/70 transition"
  type="button"
>
  Delete
</button>
            </div>
          </td>
        </tr>

        {node.children.length > 0 && renderTree(node.children, level + 1)}
      </React.Fragment>
    ));
  };

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // remove special chars
      .replace(/\s+/g, "-") // space → dash
      .replace(/-+/g, "-"); // remove extra dashes
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Categories
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your product categories and nested subcategories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm">
            <div className="text-xs text-gray-500">Total categories</div>
            <div className="text-lg font-semibold text-gray-900">
              {Array.isArray(categories) ? categories.length : 0}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT FORM */}
        <section className="col-span-12 lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Add new category
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Create a new category (optional parent for subcategories).
            </p>
          </div>

          {/* NAME */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
                setSlug(generateSlug(value)); // 👈 auto slug
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              placeholder="e.g. Electronics"
            />
          </div>

          {/* SLUG */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              placeholder="e.g. electronics"
            />
          </div>

          {/* PARENT */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent category
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(Number(e.target.value) || "")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            >
              <option value="">None</option>

              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* DESCRIPTION */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[110px] rounded-xl border border-gray-200 px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              placeholder="Short description (optional)"
            />
          </div>

          <button
            onClick={handleAdd}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition focus:ring-2 focus:ring-indigo-500/25"
            type="button"
          >
           {editingId ? "Update Category" : "Add Category"}
          </button>
        </section>

        {/* RIGHT TABLE */}
        <section className="col-span-12 lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-0 sm:p-0">
          <div className="border-b border-gray-100 px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Category list
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Nested structure is displayed with indentation.
              </p>
            </div>
            <div className="hidden sm:block rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                Tip
              </div>
              <div className="text-sm font-medium text-gray-700">
                Use Parent to create subcategories
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Slug</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {renderTree(treeData)}

                {categories.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="text-gray-900 font-semibold">
                          No categories found
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          Add your first category from the form on the left.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
