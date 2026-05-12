import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  PencilLine,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Boxes,
  Sparkles,
  Upload,
  Download
} from "lucide-react";
import { BASE_URL } from "../utils/api";

const sourceBadgeMap = {
  admin: {
    label: "Admin Panel",
    className: "border border-blue-200 bg-blue-100/90 text-blue-700",
  },
  woocommerce: {
    label: "WooCommerce",
    className: "border border-emerald-200 bg-emerald-100/90 text-emerald-700",
  },
};

const getSourceBadge = (source) => sourceBadgeMap[source] || sourceBadgeMap.admin;

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

const productsPerPage = 10;

  useEffect(() => {
    if (location.state?.toastMessage) {
      toast.success(location.state.toastMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const fetchProducts = async () => {
  setLoading(true);

  try {
    const response = await fetch(`${BASE_URL}/api/products`);

    const text = await response.text(); // ✅ debug
    const data = text ? JSON.parse(text) : {};

    console.log("API RESPONSE:", data); // ✅ DEBUG

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch products");
    }

    // ✅ FIX: safe access
    setProducts(Array.isArray(data.products) ? data.products : []);

  } catch (error) {
    console.error("Fetch products error:", error);
    toast.error("Backend not responding or wrong API URL");
    setProducts([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
  fetchProducts();
}, []); 

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      [product.name, product.category, product.sku, product.source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [products, searchTerm]);

  const totalPages = Math.ceil(
  filteredProducts.length / productsPerPage
);

const indexOfLastProduct = currentPage * productsPerPage;

const indexOfFirstProduct =
  indexOfLastProduct - productsPerPage;

const currentProducts = filteredProducts.slice(
  indexOfFirstProduct,
  indexOfLastProduct
);

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(product.id);

    try {
      const response = await fetch(`${BASE_URL}/api/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to delete product");
      }

      toast.success(data.message || "Product deleted successfully");
      await fetchProducts();
    } catch (error) {
      console.error("Delete product error:", error);
      toast.error(error.message || "Unable to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const totalProducts = products.length;
  const publishedProducts = products.filter((product) => product.status === "publish").length;
  const draftProducts = products.filter((product) => product.status === "draft").length;

  // 🔥 EXPORT FUNCTION
const handleExport = () => {
  if (!products.length) {
    toast.error("No products to export");
    return;
  }

  const csv = [
    [
      "ID",
      "Name",
      "Description",
      "Regular Price",
      "Sale Price",
      "Category",
      "SKU",
      "Stock",
      "Stock Status",
      "Status",
      "Brand",
      "Color",
      "Size",
      "HSN",
      "Tax Class",
      "Tax Status",
      "Weight",
      "Length",
      "Width",
      "Height",
      "Image",
      "Source",
      "Created At",
      "Updated At"
    ],

    ...products.map((p) => [
      p.id,
      p.name,
      p.description,
      p.regular_price,
      p.sale_price,
      p.category,
      p.sku,
      p.stock,
      p.stock_status,
      p.status,
      p.brand,
      p.color,
      p.size,
      p.hsn,
      p.tax_class,
      p.tax_status,
      p.weight,
      p.length,
      p.width,
      p.height,
      p.image,
      p.source,
      p.created_at,
      p.updated_at
    ])
  ]
    .map((row) =>
      row.map((value) => `"${value ?? ""}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = `products-export-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  a.click();

  window.URL.revokeObjectURL(url);
};

// 🔥 IMPORT FUNCTION
const handleImport = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${BASE_URL}/api/products/import`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    alert(
      `✅ Imported: ${data.inserted}\n❌ Skipped: ${data.skipped}\n📦 Total: ${data.total}`
    );

    fetchProducts();

  } catch (err) {
    console.error(err);
    alert("Import failed");
  }
};

  return (
    <div className="min-h-screen">
     <div className="mx-auto max-w-7xl space-y-3">
      <section className="rounded-[32px] border border-white/60 bg-white/70 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
       <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
         <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200
          bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
          <Sparkles className="h-3 w-3" />
                PRODUCT MANAGEMENT
         </div>
         <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3 xl">
          Product Dashboard
        </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
        Manage your product inventory, track sources, and control listings
        from Admin Panel & WooCommerce in one place.
     </p>
  </div>

      <div className="flex flex-col gap-3 sm:flex-row">

  {/* 🔍 SEARCH */}
  <div className="relative min-w-[260px]">
    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
      placeholder="Search products, SKU, category..."
      className="w-full rounded-2xl bg-white border border-slate-200 py-2 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
    />
  </div>

  {/* 🔥 ACTION BUTTONS */}
  <div className="flex gap-2">

    {/* IMPORT */}
    <label className="inline-flex items-center gap-2 cursor-pointer rounded-2xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 transition">
      <Upload className="h-4 w-4" />
      Import
      <input
        type="file"
        accept=".xlsx,.csv"
        onChange={handleImport}
        className="hidden"
      />
    </label>

    {/* EXPORT */}
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition"
    >
      <Download className="h-4 w-4" />
      Export
    </button>

    {/* ADD PRODUCT */}
    <Link
      to="/add-product"
      className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#7c3aed_100%)] 
      px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
    >
      <Plus className="h-4 w-4" />
      Add
    </Link>

    <button
  onClick={async () => {
    if (!selectedProducts.length) {
      toast.error("No products selected");
      return;
    }

    const confirmDelete = window.confirm("Delete selected products?");
    if (!confirmDelete) return;

    try {
      await Promise.all(
        selectedProducts.map(id =>
          fetch(`${BASE_URL}/api/products/${id}`, {
            method: "DELETE",
          })
        )
      );

      toast.success("Selected products deleted");
      setSelectedProducts([]);
      fetchProducts();

    } catch (err) {
      toast.error("Bulk delete failed");
    }
  }}
  className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2
              text-sm font-semibold text-white hover:bg-red-700"
>
  Delete
</button>

  </div>
  
</div>
    </div>

         <div className="mt-6 grid gap-4 grid-cols-1 md:grid-cols-3">
            <StatCard
              icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
              label="Total Products"
              value={totalProducts}
              tone="blue"
            />
            <StatCard
              icon={<Boxes className="h-5 w-5 text-emerald-600" />}
              label="Published"
              value={publishedProducts}
              tone="emerald"
            />
            <StatCard
              icon={<PencilLine className="h-5 w-5 text-amber-600" />}
              label="Drafts"
              value={draftProducts}
              tone="amber"
            />
          </div>
        </section>

  <section className="overflow-hidden rounded-[32px] border border-white/60 bg-white/75 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
   {loading ? (
   <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
     <p className="text-sm font-medium text-slate-600">Loading products...</p>
    </div>
          ) : filteredProducts.length === 0 ? (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
         <ShoppingBag className="h-8 w-8 text-slate-400" />
      </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">
                No products found
        </h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
          Add your first product or adjust the search query to surface items in the catalog.
       </p>
        <Link
        to="/add-product"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 
        py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
         >
           <Plus className="h-4 w-4" />
            Add First Product
            </Link>
            </div>
          ) : (
        
     <div className="overflow-x-auto">
     <table className="min-w-full text-sm">
    <thead className="bg-slate-50/90 text-slate-600">
  <tr>
    <th className="px-6 py-4">
  <input
    type="checkbox"
    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedProducts(filteredProducts.map(p => p.id));
      } else {
        setSelectedProducts([]);
      }
    }}
  />
</th>
    <th className="px-6 py-4 text-left font-semibold">Product Name</th>
    <th className="px-6 py-4 text-left font-semibold">Price</th>
    <th className="px-6 py-4 text-left font-semibold">Stock</th>
    <th className="px-6 py-4 text-left font-semibold">Stock Status</th>
    <th className="px-6 py-4 text-left font-semibold">Status</th>
    <th className="px-6 py-4 text-left font-semibold">Category</th>
    <th className="px-6 py-4 text-left font-semibold">Source</th>
    <th className="px-6 py-4 text-left font-semibold">Created</th>
    <th className="px-6 py-4 text-left font-semibold">Actions</th>
  </tr>
</thead>

     <tbody className="divide-y divide-slate-200/80">
        {currentProducts.map((product) => {
          const badge = getSourceBadge(product.source);

           return (
             <tr
               key={product.id}
              className="group transition duration-200 hover:bg-slate-50/90"
             >

<td className="px-6 py-4">
  <input
    type="checkbox"
    checked={selectedProducts.includes(product.id)}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedProducts(prev => [...prev, product.id]);
      } else {
        setSelectedProducts(prev => prev.filter(id => id !== product.id));
      }
    }}
  />
</td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-4">

          <div>
            <div className="font-semibold text-slate-900">
              {product.name}
               </div>
            <div className="mt-1 text-xs text-slate-500">
              {product.sku ? `SKU: ${product.sku}` : "No SKU assigned"}
          </div>
        </div>
      </div>
     </td>

      <td className="px-6 py-4 font-medium text-slate-900">
        <div className="flex flex-col">
    
    {/* SALE PRICE */}
    {product.sale_price !== null && product.sale_price !== 0 && (
      <span className="text-green-600 font-semibold">
       {product.sale_price !== null &&
        product.sale_price !== "" &&
        !isNaN(Number(product.sale_price)) && (
      <span className="text-green-600 font-semibold">
        ₹{Number(product.sale_price).toLocaleString("en-IN")}
      </span>
    )}
      </span>
    )}

    {/* REGULAR PRICE */}
    <span
      className={
        product.sale_price
          ? "text-xs line-through text-slate-400"
          : ""
      }
    >
      ₹{!isNaN(Number(product.regular_price))
      ? Number(product.regular_price).toLocaleString("en-IN")
       : "0"}
    </span>

  </div>
</td>

{/* STOCK */}
<td className="px-6 py-4 text-slate-600">
  {product.stock ?? 0}
</td>

{/* STOCK STATUS */}
<td className="px-6 py-4">
<span className={`px-3 py-1 rounded-full text-xs font-semibold ${
  product.stock_status === "in_stock"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-rose-100 text-rose-700"
}`}>
  {product.stock_status === "in_stock" ? "In Stock" : "Out of Stock"}
</span>
</td>

{/* STATUS */}
<td className="px-6 py-4">
  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
    product.status === "publish"
      ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-700"
  }`}>
    {product.status || "draft"}
  </span>
</td>

     <td className="px-6 py-4 text-slate-600">
       {product.category || "Uncategorized"}
     </td>

      <td className="px-6 py-4">
        <span 
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
        >
         {badge.label}
         </span>
           </td>

    <td className="px-6 py-4 text-slate-500">
       {product.created_at
         ? new Date(product.created_at).toLocaleDateString("en-IN", {
           day: "2-digit",
           month: "short",
           year: "numeric",
           })
           : "—"}
     </td>

      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-2 ">
         <Link
           to={`/edit-product/${product.id}`}
           className="inline-flex items-center gap-2 rounded-xl border border-slate-200
            bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition
             hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700"
         >
          <PencilLine className="h-3.5 w-3.5" />
                              
            </Link>

         <button
            type="button"
            disabled={deletingId === product.id}
            onClick={() => handleDelete(product)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3.5 py-2
             bg-rose-50 text-xs font-semibold text-rose-700 transition hover:-translate-y-0.5
               hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
           >
             <Trash2 className="h-3.5 w-3.5" />
               {deletingId === product.id ? "Deleting..." : ""}
             </button>
             </div>
            </td>
           </tr>
          );
        })}
     </tbody>
   </table>

   {/* Pagination */}
   <div className="flex items-center justify-between border-t border-slate-200 px-6 py-2">

  {/* LEFT */}
  <div className="text-sm text-slate-500">
    Showing{" "}
    <span className="font-semibold">
      {indexOfFirstProduct + 1}
    </span>{" "}
    to{" "}
    <span className="font-semibold">
      {Math.min(indexOfLastProduct, filteredProducts.length)}
    </span>{" "}
    of{" "}
    <span className="font-semibold">
      {filteredProducts.length}
    </span>{" "}
    products
  </div>

  {/* RIGHT */}
  <div className="flex items-center gap-2">

    {/* PREVIOUS */}
    <button
      onClick={() =>
        setCurrentPage((prev) => Math.max(prev - 1, 1))
      }
      disabled={currentPage === 1}
      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
    >
      Previous
    </button>

    {/* PAGE NUMBERS */}
    {[...Array(totalPages)].map((_, index) => {
      const page = index + 1;

      return (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`h-8 w-8 rounded-xl text-sm font-semibold transition ${
            currentPage === page
              ? "bg-blue-600 text-white"
              : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          {page}
        </button>
      );
    })}

    {/* NEXT */}
    <button
      onClick={() =>
        setCurrentPage((prev) =>
          Math.min(prev + 1, totalPages)
        )
      }
      disabled={currentPage === totalPages}
      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
    >
      Next
    </button>
  </div>
</div>
  </div>
 )}
  </section>
 </div>
</div>
  );
}

function StatCard({ icon, label, value, tone }) {
  const toneMap = {
    blue: "border-blue-200 bg-blue-50/80",
    emerald: "border-emerald-200 bg-emerald-50/80",
    amber: "border-amber-200 bg-amber-50/80",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${toneMap[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          {icon}
        </div>
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="text-xl font-bold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}
