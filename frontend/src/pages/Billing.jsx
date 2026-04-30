const Billing = () => {
  return (
    <div className="space-y-6">

      {/* PAGE TITLE */}
      <h1 className="text-2xl font-bold">Billing</h1>

      {/* CURRENT PLAN */}
      <div className="bg-white rounded-xl shadow p-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Current Plan</h2>
          <p className="text-gray-500">Premium Plan</p>
          <p className="text-sm text-gray-600 mt-1">
            ₹2,999 / month • Next billing on <b>25 Sep 2026</b>
          </p>
        </div>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Upgrade Plan
        </button>
      </div>

      {/* BILLING SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-2xl font-bold">₹18,450</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">Last Payment</p>
          <p className="text-2xl font-bold">₹2,999</p>
          <p className="text-xs text-gray-500">25 Aug 2026</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">Status</p>
          <p className="text-2xl font-bold text-green-600">Active</p>
        </div>
      </div>

      {/* PAYMENT METHOD */}
      <div className="bg-white rounded-xl shadow p-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Payment Method</h2>
          <p className="text-gray-500">Visa ending in 4242</p>
          <p className="text-sm text-gray-600">Expires 08/27</p>
        </div>

        <button className="px-4 py-2 border rounded-lg">
          Change Method
        </button>
      </div>

      {/* BILLING HISTORY */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Billing History</h2>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Invoice</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-b">
              <td className="py-3">INV-1024</td>
              <td>25 Aug 2026</td>
              <td>₹2,999</td>
              <td className="text-green-600">Paid</td>
              <td className="text-right text-blue-600 cursor-pointer">
                Download
              </td>
            </tr>

            <tr>
              <td className="py-3">INV-1023</td>
              <td>25 Jul 2026</td>
              <td>₹2,999</td>
              <td className="text-green-600">Paid</td>
              <td className="text-right text-blue-600 cursor-pointer">
                Download
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Billing;
