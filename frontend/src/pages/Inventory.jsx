import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";
import * as productService from "../services/productService";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts({ limit: 100 });
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (error) {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
  }, [products, search]);

  // Variable products manage stock per-variation (see Edit Product), so base
  // stock isn't directly editable here — this avoids the base `stock` column
  // and per-variation stock silently fighting each other.
  const updateBaseStock = async (product, value) => {
    const stock = Number(value);
    if (Number.isNaN(stock) || stock < 0) return;

    setSavingId(product.id);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock } : p)));
    try {
      await productService.updateProduct(product.id, {
        name: product.name,
        regular_price: product.regular_price,
        stock,
        stock_status: stock > 0 ? "in_stock" : "out_of_stock",
      });
    } catch (error) {
      toast.error("Failed to update stock");
      fetchAll();
    } finally {
      setSavingId(null);
    }
  };

  const downloadPDF = () => {
    html2pdf().from(document.getElementById("inv")).save("inventory.pdf");
  };

  const downloadCSV = () => {
    let csv = "Product,SKU,Stock,Status\n";
    filtered.forEach((p) => {
      csv += `${p.name},${p.sku || ""},${p.has_variations ? "variable" : p.stock},${p.in_stock ? "In Stock" : "Out of Stock"}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventory.csv";
    a.click();
  };

  const downloadExcel = () => {
    let html = "<table><tr><th>Name</th><th>SKU</th><th>Stock</th></tr>";
    filtered.forEach((p) => { html += `<tr><td>${p.name}</td><td>${p.sku || ""}</td><td>${p.has_variations ? "variable" : p.stock}</td></tr>`; });
    html += "</table>";
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventory.xls";
    a.click();
  };

  return (
    <div className="p-4 sm:p-6" id="inv">
      <h1 className="text-2xl font-bold mb-3">Inventory Management</h1>

      <input
        placeholder="Search products or SKU"
        className="mb-3 w-full rounded border px-3 py-2 sm:max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="responsive-table overflow-x-auto rounded bg-white shadow">
        <table className="w-full min-w-[640px] bg-white shadow rounded">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Low Stock Alert</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="px-3 py-6 text-center text-slate-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" className="px-3 py-6 text-center text-slate-500">No products found</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2 text-slate-500">{p.sku || "—"}</td>
                  <td className="px-3 py-2">
                    {p.has_variations ? (
                      <span className="text-xs text-slate-500" title="Manage stock per variation in Edit Product">
                        Variable ({(p.variations || []).length} variations)
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        className="w-20 rounded border px-2 py-1 disabled:opacity-50"
                        defaultValue={p.stock}
                        disabled={savingId === p.id}
                        onBlur={(e) => updateBaseStock(p, e.target.value)}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{p.low_stock_threshold}</td>
                  <td className="px-3 py-2">
                    {!p.in_stock && <span className="text-red-600">Out of Stock</span>}
                    {p.in_stock && p.is_low_stock && <span className="text-orange-500">Low Stock</span>}
                    {p.in_stock && !p.is_low_stock && <span className="text-green-600">In Stock</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="bg-red-500 text-white px-3 py-2 rounded" onClick={downloadPDF}>PDF</button>
        <button className="bg-orange-500 text-white px-3 py-2 rounded" onClick={downloadCSV}>CSV</button>
        <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={downloadExcel}>Excel</button>
      </div>
    </div>
  );
}
