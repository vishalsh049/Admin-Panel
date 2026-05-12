import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/api";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


const ALL_COLUMNS = {
  expenseId: "Expense ID",
  date: "Date",
  vendor: "Vendor",
  purchasePerson: "Purchase Person",
  place: "Place of Purchase",
  paidThrough: "Paid Through",
  total: "Total Amount",
  paid: "Paid",
  pending: "Pending",
  status: "Status",
};

export default function Expenses() {

  const [expenses, setExpenses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

const [openRowMenu, setOpenRowMenu] = useState(null);
 useEffect(() => {
  const handleClickOutside = () => {
    setOpenRowMenu(null);
  };

  if (openRowMenu !== null) {
    document.addEventListener("click", handleClickOutside);
  }

  return () => {
    document.removeEventListener("click", handleClickOutside);
  };
}, [openRowMenu]);

  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/expenses`)
      .then((res) => setExpenses(res.data))
      .catch((err) => console.error(err));
  }, []);

  const deleteExpense = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/api/expenses/${id}`);
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // EXPORT SELECTED WITH ITEMS
  const exportSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one expense");
      return;
    }

    try {
      let exportRows = [];

      for (let id of selectedIds) {
        const res = await axios.get(
          `${BASE_URL}/api/expenses/${id}`
        );

        const expense = res.data;

        if (expense.ExpenseItems && expense.ExpenseItems.length > 0) {
          expense.ExpenseItems.forEach((item) => {
            exportRows.push({
              Date: new Date(expense.date).toLocaleDateString("en-GB"),
              Vendor: expense.vendorName,
              "Purchase Person": expense.purchasePersonName,
              Place: expense.place,
              "Paid Through": expense.paidThrough,
              Item: item.notes,
              "Item Amount": item.amount,
              "Total Amount": expense.totalAfterGst,
              Paid: expense.amountPaid,
              Pending: expense.amountPending,
              Status: expense.status,
            });
          });
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const fileData = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(fileData, "Expenses_With_Items.xlsx");
    } catch (error) {
      console.error(error);
      alert("Export failed");
    }
  };

  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowMenu(false);
    };

    if (showMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMenu]);

  const [monthFilter, setMonthFilter] = useState("");
  const [search, setSearch] = useState("");

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("expense_columns");
    return saved ? JSON.parse(saved) : Object.keys(ALL_COLUMNS);
  });

  const toggleColumn = (key) => {
    const updated = columns.includes(key)
      ? columns.filter((c) => c !== key)
      : [...columns, key];

    setColumns(updated);
    localStorage.setItem("expense_columns", JSON.stringify(updated));
  };


  const filteredExpenses = expenses.filter((expense) => {

    const matchesMonth =
      !monthFilter || expense.date.slice(0, 7) === monthFilter;

    const matchesSearch =
      !search ||
      expense.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
      expense.purchasePersonName?.toLowerCase().includes(search.toLowerCase()) ||
      `exp-${expense.id}`.includes(search.toLowerCase());

    return matchesMonth && matchesSearch;

  });

  return (
    <div className="relative min-h-[80vh] rounded bg-white p-4 shadow sm:p-6 lg:p-8">

      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Expenses</h2>
          <p className="text-sm text-gray-500">
            Track and manage all business expenses
          </p>
        </div>

        <div className="relative flex flex-wrap gap-2">
          <Link
            to="/expenses/add"
            className="w-full rounded bg-blue-600 px-4 py-2 text-white sm:w-auto"
          >
            + Add Expense
          </Link>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="w-full rounded border px-3 py-2 sm:w-auto"
          >
            ⋮
          </button>

          {showMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-2 w-56 bg-white border rounded shadow-xl text-sm z-50"
            >
              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                Sort by
              </div>

              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                Import
              </div>

              <div
                onClick={() => {
                  exportSelected();
                  setShowMenu(false);
                }}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                Export
              </div>

              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                Preferences
              </div>

              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                Manage Custom Fields
              </div>

              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                Refresh List
              </div>

              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                Reset Column Width
              </div>
            </div>
          )}

        </div>
      </div>

      {/* FILTERS */}

      <div className="mb-4 flex flex-col gap-3 pt-2 lg:flex-row lg:items-center lg:justify-between">

        {/* MONTH FILTER (LEFT) */}
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-full rounded border p-2 sm:w-auto"
        />

        {/* SEARCH BOX (RIGHT) */}
       <input
  type="text"
  placeholder="Search: Expense ID, Vendor or Person ..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="w-full rounded-lg border p-2 shadow-sm sm:max-w-xs"
