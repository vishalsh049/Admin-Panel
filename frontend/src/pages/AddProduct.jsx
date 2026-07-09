import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ProductEditorForm, { defaultProductFormValues } from "./ProductEditorForm";
import * as productService from "../services/productService";
import * as categoryService from "../services/categoryService";

export default function AddProduct() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(defaultProductFormValues);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState([]);

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

  useEffect(() => {
    categoryService
      .getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Category fetch error:", err));
  }, []);

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
        regular_price: formData.regular_price === "" ? 0 : Number(formData.regular_price),
        sale_price: formData.sale_price === "" ? null : Number(formData.sale_price),
        cost_price: formData.cost_price === "" ? null : Number(formData.cost_price),
        stock: Number(formData.stock) || 0,
        low_stock_threshold: Number(formData.low_stock_threshold) || 5,
        weight: Number(formData.weight) || 0,
        length: Number(formData.length) || 0,
        width: Number(formData.width) || 0,
        height: Number(formData.height) || 0,
        source: "admin",
      };

      const data = await productService.createProduct(payload);
      toast.success(data.message || "Product added successfully");
      navigate(`/edit-product/${data.product.id}`, {
        state: { toastMessage: "Product created — add gallery images and variations below." },
      });
    } catch (error) {
      console.error("Add product error:", error);
      toast.error(error.response?.data?.error || "Unable to add product");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProductEditorForm
      title="Create New Product"
      subtitle="Add a new product to your catalog. All items created here are securely stored and managed from your admin dashboard."
      productId={null}
      formData={formData}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/products")}
      isSaving={isSaving}
      submitLabel="Save & Continue"
      categories={categories}
    />
  );
}
