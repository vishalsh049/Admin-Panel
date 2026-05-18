import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { BASE_URL } from "../utils/api";
import { FaArrowLeft, FaArrowRight, FaFileExport, FaFileImport, FaSearch, FaTimes } from "react-icons/fa";

export default function SaleBills() {
  const navigate = useNavigate();

  const [bills, setBills] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [selectedBills, setSelectedBills] = useState([]);
  const menuRef = useRef(null);

  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${BASE_URL}/api/sale-bills`)
      .then((res) => res.json())
      .then((data) => {
        console.log("API DATA:", data);

        if (Array.isArray(data)) {
          setBills(data);
        } else {
          setBills([]);
        }
      })
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bill?")) return;

    await fetch(`${BASE_URL}/api/sale-bills/${id}`, {
      method: "DELETE",
    });

    setBills(bills.filter((b) => b.id !== id));
    setSelectedBills((prev) => prev.filter((x) => x !== id));
  };

  const toggleSelect = (id) => {
    setSelectedBills((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectAll = () => {
    if (selectedBills.length === bills.length) {
      setSelectedBills([]);
    } else {
      setSelectedBills(bills.map((b) => b.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBills.length === 0) {
      alert("Select at least one bill");
      return;
    }

    if (!window.confirm("Delete selected bills?")) return;

    await Promise.all(
      selectedBills.map((id) =>
        fetch(`${BASE_URL}/api/sale-bills/${id}`, {
          method: "DELETE",
        })
      )
    );

    setBills(bills.filter((b) => !selectedBills.includes(b.id)));
    setSelectedBills([]);
  };

  const handleDownload = () => {
    const selectedData =
      selectedBills.length > 0 ? bills.filter((b) => selectedBills.includes(b.id)) : bills;

    const csv = [
      ["Date", "Customer", "Phone", "Email", "Status", "Payment", "Total"],
      ...selectedData.map((b) => [
        b.order_date,
        b.billing_name,
        b.billing_phone,
        b.billing_email,
        b.status,
        b.payment_method,
        b.total_amount,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "sale_bills.csv";
    a.click();
  };

  const filteredBills = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bills;

    return bills.filter((b) => {
      const orderDate = b.order_date ? String(b.order_date) : "";
      const name = b.billing_name ? String(b.billing_name) : "";
      const phone = b.billing_phone ? String(b.billing_phone) : "";
      const email = b.billing_email ? String(b.billing_email) : "";
      const status = b.status ? String(b.status) : "";
      const payment = b.payment_method ? String(b.payment_method) : "";
      const total = b.total_amount !== undefined && b.total_amount !== null ? String(b.total_amount) : "";

      return (
        orderDate.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        status.toLowerCase().includes(q) ||
        payment.toLowerCase().includes(q) ||
        total.toLowerCase().includes(q)
      );
    });
  }, [bills, query]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const paginatedBills = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredBills.slice(start, start + pageSize);
  }, [filteredBills, pageSize, safePage]);

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages = new Set([1, totalPages, safePage - 1, safePage, safePage + 1]);
    return Array.from(pages)
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b);
  }, [safePage, totalPages]);

  const startIndex = filteredBills.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(filteredBills.length, safePage * pageSize);

  const statusPill = (status) => {
    const s = String(status || "").toLowerCase();

    if (s === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (s === "processing") return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (s === "cancelled") return "bg-rose-50 text-rose-700 border-rose-100";
    return "bg-amber-50 text-amber-700 border-amber-100";
  };

  return (
    <div className="w-full relative overflow-x-hidden">
      {/* soft luxury background */}
      <div className="absolute -top-28 left-1/2 -translate-x-1/2 h-[300px] w-[780px] bg-gradient-to-r from-indigo-400/20 via-purple-300/10 to-emerald-300/20 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-20 h-[240px] w-[420px] bg-gradient-to-b from-emerald-400/12 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-28 -right-24 h-[280px] w-[520px] bg-gradient-to-b from-purple-400/12 to-transparent blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 shadow-[0_35px_90px_-70px_rgba(2,6,23,0.35)] overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-6 border-b border-slate-200 bg-white/70 backdrop-blur">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-2xl font-semibold tracking-tight text-slate-900">Sale Bills</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Luxury directory: search, import/export, fixed pagination & premium table UI.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 h-10 shadow-[0_14px_34px_-18px_rgba(16,185,129,0.8)] transition-all"
                >
                  <FaFileExport />
                  Download
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white px-4 h-10 shadow-[0_14px_34px_-18px_rgba(239,68,68,0.75)] transition-all"
                >
                  Delete Selected
                </button>

                <button
                  onClick={() => navigate("/add-sale-bill")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-10 shadow-[0_14px_34px_-18px_rgba(79,70,229,0.75)] transition-all"
                >
                  + Create Bill
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="mt-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="relative flex-1">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <FaSearch />
                  </div>

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search bills by date, customer, phone, email, status, payment, total..."
                    className="w-full h-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-10 pr-10 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-indigo-200 focus:ring-4 focus:ring-indigo-100/40 transition-colors"
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
                  {/* Import UI only (no backend connectivity changes) */}
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-4 h-10 shadow-sm hover:bg-white transition-colors">
                    <FaFileImport className="text-slate-700" />
                    <span className="text-sm text-slate-800">Import</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.csv,.pdf"
                      onChange={() => {
                        // UI-only import
                      }}
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">
                      Rows
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-9 rounded-2xl border border-slate-200 bg-white/80 px-3 text-slate-800 font-semibold shadow-sm outline-none focus:ring-4 focus:ring-indigo-100/40 transition-colors"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Small summary */}
              <div className="mt-3 text-sm text-slate-600">
                {filteredBills.length === 0 ? (
                  <span className="font-semibold text-slate-600">No results.</span>
                ) : (
                  <span>
                    Showing{" "}
                    <span className="font-semibold text-slate-900">
                      {startIndex}-{endIndex}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">{filteredBills.length}</span>{" "}
                    bills
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="px-5 sm:px-7 pb-6 pt-4">
            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/70 backdrop-blur shadow-[0_18px_50px_-40px_rgba(2,6,23,0.18)]">
              <table className="w-full text-sm table-auto">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200">
                    <th className="p-4 text-center w-14">
                      <input
                        type="checkbox"
                        onChange={selectAll}
                        checked={selectedBills.length === bills.length && bills.length > 0}
                        aria-label="Select all bills"
                      />
                    </th>
                    <th className="p-4 text-center font-semibold text-slate-700">Order Date</th>
                    <th className="p-4 text-center font-semibold text-slate-700">Customer</th>
                    <th className="p-4 text-center font-semibold text-slate-700">Phone</th>
                    <th className="p-4 text-center font-semibold text-slate-700">Email</th>
                    <th className="p-4 text-center font-semibold text-slate-700">Status</th>
                    <th className="p-4 text-center font-semibold text-slate-700">Payment</th>
                    <th className="p-4 text-center font-semibold text-slate-700">Total</th>
                    <th className="p-4 text-center font-semibold text-slate-700 w-24">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">
                        No Bills Created
                      </td>
                    </tr>
                  ) : (
                    paginatedBills.map((bill) => (
                      <tr
                        key={bill.id}
                        onClick={() => navigate(`/sale-bills/${bill.id}`)}
                        className="border-t hover:bg-gradient-to-r hover:from-slate-50/70 hover:to-white transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2 text-center w-14" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedBills.includes(bill.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelect(bill.id);
                            }}
                          />
                        </td>

                        <td className="px-4 py-2 text-center whitespace-nowrap">
                          {bill.order_date
                            ? new Date(bill.order_date).toLocaleDateString("en-IN", {
                                timeZone: "Asia/Kolkata",
                              })
                            : "-"}
                        </td>

                        <td className="px-4 py-2 text-center">
                          <span className=" text-slate-900">{bill.billing_name || "-"}</span>
                        </td>

                        <td className="px-4 py-2 text-center">
                          <span className="text-slate-700">{bill.billing_phone || "-"}</span>
                        </td>

                        <td className="px-4 py-2 text-center">
                          <span className="text-slate-700 truncate block max-w-[200px] mx-auto">
                            {bill.billing_email || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-2 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border ${statusPill(
                              bill.status
                            )}`}
                          >
                            {bill.status}
                          </span>
                        </td>

                        <td className="px-4 py-2 text-center">
                          <span className="text-slate-700">{bill.payment_method || "-"}</span>
                        </td>

                        <td className="px-4 py-2 text-center whitespace-nowrap">
                          <span className=" text-slate-900">
                            ₹{Number(bill.total_amount || 0).toFixed(2)}
                          </span>
                        </td>
<td className="px-4 py-2 text-center w-24">
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleDelete(bill.id);
    }}
    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
  >
    Delete
  </button>
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
            <div className="p-2 sm:p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-slate-600">
                {filteredBills.length === 0 ? (
                  <span>—</span>
                ) : (
                  <span>
                    Page{" "}
                    <span className="font-semibold text-slate-900">{safePage}</span> of{" "}
                    <span className="font-semibold text-slate-900">{totalPages}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
                        {needsEllipsis && <span className="px-2 text-slate-400 font-bold">…</span>}
                        <button
                          onClick={() => setPage(n)}
                          className={`h-8 min-w-[40px] px-3 rounded-2xl border text-sm font-bold transition-all ${
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
              Tip: Search instantly. Pagination stays pinned to the bottom for a luxury dashboard feel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
