import { useState } from "react";
import React from "react";
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
  FaTimes,
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar({ isOpen, onClose }) {
  const [openInventory, setOpenInventory] = useState(false);
  const [openCustomers, setOpenCustomers] = useState(false);
  const [openVendors, setOpenVendors] = useState(false);
  const [openExpenses, setOpenExpenses] = useState(false);
  const [openUsers, setOpenUsers] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = (user?.role || "admin").toLowerCase();

  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

       .sb-root {
  font-family: 'Inter', sans-serif;
  width: 260px;
  max-width: 85vw;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e8eaf0;
  overflow-y: auto;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}

        .sb-root.open {
          transform: translateX(0);
        }

        /* Logo */
        .sb-logo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 22px 20px 18px;
          border-bottom: 1px solid #f0f1f5;
        }
        .sb-logo-row {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .sb-logo-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
        }
        .sb-logo-text h1 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #1a1d2e;
          line-height: 1.2;
        }
        .sb-logo-text p {
          margin: 3px 0 0;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: #9ea3b8;
          text-transform: uppercase;
        }

        /* Nav area */
        .sb-nav {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 12px 14px 8px;
          scrollbar-width: none;
        }
        .sb-nav::-webkit-scrollbar { display: none; }

        /* Section label */
        .sb-section {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #b0b4c8;
          padding: 0 6px;
          margin: 18px 0 6px;
        }
        .sb-section:first-child { margin-top: 4px; }

        ul { list-style: none; margin: 0; padding: 0; }
        li { margin: 0 0 2px; }

        /* Nav item */
        .sb-item {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 9px 10px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: #3d4166;
          text-decoration: none;
          cursor: pointer;
          border: none;
          background: transparent;
          transition: background 0.15s, color 0.15s;
          position: relative;
          text-align: left;
        }
        .sb-item:hover {
          background: #f4f5fb;
          color: #1a1d2e;
        }
        .sb-item.active {
          background: #eeecfb;
          color: #5b4fcf;
          font-weight: 600;
        }
        .sb-item.active::before {
          content: '';
          position: absolute;
          left: -14px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 58%;
          background: #5b4fcf;
          border-radius: 0 3px 3px 0;
        }

        /* Colored icon wraps */
        .sb-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }
        .sb-icon.purple { background: #eeecfb; color: #5b4fcf; }
        .sb-icon.green  { background: #e8f8f0; color: #22a861; }
        .sb-icon.blue   { background: #e8f0fc; color: #3b72e8; }
        .sb-icon.orange { background: #fff3e8; color: #f07a1a; }
        .sb-icon.violet { background: #f0ebff; color: #7c55e8; }
        .sb-icon.teal   { background: #e5f8f5; color: #1ab89a; }
        .sb-icon.red    { background: #fdecea; color: #e0443a; }
        .sb-icon.indigo { background: #eaedfc; color: #4a5cd4; }
        .sb-icon.gray   { background: #f2f3f7; color: #6b7195; }
        .sb-icon.yellow { background: #fef9e7; color: #d4a017; }
        .sb-icon.cyan   { background: #e5f5fb; color: #1a9dc8; }

        .sb-chevron {
          margin-left: auto;
          font-size: 10px;
          color: #b0b4c8;
        }

        /* Sub menu */
        .sb-sub {
          margin-top: 3px;
          padding-left: 43px;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .sb-sub-item {
          display: block;
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 500;
          color: #6b7195;
          text-decoration: none;
          transition: background 0.13s, color 0.13s;
        }
        .sb-sub-item:hover {
          background: #f4f5fb;
          color: #1a1d2e;
        }
        .sb-sub-item.active {
          color: #5b4fcf;
          background: #eeecfb;
        }

        /* Footer */
        .sb-footer {
          padding: 12px 14px 16px;
          border-top: 1px solid #f0f1f5;
        }
        .sb-signout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          background: #fff5f5;
          border: 1px solid #fdd8d8;
          color: #e0443a;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .sb-signout:hover {
          background: #fdecea;
          border-color: #f9b5b2;
        }

        .sb-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #475569;
          flex-shrink: 0;
        }

        .sb-overlay {
          position: fixed;
          inset: 0;
          z-index: 45;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(2px);
        }

        @media (min-width: 1024px) {
          .sb-root {
            width: 228px;
            transform: translateX(0);
          }

          .sb-overlay,
          .sb-close {
            display: none;
          }
        }
      `}</style>

      {isOpen && (
        <button
          type="button"
          className="sb-overlay lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`sb-root ${isOpen ? "open" : ""}`}>
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo-row">
            <div className="sb-logo-text">
              <h1>Divya Darshnam</h1>
              <p>Admin Panel</p>
            </div>
          </div>
          <button type="button" className="sb-close lg:hidden" onClick={onClose} aria-label="Close sidebar">
            <FaTimes />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sb-nav">
          <ul>
            <p className="sb-section">Main</p>

            <NavItem to="/dashboard" onClose={onClose} iconClass="purple" icon={<FaHome />} label="Dashboard" active={isActive("/dashboard")} />
            {role === "admin" && (
              <NavItem to="/analytics" iconClass="indigo" icon={<FaChartLine />} label="Analytics" active={isActive("/analytics")} />
            )}

            {(role === "admin" || role === "sales" || role === "inventory") && (
              <p className="sb-section">Management</p>
            )}

            {(role === "admin" || role === "sales") && (
              <DropdownItem label="Customers" iconClass="green" icon={<FaUsersCog />} open={openCustomers} onClick={() => setOpenCustomers(!openCustomers)}>
                <SubNavItem to="/customers" label="Customers List" active={isActive("/customers")} />
                <SubNavItem to="/sale-bills" label="Sale Bills" active={isActive("/sale-bills")} />
              </DropdownItem>
            )}

            {(role === "admin" || role === "inventory") && (
              <DropdownItem label="Inventory" iconClass="blue" icon={<FaFileInvoice />} open={openInventory} onClick={() => setOpenInventory(!openInventory)}>
                <SubNavItem to="/products" label="Products" active={isActive("/products")} />
                <SubNavItem to="/add-product" label="Add Product" active={isActive("/add-product")} />
                <SubNavItem to="/categories" label="Categories" active={isActive("/categories")} />
              </DropdownItem>
            )}

            {(role === "admin" || role === "sales") && (
              <NavItem to="/orders" iconClass="orange" icon={<FaShoppingBag />} label="Orders" active={isActive("/orders")} />
            )}

            <NavItem to="/yourstore" iconClass="violet" icon={<FaStore />} label="Your Store" active={isActive("/yourstore")} />

            {(role === "admin" || role === "inventory") && (
              <DropdownItem label="Vendors" iconClass="teal" icon={<FaUserTie />} open={openVendors} onClick={() => setOpenVendors(!openVendors)}>
                <SubNavItem to="/vendors" label="Vendor List" active={isActive("/vendors")} />
                <SubNavItem to="/purchase-bills" label="Purchase Bills" active={isActive("/purchase-bills")} />
              </DropdownItem>
            )}

            {(role === "admin" || role === "accounts") && (
              <p className="sb-section">Finance</p>
            )}

            {(role === "admin" || role === "accounts") && (
              <DropdownItem label="Expenses" iconClass="red" icon={<FaMoneyBillWave />} open={openExpenses} onClick={() => setOpenExpenses(!openExpenses)}>
                <SubNavItem to="/expenses" label="All Expenses" active={isActive("/expenses")} />
                <SubNavItem to="/expense-bills" label="Expense Bills" active={isActive("/expense-bills")} />
              </DropdownItem>
            )}

            {(role === "admin" || role === "accounts") && (
              <NavItem to="/billing" iconClass="indigo" icon={<FaFileInvoice />} label="Billing" active={isActive("/billing")} />
            )}
            {(role === "admin" || role === "accounts") && (
              <NavItem to="/reports" iconClass="indigo" icon={<FaChartBar />} label="Reports" active={isActive("/reports")} />
            )}

            {role === "admin" && (
              <p className="sb-section">Administration</p>
            )}

            {role === "admin" && (
              <DropdownItem label="Users" iconClass="yellow" icon={<FaUsersCog />} open={openUsers} onClick={() => setOpenUsers(!openUsers)}>
                <SubNavItem to="/users" label="Users List" active={isActive("/users")} />
              </DropdownItem>
            )}

            <NavItem to="/profile" iconClass="blue" icon={<FaUser />} label="Profile" active={isActive("/profile")} />
            <NavItem to="/settings" iconClass="gray" icon={<FaCogs />} label="Settings" active={isActive("/settings")} />
            <NavItem to="/support" iconClass="cyan" icon={<FaHeadset />} label="Support" active={isActive("/support")} />
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="sb-footer">
          <button
            className="sb-signout"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.dispatchEvent(new Event("auth-changed"));
              window.location.href = "/login";
            }}
          >
            <FaSignOutAlt style={{ width: 14, height: 14 }} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({ to, icon, label, active, iconClass, onClose }) {
  return (
    <li>
      <Link
       to={to}
       onClick={onClose}
       className={`sb-item${active ? " active" : ""}`} 
       >
        <span className={`sb-icon ${iconClass}`}>
          {React.cloneElement(icon, { style: { width: 13, height: 13 } })}
        </span>
        {label}
      </Link>
    </li>
  );
}

function DropdownItem({ label, icon, iconClass, open, onClick, children }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="sb-item" style={{ width: "100%" }}>
        <span className={`sb-icon ${iconClass}`}>
          {React.cloneElement(icon, { style: { width: 13, height: 13 } })}
        </span>
        {label}
        <span className="sb-chevron">
          {open ? <FaChevronUp /> : <FaChevronDown />}
        </span>
      </button>
      {open && <div className="sb-sub">{children}</div>}
    </li>
  );
}

function SubNavItem({ to, label, active }) {
  return (
    <Link to={to} className={`sb-sub-item${active ? " active" : ""}`}>
      {label}
    </Link>
  );
}
