import { FaSearch, FaBell, FaMoon } from "react-icons/fa";

export default function Topbar() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const displayName = user?.name || "Admin";

  return (
    <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-100">

      <div>
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-xs text-gray-500">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      <div className="flex items-center gap-6">

        <div className="flex items-center bg-gray-100 px-4 py-2 rounded-lg w-80">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search anything..."
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>

        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm shadow">
          + New
        </button>

        <FaMoon className="text-gray-500 cursor-pointer" />
        <FaBell className="text-gray-500 cursor-pointer" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <span className="text-sm font-medium capitalize">{displayName}</span>
        </div>
      </div>
    </div>
  );
}
