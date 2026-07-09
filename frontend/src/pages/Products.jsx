import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  PencilLine, Plus, Search, ShoppingBag, Trash2, Boxes, Sparkles,
  Upload, Download, Eye, RefreshCw, AlertTriangle, ArrowUp, ArrowDown,
} from "lucide-react";
import * as productService from "../services/productService";
import * as categoryService from "../services/categoryService";
import { getImageUrl } from "../utils/getImageUrl";
import ConfirmModal from "../components/ConfirmModal";

const sourceBadgeMap = {
  admin: { label: "Admin Panel", className: "border border-blue-200 bg-blue-100/90 text-blue-700" },
};
const getSourceBadge = (source) => sourceBadgeMap[source] || sourceBadgeMap.admin;

const SORT_COLUMNS = {
  name: { asc: "name_asc", desc: "name_desc" },
  price: { asc: "price_asc", desc: "price_desc" },
  stock: { asc: "stock_asc", desc: "stock_desc" },
};

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, lowStock: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [viewProduct, setViewProduct] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (location.state?.toastMessage) {
      toast.success(location.state.toastMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    categoryService
      .getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await productService.getProductStats();
      setStats(data.stats);
    } catch {
      // stats are supplementary — a failure here shouldn't block the list
    }
  }, []);

  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: pagination.limit, sort: sortKey };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (categoryFilter) params.category_id = categoryFilter;
        if (statusFilter) params.status = statusFilter;

        const data = await productService.getProducts(params);
        setProducts(Array.isArray(data.products) ? data.products : []);
        setPagination(data.pagination);
      } catch (error) {
        console.error("Fetch products error:", error);
        toast.error(error.response?.data?.error || "Backend not responding or wrong API URL");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, sortKey, searchTerm, categoryFilter, statusFilter]
  );

  useEffect(() => {
    fetchProducts(1);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, searchTerm, categoryFilter, statusFilter]);

  const handleRefresh = () => {
    fetchProducts(pagination.page);
    fetchStats();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    try {
      const data = await productService.deleteProduct(pendingDelete.id);
      toast.success(data.message || "Product deleted successfully");
      fetchProducts(pagination.page);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to delete product");
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    setIsBusy(true);
    try {
      await productService.bulkDeleteProducts(selectedProducts);
      toast.success("Selected products deleted");
      setSelectedProducts([]);
      fetchProducts(1);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || "Bulk delete failed");
    } finally {
      setIsBusy(false);
      setPendingBulkDelete(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryFilter) params.category_id = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const blob = await productService.exportProducts(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await productService.importProducts(file);
      toast.success(`Imported: ${data.inserted} · Skipped: ${data.skipped} · Total: ${data.total}`);
      fetchProducts(1);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || "Import failed");
    } finally {
      e.target.value = "";
    }
  };

  const toggleSort = (column) => {
    const map = SORT_COLUMNS[column];
    if (sortKey === map.asc) setSortKey(map.desc);
    else if (sortKey === map.desc) setSortKey("newest");
    else setSortKey(map.asc);
  };

  const sortIndicator = (column) => {
    const map = SORT_COLUMNS[column];
    if (sortKey === map.asc) return <ArrowUp className="inline h-3 w-3" />;
    if (sortKey === map.desc) return <ArrowDown className="inline h-3 w-3" />;
    return null;
  };

  const allSelected = products.length > 0 && selectedProducts.length === products.length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-2">
        <section className="rounded-[22px] border border-white/60 bg-white/70 p-2 backdrop-blur-xl sm:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
                <Sparkles className="h-3 w-3" />
                PRODUCT MANAGEMENT
              </div>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
                Manage your product inventory, track sources, and control listings from your Admin Panel.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100">
                <Upload className="h-4 w-4" />
                Import
                <input type="file" accept=".xlsx,.csv" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button onClick={handleRefresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <Link to="/add-product" className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2563eb_0%,#7c3aed_100%)] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5">
                <Plus className="h-4 w-4" />
                Add
              </Link>
              {selectedProducts.length > 0 && (
                <button onClick={() => setPendingBulkDelete(true)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedProducts.length})
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search products, SKU..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All Status</option>
              <option value="publish">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="mt-4 grid gap-2 grid-cols-2 md:grid-cols-4">
            <StatCard icon={<ShoppingBag className="h-5 w-5 text-blue-600" />} label="Total Products" value={stats.total} tone="blue" />
            <StatCard icon={<Boxes className="h-5 w-5 text-emerald-600" />} label="Published" value={stats.published} tone="emerald" />
            <StatCard icon={<PencilLine className="h-5 w-5 text-amber-600" />} label="Drafts" value={stats.draft} tone="amber" />
            <StatCard icon={<AlertTriangle className="h-5 w-5 text-rose-600" />} label="Low Stock" value={stats.lowStock} tone="rose" />
          </div>
        </section>

        <section className="overflow-hidden rounded-[22px] border border-white/60 bg-white/75 backdrop-blur-xl">
          {loading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="text-sm font-medium text-slate-600">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
                <ShoppingBag className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-900">No products found</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Add your first product or adjust your search/filters to surface items in the catalog.
              </p>
              <Link to="/add-product" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                <Plus className="h-4 w-4" />
                Add First Product
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => setSelectedProducts(e.target.checked ? products.map((p) => p.id) : [])}
                      />
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">Image</th>
                    <th className="px-4 py-2 text-left font-semibold cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      Product Name {sortIndicator("name")}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold cursor-pointer select-none" onClick={() => toggleSort("price")}>
                      Price {sortIndicator("price")}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold cursor-pointer select-none" onClick={() => toggleSort("stock")}>
                      Stock {sortIndicator("stock")}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">Stock Status</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-left font-semibold">Category</th>
                    <th className="px-4 py-2 text-left font-semibold">Source</th>
                    <th className="px-4 py-2 text-left font-semibold">Created</th>
                    <th className="px-4 py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {products.map((product) => {
                    const badge = getSourceBadge(product.source);
                    return (
                      <tr key={product.id} className="group border-b border-slate-100 transition hover:bg-blue-50/30">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={(e) =>
                              setSelectedProducts((prev) =>
                                e.target.checked ? [...prev, product.id] : prev.filter((id) => id !== product.id)
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <img
                            src={getImageUrl(product.image)}
                            onError={(e) => { e.target.src = getImageUrl(null); }}
                            alt={product.name}
                            className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="font-semibold text-slate-900">{product.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{product.sku ? `SKU: ${product.sku}` : "No SKU assigned"}</div>
                          {product.is_low_stock && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                              <AlertTriangle className="h-3 w-3" /> Low stock
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          <div className="flex flex-col">
                            {product.sale_price ? (
                              <>
                                <span className="font-semibold text-green-600">₹{Number(product.sale_price).toLocaleString("en-IN")}</span>
                                <span className="text-xs text-slate-400 line-through">₹{Number(product.regular_price).toLocaleString("en-IN")}</span>
                              </>
                            ) : (
                              <span>{product.has_variations && product.price_range ? `₹${product.price_range.min} – ₹${product.price_range.max}` : `₹${Number(product.regular_price || 0).toLocaleString("en-IN")}`}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-600">{product.stock ?? 0}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.in_stock ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {product.in_stock ? "In Stock" : "Out of Stock"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status === "publish" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                            {product.status || "draft"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-600">{product.category || "Uncategorized"}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          {product.created_at ? new Date(product.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setViewProduct(product); setShowViewModal(true); }} className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                              <Eye className="h-4 w-4" />
                            </button>
                            <Link to={`/edit-product/${product.id}`} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700">
                              <PencilLine className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              disabled={deletingId === product.id}
                              onClick={() => setPendingDelete(product)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
                <div className="text-sm text-slate-500">
                  Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                  <span className="font-semibold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                  <span className="font-semibold">{pagination.total}</span> products
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => fetchProducts(pagination.page - 1)} disabled={pagination.page === 1} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50">
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button onClick={() => fetchProducts(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50">
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {showViewModal && viewProduct && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-md">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Product Details</h2>
                <button onClick={() => setShowViewModal(false)} className="text-xl text-red-500">✕</button>
              </div>

              <img src={getImageUrl(viewProduct.image)} className="mb-6 h-32 w-32 rounded-2xl border object-cover" alt="" />

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Info title="ID" value={viewProduct.id} />
                <Info title="Name" value={viewProduct.name} />
                <Info title="SKU" value={viewProduct.sku} />
                <Info title="Category" value={viewProduct.category} />
                <Info title="Regular Price" value={`₹${viewProduct.regular_price}`} />
                <Info title="Sale Price" value={viewProduct.sale_price ? `₹${viewProduct.sale_price}` : "—"} />
                <Info title="Stock" value={viewProduct.stock} />
                <Info title="Stock Status" value={viewProduct.in_stock ? "In Stock" : "Out of Stock"} />
                <Info title="Status" value={viewProduct.status} />
                <Info title="Brand" value={viewProduct.brand} />
                <Info title="Color" value={viewProduct.color} />
                <Info title="Size" value={viewProduct.size} />
              </div>

              {viewProduct.short_description && (
                <div className="mt-5">
                  <h3 className="mb-2 font-semibold">Short Description</h3>
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{viewProduct.short_description}</p>
                </div>
              )}

              <div className="mt-5">
                <h3 className="mb-2 font-semibold">Description</h3>
                <div
                  className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700"
                  dangerouslySetInnerHTML={{ __html: viewProduct.description || "No description available" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        isBusy={!!deletingId}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmModal
        open={pendingBulkDelete}
        title={`Delete ${selectedProducts.length} selected product(s)?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        isBusy={isBusy}
        onConfirm={handleBulkDelete}
        onCancel={() => setPendingBulkDelete(false)}
      />
    </div>
  );
}

function StatCard({ icon, label, value, tone }) {
  const toneMap = {
    blue: "border-blue-200 bg-blue-50/80",
    emerald: "border-emerald-200 bg-emerald-50/80",
    amber: "border-amber-200 bg-amber-50/80",
    rose: "border-rose-200 bg-rose-50/80",
  };
  return (
    <div className={`rounded-2xl border p-2 shadow-sm transition hover:shadow-md ${toneMap[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm">{icon}</div>
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="text-lg font-semibold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Info({ title, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}
