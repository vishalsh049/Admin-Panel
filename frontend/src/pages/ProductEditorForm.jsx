import { ImagePlus, Package2, Save, Tag, Warehouse } from "lucide-react";
import { useState } from "react";
import { useEffect, useRef } from "react";

const statusOptions = ["publish", "draft"];


export const defaultProductFormValues = {
  name: "",
  description: "",
  regular_price: "",  
  sale_price: "",     
  categories: [],
  sku: "",
  stock: "",
  status: "publish",
  image_url: "",
};

export default function ProductEditorForm({
  title,
  subtitle,
  formData,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
   categories = [],
   selectedCategories = [],
  onCategoryChange,
}) {

  const [openDropdown, setOpenDropdown] = useState(false);
  const [search, setSearch] = useState("");

const dropdownRef = useRef();

useEffect(() => {
  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setOpenDropdown(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

const filteredCategories = categories.filter((cat) =>
  cat.name.toLowerCase().includes(search.toLowerCase())
);
const handleSelectAll = () => {
  if (selectedCategories.length === categories.length) {
    onCategoryChange([]); // clear all
  } else {
    onCategoryChange(categories.map((c) => c.name)); // select all
  }
};

  return (
    <div className="">
      <div className="">
        <div className="mb-4 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 font-semibold uppercase px-2 py-0.5 text-[10px] tracking-wide text-blue-700">
                <Package2 className="h-3.5 w-3.5" />
                PRODUCT MANAGEMENT
              </div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl"> 
                {title}
              </h1>
            <p className="mt-1 text-xs text-slate-500">
                {subtitle}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
              <div className="font-medium text-slate-900">Product Source</div>
              <div className="mt-1 text-blue-700">Admin Dashboard</div>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            <GlassCard
              icon={<Tag className="h-5 w-5 text-blue-600" />}
              title="Product Details"
              description="Define the essentials customers and staff will recognize instantly."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Product Name" required>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={onChange}
                    placeholder="Enter product name"
                    className={inputClassName}
                    required
                  />
                </Field>

               <Field label="Category">
  <div className="relative" ref={dropdownRef}>

    {/* Dropdown Button */}
    <div
      onClick={() => setOpenDropdown(!openDropdown)}
      className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2 min-h-[44px] shadow-sm hover:shadow-md transition text-sm flex justify-between items-center"
    >
      <span className="text-slate-700">
        {selectedCategories.length > 0
          ? <div className="flex flex-wrap gap-2">
  {selectedCategories.length > 0 ? (
    selectedCategories.map((cat) => (
      <span
        key={cat}
        className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-2 py-1 rounded-full text-[11px] font-medium border border-blue-100 shadow-sm"
      >
        {cat}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCategoryChange(cat);
          }}
          className="text-blue-500 hover:text-red-500"
        >
          ✕
        </button>
      </span>
    ))
  ) : (
    <span className="text-slate-400">Select categories</span>
  )}
</div>
          : "Select categories"}
      </span>
      <span>▼</span>
    </div>

    {/* Dropdown Panel */}
    {openDropdown && (
  <div className="absolute z-50 mt-2 w-full max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-xl shadow-2xl p-4 space-y-3">

    {/* 🔍 SEARCH */}
    <input
      type="text"
      placeholder="Search categories..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
    />

    {/* ✅ SELECT ALL */}
    <div className="flex justify-between items-center text-xs text-slate-500">
      <button
        type="button"
        onClick={() => {
          const all = categories.map((c) => c.name);
          onCategoryChange(all);
        }}
        className="hover:text-blue-600"
      >
        Select All
      </button>

      <button
        type="button"
        onClick={() => onCategoryChange([])}
        className="hover:text-red-500"
      >
        Clear
      </button>
    </div>

    {/* 📂 CATEGORY LIST */}
    {filteredCategories
      .filter((cat) => !cat.parent_id)
      .map((parent) => (
        <div key={parent.id} className="space-y-1">

          {/* Parent */}
          <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer font-medium">
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={selectedCategories.includes(parent.name)}
              onChange={() => onCategoryChange(parent.name)}
            />
            {parent.name}
          </label>

          {/* Children */}
          <div className="ml-5 space-y-1">
            {filteredCategories
              .filter((child) => child.parent_id === parent.id)
              .map((child) => (
                <label
                  key={child.id}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    className="accent-blue-500"
                    checked={selectedCategories.includes(child.name)}
                    onChange={() => onCategoryChange(child.name)}
                  />
                  {child.name}
                </label>
              ))}
          </div>

        </div>
      ))}

  </div>
)}
  </div>
</Field>
                <div className="grid gap-5 md:grid-cols-2">

  <Field label="Regular Price (₹)" required>
    <input
      name="regular_price"
      type="number"
      value={formData.regular_price}
      onChange={onChange}
      placeholder="0.00"
      className={inputClassName}
      required
    />
  </Field>

  <Field label="Sale Price (₹)">
    <input
      name="sale_price"
      type="number"
      value={formData.sale_price}
      onChange={onChange}
      placeholder="Optional"
      className={inputClassName}
    />
  </Field>

</div>

                <Field label="SKU">
                  <input
                    name="sku"
                    value={formData.sku}
                    onChange={onChange}
                    placeholder="SKU-001"
                    className={inputClassName}
                  />
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={onChange}
                  rows="7"
                  placeholder="Write a polished product description..."
                  className={`${inputClassName} resize-none`}
                />
              </Field>
            </GlassCard>

            <GlassCard
              icon={<ImagePlus className="h-5 w-5 text-fuchsia-600" />}
              title="Media"
              description="Use a product image URL to give the catalog a polished visual identity."
            >
              <Field label="Image URL">
                <input
                  name="image_url"
                  value={formData.image_url}
                  onChange={onChange}
                  placeholder="https://example.com/product-image.jpg"
                  className={inputClassName}
                />
              </Field>

              <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                {formData.image_url ? (
                  <img
                    src={formData.image_url}
                    alt={formData.name || "Product preview"}
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
                    <ImagePlus className="h-10 w-10 text-slate-300" />
                    <div>No image preview yet</div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="space-y-4">
            <GlassCard
              icon={<Warehouse className="h-5 w-5 text-emerald-600" />}
              title="Inventory"
              description="Manage stock levels and control product visibility from here."
            >
              <div className="grid gap-5">
                <Field label="Stock">
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={onChange}
                    placeholder="0"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Status">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={onChange}
                    className={inputClassName}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "publish" ? "Publish" : "Draft"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </GlassCard>

            <GlassCard
              icon={<Save className="h-5 w-5 text-amber-600" />}
              title="Ready to Save"
              description="Review all product details before saving. You can edit or update this product anytime later."
            >
              <div className="space-y-4 text-sm text-slate-600">
                <SummaryRow label="Name" value={formData.name || "Untitled product"} />
                <SummaryRow
                  label="Price"
                  value={
                formData.sale_price
              ? `₹${formData.sale_price} (Sale)`
             : formData.regular_price
            ? `₹${formData.regular_price}`
            : "₹0.00"
           }
                />
                <SummaryRow
                  label="Stock"
                  value={formData.stock === "" ? "0 units" : `${formData.stock} units`}
                />
                <SummaryRow
                  label="Status"
                  value={formData.status === "publish" ? "Publish" : "Draft"}
                />
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#7c3aed_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(59,130,246,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_45px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : submitLabel}
                </button>

                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </GlassCard>
          </div>
        </form>
      </div>
    </div>
  );
}

function GlassCard({ icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/75 p-6 shadow-md hover:shadow-lg transition backdrop-blur-xl sm:p-7">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </div>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100";
