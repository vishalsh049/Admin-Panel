import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ImagePlus, Package2, Save, Tag, Search as SearchIcon,
  Star, TrendingUp, Sparkles, Award, Layers, Plus, Trash2, X, Wand2,
  Star as StarFilled, IndianRupee, Boxes, FileText, Truck, SlidersHorizontal,
  Settings2, Eye, CheckCircle2, Circle, ChevronRight, ChevronLeft, Home,
  UploadCloud, RefreshCw, Rocket, AlertTriangle, History,
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

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "link", "image", "video"],
    ["clean"],
  ],
};

const TABS = [
  { id: "basic", label: "Basic Info", icon: Tag },
  { id: "pricing", label: "Pricing", icon: IndianRupee },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "images", label: "Images", icon: ImagePlus },
  { id: "description", label: "Description", icon: FileText },
  { id: "seo", label: "SEO", icon: SearchIcon },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "attributes", label: "Attributes", icon: SlidersHorizontal },
  { id: "variants", label: "Variants", icon: Layers },
  { id: "advanced", label: "Advanced", icon: Settings2 },
];

const DRAFT_STORAGE_KEY = "dd-admin-product-draft-new";
// Only simple scalar fields are auto-saved locally; images/attributes/variations
// live on the server and must not be restored from a stale local draft.
const DRAFT_FIELDS = [
  "name", "slug", "short_description", "description", "regular_price", "sale_price",
  "cost_price", "category_id", "sku", "stock", "low_stock_threshold", "stock_status",
  "status", "weight", "length", "width", "height", "color", "size", "hsn", "brand",
  "tax_class", "tax_status", "seo_title", "seo_description", "seo_keywords",
  "is_featured", "is_best_seller", "is_new_arrival", "is_trending",
];

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

