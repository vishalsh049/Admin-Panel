import { useEffect, useRef, useState } from "react";
import { Search, PackageX, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { searchPosProducts, fetchCategories } from "../../services/posService";
import { getImageUrl } from "../../utils/getImageUrl";
import { inr } from "./constants";
import { createScanDetector } from "../../hooks/useKeyboardShortcuts";
import VariantPickerModal from "./VariantPickerModal";

export default function ProductSearchGrid({ onAddToCart, searchInputRef }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [variantProduct, setVariantProduct] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchCategories({ status: "Active" })
      .then((cats) => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(search, categoryId);
    }, 250);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId]);

  async function runSearch(term, catId) {
    setLoading(true);
    try {
      const data = await searchPosProducts({
        search: term || undefined,
        category_id: catId || undefined,
        sort: "name_asc",
      });
      setProducts(data.products || []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function handlePick(product) {
    if (product.has_variations) {
      setVariantProduct(product);
      return;
    }
    if (!product.in_stock) {
      toast.error(`"${product.name}" is out of stock`);
      return;
    }
    onAddToCart(product, null);
  }

  const scanHandler = useRef(
    createScanDetector((code) => {
      setSearch(code);
    })
  ).current;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 p-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={scanHandler}
            placeholder="Search by name, SKU or scan a barcode…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              !categoryId
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                categoryId === c.id
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-slate-400">
            <PackageX className="mb-2 h-10 w-10" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePick(p)}
                disabled={!p.in_stock}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="relative h-24 w-full bg-slate-50 dark:bg-slate-900">
                  <img
                    src={getImageUrl(p.image)}
                    alt={p.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {p.has_variations && (
                    <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-indigo-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Layers className="h-2.5 w-2.5" /> Options
                    </span>
                  )}
                  {!p.in_stock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[11px] font-semibold text-rose-600 dark:bg-slate-900/70">
                      Out of stock
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-tight text-slate-800 dark:text-slate-100">{p.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{p.sku || "—"}</p>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{inr(p.price, { decimals: 0 })}</span>
                    {!p.has_variations && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{p.stock} in stock</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {variantProduct && (
        <VariantPickerModal
          product={variantProduct}
          onClose={() => setVariantProduct(null)}
          onSelect={(variation) => {
            onAddToCart(variantProduct, variation);
            setVariantProduct(null);
          }}
        />
      )}
    </div>
  );
}
