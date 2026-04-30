import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import ProductEditorForm from "./ProductEditorForm";
import { BASE_URL } from "../utils/api";

const mapProductToForm = (product) => ({
  name: product.name || "",
  description: product.description || "",
  price: product.price ?? "",
  category: product.category || "",
  sku: product.sku || "",
  stock: product.stock ?? "",
  status: product.status || "publish",
  image_url: product.image_url || "",
});

export default function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState(defaultProductFormValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/products/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || "Failed to load product");
        }

        if (isMounted) {
          setFormData(mapProductToForm(data.product));
        }
      } catch (error) {
        console.error("Load product error:", error);
        toast.error(error.message || "Unable to load product");
        navigate("/products");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      toast.error("Please enter a valid product price");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${BASE_URL}/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to update product");
      }

      navigate("/products", {
        state: {
          toastMessage: data.message || "Product updated successfully",
        },
      });
    } catch (error) {
      console.error("Update product error:", error);
      toast.error(error.message || "Unable to update product");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_55%,#f8fafc_100%)]">
        <div className="rounded-3xl border border-white/70 bg-white/80 px-8 py-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProductEditorForm
      title="Edit Product"
      subtitle="Refine pricing, stock, and presentation details while keeping your catalog synced with the latest admin-side updates."
      formData={formData}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/products")}
      isSaving={isSaving}
      submitLabel="Save Changes"
    />
  );
}
