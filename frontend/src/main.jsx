import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { VendorProvider } from "./context/VendorContext";
import { ExpenseProvider } from "./context/ExpenseContext";
import { ThemeProvider } from "./context/ThemeContext";
import { setAuthHeader } from "./utils/authHeader";

setAuthHeader(localStorage.getItem("token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <VendorProvider>
          <ExpenseProvider>
            <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
            <App />
          </ExpenseProvider>
        </VendorProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
