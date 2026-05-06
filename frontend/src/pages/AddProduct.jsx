import { useEffect, useState } from "react";
import { BASE_URL } from "../utils/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ProductEditorForm, { defaultProductFormValues } from "./ProductEditorForm";


export default function AddProduct() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(defaultProductFormValues);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  {/* handle change */}
 const handleChange = (event) => {
  const { name, value } = event.target;
  setFormData((current) => {
    let updated = {
      ...current,
      [name]: value,
    };
    // ✅ Auto update stock status
    if (name === "stock") {
      updated.stock_status = Number(value) > 0 ? "in_stock" : "out_of_stock";
    }
    return updated;
  });
};

useEffect(() => {
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/categories`);
      const data = await res.json();
      console.log("API DATA:", data);
      setCategories(Array.isArray(data) ? data : []);
    } 
    catch (err) 
    {
      console.error("Category fetch error:", err);
    }
  };
  fetchCategories();
}, []);


{/* handle category change */}
const handleCategoryChange = (categoryName) => {
  setFormData((prev) => {
    const exists = prev.categories.includes(categoryName);

    return {
      ...prev,
      categories: exists
        ? prev.categories.filter((c) => c !== categoryName) // remove
        : [...prev.categories, categoryName], // add
    };
  });
};

{/* handle submit */}
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
      const response = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      body: JSON.stringify({
  ...formData,

  image: formData.image_preview,

  regular_price:
    formData.regular_price === ""
      ? 0
      : Number(formData.regular_price),

  sale_price:
    formData.sale_price === ""
      ? null
      : Number(formData.sale_price),

  stock: Number(formData.stock) || 0,

  weight: Number(formData.weight) || 0,
  length: Number(formData.length) || 0,
  width: Number(formData.width) || 0,
  height: Number(formData.height) || 0,

  source: "admin",
}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to add product");
      }
      navigate("/products", {
        state: {
          toastMessage: data.message || "Product added successfully",
        },
      });
    } catch (error) {
      console.error("Add product error:", error);
      toast.error(error.message || "Unable to add product");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProductEditorForm
      title="Create New Product"
      subtitle="Add a new product to your catalog. All items created here are securely stored and managed from your admin dashboard."
      formData={formData}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/products")}
      isSaving={isSaving}
      submitLabel="Save & Publish"
      categories={categories}
      selectedCategories={formData.categories}
      onCategoryChange={handleCategoryChange}
    />
  );
}
