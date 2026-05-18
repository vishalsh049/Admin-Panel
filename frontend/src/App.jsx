import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

import Sidebar from "./components/Sidebar";
import TopNavbar from "./components/TopNavbar";

/* Pages */
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";

import Customers from "./pages/Customers";
import SaleBills from "./pages/SaleBills";
import AddSaleBill from "./pages/AddSaleBill";
import EditSaleBill from "./pages/EditSaleBill";

import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import Invoice from "./pages/Invoice";

import Reports from "./pages/Reports";
import YourStore from "./pages/YourStore";
import Products from "./pages/Products";

import Inventory from "./pages/Inventory";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";
import Categories from "./pages/Categories";

import Vendors from "./pages/Vendors";
import VendorDetails from "./pages/VendorDetails";
import VendorPayouts from "./pages/VendorPayouts";
import AddVendor from "./pages/AddVendor";
import PurchaseBill from "./pages/PurchaseBill";

import Expenses from "./pages/Expenses";
import AddExpense from "./pages/AddExpense";
import ExpenseBill from "./pages/ExpenseBill";

import Billing from "./pages/Billing";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Settings from "./pages/Setting";
import Support from "./pages/Support";

/* ================= AUTH CHECK ================= */
const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

/* ================= PROTECTED ROUTE ================= */
const PrivateRoute = ({ token }) => {
  return token ? <Outlet /> : <Navigate to="/login" />;
};

export default function App() {
  const [token, setToken] = useState(isAuthenticated());

  useEffect(() => {
    const checkAuth = () => setToken(isAuthenticated());

    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-changed", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-changed", checkAuth);
    };
  }, []);

  return (
    <Router>
      <AppRoutes token={token} />
    </Router>
  );
}

function AppRoutes({ token }) {
  const location = useLocation();
  const hideSidebar = false;
  const auth = isAuthenticated();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      {auth && !hideSidebar && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="min-h-screen lg:pl-56">
        {/* Navbar */}
        {auth && <TopNavbar onMenuClick={() => setSidebarOpen(true)} />}

        <main
          className={
            auth && !hideSidebar
              ? "mx-auto w-full max-w-7xl px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
              : "p-4"
          }
        >
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<PrivateRoute token={token} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />

              <Route path="/customers" element={<Customers />} />

              <Route path="/sale-bills" element={<SaleBills />} />
              <Route path="/add-sale-bill" element={<AddSaleBill />} />
              <Route path="/sale-bills/:id" element={<EditSaleBill />} />
              <Route
                path="/edit-sale-bill/:id"
                element={<Navigate to={location.pathname.replace("/edit-sale-bill/", "/sale-bills/")} replace />}
              />

              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetails />} />
              <Route path="/invoice/:id" element={<Invoice />} />

              <Route path="/products" element={<Products />} />

              <Route path="/inventory" element={<Inventory />} />
              <Route path="/add-product" element={<AddProduct />} />
              <Route path="/edit-product/:id" element={<EditProduct />} />
              <Route path="/categories" element={<Categories />} />

              <Route path="/vendors" element={<Vendors />} />
              <Route path="/vendors/add" element={<AddVendor />} />
              <Route path="/vendors/edit/:id" element={<AddVendor />} />
              <Route path="/vendors/:id" element={<VendorDetails />} />
              <Route path="/vendor-payouts" element={<VendorPayouts />} />
              <Route path="/purchase-bills" element={<PurchaseBill />} />

              <Route path="/expenses" element={<Expenses />} />
              <Route path="/expenses/add" element={<AddExpense />} />
              <Route path="/expenses/edit/:id" element={<AddExpense />} />
              <Route path="/expense-bills" element={<ExpenseBill />} />

              <Route path="/reports" element={<Reports />} />
              <Route path="/yourstore" element={<YourStore />} />

              <Route path="/billing" element={<Billing />} />

              <Route path="/users" element={<Users />} />
              <Route path="/profile" element={<Profile />} />

              <Route path="/settings" element={<Settings />} />
              <Route path="/support" element={<Support />} />
            </Route>

            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/login" />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
