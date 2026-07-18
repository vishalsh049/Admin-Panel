import React, { useEffect, useMemo, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { Bar } from "react-chartjs-2";
import api from "../services/api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const parseItems = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) || []; } catch { return []; }
  }
  return [];
};

export default function Reports() {
  const reportRef = useRef();
  const chartRef = useRef();

  // ---------- DATA ----------
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/store/admin/orders")
      .then((res) => setOrders(res.data?.data || []))
      .catch(() => setError("Failed to load report data."))
      .finally(() => setLoading(false));
  }, []);

  // ---------- STATES ----------
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("sales"); // sales | product | customer
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => { setPage(1); }, [view, search, from, to]);

  // ---------- FILTER (date range; cancelled/failed orders don't count as sales) ----------
  const filteredOrders = useMemo(() => {
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to + "T23:59:59") : null;
    return orders.filter((o) => {
      if (["cancelled", "failed"].includes((o.status || "").toLowerCase())) return false;
      const d = new Date(o.created_at);
      if (f && d < f) return false;
      if (t && d > t) return false;
      return true;
    });
  }, [orders, from, to]);

  // ---------- AGGREGATIONS ----------
  const monthlyRows = useMemo(() => {
    const map = new Map();
    for (const o of filteredOrders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(key) || {
        key,
        month: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
        sales: 0,
        orders: 0,
        gst: 0,
      };
      row.sales += Number(o.totalPrice) || 0;
      row.gst += Number(o.gstAmount) || 0;
      row.orders += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredOrders]);

  const productRows = useMemo(() => {
    const map = new Map();
    for (const o of filteredOrders) {
      for (const item of parseItems(o.items)) {
        const name = item.name || "Unknown product";
        const row = map.get(name) || { product: name, qty: 0, sales: 0 };
        const qty = Number(item.quantity) || 1;
        row.qty += qty;
        row.sales += (Number(item.price) || 0) * qty;
        map.set(name, row);
      }
    }
    return [...map.values()].sort((a, b) => b.sales - a.sales);
  }, [filteredOrders]);

  const customerRows = useMemo(() => {
    const map = new Map();
    for (const o of filteredOrders) {
      const name = o.customerName || "Guest";
      const row = map.get(name) || { customer: name, orders: 0, sales: 0 };
      row.orders += 1;
      row.sales += Number(o.totalPrice) || 0;
      map.set(name, row);
    }
    return [...map.values()].sort((a, b) => b.sales - a.sales);
  }, [filteredOrders]);

  // ---------- SEARCH + PAGINATION (on the active view's rows) ----------
  const viewRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows =
      view === "sales" ? monthlyRows : view === "product" ? productRows : customerRows;
    if (!q) return rows;
    return rows.filter((r) =>
      (r.month || r.product || r.customer || "").toLowerCase().includes(q)
    );
  }, [view, search, monthlyRows, productRows, customerRows]);

  const pageCount = Math.max(1, Math.ceil(viewRows.length / rowsPerPage));
  const pageRows = viewRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // ---------- TOTALS ----------
  const totalSales = filteredOrders.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgOrder = totalOrders ? totalSales / totalOrders : 0;
  const totalGst = filteredOrders.reduce((s, o) => s + (Number(o.gstAmount) || 0), 0);

  // ---------- CHART ----------
  const chartData = {
    labels: monthlyRows.map((r) => r.month),
    datasets: [
      {
        label: "Monthly Sales",
        data: monthlyRows.map((r) => r.sales),
        backgroundColor: "rgba(59,130,246,0.7)",
      },
    ],
  };

  // ---------- EXPORT ----------
  const printPage = () => window.print();

  const exportPDF = () => html2pdf().from(reportRef.current).save(`${view}-report.pdf`);

  const exportRows = () => {
    if (view === "sales")
      return {
        header: ["Month", "Orders", "Sales", "GST"],
        rows: viewRows.map((r) => [r.month, r.orders, r.sales.toFixed(2), r.gst.toFixed(2)]),
      };
    if (view === "product")
      return {
        header: ["Product", "Qty Sold", "Sales"],
        rows: viewRows.map((r) => [r.product, r.qty, r.sales.toFixed(2)]),
      };
    return {
      header: ["Customer", "Orders", "Sales"],
      rows: viewRows.map((r) => [r.customer, r.orders, r.sales.toFixed(2)]),
    };
  };

  const downloadCSV = () => {
    const { header, rows } = exportRows();
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${view}-report.csv`;
    link.click();
  };

  const downloadExcel = () => {
    const { header, rows } = exportRows();
    const table = `
      <table>
        <tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr>
        ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
      </table>
    `;
    const blob = new Blob([table], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${view}-report.xls`;
    link.click();
  };

  const downloadChart = () => {
    if (!chartRef.current) return;
    const url = chartRef.current.canvas.toDataURL();
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales-chart.png";
    a.click();
  };

  // ---------- UI ----------
  if (loading) return <div className="p-10 text-center text-slate-500">Loading report data…</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="px-0 py-2 sm:px-2">

      {/* ===== HEADER ===== */}
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

        <div className="flex flex-col gap-3 rounded bg-white px-4 py-3 shadow sm:flex-row sm:flex-wrap">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded border px-2 py-2 sm:w-auto" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded border px-2 py-2 sm:w-auto" />
          <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded border px-2 py-2 sm:min-w-[220px]" />
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={printPage} className="rounded bg-gray-800 px-3 py-2 text-white">Print</button>
          <button onClick={exportPDF} className="rounded bg-red-600 px-3 py-2 text-white">PDF</button>
          <button onClick={downloadCSV} className="rounded bg-orange-500 px-3 py-2 text-white">CSV</button>
          <button onClick={downloadExcel} className="rounded bg-green-600 px-3 py-2 text-white">Excel</button>
          {view === "sales" && (
            <button onClick={downloadChart} className="rounded bg-blue-600 px-3 py-2 text-white">Chart PNG</button>
          )}
        </div>

      </div>

      {/* ===== TABS ===== */}
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <button onClick={() => setView("sales")} className={view === "sales" ? "text-blue-600 font-bold" : "text-gray-500"}>Sales Report</button>
        <button onClick={() => setView("product")} className={view === "product" ? "text-blue-600 font-bold" : "text-gray-500"}>Product Report</button>
        <button onClick={() => setView("customer")} className={view === "customer" ? "text-blue-600 font-bold" : "text-gray-500"}>Customer Report</button>
      </div>

      {/* ===== REPORT CONTENT ===== */}
      <div ref={reportRef}>

        {view === "sales" && (
          <>
            <h1 className="text-2xl font-bold mb-4">Sales Report</h1>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="bg-white shadow p-4 rounded"><p>Total Sales</p><h2>{inr(totalSales)}</h2></div>
              <div className="bg-white shadow p-4 rounded"><p>Total Orders</p><h2>{totalOrders}</h2></div>
              <div className="bg-white shadow p-4 rounded"><p>Average Order</p><h2>{inr(avgOrder)}</h2></div>
              <div className="bg-white shadow p-4 rounded"><p>GST Collected</p><h2>{inr(totalGst)}</h2></div>
            </div>

            <div className="responsive-table rounded bg-white shadow">
              <table className="w-full min-w-[520px] bg-white rounded shadow">
                <thead><tr className="bg-gray-100">
                  <th className="p-2 text-left">Month</th><th className="p-2 text-right">Orders</th><th className="p-2 text-right">Sales</th><th className="p-2 text-right">GST</th>
                </tr></thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.key} className="border-b">
                      <td className="p-2">{r.month}</td>
                      <td className="p-2 text-right">{r.orders}</td>
                      <td className="p-2 text-right">{inr(r.sales)}</td>
                      <td className="p-2 text-right">{inr(r.gst)}</td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">No orders in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-white rounded shadow p-4">
              <Bar ref={chartRef} data={chartData} />
            </div>
          </>
        )}

        {view === "product" && (
          <>
            <h2 className="text-xl font-bold mb-2">Product Report</h2>
            <div className="responsive-table rounded bg-white shadow">
              <table className="w-full min-w-[320px] bg-white rounded shadow">
                <thead><tr className="bg-gray-100">
                  <th className="p-2 text-left">Product</th><th className="p-2 text-right">Qty Sold</th><th className="p-2 text-right">Sales</th>
                </tr></thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.product} className="border-b">
                      <td className="p-2">{r.product}</td>
                      <td className="p-2 text-right">{r.qty}</td>
                      <td className="p-2 text-right">{inr(r.sales)}</td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">No product sales in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === "customer" && (
          <>
            <h2 className="text-xl font-bold mb-2">Customer Report</h2>
            <div className="responsive-table rounded bg-white shadow">
              <table className="w-full min-w-[320px] bg-white rounded shadow">
                <thead><tr className="bg-gray-100">
                  <th className="p-2 text-left">Customer</th><th className="p-2 text-right">Orders</th><th className="p-2 text-right">Sales</th>
                </tr></thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.customer} className="border-b">
                      <td className="p-2">{r.customer}</td>
                      <td className="p-2 text-right">{r.orders}</td>
                      <td className="p-2 text-right">{inr(r.sales)}</td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">No customers in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>

      {/* ===== PAGINATION ===== */}
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-gray-600">Page {page} of {pageCount}</span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
            className="rounded border bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
