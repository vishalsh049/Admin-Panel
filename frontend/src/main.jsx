import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";
import { VendorProvider } from "./context/VendorContext";
import { ExpenseProvider } from "./context/ExpenseContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <VendorProvider>
      <ExpenseProvider>
        <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
        <App />
      </ExpenseProvider>
    </VendorProvider>
  </React.StrictMode>
);
