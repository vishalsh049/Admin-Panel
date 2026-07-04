import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaFileExport, FaFileImport, FaSearch, FaTimes, FaUser } from "react-icons/fa";
import { exportToExcel, exportToPDF } from "../utils/exportReports";
import { BASE_URL } from "../utils/api";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${BASE_URL}/api/customers`)
  .then((res) => res.json())
  .then((data) => {
    setCustomers(data.data || []);
    setCustomers(data.data || []);
    setTotalCustomers(data.total || 0);
  })
  .catch((err) => console.log(err));
  }, []);

  function formatDate(dateString) {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((c) => {
      const name = c.name || "";
      const email = c.email || "";
      const phone = c.phone || "";

      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q)
      );
    });
  }, [customers, query]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const paginatedCustomers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, pageSize, safePage]);

  const exportRows = (rows) =>
    rows.map((c) => [
      c.name || c.email || "-",
      c.email || "-",
      c.phone || "-",
      c.created_at ? formatDate(c.created_at) : "-",
    ]);

  const handleExportPDF = () => {
    const columns = ["Customer", "Email", "Phone", "Join Date"];
    const rows = exportRows(filteredCustomers);
    exportToPDF("Customers", columns, rows);
  };

  const handleExportExcel = () => {
    const columns = ["Customer", "Email", "Phone", "Join Date"];
    const rows = exportRows(filteredCustomers);
    exportToExcel("Customers", columns, rows);
  };

  const startIndex = filteredCustomers.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(filteredCustomers.length, safePage * pageSize);

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages = new Set([1, totalPages, safePage - 1, safePage, safePage + 1]);
    return Array.from(pages)
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b);
  }, [safePage, totalPages]);


{/* main return */}
  return (
    <div className="w-full relative overflow-x-hidden">
      <div className="relative">
        <div className="">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">Customers</h2>
              <p className="text-sm text-slate-500">
                Ultra-premium directory with luxury search, export and fixed pagination.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</p>
                <p className="text-md font-bold text-slate-900">{totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="mt-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div className="bg-gradient-to-b from-white via-white to-slate-50 rounded-xl border border-slate-200 shadow-[0_30px_90px_-70px_rgba(2,6,23,0.25)] overflow-hidden relative">
          <div className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <FaSearch />
                </div>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white/85 backdrop-blur px-6 pr-8 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-indigo-200 focus:ring-4 focus:ring-indigo-100/40 transition-colors"
                />

                {query.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-slate-100 text-slate-500 transition-colors flex items-center justify-center"
                    aria-label="Clear search"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none rounded-xl border border-slate-200 bg-white/70 backdrop-blur px-4 py-2 shadow-sm hover:bg-white transition-colors">
                  <FaFileImport className="text-slate-700" />
                  <span className="text-sm font-semibold text-slate-800">Import</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.pdf"
                    onChange={() => {
                      // UI-only import (no backend connectivity changed)
                    }}
                  />
                </label>

                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 shadow-[0_14px_34px_-18px_rgba(79,70,229,0.75)] transition-all"
                >
                  <FaFileExport />
                  <span className="text-sm font-semibold">Export PDF</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 shadow-[0_14px_34px_-18px_rgba(16,185,129,0.75)] transition-all"
                >
                  <FaFileExport />
                  <span className="text-sm font-semibold">Export Excel</span>
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="px-2 text-sm text-slate-600">
                {filteredCustomers.length === 0 ? (
                  <span className="font-semibold text-slate-600">No results.</span>
                ) : (
                  <span>
                    Showing{" "}
                    <span className="font-semibold text-slate-900">
                      {startIndex}-{endIndex}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">{totalCustomers}</span>{" "}
                    customers
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rows</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-6 rounded-md border border-slate-200 bg-white/80 px-2 text-slate-800 font-semibold shadow-sm outline-none focus:ring-4 focus:ring-indigo-100/40 transition-colors"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </div>
            </div>
          </div>

          <div className="">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-[0_18px_50px_-40px_rgba(2,6,23,0.18)]">
              <table className="w-full text-sm table-auto">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200">
                    <th className="p-4 text-left font-semibold text-slate-700">Customer</th>
                    <th className="p-4 text-left font-semibold text-slate-700">Email</th>
                    <th className="p-4 text-left font-semibold text-slate-700">Phone</th>
                    <th className="p-4 text-left font-semibold text-slate-700">Join Date</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center">
                        <div className="inline-flex flex-col items-center gap-2">
                          <div className="w-14 h-14 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <FaUser className="text-slate-500 text-lg" />
                          </div>
                          <p className="font-bold text-slate-900">No customers found</p>
                          <p className="text-sm text-slate-500">Try a different search term.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-slate-100 hover:bg-gradient-to-r hover:from-slate-50/70 hover:to-white transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3 min-w-[240px]">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-indigo-50 ring-2 ring-white shadow-sm flex items-center justify-center">
                              <FaUser className="text-slate-600 text-sm" />
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {c.name || c.email}
                              </p>
                              <p className="text-xs text-slate-500 truncate max-w-[190px]">{c.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="text-slate-700">{c.email}</span>
                        </td>

                        <td className="p-4">
                          <span className="text-slate-700">{c.phone || "-"}</span>
                        </td>

                        <td className="p-4">
                          <span className="text-slate-700 font-medium">
                            {c.created_at ? formatDate(c.created_at) : "-"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fixed Premium Pagination Footer */}
          <div className="sticky bottom-0 z-20 bg-white/90 backdrop-blur border-t border-slate-200">
            <div className="p-4 sm:p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-slate-600">
                {filteredCustomers.length === 0 ? (
                  <span>—</span>
                ) : (
                  <span>
                    Page{" "}
                    <span className="font-semibold text-slate-900">{safePage}</span> of{" "}
                    <span className="font-semibold text-slate-900">{totalPages}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`h-8 px-3 rounded-2xl border text-sm transition-all flex items-center gap-2 ${
                    safePage <= 1
                      ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                  }`}
                >
                  <FaArrowLeft className="text-xs" />
                  Prev
                </button>

                <div className="flex items-center gap-1">
                  {pageButtons.map((n, idx) => {
                    const prev = idx > 0 ? pageButtons[idx - 1] : null;
                    const needsEllipsis = prev !== null && n - prev > 1;
                    return (
                      <div key={`${n}`} className="flex items-center gap-1">
                        {needsEllipsis && <span className="px-2 text-slate-400">…</span>}
                        <button
                          onClick={() => setPage(n)}
                          className={`h-8 min-w-[40px] px-3 rounded-2xl border text-sm transition-all ${
                            n === safePage
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-[0_14px_34px_-18px_rgba(79,70,229,0.75)]"
                              : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                          }`}
                          aria-current={n === safePage ? "page" : undefined}
                        >
                          {n}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={`h-8 px-3 rounded-2xl border text-sm transition-all flex items-center gap-2 ${
                    safePage >= totalPages
                      ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                  }`}
                >
                  Next
                  <FaArrowRight className="text-xs" />
                </button>
              </div>
            </div>
          </div>

          {/* bottom note */}
          <div className="px-5 sm:px-7 py-4 border-t border-slate-200 bg-white/60">
            <p className="text-xs text-slate-500">
              Tip: Search filters instantly. Pagination stays pinned for a luxury dashboard experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
