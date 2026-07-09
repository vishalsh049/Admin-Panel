import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import ProductEditorForm, { defaultProductFormValues } from "./ProductEditorForm";
import * as productService from "../services/productService";
import * as categoryService from "../services/categoryService";

function mapProductToForm(product, attributes, variations) {
  return {
    ...defaultProductFormValues,
    name: product.name || "",
    slug: product.slug || "",
    short_description: product.short_description || "",
    description: product.description || "",
    regular_price: product.regular_price ?? "",
    sale_price: product.sale_price ?? "",
    cost_price: product.cost_price ?? "",
    category_id: product.category_id || "",
    sku: product.sku || "",
    stock: product.stock ?? "",
    low_stock_threshold: product.low_stock_threshold ?? "5",
    stock_status: product.stock_status || "in_stock",
    status: product.status || "publish",
    image_preview: product.image || "",
    images: product.images || [],
    weight: product.weight ?? "",
    length: product.length ?? "",
    width: product.width ?? "",
    height: product.height ?? "",
    color: product.color || "",
    size: product.size || "",
    hsn: product.hsn || "",
    brand: product.brand || "",
    tax_class: product.tax_class || "",
    tax_status: product.tax_status || "taxable",
    seo_title: product.seo_title || "",
    seo_description: product.seo_description || "",
    seo_keywords: product.seo_keywords || "",
    is_featured: !!product.is_featured,
    is_best_seller: !!product.is_best_seller,
    is_new_arrival: !!product.is_new_arrival,
    is_trending: !!product.is_trending,
    has_variations: !!product.has_variations,
    attributes: (attributes || []).map((a) => ({
      name: a.name,
      values: (a.values || []).map((v) => v.value),
      is_for_variations: a.is_for_variations,
    })),
    variations: (variations || []).map((v) => ({
      id: v.id,
      sku: v.sku || "",
      regular_price: v.regular_price,
      sale_price: v.sale_price,
      stock: v.stock,
      status: v.status,
      image: v.image_path,
      attributeValues: v.attributeValues || [],
    })),
  };
}

export default function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState(defaultProductFormValues);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [productRes, categoriesData, attributesRes, variationsRes] = await Promise.all([
          productService.getProduct(id),
          categoryService.getCategories(),
          productService.getAttributes(id),
          productService.getVariations(id),
        ]);

        if (!isMounted) return;
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setFormData(
          mapProductToForm(productRes.product, attributesRes.attributes, variationsRes.variations)
        );
      } catch (error) {
        console.error("Load product error:", error);
        toast.error(error.response?.data?.error || "Unable to load product");
        navigate("/products");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => {
      const updated = { ...current, [name]: value };
      if (name === "stock") {
        updated.stock_status = Number(value) > 0 ? "in_stock" : "out_of_stock";
      }
      return updated;
    });
  };

  const handleImagesChanged = (images) => {
    setFormData((current) => ({ ...current, images }));
  };

  const handleVariationsChanged = (variations) => {
    setFormData((current) => ({
      ...current,
      variations: (variations || []).map((v) => ({
        id: v.id,
        sku: v.sku || "",
        regular_price: v.regular_price,
        sale_price: v.sale_price,
        stock: v.stock,
        status: v.status,
        image: v.image_path,
        attributeValues: v.attributeValues || [],
      })),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.regular_price || Number(formData.regular_price) <= 0) {
      toast.error("Please enter a valid product price");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        image: formData.image_preview,
        regular_price: Number(formData.regular_price),
        sale_price: formData.sale_price === "" ? null : Number(formData.sale_price),
        cost_price: formData.cost_price === "" ? null : Number(formData.cost_price),
        stock: Number(formData.stock) || 0,
        low_stock_threshold: Number(formData.low_stock_threshold) || 5,
        weight: Number(formData.weight) || 0,
        length: Number(formData.length) || 0,
        width: Number(formData.width) || 0,
        height: Number(formData.height) || 0,
      };

      const data = await productService.updateProduct(id, payload);
      navigate("/products", {
        state: { toastMessage: data.message || "Product updated successfully" },
      });
    } catch (error) {
      console.error("Update product error:", error);
      toast.error(error.response?.data?.error || "Unable to update product");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_55%,#f8fafc_100%)]">
        <div className="rounded-3xl border border-white/70 bg-white/80 px-8 py-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <ProductEditorForm
      title="Edit Product"
      subtitle="Refine pricing, stock, and presentation details while keeping your catalog synced with the latest admin-side updates."
      productId={id}
      formData={formData}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/products")}
      isSaving={isSaving}
      submitLabel="Save Changes"
      categories={categories}
      onImagesChanged={handleImagesChanged}
      onVariationsChanged={handleVariationsChanged}
    />
  );
}
