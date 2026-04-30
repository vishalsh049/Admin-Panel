import { useExpenses } from "../context/ExpenseContext";

export default function GstReport() {
  const { expenses, totalGST } = useExpenses();

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">GST Input Credit</h2>

      <p className="mb-4">
        Total GST Claimable: <b>₹{totalGST}</b>
      </p>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Vendor</th>
            <th className="border p-2">GST %</th>
            <th className="border p-2">GST Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e._id}>
              <td className="border p-2">{e.vendorName}</td>
              <td className="border p-2">{e.gstPercent}%</td>
              <td className="border p-2">₹{e.gstAmount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
