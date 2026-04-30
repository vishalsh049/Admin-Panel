import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { BASE_URL } from "../utils/api";

export default function SaleBills() {

  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [selectedBills, setSelectedBills] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {

    fetch(`${BASE_URL}/api/sale-bills`)
      .then(res => res.json())
      .then(data => {

        console.log("API DATA:", data);   

        if (Array.isArray(data)) {
          setBills(data);
        } else {
          setBills([]);
        }

      })
      .catch(err => console.log(err));

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
    method: "DELETE"
  });

  setBills(bills.filter(b => b.id !== id));

};

const toggleSelect = (id) => {
  setSelectedBills((prev) =>
    prev.includes(id)
      ? prev.filter((i) => i !== id)
      : [...prev, id]
  );
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
        method: "DELETE"
      })
    )
  );

  setBills(bills.filter((b) => !selectedBills.includes(b.id)));
  setSelectedBills([]);
};

const handleDownload = () => {
  const selectedData =
    selectedBills.length > 0
      ? bills.filter((b) => selectedBills.includes(b.id))
      : bills;

  const csv = [
    ["Date", "Customer", "Phone", "Email", "Status", "Payment", "Total"],
    ...selectedData.map((b) => [
      b.order_date,
      b.billing_name,
      b.billing_phone,
      b.billing_email,
      b.status,
      b.payment_method,
      b.total_amount
    ])
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

// main return //

  return (

    <div>

      <div className="bg-white rounded-xl shadow p-6">

        <div className="flex justify-between items-center mb-6">

          <h2 className="text-xl font-semibold">Sale Bills</h2>

       <div className="flex gap-2">

  <button
    onClick={handleDownload}
    className="bg-green-600 text-white px-4 py-2 rounded-lg"
  >
    Download
  </button>

  <button
    onClick={handleBulkDelete}
    className="bg-red-600 text-white px-4 py-2 rounded-lg"
  >
    Delete Selected
  </button>

  <button
    onClick={() => navigate("/add-sale-bill")}
    className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
  >
    + Create Bill
  </button>

</div>

        </div>

        <table className="w-full">

          <thead className="bg-gray-50">

            <tr>
              <th className="p-3 text-center">
                   <input
                    type="checkbox"
                     onChange={selectAll}
                       checked={selectedBills.length === bills.length && bills.length > 0}
                        />
              </th>
              <th className="p-3 text-center">Order Date</th>
              <th className="p-3 text-center">Customer</th>
              <th className="p-3 text-center">Phone</th>
              <th className="p-3 text-center">Email</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Payment</th>
              <th className="p-3 text-center">Total</th>
              <th className="p-3 text-center">Action</th>
            </tr>

          </thead>

          <tbody>

            {bills.length === 0 ? (

              <tr>
                <td colSpan="8" className="text-center p-6 text-gray-500">
                  No Bills Created
                </td>
              </tr>

            ) : (

              bills.map((bill) => (

              <tr
                key={bill.id} 
              onClick={() => navigate(`/sale-bills/${bill.id}`)}
              className="border-t hover:bg-gray-50 cursor-pointer"
          >

  <td className="p-3 text-center">
  <input
    type="checkbox"
    checked={selectedBills.includes(bill.id)}
    onChange={(e) => {
      e.stopPropagation();
      toggleSelect(bill.id);
    }}
  />
</td>

  <td className="p-3 text-center">
    {bill.order_date
      ? new Date(bill.order_date).toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata"
        })
      : "-"}
  </td>

  <td className="p-3 text-center">
    {bill.billing_name || "-"}
  </td>

  <td className="p-3 text-center">
    {bill.billing_phone || "-"}
  </td>

  <td className="p-3 text-center">
    {bill.billing_email || "-"}
  </td>

  <td className="p-3 text-center">
    <span className={`px-2 py-1 rounded text-xs
      ${bill.status === "completed" ? "bg-green-100 text-green-700" :
      bill.status === "processing" ? "bg-blue-100 text-blue-700" :
      bill.status === "cancelled" ? "bg-red-100 text-red-700" :
      "bg-yellow-100 text-yellow-700"}`}>
      {bill.status}
    </span>
  </td>

  <td className="p-3 text-center">
    {bill.payment_method || "-"}
  </td>

  <td className="p-3 text-center">
    ₹{Number(bill.total_amount || 0).toFixed(2)}
  </td>

  <td className="p-3 text-center">

  <div className="relative inline-block" ref={menuRef}>

    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpenMenu(openMenu === bill.id ? null : bill.id);
      }}
      className="text-xl px-2"
    >
      ⋮
    </button>

    {openMenu === bill.id && (

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 mt-2 w-28 bg-white border rounded shadow z-10"
      >

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/sale-bills/${bill.id}`);
            setOpenMenu(null);
          }}
          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
        >
          View
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/edit-sale-bill/${bill.id}`);
            setOpenMenu(null);
          }}
          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
        >
          Edit
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(bill.id);
            setOpenMenu(null);
          }}
          className="block w-full text-left px-3 py-2 text-red-600 hover:bg-gray-100"
        >
          Delete
        </button>

      </div>

    )}

  </div>

</td>

</tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>

  );

}
