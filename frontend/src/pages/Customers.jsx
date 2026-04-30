import { useEffect, useState } from "react";
import { FaUser } from "react-icons/fa";
import { BASE_URL } from "../utils/api";

export default function Customers() {

  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetch(`${BASE_URL}/api/customers`)
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data);
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

  return (
    <>
      <h2 className="text-3xl font-semibold mb-6">Customers</h2>

    <div className="bg-white p-6 shadow rounded-xl w-full overflow-x-hidden">

        <table className="w-full text-sm table-auto">

          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">City</th>
              <th className="p-3 text-left">Country</th>
              <th className="p-3 text-left">Username</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Join Date</th>
            </tr>
          </thead>

          <tbody>

            {customers.map((c) => (

              <tr key={c.id} className="border-b hover:bg-gray-50">

                <td className="p-3 flex items-center gap-3">

                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      className="w-8 h-8 rounded-full"
                      alt=""
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <FaUser className="text-gray-600 text-sm" />
                    </div>
                  )}

                  {c.first_name || c.last_name
                    ? `${c.first_name} ${c.last_name}`
                    : c.email}

                </td>

                <td className="p-3">{c.email}</td>

                <td className="p-3">{c.billing?.phone || "-"}</td>

                <td className="p-3">{c.billing?.city || "-"}</td>

                <td className="p-3">{c.billing?.country || "-"}</td>

       <td className="p-3 max-w-[150px] truncate">
  {c.username?.split(" ")[0] || "-"}
</td>

                <td className="p-3 capitalize">{c.role}</td>

                <td className="p-3">{formatDate(c.date_created)}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>
    </>
  );
}
