import { useMemo, useState } from "react";
import {
  ImagePlus, Package2, Save, Tag, Warehouse, Search as SearchIcon,
  Star, TrendingUp, Sparkles, Award, Layers, Plus, Trash2, X, Wand2, Star as StarFilled,
} from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import toast from "react-hot-toast";
import * as productService from "../services/productService";
import { getImageUrl } from "../utils/getImageUrl";
import { slugify } from "../utils/slugify";
import ConfirmModal from "../components/ConfirmModal";
import SeoFieldsPanel from "../components/SeoFieldsPanel";

export const defaultProductFormValues = {
  name: "",
  slug: "",
  short_description: "",
  description: "",
  regular_price: "",
  sale_price: "",
  cost_price: "",
  category_id: "",
  sku: "",
  stock: "",
  low_stock_threshold: "5",
  stock_status: "in_stock",
  status: "publish",
  image_preview: "",
  images: [],
  weight: "",
  length: "",
  width: "",
  height: "",
  color: "",
  size: "",
  hsn: "",
  brand: "",
  tax_class: "",
  tax_status: "taxable",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  is_featured: false,
  is_best_seller: false,
  is_new_arrival: false,
  is_trending: false,
  has_variations: false,
  attributes: [],
  variations: [],
};

const statusOptions = ["publish", "draft"];

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

