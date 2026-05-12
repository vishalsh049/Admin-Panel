import { Link } from "react-router-dom";
import { useVendors } from "../context/VendorContext";

export default function Vendors() {
  const vendorContext = useVendors();

  // SAFETY FIX 👇
  const vendors = vendorContext?.vendors || [];

  return (
    <div className="rounded bg-white p-4 shadow sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Vendors</h2>

        <Link
          to="/vendors/add"
          className="rounded bg-blue-600 px-4 py-2 text-white w-full sm:w-auto"
        >
          + Add Vendor
        </Link>
      </div>

      {vendors.length === 0 ? (
        <p className="text-gray-500">No vendors added yet</p>
      ) : (
        <div className="responsive-table">
        <table className="w-full min-w-[640px] border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Company</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {vendors.map((v) => (
              <tr key={v.id}>
                <td className="border p-2">
                  {v.vendorDetails?.firstName}{" "}
                  {v.vendorDetails?.lastName}
                </td>

                <td className="border p-2">
                  {v.vendorDetails?.company || "-"}
                </td>

                <td className="border p-2">
                  {v.vendorDetails?.email || "-"}
                </td>

                <td className="border p-2">
                  <Link
                    to={`/vendors/${v.id}`}
                    className="text-blue-600"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
