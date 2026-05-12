import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../utils/api";

const SearchableAccountDropdown = ({
  value,
  onChange,
  accounts,
  onAddNew,
  setAccounts
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = accounts.filter((acc) =>
    acc.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
      
      {/* INPUT BOX */}
      <div
        onClick={() => setOpen(!open)}
        className={`w-full border rounded-xl px-4 py-2.5 bg-white flex justify-between items-center cursor-pointer
        ${open ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-300"}`}
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>
          {value || "Select an account"}
        </span>

        <svg
          className={`w-4 h-4 transition-transform ${
            open ? "rotate-180 text-blue-500" : "text-gray-500"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-[9999]">

          {/* SEARCH */}
          <div className="p-3 border-b bg-gray-50">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-200"
              />
              <svg
                className="w-4 h-4 absolute left-3 top-2.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* SECTION HEADER */}
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-100">
            Expense
          </div>

         {/* ACCOUNT LIST */}
<div className="max-h-48 overflow-y-auto">
  {filtered.map((acc) => (
  <div
    key={acc.id}
    className="flex justify-between items-center px-4 py-2 text-sm hover:bg-blue-50"
  >
    <span
      className="cursor-pointer"
      onClick={() => {
  onChange(acc);   // send full object
  setOpen(false);
}}
    >
      {acc.name}
    </span>

    <button
      onClick={async (e) => {
        e.stopPropagation();

        if (!window.confirm("Delete this account?")) return;

        try {
          await axios.delete(
            `${BASE_URL}/api/expense-categories/${acc.id}`
          );

          // Remove from UI immediately
          setAccounts((prev) =>
            prev.filter((item) => item.id !== acc.id)
          );

        } catch (error) {
          console.error(error);
          alert("Failed to delete account");
        }
      }}
      className="text-red-500 text-xs"
    >
      ✕
    </button>
  </div>
))}
</div>

{/* FIXED ADD BUTTON (ALWAYS VISIBLE) */}
<div
  onClick={() => {
    setOpen(false);
    onAddNew();
  }}
  className="px-4 py-3 border-t bg-white text-blue-600 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2"
>
  <span className="text-lg font-bold">+</span>
  Add New Account
</div>

        </div>
      )}
    </div>
  );
};

const AddExpense = () => {
  const navigate = useNavigate();

  const { id } = useParams();
const isEdit = Boolean(id);

  const [accounts, setAccounts] = useState([]);

// LOAD ACCOUNTS
useEffect(() => {
  axios
    .get(`${BASE_URL}/api/expense-categories`)
    .then((res) => setAccounts(res.data))
    .catch((err) => console.error(err));
}, []);

  const [receipt, setReceipt] = useState(null);
  const [invoicePdf, setInvoicePdf] = useState(null);

  const [expense, setExpense] = useState({
  date: "",
  paidThrough: "",
  currency: "INR",
  vendorName: "",
  purchasePersonName: "",
  place: "",
  invoiceNo: "",
  totalBeforeGst: "",
  gstAmount: "",
  transportCharges: "",
  totalAfterGst: "",
  amountPaid: "",
  amountPending: "",
  status: "Unpaid",
  notes: "",
});

  const [items, setItems] = useState([
  { account: null, notes: "", amount: "" }
]);

  const [menuIndex, setMenuIndex] = useState(null);

  /* LOAD ACCOUNTS */
useEffect(() => {
  if (!isEdit) return;

  axios
    .get(`${BASE_URL}/api/expenses/${id}`)
    .then((res) => {
      const data = res.data;

      // Set main expense fields
      setExpense({
        date: data.date || "",
        paidThrough: data.paidThrough || "",
        vendorName: data.vendorName || "",
        purchasePersonName: data.purchasePersonName || "",
        place: data.place || "",
        invoiceNo: data.invoiceNo || "",
        gstAmount: data.gstAmount || 0,
        transportCharges: data.transportCharges || 0,
        amountPaid: data.amountPaid || 0,
        notes: data.notes || ""
      });

      // ✅ Set items properly
      if (data.ExpenseItems && data.ExpenseItems.length > 0) {
        const formattedItems = data.ExpenseItems.map((item) => ({
          account: accounts.find(acc => acc.id === item.categoryId) || null,
          notes: item.notes || "",
          amount: item.amount || ""
        }));

        setItems(formattedItems);
      }

    })
    .catch((err) => console.error(err));

}, [id, isEdit, accounts]);
  const handleChange = (e) => {
    setExpense({ ...expense, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
  const updated = [...items];

  if (field === "amount") {
    // Allow empty input
    if (value === "") {
      updated[index][field] = "";
    } else {
      // Remove leading zeros
      updated[index][field] = value === "" ? "" : Number(value);
    }
  } else {
    updated[index][field] = value;
  }

  setItems(updated);
};

const addRow = () => {
  setItems((prev) => [
    ...prev,
    { account: null, notes: "", amount: "" }
  ]);
};
  const removeRow = (index) => {
  if (items.length === 1) return;
  setItems(items.filter((_, i) => i !== index));
};

  const cloneRow = (index) => {
    const updated = [...items];
    updated.splice(index + 1, 0, { ...items[index] });
    setItems(updated);
  };

  const insertRow = (index) => {
  const updated = [...items];
updated.splice(index + 1, 0, {
  account: null,
  notes: "",
  amount: ""
});
  setItems(updated);
};
const totalAmount = items.reduce((sum, item) => {
  return sum + (parseFloat(item.amount) || 0);
}, 0);

const calculatedTotalAfterGst =
  totalAmount +
  parseFloat(expense.gstAmount || 0) +
  parseFloat(expense.transportCharges || 0);

const calculatedPending =
  calculatedTotalAfterGst - parseFloat(expense.amountPaid || 0);

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (items.some(item => !item.account)) {
    alert("Please select expense account");
    return;
  }

  try {
    const formattedItems = items.map(item => ({
      categoryId: item.account.id,
      notes: item.notes,
      amount: parseFloat(item.amount)
    }));

 const formData = new FormData();

formData.append("date", expense.date);
formData.append("vendorName", expense.vendorName);
formData.append("purchasePersonName", expense.purchasePersonName);
formData.append("place", expense.place);
formData.append("invoiceNo", expense.invoiceNo);
formData.append("paidThrough", expense.paidThrough);

formData.append("totalBeforeGst", totalAmount);
formData.append("gstAmount", expense.gstAmount);
formData.append("transportCharges", expense.transportCharges);
formData.append("totalAfterGst", calculatedTotalAfterGst);

formData.append("amountPaid", expense.amountPaid);
formData.append("amountPending", calculatedPending);

formData.append(
  "status",
  calculatedPending <= 0 && calculatedTotalAfterGst > 0
    ? "Paid"
    : parseFloat(expense.amountPaid || 0) > 0
    ? "Partial"
    : "Unpaid"
);

formData.append("notes", expense.notes);
formData.append("items", JSON.stringify(formattedItems));

if (receipt) {
  formData.append("receiptImage", receipt);
}

if (invoicePdf) {
  formData.append("invoicePdf", invoicePdf);
}

if (isEdit) {
 await axios.put(
  `${BASE_URL}/api/expenses/${id}`,
  formData
);

} else {
  await axios.post(
  `${BASE_URL}/api/expenses`,
  formData
);
}

    alert("Expense Saved Successfully");
    navigate("/expenses");

  } catch (error) {
    console.error(error);  
    alert("Error saving expense: " + (error.response?.data?.message || error.message));
  }
};

  return (
    <div className="px-0 py-2 sm:px-2">
      <div className="mx-auto max-w-7xl rounded-2xl bg-white p-4 shadow-xl sm:p-6 lg:p-8">

      <h2 className="text-2xl font-semibold mb-10">
  {isEdit ? "Edit Expense" : "Record Expense"}
</h2>

        <form onSubmit={handleSubmit}>


          {/* ================= MAIN SECTION ================= */}
<div className="grid grid-cols-1 gap-8 xl:grid-cols-12">

  {/* LEFT SIDE - FULL EXPENSE CONTENT */}
  <div className="xl:col-span-9">

    {/* HEADER SECTION */}
<div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12 xl:items-end">

  <div className="xl:col-span-3">
  <label className="text-sm font-medium text-gray-600">Date</label>
  <input
    type="date"
    name="date"
    value={expense.date}
    onChange={handleChange}
    className="w-full border rounded-xl px-4 py-2.5 mt-2 focus:ring-2 focus:ring-blue-200"
    required
  />
</div>

<div className="xl:col-span-3">
  <label className="text-sm font-medium text-gray-600">Paid Through</label>
  <select
    name="paidThrough"
    value={expense.paidThrough}
    onChange={handleChange}
    className="w-full border rounded-lg px-4 py-2.5 mt-2"
    required
  >
    <option value="">Select</option>
    <option>Cash</option>
    <option>Bank</option>
    <option>UPI</option>
    <option>Card</option>
  </select>
</div>

<div className="xl:col-span-3">
  <label className="text-sm font-medium text-gray-600">Vendor</label>
  <input
    type="text"
    name="vendorName"
    value={expense.vendorName}
    onChange={handleChange}
    className="w-full border rounded-xl px-4 py-2.5 mt-2 focus:ring-2 focus:ring-blue-200"
  />
</div>

<div className="xl:col-span-3">
  <label className="text-sm font-medium text-gray-600">
    Purchase Person
  </label>
  <input
    type="text"
    name="purchasePersonName"
    value={expense.purchasePersonName}
    onChange={handleChange}
    className="w-full border rounded-xl px-4 py-2.5 mt-2 focus:ring-2 focus:ring-blue-200"
  />
</div>

<div className="xl:col-span-3">
  <label className="text-sm font-medium text-gray-600">
    Place of Purchase
  </label>
  <input
    type="text"
    name="place"
    value={expense.place}
    onChange={handleChange}
    className="w-full border rounded-xl px-4 py-2.5 mt-2 focus:ring-2 focus:ring-blue-200"
  />
</div>

<div className="xl:col-span-3">
  <label className="text-sm font-medium text-gray-600">
    Invoice No
  </label>
  <input
    type="text"
    name="invoiceNo"
    value={expense.invoiceNo}
    onChange={handleChange}
    className="w-full border rounded-xl px-4 py-2.5 mt-2 focus:ring-2 focus:ring-blue-200"
  />
</div>

<div className="xl:col-span-3">
  <label className="text-sm font-medium text-gray-600">Currency</label>
  <select
    name="currency"
    value={expense.currency}
    onChange={handleChange}
    className="w-full border rounded-lg px-4 py-2.5 mt-2 bg-gray-50"
  >
    <option value="INR">INR - Indian Rupee</option>
  </select>
</div>

</div>

    {/* TABLE BOX */}
<div className="border border-gray-200 rounded-2xl bg-white shadow-sm">

  {/* HEADER */}
  <div className="hidden grid-cols-12 bg-gray-100 px-6 py-4 text-sm font-semibold text-gray-700 md:grid">
    <div className="col-span-4">Expense Account</div>
    <div className="col-span-5">Notes</div>
    <div className="col-span-2 text-right">Amount</div>
    <div className="col-span-1"></div>
  </div>

  {/* ROWS */}
  {items.map((item, index) => (
    <div
      key={index}
      className="grid grid-cols-1 gap-4 border-t px-4 py-5 transition hover:bg-gray-50 md:grid-cols-12 md:gap-6 md:px-6 md:items-center"
    >

      {/* ACCOUNT */}
      <div className="md:col-span-4">
       <SearchableAccountDropdown
  value={item.account?.name || ""}
  accounts={accounts}
  setAccounts={setAccounts}   
  onChange={(val) =>
    handleItemChange(index, "account", val)
  }
  onAddNew={async () => {
  const name = prompt("Enter new account name");

  if (!name) return;

  try {
    const response = await axios.post(
      `${BASE_URL}/api/expense-categories`,
      { name }
    );

    const newCategory = response.data;

    // Add to dropdown list immediately
    setAccounts((prev) => [...prev, newCategory]);

    // Select automatically in current row
    handleItemChange(index, "account", newCategory);

  } catch (error) {
    console.error("Error saving category:", error);
    alert("Failed to save category");
  }
}}
        />
      </div>

      {/* NOTES */}
      <div className="md:col-span-5">
        <textarea
          rows="1"
          placeholder="Max. 500 characters"
          value={item.notes}
          onChange={(e) =>
            handleItemChange(index, "notes", e.target.value)
          }
          className="w-full border rounded-xl px-3 py-2 resize-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* AMOUNT */}
      <div className="md:col-span-2">
       <input
  type="number"
  min="0"
  step="0.01"
  value={item.amount ?? ""}
  onChange={(e) =>
    handleItemChange(index, "amount", e.target.value)
  }
  onWheel={(e) => e.target.blur()}   // Prevent scroll changing value
  className="w-full border rounded-xl px-3 py-2 text-right focus:ring-2 focus:ring-blue-200"
  required
/>
      </div>

      {/* 3 DOT MENU */}
      <div className="relative flex justify-end md:col-span-1">
        <button
          type="button"
          onClick={() =>
            setMenuIndex(menuIndex === index ? null : index)
          }
          className="p-2 rounded-full hover:bg-gray-200"
        >
          ⋮
        </button>

        {menuIndex === index && (
          <div className="absolute right-0 top-10 bg-white border rounded-lg shadow-lg w-40 z-50">
            <button
              type="button"
              onClick={() => {
                insertRow(index);
                setMenuIndex(null);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Insert Row
            </button>

            <button
              type="button"
              onClick={() => {
                cloneRow(index);
                setMenuIndex(null);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Duplicate Row
            </button>

            <button
              type="button"
              onClick={() => {
                removeRow(index);
                setMenuIndex(null);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-500 text-sm"
            >
              Remove
            </button>
          </div>
        )}
      </div>

    </div>
  ))}

  {/* ADD ROW BUTTON */}
  <div className="px-6 py-4 border-t">
    <button
      type="button"
      onClick={addRow}
      className="text-blue-600 font-medium text-sm hover:underline"
    >
      + Add New Row
    </button>
  </div>

  {/* TOTAL */}
  <div className="flex flex-col items-end gap-2 border-t bg-gray-50 px-4 py-6 sm:px-6 sm:flex-row sm:justify-end sm:items-center">
    <span className="text-lg font-medium text-gray-700">
      Expense Total (₹)
    </span>
    <span className="ml-4 text-2xl font-bold text-blue-600">
      ₹{totalAmount.toFixed(2)}
    </span>
  </div>

  {/* GST SECTION */}
<div className="mt-6 bg-gray-50 p-6 rounded-xl border">

  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">

    <div className="xl:col-span-3">
      <label className="text-sm text-gray-600">
        Total Before GST
      </label>
      <input
  type="number"
  value={totalAmount}
  readOnly
  className="w-full border rounded-lg px-3 py-2 mt-2 bg-gray-100"
/>
    </div>

    <div className="xl:col-span-3">
      <label className="text-sm text-gray-600">
        GST Amount
      </label>
      <input
        type="number"
        name="gstAmount"
        value={expense.gstAmount}
        onChange={handleChange}
        className="w-full border rounded-lg px-3 py-2 mt-2"
      />
    </div>

    <div className="xl:col-span-3">
      <label className="text-sm text-gray-600">
        Transport Charges
      </label>
      <input
        type="number"
        name="transportCharges"
        value={expense.transportCharges}
        onChange={handleChange}
        className="w-full border rounded-lg px-3 py-2 mt-2"
      />
    </div>

    <div className="xl:col-span-3">
      <label className="text-sm text-gray-600">
        Total After GST
      </label>
      <input
  type="number"
  value={calculatedTotalAfterGst}
  readOnly
  className="w-full border rounded-lg px-3 py-2 mt-2 bg-gray-100"
/>
    </div>

  </div>
</div>

{/* PAYMENT SECTION */}
<div className="mt-6 bg-white p-6 rounded-xl border">
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">

    <div className="xl:col-span-3">
      <label className="text-sm text-gray-600">
        Amount Paid
      </label>
      <input
        type="number"
        name="amountPaid"
        value={expense.amountPaid}
        onChange={handleChange}
        className="w-full border rounded-lg px-3 py-2 mt-2"
      />
    </div>

    <div className="xl:col-span-3">
      <label className="text-sm text-gray-600">
        Pending Amount
      </label>
      <input
  type="number"
  value={
    calculatedPending > 0
      ? calculatedPending
      : 0
  }
  readOnly
  className="w-full border rounded-lg px-3 py-2 mt-2 bg-gray-100"
/>
    </div>

    <div className="xl:col-span-3">
      <label className="text-sm text-gray-600">
        Status
      </label>
      <input
  type="text"
  value={
    calculatedPending <= 0 && calculatedTotalAfterGst > 0
      ? "Paid"
      : parseFloat(expense.amountPaid || 0) > 0
      ? "Partial"
      : "Unpaid"
  }
  readOnly
  className="w-full border rounded-lg px-3 py-2 mt-2 bg-gray-100"
/>
    </div>

  </div>
</div>

</div>


  </div>

  {/* RIGHT SIDE - FILE UPLOAD */}
<div className="space-y-6 xl:col-span-3">

  {/* IMAGE UPLOAD */}
  <div className="border-2 border-dashed border-blue-300 rounded-2xl p-6 bg-blue-50 text-center">
    <p className="text-sm font-semibold text-gray-700 mb-3">
      Upload Receipt Image
    </p>
    <p className="text-xs text-gray-500 mb-4">
      PNG or JPG only
    </p>

    <input
      type="file"
      accept="image/png, image/jpeg"
      onChange={(e) => setReceipt(e.target.files[0])}
      className="w-full"
    />
  </div>

  {/* PDF UPLOAD */}
  <div className="border-2 border-dashed border-yellow-400 rounded-2xl p-6 bg-yellow-50 text-center">
    <p className="text-sm font-semibold text-gray-700 mb-3">
      Upload Invoice PDF
    </p>
    <p className="text-xs text-gray-500 mb-4">
      PDF format only
    </p>

    <input
  type="file"
  accept="application/pdf"
  onChange={(e) => setInvoicePdf(e.target.files[0])}
  className="w-full"
/>
  </div>

</div>

</div>

          {/* NOTES */}
          <div className="mt-10">
            <label className="text-sm font-medium text-gray-600">
              Overall Notes
            </label>
            <textarea
              name="notes"
              value={expense.notes}
              onChange={handleChange}
              rows="4"
              className="w-full border rounded-lg p-3 mt-2"
            />
          </div>

          {/* BUTTONS */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/expenses")}
              className="px-6 py-2 border rounded-lg"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow"
            >
              Save
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AddExpense;