export default function ProductEditorForm({
  title,
  subtitle,
  productId,
  formData,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  categories = [],
  onImagesChanged,
  onVariationsChanged,
}) {
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!formData.slug);
  const [pendingDeleteImage, setPendingDeleteImage] = useState(null);
  const [attributeDraft, setAttributeDraft] = useState({ name: "", valuesText: "" });
  const [savingAttributes, setSavingAttributes] = useState(false);
  const [generatingVariations, setGeneratingVariations] = useState(false);

  const categoryOptions = useMemo(() => {
    const byParent = new Map();
    categories.forEach((c) => {
      const key = c.parent_id || 0;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(c);
    });
    const ordered = [];
    const walk = (parentId, depth) => {
      (byParent.get(parentId) || []).forEach((c) => {
        ordered.push({ ...c, depth });
        walk(c.id, depth + 1);
      });
    };
    walk(0, 0);
    return ordered;
  }, [categories]);

  const setField = (name, value) => onChange({ target: { name, value } });

  const handleNameChange = (e) => {
    onChange(e);
    if (!slugTouched) {
      setField("slug", slugify(e.target.value));
    }
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    onChange(e);
  };

  const handlePrimaryImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPrimary(true);
    try {
      const data = await productService.uploadPrimaryImage(file);
      setField("image_preview", data.path);
    } catch (error) {
      toast.error(error.response?.data?.error || "Image upload failed");
    } finally {
      setUploadingPrimary(false);
      e.target.value = "";
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!productId) {
      toast.error("Save the product first, then add gallery images");
      return;
    }
    setUploadingGallery(true);
    try {
      const data = await productService.addGalleryImages(productId, files);
      onImagesChanged?.(data.images);
      toast.success("Gallery images added");
    } catch (error) {
      toast.error(error.response?.data?.error || "Gallery upload failed");
    } finally {
      setUploadingGallery(false);
      e.target.value = "";
    }
  };

  const handleDeleteImage = async () => {
    if (!pendingDeleteImage) return;
    try {
      await productService.deleteGalleryImage(productId, pendingDeleteImage.id);
      onImagesChanged?.((formData.images || []).filter((img) => img.id !== pendingDeleteImage.id));
      toast.success("Image removed");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to remove image");
    } finally {
      setPendingDeleteImage(null);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await productService.setPrimaryImage(productId, imageId);
      onImagesChanged?.(
        (formData.images || []).map((img) => ({ ...img, is_primary: img.id === imageId }))
      );
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to set primary image");
    }
  };

  const handleTaxClassChange = (e) => {
    onChange(e);
  };

  // ---- Attributes / Variations ----
  const addAttributeDraft = () => {
    const name = attributeDraft.name.trim();
    const values = attributeDraft.valuesText
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!name || values.length === 0) {
      toast.error("Enter an attribute name and at least one value");
      return;
    }
    setField("attributes", [...(formData.attributes || []), { name, values, is_for_variations: true }]);
    setAttributeDraft({ name: "", valuesText: "" });
  };

  const removeAttribute = (index) => {
    setField("attributes", (formData.attributes || []).filter((_, i) => i !== index));
  };

  const saveAttributesToServer = async () => {
    if (!productId) {
      toast.error("Save the product first, then define attributes");
      return;
    }
    setSavingAttributes(true);
    try {
      await productService.saveAttributes(productId, formData.attributes || []);
      toast.success("Attributes saved");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save attributes");
    } finally {
      setSavingAttributes(false);
    }
  };

  const generateVariations = async () => {
    if (!productId) {
      toast.error("Save the product first, then generate variations");
      return;
    }
    setGeneratingVariations(true);
    try {
      await saveAttributesToServerSilently();
      const result = await productService.generateVariations(productId);
      const { variations } = await productService.getVariations(productId);
      onVariationsChanged?.(variations);
      setField("has_variations", true);
      toast.success(`Generated ${result.created} new variation(s)`);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to generate variations");
    } finally {
      setGeneratingVariations(false);
    }
  };

  const saveAttributesToServerSilently = async () => {
    await productService.saveAttributes(productId, formData.attributes || []);
  };

  const updateVariationField = (variationId, field, value) => {
    setField(
      "variations",
      (formData.variations || []).map((v) => (v.id === variationId ? { ...v, [field]: value } : v))
    );
  };

  const saveVariationRow = async (variation) => {
    try {
      await productService.updateVariation(productId, variation.id, {
        sku: variation.sku,
        regular_price: variation.regular_price,
        sale_price: variation.sale_price,
        stock: variation.stock,
        status: variation.status,
        stock_status: Number(variation.stock) > 0 ? "in_stock" : "out_of_stock",
      });
      toast.success("Variation saved");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save variation");
    }
  };

  const deleteVariationRow = async (variationId) => {
    try {
      await productService.deleteVariation(productId, variationId);
      setField("variations", (formData.variations || []).filter((v) => v.id !== variationId));
      toast.success("Variation deleted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete variation");
    }
  };

  const images = formData.images || [];

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 font-semibold uppercase px-2 py-0.5 text-[10px] tracking-wide text-blue-700">
              <Package2 className="h-3.5 w-3.5" />
              PRODUCT MANAGEMENT
            </div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="font-medium text-slate-900">Product Source</div>
            <div className="mt-1 text-blue-700">Admin Dashboard</div>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <GlassCard icon={<Tag className="h-5 w-5 text-blue-600" />} title="Product Details" description="Define the essentials customers and staff will recognize instantly.">
            <div className="grid gap-4">
              <Field label="Product Name" required>
                <input name="name" value={formData.name} onChange={handleNameChange} placeholder="Enter product name" className={inputClassName} required />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Slug (auto-generated)">
                  <input name="slug" value={formData.slug} onChange={handleSlugChange} placeholder="product-url-slug" className={inputClassName} />
                </Field>
                <Field label="Category">
                  <select name="category_id" value={formData.category_id || ""} onChange={onChange} className={inputClassName}>
                    <option value="">Uncategorized</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {"— ".repeat(cat.depth)}{cat.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="SKU">
                  <input name="sku" value={formData.sku} onChange={onChange} placeholder="SKU-001" className={inputClassName} />
                </Field>
                <Field label="Brand Name">
                  <input name="brand" value={formData.brand} onChange={onChange} placeholder="Enter brand name" className={inputClassName} />
                </Field>
              </div>

              <Field label="Short Description">
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={onChange}
                  rows="2"
                  placeholder="One or two sentences shown in listings and cards..."
                  className={`${inputClassName} resize-none`}
                />
              </Field>

              <Field label="Full Description">
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={formData.description}
                    onChange={(html) => setField("description", html)}
                    modules={quillModules}
                    placeholder="Write a polished product description..."
                  />
                </div>
              </Field>
            </div>
          </GlassCard>

          <GlassCard icon={<Tag className="h-5 w-5 text-emerald-600" />} title="Pricing & Tax" description="Set pricing, margin tracking, and GST details.">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
              <Field label="Regular Price (₹)" required>
                <input name="regular_price" type="number" value={formData.regular_price} onChange={onChange} placeholder="0.00" className={inputClassName} required />
              </Field>
              <Field label="Sale Price (₹)">
                <input name="sale_price" type="number" value={formData.sale_price} onChange={onChange} placeholder="Optional" className={inputClassName} />
              </Field>
              <Field label="Cost Price (₹)">
                <input name="cost_price" type="number" value={formData.cost_price} onChange={onChange} placeholder="Optional" className={inputClassName} />
              </Field>
              <Field label="HSN Code">
                <input name="hsn" value={formData.hsn} onChange={onChange} placeholder="Enter HSN code" className={inputClassName} />
              </Field>
              <Field label="GST / Tax Class">
                <select name="tax_class" value={formData.tax_class} onChange={handleTaxClassChange} className={inputClassName}>
                  <option value="">Select Tax Class</option>
                  <option value="standard">Standard</option>
                  <option value="gst_0">GST 0%</option>
                  <option value="gst_0_25">GST 0.25%</option>
                  <option value="gst_3">GST 3%</option>
                  <option value="gst_5">GST 5%</option>
                  <option value="gst_12">GST 12%</option>
                  <option value="gst_18">GST 18%</option>
                  <option value="gst_18_standard">GST 18% (Standard)</option>
                  <option value="gst_28">GST 28%</option>
                </select>
              </Field>
              <Field label="Tax Status">
                <select name="tax_status" value={formData.tax_status} onChange={onChange} className={inputClassName}>
                  <option value="taxable">Taxable</option>
                  <option value="shipping">Shipping Only</option>
                  <option value="none">None</option>
                </select>
              </Field>
              <Field label="Color">
                <input name="color" value={formData.color} onChange={onChange} placeholder="Example: Red" className={inputClassName} />
              </Field>
              <Field label="Size">
                <input name="size" value={formData.size} onChange={onChange} placeholder="Example: 28" className={inputClassName} />
              </Field>
            </div>
          </GlassCard>

          <GlassCard icon={<Warehouse className="h-5 w-5 text-amber-600" />} title="Shipping Dimensions" description="Used for shipping calculations.">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <Field label="Weight (kg)">
                <input name="weight" type="number" value={formData.weight} onChange={onChange} placeholder="0" className={inputClassName} />
              </Field>
              <Field label="Length (cm)">
                <input name="length" type="number" value={formData.length} onChange={onChange} placeholder="0" className={inputClassName} />
              </Field>
              <Field label="Width (cm)">
                <input name="width" type="number" value={formData.width} onChange={onChange} placeholder="0" className={inputClassName} />
              </Field>
              <Field label="Height (cm)">
                <input name="height" type="number" value={formData.height} onChange={onChange} placeholder="0" className={inputClassName} />
              </Field>
            </div>
          </GlassCard>

          <GlassCard icon={<ImagePlus className="h-5 w-5 text-fuchsia-600" />} title="Media" description="Upload a featured image and gallery images.">
            <Field label="Featured Image">
              <input type="file" accept="image/*" onChange={handlePrimaryImageUpload} disabled={uploadingPrimary} className="w-full text-sm" />
            </Field>
            <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
              {formData.image_preview ? (
                <img src={getImageUrl(formData.image_preview)} alt={formData.name || "Product preview"} className="h-64 w-full object-cover" />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
                  <ImagePlus className="h-10 w-10 text-slate-300" />
                  <div>{uploadingPrimary ? "Uploading..." : "No image preview yet"}</div>
                </div>
              )}
            </div>

            <Field label={`Gallery Images${productId ? "" : " (save product first)"}`}>
              <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={!productId || uploadingGallery} className="w-full text-sm disabled:opacity-50" />
            </Field>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((img) => (
                  <div key={img.id} className="group relative overflow-hidden rounded-xl border border-slate-200">
                    <img src={getImageUrl(img.path || img.image_path)} alt="" className="h-24 w-full object-cover" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <button type="button" onClick={() => handleSetPrimary(img.id)} className="rounded-full bg-white/90 p-1.5 text-amber-600 hover:bg-white" title="Set as primary">
                        <StarFilled className={`h-3.5 w-3.5 ${img.is_primary ? "fill-amber-500" : ""}`} />
                      </button>
                      <button type="button" onClick={() => setPendingDeleteImage(img)} className="rounded-full bg-white/90 p-1.5 text-rose-600 hover:bg-white" title="Remove image">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {img.is_primary && (
                      <span className="absolute left-1 top-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">Primary</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard icon={<Layers className="h-5 w-5 text-indigo-600" />} title="Variations" description="Add attributes like Size/Color and generate every combination, WooCommerce-style.">
            {!productId ? (
              <p className="text-sm text-slate-500">Save the product first to configure variations.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {(formData.attributes || []).map((attr, index) => (
                    <div key={index} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm">
                        <span className="font-medium text-slate-800">{attr.name}:</span>{" "}
                        <span className="text-slate-600">{attr.values.join(", ")}</span>
                      </div>
                      <button type="button" onClick={() => removeAttribute(index)} className="text-slate-400 hover:text-rose-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto]">
                  <input
                    value={attributeDraft.name}
                    onChange={(e) => setAttributeDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Attribute (e.g. Size)"
                    className={inputClassName}
                  />
                  <input
                    value={attributeDraft.valuesText}
                    onChange={(e) => setAttributeDraft((d) => ({ ...d, valuesText: e.target.value }))}
                    placeholder="Values, comma separated (S, M, L)"
                    className={inputClassName}
                  />
                  <button type="button" onClick={addAttributeDraft} className="inline-flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={saveAttributesToServer} disabled={savingAttributes} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    {savingAttributes ? "Saving..." : "Save Attributes"}
                  </button>
                  <button type="button" onClick={generateVariations} disabled={generatingVariations} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                    <Wand2 className="h-4 w-4" /> {generatingVariations ? "Generating..." : "Generate Variations"}
                  </button>
                </div>

                {(formData.variations || []).length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Combination</th>
                          <th className="px-3 py-2 text-left">SKU</th>
                          <th className="px-3 py-2 text-left">Price</th>
                          <th className="px-3 py-2 text-left">Sale Price</th>
                          <th className="px-3 py-2 text-left">Stock</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(formData.variations || []).map((v) => (
                          <tr key={v.id}>
                            <td className="px-3 py-2 text-slate-600">{(v.attributeValues || v.attribute_labels || []).map((a) => a.value || a).join(" / ")}</td>
                            <td className="px-3 py-2">
                              <input value={v.sku || ""} onChange={(e) => updateVariationField(v.id, "sku", e.target.value)} className="w-28 rounded-lg border border-slate-200 px-2 py-1" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={v.regular_price} onChange={(e) => updateVariationField(v.id, "regular_price", e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={v.sale_price || ""} onChange={(e) => updateVariationField(v.id, "sale_price", e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={v.stock} onChange={(e) => updateVariationField(v.id, "stock", e.target.value)} className="w-16 rounded-lg border border-slate-200 px-2 py-1" />
                            </td>
                            <td className="px-3 py-2">
                              <select value={v.status} onChange={(e) => updateVariationField(v.id, "status", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <button type="button" onClick={() => saveVariationRow(v)} className="mr-2 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">Save</button>
                              <button type="button" onClick={() => deleteVariationRow(v.id)} className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100">Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </GlassCard>

          <GlassCard icon={<SearchIcon className="h-5 w-5 text-cyan-600" />} title="SEO" description="Improve how this product appears in search results.">
            <SeoFieldsPanel
              seoTitle={formData.seo_title}
              seoDescription={formData.seo_description}
              seoKeywords={formData.seo_keywords}
              fallbackTitle={formData.name}
              onChange={(name, value) => setField(name, value)}
            />
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard icon={<Warehouse className="h-5 w-5 text-emerald-600" />} title="Inventory & Visibility" description="Manage stock levels and control product visibility from here.">
            <div className="grid gap-3 grid-cols-1">
              <Field label="Stock">
                <input name="stock" type="number" min="0" value={formData.stock} onChange={onChange} placeholder="0" className={inputClassName} />
              </Field>
              <Field label="Low Stock Alert">
                <input name="low_stock_threshold" type="number" min="0" value={formData.low_stock_threshold} onChange={onChange} placeholder="5" className={inputClassName} />
              </Field>
              <Field label="Stock Status">
                <select name="stock_status" value={formData.stock_status} onChange={onChange} className={inputClassName}>
                  <option value="in_stock">In Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </Field>
              <Field label="Status">
                <select name="status" value={formData.status} onChange={onChange} className={inputClassName}>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>{option === "publish" ? "Publish" : "Draft"}</option>
                  ))}
                </select>
              </Field>
            </div>
          </GlassCard>

          <GlassCard icon={<Star className="h-5 w-5 text-amber-500" />} title="Merchandising Flags" description="Control where this product is highlighted on the website.">
            <div className="space-y-2">
              <ToggleRow icon={<Star className="h-4 w-4" />} label="Featured Product" name="is_featured" checked={formData.is_featured} onChange={onChange} />
              <ToggleRow icon={<Award className="h-4 w-4" />} label="Best Seller" name="is_best_seller" checked={formData.is_best_seller} onChange={onChange} />
              <ToggleRow icon={<Sparkles className="h-4 w-4" />} label="New Arrival" name="is_new_arrival" checked={formData.is_new_arrival} onChange={onChange} />
              <ToggleRow icon={<TrendingUp className="h-4 w-4" />} label="Trending Product" name="is_trending" checked={formData.is_trending} onChange={onChange} />
            </div>
          </GlassCard>

          <GlassCard icon={<Save className="h-5 w-5 text-amber-600" />} title="Ready to Save" description="Review all product details before saving.">
            <div className="space-y-4 text-sm text-slate-600">
              <SummaryRow label="Name" value={formData.name || "Untitled product"} />
              <SummaryRow
                label="Price"
                value={formData.sale_price ? `₹${formData.sale_price} (Sale)` : formData.regular_price ? `₹${formData.regular_price}` : "₹0.00"}
              />
              <SummaryRow label="Stock" value={formData.stock === "" ? "0 units" : `${formData.stock} units`} />
              <SummaryRow label="Status" value={formData.status === "publish" ? "Publish" : "Draft"} />
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
              <button type="button" onClick={onCancel} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      </form>

      <ConfirmModal
        open={!!pendingDeleteImage}
        title="Remove this image?"
        message="This will permanently delete the image from the product gallery."
        confirmLabel="Remove"
        onConfirm={handleDeleteImage}
        onCancel={() => setPendingDeleteImage(null)}
      />
    </div>
  );
}

function GlassCard({ icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/75 p-6 shadow-md hover:shadow-lg transition backdrop-blur-xl sm:p-7">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">{icon}</div>
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
    <label className="block w-full">
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

function ToggleRow({ icon, label, name, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50">
      <span className="flex items-center gap-2 text-slate-700">
        {icon}
        {label}
      </span>
      <input
        type="checkbox"
        name={name}
        checked={!!checked}
        onChange={(e) => onChange({ target: { name, value: e.target.checked } })}
        className="h-4 w-4 accent-blue-600"
      />
    </label>
  );
}

const inputClassName =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100";
