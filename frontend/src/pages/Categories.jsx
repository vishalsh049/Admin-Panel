import React, { useState, useEffect } from "react";
import { BASE_URL } from "../utils/api";

export default function Categories() {

  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");

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
  }, []);

  // ➕ ADD CATEGORY
 const handleAdd = async () => {
  if (!name.trim()) return alert("Name required");

  try {
    const res = await fetch(`${BASE_URL}/api/categories`, {
      method: "POST",
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

    alert("Category Added ✅");

    // reset form
    setName("");
    setSlug("");
    setDescription("");
    setParentId("");

    fetchCategories();

  } catch (err) {
    console.error("Error:", err);
  }
};

  const renderTree = (nodes, level = 0) => {
  return nodes.map((node) => (
    <React.Fragment key={node.id}>

      <tr className="border-b hover:bg-gray-50">
        <td className="p-2">
          <span style={{ paddingLeft: `${level * 20}px` }}>
            {level > 0 && "↳ "}
            {node.name}
          </span>
        </td>

        <td className="p-2">{node.slug || "-"}</td>

        <td className="p-2">
          {node.parent_id ? "Subcategory" : "Main"}
        </td>

        <td className="p-2 flex gap-2">
          <button className="text-blue-500">Edit</button>
          <button className="text-red-500">Delete</button>
        </td>
      </tr>

      {node.children.length > 0 &&
        renderTree(node.children, level + 1)}

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
    <div className="p-6 bg-gray-50 min-h-screen">

      <h1 className="text-2xl font-semibold mb-6">
        Product Categories
      </h1>

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT FORM */}
        <div className="col-span-4 bg-white p-6 rounded-xl shadow">

          <h2 className="font-semibold mb-4 text-lg">
            Add new category
          </h2>

          {/* NAME */}
          <label className="block text-sm mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => {
  const value = e.target.value;
  setName(value);
  setSlug(generateSlug(value)); // 👈 auto slug
}}
            className="w-full border px-3 py-2 rounded mb-3"
          />

          {/* SLUG */}
          <label className="block text-sm mb-1">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-3"
          />

          {/* PARENT */}
          <label className="block text-sm mb-1">Parent category</label>
        <select
  value={parentId}
  onChange={(e) => setParentId(Number(e.target.value) || "")}
  className="w-full border px-3 py-2 rounded mb-3"
>
  <option value="">None</option>

  {categories.map((cat) => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  ))}
</select> 

          {/* DESCRIPTION */}
          <label className="block text-sm mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-4"
          />

          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Add Category
          </button>
        </div>

        {/* RIGHT TABLE */}
        <div className="col-span-8 bg-white p-6 rounded-xl shadow">

          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 text-sm border-b">
                <th className="p-2">Name</th>
                <th className="p-2">Slug</th>
                <th className="p-2">Parent</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>

            <tbody>
  {renderTree(treeData)}

  {categories.length === 0 && (
    <tr>
      <td colSpan="4" className="text-center py-6 text-gray-400">
        No categories found
      </td>
    </tr>
  )}
</tbody>

          </table>

        </div>
      </div>
    </div>
  );
}