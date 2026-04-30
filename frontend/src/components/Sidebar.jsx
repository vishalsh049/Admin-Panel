import { useState } from "react";
import {
  FaChartBar,
  FaChartLine,
  FaHome,
  FaUser,
  FaShoppingBag,
  FaCogs,
  FaHeadset,
  FaStore,
  FaFileInvoice,
  FaChevronDown,
  FaChevronUp,
  FaSignOutAlt,
  FaUsersCog,
  FaUserTie,
  FaMoneyBillWave,
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {

  const [openInventory, setOpenInventory] = useState(false);
  const [openCustomers, setOpenCustomers] = useState(false);
  const [openVendors, setOpenVendors] = useState(false);
  const [openExpenses, setOpenExpenses] = useState(false);
  const [openUsers, setOpenUsers] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = (user?.role || "admin").toLowerCase();

  const location = useLocation();

const isActive = (path) =>
  location.pathname === path
    ? "bg-indigo-100 text-indigo-700 font-semibold"
    : "text-gray-600 hover:bg-gray-100 hover:text-black";

  return (
<aside className="w-56 h-screen bg-white text-gray-800 flex flex-col border-r border-gray-200">
      {/* Logo */}

      <div className="px-6 py-3 border-b border-gray-200">
        <h1 className="text-2xl font-bold tracking-wide">
          Admin<span className="text-indigo-500">Panel</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">CRM & ERP Dashboard</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 sidebar-scroll px-4 py-6">
        <ul className="space-y-1 text-sm">

          <MenuItem to="/dashboard" icon={<FaHome />} label="Dashboard" active={isActive("/dashboard")} />
          {role === "admin" && (
          <MenuItem to="/analytics" icon={<FaChartLine />} label="Analytics" active={isActive("/analytics")} />
          )}

          {/* Customers Dropdown */}
{(role === "admin" || role === "sales") && (
<li>
            <button
              onClick={() => setOpenCustomers(!openCustomers)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-black"
            >
              <span className="flex items-center gap-3">
                <FaUsersCog />
                Customers
              </span>
              {openCustomers ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {openCustomers && (
              <ul className="ml-6 mt-2 space-y-1">
                <SubMenuItem to="/customers" label="Customers List" />
                <SubMenuItem to="/sale-bills" label="Sale Bills" />
              </ul>
            )}
          </li>
)}
          
          {/* Inventory Dropdown */}
{(role === "admin" || role === "inventory") && (
<li>
            <button
              onClick={() => setOpenInventory(!openInventory)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition"
            >
              <span className="flex items-center gap-3">
                <FaFileInvoice />
                Inventory
              </span>
              {openInventory ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {openInventory && (
              <ul className="ml-6 mt-2 space-y-1">
                <SubMenuItem to="/products" label="Products" />
                <SubMenuItem to="/add-product" label="Add Product" />
                <SubMenuItem to="/categories" label="Categories" />

              </ul>
            )}
          </li>
)}

         {(role === "admin" || role === "sales") && (
<MenuItem to="/orders" icon={<FaShoppingBag />} label="Orders" active={isActive("/orders")} />
)}
          <MenuItem to="/yourstore" icon={<FaStore />} label="Your Store" active={isActive("/yourstore")} />

        {/* Vendors Dropdown */}
{(role === "admin" || role === "inventory") && (
<li>
            <button
              onClick={() => setOpenVendors(!openVendors)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800"
            >
              <span className="flex items-center gap-3">
                <FaUserTie />
                Vendors
              </span>
              {openVendors ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {openVendors && (
              <ul className="ml-6 mt-2 space-y-1">
                <SubMenuItem to="/vendors" label="Vendor List" />
                <SubMenuItem to="/purchase-bills" label="Purchase Bills" />
              </ul>
            )}
          </li>
)}

          {/* Expenses Dropdown */}
{(role === "admin" || role === "accounts") && (
<li>
            <button
              onClick={() => setOpenExpenses(!openExpenses)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800"
            >
              <span className="flex items-center gap-3">
                <FaMoneyBillWave />
                Expenses
              </span>
              {openExpenses ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {openExpenses && (
              <ul className="ml-6 mt-2 space-y-1">
                <SubMenuItem to="/expenses" label="All Expenses" />
                <SubMenuItem to="/expense-bills" label="Expense Bills" />
              </ul>
            )}
          </li>
)}

          {(role === "admin" || role === "accounts") && (
<MenuItem to="/billing" icon={<FaChartBar />} label="Billing" active={isActive("/billing")} />
)}
          {(role === "admin" || role === "accounts") && (
<MenuItem to="/reports" icon={<FaChartBar />} label="Reports" active={isActive("/reports")} />
)}

  {/* Users Dropdown */}

{role === "admin" && (
<li>
  <button
    onClick={() => setOpenUsers(!openUsers)}
    className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800"
  >
    <span className="flex items-center gap-3">
      <FaUsersCog />
      Users
    </span>

    {openUsers ? <FaChevronUp /> : <FaChevronDown />}
  </button>

{openUsers && (
  <ul className="ml-6 mt-2 space-y-1">
    {role === "admin" && (
      <SubMenuItem to="/users" label="Users List" />
    )}
  </ul>
)}
</li>
)}

          <MenuItem to="/profile" icon={<FaUser />} label="Profile" active={isActive("/profile")} />
          <MenuItem to="/settings" icon={<FaCogs />} label="Settings" active={isActive("/settings")} />
          <MenuItem to="/support" icon={<FaHeadset />} label="Support" active={isActive("/support")} />

        </ul>
      </nav>

      {/* Logout */}
<div className="px-4 py-4 border-t border-gray-200">
  <button
    onClick={() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-changed"));
      window.location.href = "/login";
    }}
    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
  >
    <FaSignOutAlt />
    Logout
  </button>
</div>
    </aside>
  );
}

/* ---------- Components ---------- */

function MenuItem({ to, icon, label, active }) {
  return (
    <li>
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${active}`}
      >
        {icon}
        {label}
      </Link>
    </li>
  );
}

function SubMenuItem({ to, label }) {
  return (
    <li>
      <Link
        to={to}
        className="block px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-black transition text-xs"
      >
        {label}
      </Link>
    </li>
  );
}
