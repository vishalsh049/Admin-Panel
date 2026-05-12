export default function VendorPayouts() {

  const payouts = [
    { id: 1, vendor: "Pingoria Enterprises", amount: 25430, status: "Paid" },
    { id: 2, vendor: "Temple Store Vendor", amount: 10200, status: "Pending" },
  ];

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">Vendor Payouts</h1>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <div className="responsive-table">
        <table className="w-full min-w-[420px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">Vendor</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {payouts.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-4">{p.vendor}</td>
                <td className="p-4">₹{p.amount}</td>
                <td className="p-4">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

    </div>
  );
}
