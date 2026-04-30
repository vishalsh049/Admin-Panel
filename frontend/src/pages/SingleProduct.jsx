import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";

export default function SingleProduct() {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ PRODUCT STATE
  const [product, setProduct] = useState({
    title: "",
    sku: "",
    hsn: "",
    gtin: "",
    regularPrice: "",
    salePrice: "",
    stock: "",
    stockStatus: "in_stock",
    category: "",
    brand: "",
    status: "Active",
    taxStatus: "taxable",
    taxClass: "standard",
    images: [],
  });

  // ✅ LOAD PRODUCT FROM PRODUCTS PAGE
useEffect(() => {
  if (location.state) {
    setProduct((prev) => ({
      ...prev,
      id: location.state.id, // ✅ REQUIRED
      title: location.state.name || "",
      sku: location.state.sku || "",
      regularPrice: location.state.sale || "",
      stock: location.state.stock || "",
      brand: location.state.brand || "",
      images: location.state.image ? [location.state.image] : [],
      stockStatus:
        location.state.stock > 0 ? "in_stock" : "out_of_stock",
    }));
  }
}, [location.state]);


  // ✅ HANDLE INPUT CHANGE
  const handleChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  // ✅ HANDLE IMAGES
  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map((file) => URL.createObjectURL(file));
    setProduct((prev) => ({
      ...prev,
      images: [...prev.images, ...urls],
    }));
  };

  const saveProduct = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/api/woo/products/${location.state.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: product.title,
          sku: product.sku,
          regular_price: product.regularPrice.toString(),
          sale_price: product.salePrice.toString(),
          stock_quantity: Number(product.stock),
          stock_status: product.stockStatus,
          status: product.status.toLowerCase(),
          brands: product.brand,
          tax_status: product.taxStatus,
          tax_class: product.taxClass,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update product");
    }

    alert("✅ Product updated successfully");
    navigate(-1);
  } catch (error) {
    console.error(error);
    alert("❌ Error updating product");
  }
};




  return (
    <div className="p-6 max-w-full">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 border rounded hover:bg-gray-100"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Product Details</h1>
        </div>

        <select
          name="status"
          value={product.status}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        >
          <option>Active</option>
          <option>Draft</option>
        </select>
      </div>

      {/* ITEM NAME */}
      <div className="mb-4">
        <label className="font-semibold">Item Name</label>
        <input
          name="title"
          value={product.title}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 mt-1"
        />
      </div>

      {/* SKU / HSN / GTIN */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <input
          name="sku"
          placeholder="SKU Code"
          value={product.sku}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />
        <input
          name="hsn"
          placeholder="HSN Code"
          value={product.hsn}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />
        <input
          name="gtin"
          placeholder="GTIN / Barcode"
          value={product.gtin}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* PRICE & TAX */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <input
          name="regularPrice"
          placeholder="Regular Price ₹"
          value={product.regularPrice}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />

        
        <input
          name="salePrice"
          placeholder="Sale Price ₹"
          value={product.salePrice}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />
        <select
          name="taxStatus"
          value={product.taxStatus}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        >
          <option value="taxable">Taxable</option>
          <option value="non-taxable">Non Taxable</option>
        </select>
        <select
          name="taxClass"
          value={product.taxClass}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        >
          <option value="standard">GST Standard</option>
          <option value="gst-5">GST 5%</option>
          <option value="gst-12">GST 12%</option>
          <option value="gst-18">GST 18%</option>
        </select>
      </div>

      {/* STOCK / STATUS / BRAND */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="font-semibold text-sm block mb-1">Stock</label>
          <input
            type="number"
            name="stock"
            placeholder="enter stock"
            value={product.stock}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="font-semibold text-sm block mb-1">
            Stock Status
          </label>
          <select
            name="stockStatus"
            value={product.stockStatus}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-sm block mb-1">
            Brand Name
          </label>
          <input
            name="brand"
            placeholder="Eg. Divya Darshnam"
            value={product.brand}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* IMAGES */}
      <label className="font-semibold">Images</label>
      <input type="file" multiple onChange={handleImages} className="mt-2" />

      <div className="flex gap-2 mt-3 flex-wrap">
        {product.images.length === 0 && (
          <div className="w-16 h-16 border rounded flex items-center justify-center text-xs text-gray-400">
            No Image
          </div>
        )}
        {product.images.map((img, i) => (
          <img key={i} src={img} className="w-16 h-16 border rounded" />
        ))}
      </div>

      {/* SAVE */}
     <button
  onClick={saveProduct}
  className="mt-6 px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
>
  Save Changes
</button>
    </div>
  );
}