const formatINR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const formRef = useRef(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!formData.slug);
  const [pendingDeleteImage, setPendingDeleteImage] = useState(null);
  const [attributeDraft, setAttributeDraft] = useState({ name: "", valuesText: "" });
  const [savingAttributes, setSavingAttributes] = useState(false);
  const [generatingVariations, setGeneratingVariations] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [restorableDraft, setRestorableDraft] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);

  const isEdit = !!productId;

  /* ---------------- change plumbing (parent state stays the source of truth) ---------------- */

  const markDirty = () => setIsDirty(true);

  const handleChange = (e) => {
    markDirty();
    onChange(e);
  };

  const setField = (name, value) => {
    markDirty();
    onChange({ target: { name, value } });
  };

  const handleNameChange = (e) => {
    handleChange(e);
    if (!slugTouched) {
      onChange({ target: { name: "slug", value: slugify(e.target.value) } });
    }
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    handleChange(e);
  };

  /* ---------------- unsaved-changes warning ---------------- */

  useEffect(() => {
    const warn = (e) => {
      if (isDirty && !isSaving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, isSaving]);

  /* ---------------- local auto-save draft (Add page only, no API calls) ---------------- */

  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.name || parsed.sku || parsed.description)) {
          setRestorableDraft(parsed);
        }
      }
    } catch {
      /* corrupted draft — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEdit || !isDirty) return;
    const timer = setTimeout(() => {
      try {
        const draft = {};
        DRAFT_FIELDS.forEach((key) => { draft[key] = formData[key]; });
        draft.__savedAt = Date.now();
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        /* storage full — ignore */
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [formData, isDirty, isEdit]);

  const restoreDraft = () => {
    if (!restorableDraft) return;
    DRAFT_FIELDS.forEach((key) => {
      if (restorableDraft[key] !== undefined) {
        onChange({ target: { name: key, value: restorableDraft[key] } });
      }
    });
    if (restorableDraft.slug) setSlugTouched(true);
    setRestorableDraft(null);
    toast.success("Draft restored");
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setRestorableDraft(null);
  };

  /* ---------------- submit helpers ---------------- */

  const fieldErrors = useMemo(() => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Product name is required";
    if (!formData.regular_price || Number(formData.regular_price) <= 0) {
      errors.regular_price = "Enter a valid regular price";
    }
    if (
      formData.sale_price !== "" &&
      Number(formData.sale_price) >= Number(formData.regular_price || 0) &&
      Number(formData.regular_price) > 0
    ) {
      errors.sale_price = "Sale price should be below the regular price";
    }
    return errors;
  }, [formData.name, formData.regular_price, formData.sale_price]);

  const blockingError = fieldErrors.name || fieldErrors.regular_price;

  const handleFormSubmit = (event) => {
    setAttemptedSubmit(true);
    if (fieldErrors.name) setActiveTab("basic");
    else if (fieldErrors.regular_price) setActiveTab("pricing");
    if (!blockingError) {
      setIsDirty(false);
      if (!isEdit) localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
    onSubmit(event);
  };

  const submitWithStatus = (status) => {
    if (formData.status !== status) setField("status", status);
    // Let React flush the status change into parent state before submitting.
    setTimeout(() => formRef.current?.requestSubmit(), 30);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ---------------- categories ---------------- */

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

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(formData.category_id)),
    [categories, formData.category_id]
  );

  const parentById = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => map.set(String(c.id), c.parent_id ? String(c.parent_id) : ""));
    return map;
  }, [categories]);

  // category_id is the single source of truth; the top-level select shows the
  // root ancestor of whatever is selected, the sub select narrows within it.
  const rootIdOf = (id) => {
    let current = String(id || "");
    let guard = 0;
    while (current && parentById.get(current) && guard++ < 20) {
      current = parentById.get(current);
    }
    return current;
  };

  const selectedRootId = rootIdOf(formData.category_id);
  const subCategoryOptions = categoryOptions.filter(
    (c) => c.parent_id && rootIdOf(c.id) === selectedRootId
  );

  /* ---------------- image uploads (shared by file input + drag-and-drop) ---------------- */

  const uploadPrimary = async (file) => {
    if (!file) return;
    setUploadingPrimary(true);
    try {
      const data = await productService.uploadPrimaryImage(file);
      setField("image_preview", data.path);
      toast.success("Featured image uploaded");
    } catch (error) {
      toast.error(error.response?.data?.error || "Image upload failed");
    } finally {
      setUploadingPrimary(false);
    }
  };

  const uploadGallery = async (files) => {
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
      markDirty();
    } catch (error) {
      toast.error(error.response?.data?.error || "Gallery upload failed");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handlePrimaryImageUpload = async (e) => {
    await uploadPrimary(e.target.files[0]);
    e.target.value = "";
  };

  const handleGalleryUpload = async (e) => {
    await uploadGallery(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (zone) => async (e) => {
    e.preventDefault();
    setDragOverZone(null);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    if (zone === "primary") await uploadPrimary(files[0]);
    else await uploadGallery(files);
  };

  const dragProps = (zone) => ({
    onDragOver: (e) => { e.preventDefault(); setDragOverZone(zone); },
    onDragLeave: () => setDragOverZone(null),
    onDrop: handleDrop(zone),
  });

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
      toast.success("Primary image updated");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to set primary image");
    }
  };

  const moveImage = async (index, direction) => {
    const list = [...(formData.images || [])];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    onImagesChanged?.(list);
    try {
      await productService.reorderImages(productId, list.map((img) => img.id));
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reorder images");
    }
  };

  /* ---------------- attributes / variations ---------------- */

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
      await productService.saveAttributes(productId, formData.attributes || []);
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

  /* ---------------- derived display values ---------------- */

  const images = formData.images || [];
  const regular = Number(formData.regular_price) || 0;
  const sale = Number(formData.sale_price) || 0;
  const cost = Number(formData.cost_price) || 0;
  const effectivePrice = sale > 0 ? sale : regular;

  const discountPct = regular > 0 && sale > 0 && sale < regular
    ? ((regular - sale) / regular) * 100
    : 0;

  const profitMargin = effectivePrice > 0 && cost > 0
    ? ((effectivePrice - cost) / effectivePrice) * 100
    : null;

  const hasDescription = !!(formData.short_description?.trim() || (formData.description && formData.description !== "<p><br></p>"));
  const hasImages = !!(formData.image_preview || images.length > 0);

  const seoScore = useMemo(() => {
    let score = 0;
    const t = (formData.seo_title || "").trim();
    const d = (formData.seo_description || "").trim();
    const k = (formData.seo_keywords || "").trim();
    if (t) score += t.length <= 60 ? 30 : 20;
    if (d) score += d.length <= 160 ? 35 : 25;
    if (k) score += 20;
    if (formData.slug) score += 15;
    return score;
  }, [formData.seo_title, formData.seo_description, formData.seo_keywords, formData.slug]);

  const checklist = [
    { label: "Product Title", done: !!formData.name.trim(), hint: formData.name.trim() ? "Looks good" : "Required" },
    { label: "Product Images", done: hasImages, hint: hasImages ? `${(formData.image_preview ? 1 : 0) + images.length} image${images.length ? "s" : ""}` : "Add at least one" },
    { label: "Pricing", done: regular > 0, hint: regular > 0 ? "Complete" : "Required" },
    { label: "Inventory", done: formData.stock !== "" && formData.stock !== null, hint: formData.stock !== "" ? (formData.stock_status === "in_stock" ? "In Stock" : "Out of Stock") : "Set stock" },
    { label: "Description", done: hasDescription, hint: hasDescription ? "Complete" : "Recommended" },
    { label: "SEO", done: seoScore >= 50, hint: seoScore >= 50 ? "Optimized" : "Improve" },
    { label: "Category", done: !!formData.category_id, hint: formData.category_id ? (selectedCategory?.name || "Set") : "Recommended" },
  ];
  const completion = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  const generateSku = () => {
    const initials = (formData.name || "product")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4) || "PRD";
    const stamp = Date.now().toString(36).toUpperCase().slice(-5);
    setField("sku", `DD-${initials}-${stamp}`);
    toast.success("SKU generated");
  };

  const showError = (key) => attemptedSubmit && fieldErrors[key];

  const statusIsPublish = formData.status === "publish";

  /* ================================ RENDER ================================ */

  return (
    <div className="product-editor pb-24">
      <style>{`
        .product-editor .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .product-editor .ql-container.ql-snow { border: none; min-height: 200px; font-size: 14px; font-family: inherit; }
        .product-editor .ql-editor { min-height: 200px; }
        .product-editor .no-scrollbar::-webkit-scrollbar { display: none; }
        .product-editor .no-scrollbar { scrollbar-width: none; }
        @keyframes pe-pop { 0% { transform: scale(0.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .product-editor .pe-pop { animation: pe-pop 0.25s ease-out; }
      `}</style>

      {/* ============ PAGE HEADER ============ */}
      <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Link to="/" className="inline-flex items-center gap-1 transition hover:text-violet-600">
            <Home className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <Link to="/products" className="transition hover:text-violet-600">Products</Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="font-medium text-violet-700">{isEdit ? "Edit Product" : "Add Product"}</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-px hover:border-slate-300 hover:shadow"
            >
              <Eye className="h-4 w-4" /> Preview
            </button>
            <button
              type="button"
              onClick={() => submitWithStatus("draft")}
              disabled={isSaving}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-px hover:bg-slate-100 hover:shadow disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> Save Draft
            </button>
            <button
              type="button"
              onClick={() => submitWithStatus("publish")}
              disabled={isSaving}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] transition hover:-translate-y-px hover:shadow-[0_14px_30px_rgba(124,58,237,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Rocket className="h-4 w-4" /> {isSaving ? "Saving..." : "Publish Product"}
            </button>
          </div>
        </div>
      </div>

      {/* ============ RESTORE DRAFT BANNER ============ */}
      {restorableDraft && (
        <div className="pe-pop mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-3.5 text-sm shadow-sm">
          <span className="inline-flex items-center gap-2 text-amber-800">
            <History className="h-4 w-4" />
            An unsaved draft from a previous session was found. Restore it?
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={restoreDraft} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700">
              Restore Draft
            </button>
            <button type="button" onClick={discardDraft} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ============ TAB BAR ============ */}
      <div className="sticky top-[60px] z-20 -mx-1 mb-4 px-1">
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/90 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-violet-50 text-violet-700 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.25)]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-violet-600" : "text-slate-400"}`} />
                {tab.label}
                {active && <span className="absolute inset-x-3 -bottom-[7px] h-0.5 rounded-full bg-violet-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ MAIN GRID ============ */}
      <form ref={formRef} onSubmit={handleFormSubmit} noValidate className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
        {/* ================= LEFT: FORM SECTIONS ================= */}
        <div className="min-w-0 space-y-4">

          {/* ---------- BASIC INFO ---------- */}
          <div className={activeTab === "basic" ? "space-y-4" : "hidden"}>
            <SectionCard icon={Tag} tint="violet" title="Basic Information" description="Enter basic product information">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Field label="Product Name" required error={showError("name")} className="lg:col-span-1">
                    <input name="name" value={formData.name} onChange={handleNameChange} placeholder="Enter product name" className={inputClassName} />
                  </Field>
                  <Field label="SKU" required={false} hint="Unique product code">
                    <div className="flex gap-2">
                      <input name="sku" value={formData.sku} onChange={handleChange} placeholder="DDSB-2026-0001" className={inputClassName} />
                      <button type="button" onClick={generateSku} title="Auto-generate SKU" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100">
                        <Wand2 className="h-3.5 w-3.5" /> Generate
                      </button>
                    </div>
                  </Field>
                  <Field label="Slug" hint="Auto-generated from name">
                    <div className="relative">
                      <input name="slug" value={formData.slug} onChange={handleSlugChange} placeholder="product-url-slug" className={`${inputClassName} pr-9`} />
                      {formData.slug && (
                        <CheckCircle2 className="pe-pop absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                      )}
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Field label="Category">
                    <select
                      value={selectedRootId}
                      onChange={(e) => setField("category_id", e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Uncategorized</option>
                      {categoryOptions.filter((c) => !c.parent_id).map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sub Category" hint={!selectedRootId ? "Pick a category first" : undefined}>
                    <select
                      value={String(formData.category_id || "") !== selectedRootId ? String(formData.category_id || "") : ""}
                      onChange={(e) => setField("category_id", e.target.value || selectedRootId)}
                      disabled={!selectedRootId || subCategoryOptions.length === 0}
                      className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
                    >
                      <option value="">
                        {subCategoryOptions.length === 0 ? "No sub categories" : "None (use main category)"}
                      </option>
                      {subCategoryOptions.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {"— ".repeat(Math.max(cat.depth - 1, 0))}{cat.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Brand">
                    <input name="brand" value={formData.brand} onChange={handleChange} placeholder="Divya Darshnam" className={inputClassName} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                  <Field label="Tags" hint="Also used as SEO keywords">
                    <TagsInput value={formData.seo_keywords} onChange={(v) => setField("seo_keywords", v)} />
                  </Field>
                  <Field label="Status">
                    <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() => setField("status", "publish")}
                        className={`h-9 rounded-lg px-4 text-sm font-medium transition-all ${statusIsPublish ? "bg-violet-600 text-white shadow" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setField("status", "draft")}
                        className={`h-9 rounded-lg px-4 text-sm font-medium transition-all ${!statusIsPublish ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Draft
                      </button>
                    </div>
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Star} tint="amber" title="Merchandising" description="Control where this product is highlighted on the website">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleRow icon={Star} label="Featured Product" name="is_featured" checked={formData.is_featured} onToggle={setField} />
                <ToggleRow icon={Award} label="Best Seller" name="is_best_seller" checked={formData.is_best_seller} onToggle={setField} />
                <ToggleRow icon={Sparkles} label="New Arrival" name="is_new_arrival" checked={formData.is_new_arrival} onToggle={setField} />
                <ToggleRow icon={TrendingUp} label="Trending" name="is_trending" checked={formData.is_trending} onToggle={setField} />
              </div>
            </SectionCard>
          </div>

          {/* ---------- PRICING ---------- */}
          <div className={activeTab === "pricing" ? "space-y-4" : "hidden"}>
            <SectionCard icon={IndianRupee} tint="rose" title="Pricing" description="Set pricing, GST, and track your margins automatically">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Regular Price (₹)" required error={showError("regular_price")}>
                  <input name="regular_price" type="number" min="0" step="0.01" value={formData.regular_price} onChange={handleChange} placeholder="2,499.00" className={inputClassName} />
                </Field>
                <Field label="Sale Price (₹)" error={attemptedSubmit ? fieldErrors.sale_price : undefined}>
                  <input name="sale_price" type="number" min="0" step="0.01" value={formData.sale_price} onChange={handleChange} placeholder="1,999.00" className={inputClassName} />
                </Field>
                <Field label="Cost Price (₹)">
                  <input name="cost_price" type="number" min="0" step="0.01" value={formData.cost_price} onChange={handleChange} placeholder="1,200.00" className={inputClassName} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Tax (%)">
                  <select name="tax_class" value={formData.tax_class} onChange={handleChange} className={inputClassName}>
                    <option value="">Select Tax Class</option>
                    <option value="standard">Standard</option>
                    <option value="gst_0">GST 0%</option>
                    <option value="gst_0_25">GST 0.25%</option>
                    <option value="gst_3">GST 3%</option>
                    <option value="gst_5">GST 5%</option>
                    <option value="gst_12">GST 12%</option>
                    <option value="gst_18">18% GST</option>
                    <option value="gst_18_standard">GST 18% (Standard)</option>
                    <option value="gst_28">GST 28%</option>
                  </select>
                </Field>
                <Field label="Discount (%)" hint="Calculated from sale price">
                  <input value={discountPct ? discountPct.toFixed(0) : ""} readOnly placeholder="—" className={`${inputClassName} bg-slate-50 text-slate-600`} />
                </Field>
                <Field label="Profit Margin" hint="Auto-calculated">
                  <div className={`flex h-11 items-center justify-between rounded-xl border px-3.5 text-sm font-semibold ${
                    profitMargin === null
                      ? "border-slate-200 bg-slate-50 text-slate-400"
                      : profitMargin >= 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-600"
                  }`}>
                    <span>{profitMargin === null ? "Add cost price" : `${profitMargin.toFixed(2)}%`}</span>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Tax Status">
                  <select name="tax_status" value={formData.tax_status} onChange={handleChange} className={inputClassName}>
                    <option value="taxable">Taxable</option>
                    <option value="shipping">Shipping Only</option>
                    <option value="none">None</option>
                  </select>
                </Field>
                {profitMargin !== null && cost > 0 && (
                  <div className="sm:col-span-2">
                    <div className="flex h-full items-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5 text-xs text-slate-600">
                      <span>Selling at <b className="text-slate-900">₹{formatINR(effectivePrice)}</b></span>
                      <span>Cost <b className="text-slate-900">₹{formatINR(cost)}</b></span>
                      <span>Profit <b className={effectivePrice - cost >= 0 ? "text-emerald-600" : "text-rose-600"}>₹{formatINR(effectivePrice - cost)}</b> per unit</span>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* ---------- INVENTORY ---------- */}
          <div className={activeTab === "inventory" ? "space-y-4" : "hidden"}>
            <SectionCard icon={Boxes} tint="sky" title="Inventory" description="Manage stock levels and availability">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Stock Quantity" required={false}>
                  <input name="stock" type="number" min="0" value={formData.stock} onChange={handleChange} placeholder="120" className={inputClassName} />
                </Field>
                <Field label="Low Stock Alert">
                  <input name="low_stock_threshold" type="number" min="0" value={formData.low_stock_threshold} onChange={handleChange} placeholder="10" className={inputClassName} />
                </Field>
                <Field label="Stock Status">
                  <select name="stock_status" value={formData.stock_status} onChange={handleChange} className={inputClassName}>
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </Field>
              </div>

              {formData.stock !== "" && Number(formData.stock) <= Number(formData.low_stock_threshold || 0) && Number(formData.stock) > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  Stock is at or below the low-stock threshold — this product will be flagged in inventory reports.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Weight (kg)" hint="Also used for shipping">
                  <input name="weight" type="number" min="0" step="0.001" value={formData.weight} onChange={handleChange} placeholder="0.025" className={inputClassName} />
                </Field>
                <Field label="HSN Code" hint="For GST invoicing">
                  <input name="hsn" value={formData.hsn} onChange={handleChange} placeholder="7113" className={inputClassName} />
                </Field>
              </div>
            </SectionCard>
          </div>

          {/* ---------- IMAGES ---------- */}
          <div className={activeTab === "images" ? "space-y-4" : "hidden"}>
            <SectionCard icon={ImagePlus} tint="fuchsia" title="Product Images" description="Upload a featured image and gallery — drag & drop supported">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Featured image dropzone */}
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">Featured Image</div>
                  <label
                    {...dragProps("primary")}
                    className={`group relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
                      dragOverZone === "primary" ? "border-violet-400 bg-violet-50" : "border-slate-300 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/40"
                    }`}
                  >
                    <input type="file" accept="image/*" onChange={handlePrimaryImageUpload} disabled={uploadingPrimary} className="hidden" />
                    {formData.image_preview ? (
                      <>
                        <img src={getImageUrl(formData.image_preview)} alt={formData.name || "Product preview"} className="absolute inset-0 h-full w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                          <span className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-sm font-medium text-slate-800">
                            <RefreshCw className="h-4 w-4" /> Replace image
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 p-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                          <UploadCloud className="h-7 w-7" />
                        </div>
                        <div className="text-sm font-medium text-slate-700">
                          {uploadingPrimary ? "Uploading..." : "Drop image here or click to browse"}
                        </div>
                        <p className="text-xs text-slate-400">PNG, JPG or WEBP — this is the main catalog image</p>
                      </div>
                    )}
                    {uploadingPrimary && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
                      </div>
                    )}
                  </label>
                </div>

                {/* Gallery dropzone + grid */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Gallery Images</span>
                    {!productId && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Save product first</span>}
                  </div>
                  <label
                    {...(productId ? dragProps("gallery") : {})}
                    className={`flex min-h-[110px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
                      !productId
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                        : dragOverZone === "gallery"
                          ? "cursor-pointer border-violet-400 bg-violet-50"
                          : "cursor-pointer border-slate-300 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/40"
                    }`}
                  >
                    <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={!productId || uploadingGallery} className="hidden" />
                    <UploadCloud className="mb-1.5 h-6 w-6 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">
                      {uploadingGallery ? "Uploading..." : "Drop multiple images or click to browse"}
                    </span>
                  </label>

                  {images.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2.5">
                      {images.map((img, index) => (
                        <div key={img.id} className="group relative overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                          <img src={getImageUrl(img.path || img.image_path)} alt="" className="h-24 w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
                            <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="rounded-full bg-white/90 p-1.5 text-slate-700 transition hover:bg-white disabled:opacity-40" title="Move left">
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => handleSetPrimary(img.id)} className="rounded-full bg-white/90 p-1.5 text-amber-600 transition hover:bg-white" title="Set as primary">
                              <StarFilled className={`h-3.5 w-3.5 ${img.is_primary ? "fill-amber-500" : ""}`} />
                            </button>
                            <button type="button" onClick={() => setPendingDeleteImage(img)} className="rounded-full bg-white/90 p-1.5 text-rose-600 transition hover:bg-white" title="Remove image">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} className="rounded-full bg-white/90 p-1.5 text-slate-700 transition hover:bg-white disabled:opacity-40" title="Move right">
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {img.is_primary && (
                            <span className="absolute left-1 top-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow">Primary</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ---------- DESCRIPTION ---------- */}
          <div className={activeTab === "description" ? "space-y-4" : "hidden"}>
            <SectionCard icon={FileText} tint="indigo" title="Description" description="Describe the product for customers and search engines">
              <div className="grid gap-4">
                <Field label="Short Description" hint="Shown in listings and product cards">
                  <textarea
                    name="short_description"
                    value={formData.short_description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="A beautiful handcrafted silver bracelet from Divya Darshnam. Perfect for every occasion."
                    className={`${inputClassName} h-auto resize-none py-2.5`}
                  />
                </Field>
                <Field label="Full Description">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
                    <ReactQuill
                      theme="snow"
                      value={formData.description}
                      onChange={(html) => setField("description", html)}
                      modules={quillModules}
                      placeholder="Write a polished product description... You can insert images and embed videos from the toolbar."
                    />
                  </div>
                </Field>
              </div>
            </SectionCard>
          </div>

          {/* ---------- SEO ---------- */}
          <div className={activeTab === "seo" ? "space-y-4" : "hidden"}>
            <SectionCard icon={SearchIcon} tint="cyan" title="SEO" description="Improve how this product appears in search results">
              <div className="mb-1 flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                <span className="text-sm font-medium text-slate-700">SEO Score</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${seoScore >= 70 ? "bg-emerald-500" : seoScore >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                      style={{ width: `${seoScore}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${seoScore >= 70 ? "text-emerald-600" : seoScore >= 40 ? "text-amber-600" : "text-rose-500"}`}>{seoScore}/100</span>
                </div>
              </div>
              <SeoFieldsPanel
                seoTitle={formData.seo_title}
                seoDescription={formData.seo_description}
                seoKeywords={formData.seo_keywords}
                fallbackTitle={formData.name}
                onChange={(name, value) => setField(name, value)}
              />
              <Field label="URL Slug" hint="Used in the product page URL">
                <input name="slug" value={formData.slug} onChange={handleSlugChange} placeholder="product-url-slug" className={inputClassName} />
              </Field>
            </SectionCard>
          </div>

          {/* ---------- SHIPPING ---------- */}
          <div className={activeTab === "shipping" ? "space-y-4" : "hidden"}>
            <SectionCard icon={Truck} tint="emerald" title="Shipping" description="Physical dimensions used for courier rate calculation">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Field label="Weight (kg)">
                  <input name="weight" type="number" min="0" step="0.001" value={formData.weight} onChange={handleChange} placeholder="0" className={inputClassName} />
                </Field>
                <Field label="Length (cm)">
                  <input name="length" type="number" min="0" step="0.1" value={formData.length} onChange={handleChange} placeholder="0" className={inputClassName} />
                </Field>
                <Field label="Width (cm)">
                  <input name="width" type="number" min="0" step="0.1" value={formData.width} onChange={handleChange} placeholder="0" className={inputClassName} />
                </Field>
                <Field label="Height (cm)">
                  <input name="height" type="number" min="0" step="0.1" value={formData.height} onChange={handleChange} placeholder="0" className={inputClassName} />
                </Field>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <Truck className="h-4 w-4 shrink-0 text-slate-400" />
                These values are sent to the shipping provider to compute delivery charges. Accurate dimensions avoid courier weight disputes.
              </div>
            </SectionCard>
          </div>

          {/* ---------- ATTRIBUTES ---------- */}
          <div className={activeTab === "attributes" ? "space-y-4" : "hidden"}>
            <SectionCard icon={SlidersHorizontal} tint="orange" title="Attributes" description="Simple attributes, plus reusable attributes for variant generation">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Color">
                  <input name="color" value={formData.color} onChange={handleChange} placeholder="Example: Silver" className={inputClassName} />
                </Field>
                <Field label="Size">
                  <input name="size" value={formData.size} onChange={handleChange} placeholder="Example: Free Size" className={inputClassName} />
                </Field>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">Custom Attributes (for variants)</div>
                {!productId ? (
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Save the product first to configure custom attributes and generate variants.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(formData.attributes || []).map((attr, index) => (
                        <div key={index} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-sm">
                            <span className="font-semibold text-slate-800">{attr.name}</span>
                            {attr.values.map((v) => (
                              <span key={v} className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{v}</span>
                            ))}
                          </div>
                          <button type="button" onClick={() => removeAttribute(index)} className="text-slate-400 transition hover:text-rose-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_2fr_auto]">
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
                      <button type="button" onClick={addAttributeDraft} className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        <Plus className="h-4 w-4" /> Add
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2.5">
                      <button type="button" onClick={saveAttributesToServer} disabled={savingAttributes} className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                        {savingAttributes ? "Saving..." : "Save Attributes"}
                      </button>
                      <button type="button" onClick={generateVariations} disabled={generatingVariations} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(124,58,237,0.3)] transition hover:bg-violet-700 disabled:opacity-60">
                        <Wand2 className="h-4 w-4" /> {generatingVariations ? "Generating..." : "Generate Variants"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </SectionCard>
          </div>

          {/* ---------- VARIANTS ---------- */}
          <div className={activeTab === "variants" ? "space-y-4" : "hidden"}>
            <SectionCard icon={Layers} tint="indigo" title="Variants" description="Per-variant pricing and stock, generated from your attributes">
              {!productId ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Save the product first, then define attributes and generate variants.</p>
              ) : (formData.variations || []).length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <Layers className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-500">No variants yet. Add attributes in the <b>Attributes</b> tab and click <b>Generate Variants</b>.</p>
                  <button type="button" onClick={() => setActiveTab("attributes")} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-medium text-violet-700 transition hover:bg-violet-100">
                    <SlidersHorizontal className="h-4 w-4" /> Go to Attributes
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left">Combination</th>
                        <th className="px-3.5 py-2.5 text-left">SKU</th>
                        <th className="px-3.5 py-2.5 text-left">Price</th>
                        <th className="px-3.5 py-2.5 text-left">Sale Price</th>
                        <th className="px-3.5 py-2.5 text-left">Stock</th>
                        <th className="px-3.5 py-2.5 text-left">Status</th>
                        <th className="px-3.5 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(formData.variations || []).map((v) => (
                        <tr key={v.id} className="transition hover:bg-violet-50/30">
                          <td className="px-3.5 py-2.5 font-medium text-slate-700">{(v.attributeValues || v.attribute_labels || []).map((a) => a.value || a).join(" / ")}</td>
                          <td className="px-3.5 py-2.5">
                            <input value={v.sku || ""} onChange={(e) => updateVariationField(v.id, "sku", e.target.value)} className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 outline-none focus:border-violet-400" />
                          </td>
                          <td className="px-3.5 py-2.5">
                            <input type="number" value={v.regular_price} onChange={(e) => updateVariationField(v.id, "regular_price", e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 outline-none focus:border-violet-400" />
                          </td>
                          <td className="px-3.5 py-2.5">
                            <input type="number" value={v.sale_price || ""} onChange={(e) => updateVariationField(v.id, "sale_price", e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 outline-none focus:border-violet-400" />
                          </td>
                          <td className="px-3.5 py-2.5">
                            <input type="number" value={v.stock} onChange={(e) => updateVariationField(v.id, "stock", e.target.value)} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 outline-none focus:border-violet-400" />
                          </td>
                          <td className="px-3.5 py-2.5">
                            <select value={v.status} onChange={(e) => updateVariationField(v.id, "status", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 outline-none focus:border-violet-400">
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </td>
                          <td className="whitespace-nowrap px-3.5 py-2.5">
                            <button type="button" onClick={() => saveVariationRow(v)} className="mr-2 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100">Save</button>
                            <button type="button" onClick={() => deleteVariationRow(v.id)} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ---------- ADVANCED ---------- */}
          <div className={activeTab === "advanced" ? "space-y-4" : "hidden"}>
            <SectionCard icon={Settings2} tint="slate" title="Advanced" description="Tax classification and compliance details">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="HSN Code" hint="Harmonized System Nomenclature for GST">
                  <input name="hsn" value={formData.hsn} onChange={handleChange} placeholder="Enter HSN code" className={inputClassName} />
                </Field>
                <Field label="Tax Status">
                  <select name="tax_status" value={formData.tax_status} onChange={handleChange} className={inputClassName}>
                    <option value="taxable">Taxable</option>
                    <option value="shipping">Shipping Only</option>
                    <option value="none">None</option>
                  </select>
                </Field>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                <Package2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="text-xs leading-5 text-slate-500">
                  <span className="font-semibold text-slate-700">Product Source:</span> Admin Dashboard.
                  Products created here are stored in the main catalog database and synced across the storefront, inventory, and reports.
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* ================= RIGHT: SIDEBAR ================= */}
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-[124px] xl:self-start">
          {/* Live preview */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Eye} tint="violet" small />
                <h3 className="text-sm font-semibold text-slate-900">Product Preview</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live Preview
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
              {formData.image_preview ? (
                <img src={getImageUrl(formData.image_preview)} alt={formData.name || "Preview"} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-slate-300">
                  <ImagePlus className="h-9 w-9" />
                  <span className="text-xs text-slate-400">No image yet</span>
                </div>
              )}
            </div>

            {images.length > 0 && (
              <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
                {images.map((img) => (
                  <img
                    key={img.id}
                    src={getImageUrl(img.path || img.image_path)}
                    alt=""
                    className={`h-14 w-14 shrink-0 rounded-xl border-2 object-cover ${img.is_primary ? "border-violet-500" : "border-transparent"}`}
                  />
                ))}
              </div>
            )}

            <div className="mt-3">
              <div className="truncate text-sm font-semibold text-slate-900">{formData.name || "Untitled product"}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900">₹{formatINR(effectivePrice)}</span>
                {sale > 0 && regular > sale && (
                  <>
                    <span className="text-xs text-slate-400 line-through">₹{formatINR(regular)}</span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">{discountPct.toFixed(0)}% OFF</span>
                  </>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusIsPublish ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {statusIsPublish ? "Active" : "Draft"}
                </span>
                {selectedCategory && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">{selectedCategory.name}</span>}
                {formData.is_featured && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Featured</span>}
              </div>
            </div>
          </div>

          {/* Publish checklist */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Publish</h3>
            <ul className="space-y-2.5">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-slate-700">
                    {item.done ? (
                      <CheckCircle2 className="pe-pop h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300" />
                    )}
                    {item.label}
                  </span>
                  <span className={`text-xs ${item.done ? "text-slate-400" : "font-medium text-amber-600"}`}>{item.hint}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4">
              <ProgressRing percent={completion} />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <Package2 className="h-4 w-4 text-violet-600" /> Product Information
                </div>
                <div className={`mt-0.5 flex items-center gap-1 text-xs ${completion >= 80 ? "text-emerald-600" : "text-slate-500"}`}>
                  {completion >= 80 && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {completion >= 100 ? "Ready to publish!" : completion >= 80 ? "Almost ready to publish!" : "Complete more sections to publish"}
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Quick Actions</h3>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => submitWithStatus("publish")}
                disabled={isSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] text-sm font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] transition hover:-translate-y-px hover:shadow-[0_14px_30px_rgba(124,58,237,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Rocket className="h-4 w-4" /> {isSaving ? "Saving..." : submitLabel || "Publish Product"}
              </button>
              <button
                type="button"
                onClick={() => submitWithStatus("draft")}
                disabled={isSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> Save Draft
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" /> Preview Product
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Tip: press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans">Ctrl</kbd> + <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans">S</kbd> to save anytime
            </p>
          </div>
        </aside>

        {/* ============ STICKY BOTTOM ACTION BAR ============ */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:pl-56">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2.5">
            <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
              {isDirty ? (
                <><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes</>
              ) : (
                <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All changes tracked</>
              )}
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
              <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:px-5">
                Cancel
              </button>
              <button type="button" onClick={() => submitWithStatus("draft")} disabled={isSaving} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60 sm:px-5">
                <Save className="h-4 w-4" /> Save Draft
              </button>
              <button type="button" onClick={() => setShowPreview(true)} className="hidden h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex sm:px-5">
                <Eye className="h-4 w-4" /> Preview
              </button>
              <button
                type="button"
                onClick={() => submitWithStatus("publish")}
                disabled={isSaving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_100%)] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(124,58,237,0.35)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70 sm:px-6"
              >
                {isSaving ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Saving...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> {submitLabel || "Publish Product"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ============ PREVIEW MODAL ============ */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
          <div className="pe-pop w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900">Storefront Preview</h3>
              <button type="button" onClick={() => setShowPreview(false)} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {formData.image_preview ? (
                <img src={getImageUrl(formData.image_preview)} alt={formData.name || "Preview"} className="aspect-square w-full rounded-2xl object-cover" />
              ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 text-slate-300">
                  <ImagePlus className="h-10 w-10" />
                  <span className="text-xs text-slate-400">No image uploaded</span>
                </div>
              )}
              {images.length > 0 && (
                <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                  {images.map((img) => (
                    <img key={img.id} src={getImageUrl(img.path || img.image_path)} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ))}
                </div>
              )}
              <div className="mt-4">
                {selectedCategory && <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">{selectedCategory.name}</div>}
                <h2 className="mt-1 text-lg font-bold text-slate-900">{formData.name || "Untitled product"}</h2>
                <div className="mt-2 flex items-baseline gap-2.5">
                  <span className="text-2xl font-bold text-slate-900">₹{formatINR(effectivePrice)}</span>
                  {sale > 0 && regular > sale && (
                    <>
                      <span className="text-sm text-slate-400 line-through">₹{formatINR(regular)}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">{discountPct.toFixed(0)}% OFF</span>
                    </>
                  )}
                </div>
                {formData.short_description && <p className="mt-3 text-sm leading-6 text-slate-600">{formData.short_description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(formData.seo_keywords || "").split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

/* ================================ UI PRIMITIVES ================================ */

const TINTS = {
  violet: "from-violet-500 to-purple-600",
  rose: "from-rose-500 to-pink-600",
  sky: "from-sky-500 to-blue-600",
  fuchsia: "from-fuchsia-500 to-purple-600",
  indigo: "from-indigo-500 to-violet-600",
  cyan: "from-cyan-500 to-sky-600",
  emerald: "from-emerald-500 to-teal-600",
  amber: "from-amber-500 to-orange-500",
  orange: "from-orange-500 to-amber-600",
  slate: "from-slate-500 to-slate-700",
};

function SectionIcon({ icon: Icon, tint, small }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${TINTS[tint] || TINTS.violet} ${small ? "h-8 w-8" : "h-10 w-10"}`}>
      <Icon className={small ? "h-4 w-4" : "h-5 w-5"} />
    </div>
  );
}

function SectionCard({ icon, tint, title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:shadow-[0_14px_45px_rgba(15,23,42,0.09)] sm:p-6">
      <div className="mb-5 flex items-start gap-3.5">
        <SectionIcon icon={icon} tint={tint} />
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, error, children, className = "" }) {
  return (
    <label className={`block w-full min-w-0 ${className}`}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-slate-700">
          {label}
          {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </span>
        {hint && !error && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <span className="pe-pop mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
          <AlertTriangle className="h-3 w-3" /> {error}
        </span>
      )}
    </label>
  );
}

function ToggleRow({ icon: Icon, label, name, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(name, !checked)}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
        checked ? "border-violet-200 bg-violet-50/70" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <span className={`flex items-center gap-2.5 font-medium ${checked ? "text-violet-800" : "text-slate-700"}`}>
        <Icon className={`h-4 w-4 ${checked ? "text-violet-600" : "text-slate-400"}`} />
        {label}
      </span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

function TagsInput({ value, onChange }) {
  const [draft, setDraft] = useState("");
  const tags = (value || "").split(",").map((t) => t.trim()).filter(Boolean);

  const commit = (raw) => {
    const next = raw.trim().replace(/,+$/, "");
    if (!next) return;
    if (tags.some((t) => t.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...tags, next].join(", "));
    setDraft("");
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index).join(", "));
  };

  return (
    <div className="flex min-h-[44px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
      {tags.map((tag, index) => (
        <span key={`${tag}-${index}`} className="pe-pop inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
          {tag}
          <button type="button" onClick={() => removeTag(index)} className="text-violet-400 transition hover:text-violet-700">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => {
          if (e.target.value.endsWith(",")) commit(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            removeTag(tags.length - 1);
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={tags.length ? "Add tags..." : "Type and press Enter..."}
        className="h-7 min-w-[110px] flex-1 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

function ProgressRing({ percent }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#ede9fe" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke="url(#pe-ring-grad)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="pe-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">{percent}%</span>
    </div>
  );
}
