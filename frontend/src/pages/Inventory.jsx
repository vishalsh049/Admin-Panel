import React, { useState } from "react";
import html2pdf from "html2pdf.js";

export default function Inventory() {

  const [items, setItems] = useState([
    { id: 1, name: "Tulsi Mala", sku: "TM-101", stock: 40, low: 5, category: "Mala" },
    { id: 2, name: "Brass Statue", sku: "BS-222", stock: 8, low: 5, category: "Murti" },
    { id: 3, name: "Pooja Thali", sku: "PT-333", stock: 15, low: 5, category: "Puja Items" },
  ]);

  const [history, setHistory] = useState([]);

  const [form, setForm] = useState({
    name: "", sku: "", stock: "", category: ""
  });

  const [search, setSearch] = useState("");

  // stock reduce from invoice (internal function now)
  const reduceStockFromInvoice = (cartItems) => {
    setItems(prev =>
      prev.map(p => {
        const match = cartItems.find(c => c.name === p.name);
        return match ? { ...p, stock: p.stock - match.qty } : p;
      })
    );
  };

  if (items.some(i => i.stock <= i.low)) {
    console.warn("Low stock alert triggered");
  }

  const addItem = () => {
    if (!form.name || !form.sku || !form.stock)
      return alert("Fill all required fields");

    setItems([...items, { ...form, id: Date.now(), stock: Number(form.stock) }]);

    setForm({ name: "", sku: "", stock: "", category: "" });
  };

  const updateStock = (id, value) => {
    setItems(items.map(i =>
      i.id === id ? { ...i, stock: Number(value) } : i
    ));

    setHistory(h => [...h, { id, change: value, time: new Date().toLocaleString() }]);
  };

  const downloadPDF = () => {
    html2pdf().from(document.getElementById("inv")).save("inventory.pdf");
  };

  const downloadCSV = () => {
    let csv = "Product,SKU,Stock\n";
    items.forEach(i => csv += `${i.name},${i.sku},${i.stock}\n`);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventory.csv";
    a.click();
  };

  const downloadExcel = () => {
    let html = "<table><tr><th>Name</th><th>Stock</th></tr>";
    items.forEach(i => html += `<tr><td>${i.name}</td><td>${i.stock}</td></tr>`);
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
        placeholder="Search products"
        className="mb-3 w-full rounded border px-3 py-2 sm:max-w-sm"
        onChange={e => setSearch(e.target.value)}
      />

      <div className="mb-4 grid gap-2 rounded bg-white p-3 shadow sm:grid-cols-2 xl:grid-cols-5">
        <input className="rounded border px-3 py-2" placeholder="Name" onChange={e=>setForm({...form,name:e.target.value})}/>
        <input className="rounded border px-3 py-2" placeholder="SKU" onChange={e=>setForm({...form,sku:e.target.value})}/>
        <input className="rounded border px-3 py-2" placeholder="Stock" onChange={e=>setForm({...form,stock:e.target.value})}/>
        <input className="rounded border px-3 py-2" placeholder="Category" onChange={e=>setForm({...form,category:e.target.value})}/>
        <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={addItem}>Add</button>
      </div>

      <div className="responsive-table rounded bg-white shadow">
      <table className="w-full min-w-[560px] bg-white shadow rounded">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th>Name</th><th>SKU</th><th>Stock</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items
            .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
            .map(i => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.sku}</td>
              <td>
                <input
                  className="w-16 rounded border"
                  value={i.stock}
                  onChange={e => updateStock(i.id, e.target.value)}
                />
              </td>
              <td>
                {i.stock <= 0 && <span className="text-red-600">Out of Stock</span>}
                {i.stock > 0 && i.stock <= i.low && <span className="text-orange-500">Low Stock</span>}
                {i.stock > i.low && <span className="text-green-600">In Stock</span>}
              </td>
            </tr>
          ))}
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
