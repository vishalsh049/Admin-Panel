import React, { useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { Bar } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function Reports() {

  const reportRef = useRef();
  const chartRef = useRef();

  // ---------- DEMO DATA ----------
  const allData = [
    { date: "05-01-2026", month: "Jan", sales: 12000, orders: 70, customer: "Rahul", product: "Tulsi Mala" },
    { date: "11-02-2026", month: "Feb", sales: 15000, orders: 95, customer: "Amit", product: "Brass Statue" },
    { date: "09-03-2026", month: "Mar", sales: 21000, orders: 140, customer: "Sneha", product: "Pooja Thali" },
    { date: "18-04-2026", month: "Apr", sales: 18000, orders: 110, customer: "Pooja", product: "Rudraksha" },
    { date: "03-05-2026", month: "May", sales: 26000, orders: 190, customer: "Karan", product: "Dhoop Cone" },
    { date: "12-06-2026", month: "Jun", sales: 30000, orders: 220, customer: "Riya", product: "Agarbatti" },
  ];

  // ---------- STATES ----------
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("sales");   // sales | product | customer
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;

  // ---------- FILTER ----------
  const filteredData = allData.filter(r => {

    if (search && !(
      r.date.includes(search) ||
      r.month.toLowerCase().includes(search.toLowerCase()) ||
      r.customer.toLowerCase().includes(search.toLowerCase()) ||
      r.product.toLowerCase().includes(search.toLowerCase())
    )) return false;

    if (!from && !to) return true;

    const d = new Date(r.date.split("-").reverse().join("-"));
    const f = from ? new Date(from) : new Date("2000-01-01");
    const t = to ? new Date(to) : new Date("2100-12-31");

    return d >= f && d <= t;
  });

  const data = filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // ---------- TOTALS ----------
  const totalSales = filteredData.reduce((s,x)=>s+x.sales,0);
  const totalOrders = filteredData.reduce((s,x)=>s+x.orders,0);
  const avgOrder = totalOrders ? Math.floor(totalSales/totalOrders) : 0;

  // ---------- GST ----------
  const igst = totalSales * 0.18;

  // ---------- CHART ----------
  const chartData = {
    labels: filteredData.map(r=>r.month),
    datasets: [{
      label: "Monthly Sales",
      data: filteredData.map(r=>r.sales),
      backgroundColor: "rgba(59,130,246,0.7)",
    }]
  };

  // ---------- EXPORT ----------
  const printPage = () => window.print();

  const exportPDF = () => html2pdf().from(reportRef.current).save("sales-report.pdf");

  const downloadCSV = () => {
    let csv = "Date,Month,Sales,Orders\n";
    filteredData.forEach(r => {
      csv += `${r.date},${r.month},${r.sales},${r.orders}\n`;
    });
    const blob = new Blob([csv],{type:"text/csv"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sales-report.csv";
    link.click();
  };

  const downloadExcel = () => {
    let table = `
      <table>
        <tr><th>Date</th><th>Month</th><th>Sales</th><th>Orders</th></tr>
        ${filteredData.map(r=>`
          <tr><td>${r.date}</td><td>${r.month}</td><td>${r.sales}</td><td>${r.orders}</td></tr>
        `).join("")}
      </table>
    `;
    const blob = new Blob([table],{type:"application/vnd.ms-excel"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sales-report.xls";
    link.click();
  };

  const downloadChart = () => {
    const url = chartRef.current.canvas.toDataURL();
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales-chart.png";
    a.click();
  };

  // ---------- UI ----------
  return (
    <div className="p-6">

      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">

        <div className="bg-white px-4 py-3 rounded shadow flex gap-3">

          <input type="date" onChange={e=>setFrom(e.target.value)} className="border rounded px-2"/>
          <input type="date" onChange={e=>setTo(e.target.value)} className="border rounded px-2"/>
          <input placeholder="Search..." onChange={e=>setSearch(e.target.value)} className="border rounded px-2"/>

        </div>

        <div className="flex gap-2">
          <button onClick={printPage} className="px-3 py-2 bg-gray-800 text-white rounded">Print</button>
          <button onClick={exportPDF} className="px-3 py-2 bg-red-600 text-white rounded">PDF</button>
          <button onClick={downloadCSV} className="px-3 py-2 bg-orange-500 text-white rounded">CSV</button>
          <button onClick={downloadExcel} className="px-3 py-2 bg-green-600 text-white rounded">Excel</button>
          <button onClick={downloadChart} className="px-3 py-2 bg-blue-600 text-white rounded">Chart PNG</button>
        </div>

      </div>

      {/* ===== TABS ===== */}
      <div className="flex gap-4 mb-3 text-sm">
        <button onClick={()=>setView("sales")} className={view==="sales"?"text-blue-600 font-bold":"text-gray-500"}>Sales Report</button>
        <button onClick={()=>setView("product")} className={view==="product"?"text-blue-600 font-bold":"text-gray-500"}>Product Report</button>
        <button onClick={()=>setView("customer")} className={view==="customer"?"text-blue-600 font-bold":"text-gray-500"}>Customer Report</button>
      </div>

      {/* ===== REPORT CONTENT ===== */}
      <div ref={reportRef}>

        {view === "sales" && (
          <>

            <h1 className="text-2xl font-bold mb-4">Sales Report</h1>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white shadow p-4 rounded"><p>Total Sales</p><h2>₹ {totalSales}</h2></div>
              <div className="bg-white shadow p-4 rounded"><p>Total Orders</p><h2>{totalOrders}</h2></div>
              <div className="bg-white shadow p-4 rounded"><p>Average Order</p><h2>₹ {avgOrder}</h2></div>
              <div className="bg-white shadow p-4 rounded"><p>IGST</p><h2>₹ {igst.toFixed(2)}</h2></div>
            </div>

            <table className="w-full bg-white rounded shadow">
              <thead><tr className="bg-gray-100">
                <th className="p-2">Date</th><th className="p-2">Month</th><th className="p-2">Sales</th><th className="p-2">Orders</th>
              </tr></thead>
              <tbody>
                {data.map((r,i)=>(
                  <tr key={i} className="border-b">
                    <td className="p-2">{r.date}</td>
                    <td className="p-2">{r.month}</td>
                    <td className="p-2">₹{r.sales}</td>
                    <td className="p-2">{r.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 bg-white rounded shadow p-4">
              <Bar ref={chartRef} data={chartData}/>
            </div>

          </>
        )}

        {view === "product" && (
          <>
            <h2 className="text-xl font-bold mb-2">Product Report</h2>
            <table className="w-full bg-white rounded shadow">
              <thead><tr><th>Product</th><th>Sales</th></tr></thead>
              <tbody>
                {filteredData.map((r,i)=>(
                  <tr key={i}><td>{r.product}</td><td>₹{r.sales}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {view === "customer" && (
          <>
            <h2 className="text-xl font-bold mb-2">Customer Report</h2>
            <table className="w-full bg-white rounded shadow">
              <thead><tr><th>Customer</th><th>Orders</th></tr></thead>
              <tbody>
                {filteredData.map((r,i)=>(
                  <tr key={i}><td>{r.customer}</td><td>{r.orders}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

      </div>
    </div>
  );
}