/>

      </div>

      {/* TABLE */}
      <div className="pt-2 w-full overflow-x-auto relative">
        <table className="w-full min-w-[1080px] text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-center">
                <input
                  type="checkbox"
                  checked={
                    expenses.length > 0 &&
                    selectedIds.length === expenses.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filteredExpenses.map((e) => e.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>

              {columns.includes("expenseId") && (<th className="p-2 border">Expense ID</th>)}
              {columns.includes("date") && <th className="p-2 border">Date</th>}
              {columns.includes("vendor") && <th className="p-2 border">Vendor</th>}
              {columns.includes("purchasePerson") && <th className="p-2 border">Purchase Person</th>}
              {columns.includes("place") && <th className="p-2 border">Place of Purchase</th>}
              {columns.includes("paidThrough") && <th className="p-2 border">Paid Through</th>}
              {columns.includes("total") && <th className="p-2 border">Total Amount</th>}
              {columns.includes("paid") && <th className="p-2 border">Paid</th>}
              {columns.includes("pending") && <th className="p-2 border">Pending</th>}
              {columns.includes("status") && <th className="p-2 border">Status</th>}

              <th className="p-2 border">Actions</th>
            </tr>
          </thead>


          <tbody>
            {filteredExpenses.length === 0 && (
              <tr>
                <td colSpan="12" className="p-6 text-center text-gray-500">
                  No expenses found
                </td>
              </tr>
            )}

            {filteredExpenses.map((e) => {
              const total = Number(e.totalAfterGst || 0);
              const paid = Number(e.amountPaid || 0);
              const pending = Number(e.amountPending || 0);

              let status = (e.status || "Unpaid").toUpperCase().trim();

              return (
                <tr
                  key={e.id}
                  onClick={async () => {
                    try {
                      const res = await axios.get(
                        `${BASE_URL}/api/expenses/${e.id}`
                      );
                      setSelectedExpense(res.data);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td
                    className="p-2 border text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(e.id)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedIds([...selectedIds, e.id]);
                        } else {
                          setSelectedIds(
                            selectedIds.filter((id) => id !== e.id)
                          );
                        }
                      }}
                    />
                  </td>

                  {columns.includes("expenseId") && (
                    <td className="p-2 border text-center font-medium text-gray-600">
                      EXP-{String(e.id).padStart(3, "0")}
                    </td>
                  )}

                  {columns.includes("date") && (
                    <td className="p-2 border text-center">
                      {e.date ? new Date(e.date).toLocaleDateString("en-GB") : "-"}
                    </td>
                  )}

                  {columns.includes("vendor") && (
                    <td className="p-2 border text-center">
                      {e.vendorName || "-"}
                    </td>
                  )}

                  {columns.includes("purchasePerson") && (
                    <td className="p-2 border text-center">
                      {e.purchasePersonName || "-"}
                    </td>
                  )}

                  {columns.includes("place") && (
                    <td className="p-2 border text-center">
                      {e.place || "-"}
                    </td>
                  )}

                  {columns.includes("paidThrough") && (
                    <td className="p-2 border text-center">
                      {e.paidThrough}
                    </td>
                  )}

                  {columns.includes("total") && (
                    <td className="p-2 border text-center font-medium">
                      ₹{total.toFixed(2)}
                    </td>
                  )}

                  {columns.includes("paid") && (
                    <td className="p-2 border text-center font-medium text-blue-600">
                      ₹{paid.toFixed(2)}
                    </td>
                  )}

                  {columns.includes("pending") && (
                    <td className="p-2 border text-center font-medium text-red-600">
                      ₹{pending.toFixed(2)}
                    </td>
                  )}

                  {columns.includes("status") && (
                    <td className="p-2 border text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs ${status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : status === "PARTIAL"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {status}
                      </span>
                    </td>
                  )}

  <td
  className="p-2 border text-center"
  onClick={(event) => event.stopPropagation()}
>
  <div className="relative inline-block">
    
    <button
  onClick={(event) => {
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();

    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });

    setOpenRowMenu(openRowMenu === e.id ? null : e.id);
  }}
      className="text-lg px-2"
    >
      ⋮
    </button>

  </div>
</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* GLOBAL DROPDOWN */}
{openRowMenu && (
  <div
    className="fixed bg-white border rounded shadow-lg z-[9999] w-32"
   style={{
  top: menuPosition.top,
  left: menuPosition.left - 120, // move left
}}
    onClick={(e) => e.stopPropagation()}
  >
    <Link
      to={`/expenses/edit/${openRowMenu}`}
      className="block px-4 py-2 hover:bg-gray-100 text-blue-600"
    >
      Edit
    </Link>

    <button
      onClick={() => {
        if (window.confirm("Delete this expense?")) {
          deleteExpense(openRowMenu);
          setOpenRowMenu(null);
        }
      }}
      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
    >
      Delete
    </button>
  </div>
)}

      {/* ================= MODAL ================= */}
      {selectedExpense && (
        <div
          onClick={() => setSelectedExpense(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
           className="responsive-modal-panel w-full max-w-6xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6 lg:p-8"
          >
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <h3 className="text-2xl font-semibold">
                Expense Details
              </h3>

              <button
                onClick={() => setSelectedExpense(null)}
                className="text-gray-500 text-2xl hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">

              {/* LEFT SIDE */}
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-semibold">Expense ID:</span>
                  {" "}EXP-{String(selectedExpense.id).padStart(3, "0")}
                </p>

                <p>
                  <span className="font-semibold">Date:</span>
                  {" "}{selectedExpense.date}
                </p>
                <p><span className="font-semibold">Vendor:</span> {selectedExpense.vendorName || "-"}</p>
                <p><span className="font-semibold">Purchase Person:</span> {selectedExpense.purchasePersonName || "-"}</p>
                <p><span className="font-semibold">Place:</span> {selectedExpense.place || "-"}</p>

                <p><span className="font-semibold">Invoice No:</span> {selectedExpense.invoiceNo || "-"}</p>

                <p><span className="font-semibold">Paid Through:</span> {selectedExpense.paidThrough}</p>
              </div>

              {/* RIGHT SIDE - SUMMARY BOX */}
              <div className="bg-gray-50 p-6 rounded-xl shadow-sm">
                <h4 className="text-lg font-semibold mb-4">
                  Amount Summary
                </h4>

                <div className="space-y-2 text-sm">
                  <p>
                    Total Amount:
                    <span className="font-medium ml-2">
                      ₹{selectedExpense.totalAfterGst}
                    </span>
                  </p>

                  <p className="text-blue-600">
                    Amount Paid:
                    <span className="ml-2">
                      ₹{selectedExpense.amountPaid}
                    </span>
                  </p>

                  <p className="text-red-600">
                    Pending:
                    <span className="ml-2">
                      ₹{selectedExpense.amountPending}
                    </span>
                  </p>

                  <p className="mt-3">
                    Status:
                    <span
                      className={`ml-3 px-3 py-1 rounded text-xs font-medium ${selectedExpense.status === "Paid"
                        ? "bg-green-100 text-green-700"
                        : selectedExpense.status === "Partial"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {selectedExpense.status}
                    </span>
                  </p>
                </div>
              </div>

            </div>

            {/* Notes Section */}
            <div className="mt-8">
              <p className="font-semibold text-sm">Notes:</p>
              <div className="mt-2 p-5 bg-gray-50 rounded-lg text-gray-700 text-base break-words whitespace-pre-wrap">
  {selectedExpense.notes || "No notes available"}
</div>
            </div>

            {selectedExpense.receiptImage && (
              <div className="mt-6">
                <p className="font-semibold text-sm mb-2">Receipt Image:</p>
                <img
                  src={`${BASE_URL}/uploads/${selectedExpense.receiptImage}`}
                  alt="receipt"
                  className="max-h-60 rounded border"
                />
              </div>
            )}

            {selectedExpense.invoicePdf && (
              <div className="mt-4">
                <p className="font-semibold text-sm mb-2">Invoice PDF:</p>
                <a
                  href={`${BASE_URL}/uploads/${selectedExpense.invoicePdf}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  View Invoice PDF
                </a>
              </div>
            )}

            {/* Items List */}
            {selectedExpense.ExpenseItems && selectedExpense.ExpenseItems.length > 0 && (
              <div className="mt-6">
                <p className="font-semibold text-sm mb-2">Items:</p>

                <div className="border rounded-lg divide-y bg-gray-50 break-words">
                  {selectedExpense.ExpenseItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 px-4 py-3 text-base sm:flex-row sm:items-start sm:justify-between sm:px-6"
                    >
                   <span className="break-words max-w-[70%]">
  <b>
    {item.category?.name ||
      item.account?.name ||
      item.categoryName ||
      "Account"}
  </b> - {item.notes || "-"}
</span>
                      <span>₹{Number(item.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}


    </div>
  );
}
