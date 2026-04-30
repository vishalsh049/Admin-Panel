import { createContext, useContext, useEffect, useState } from "react";

const ExpenseContext = createContext();

/* ---------------- PROVIDER ---------------- */
export function ExpenseProvider({ children }) {
  const [expenses, setExpenses] = useState([]);

  /* ---------- LOAD FROM LOCAL STORAGE ---------- */
  useEffect(() => {
    const stored = localStorage.getItem("expenses");
    if (stored) {
      setExpenses(JSON.parse(stored));
    }
  }, []);

  /* ---------- SAVE TO LOCAL STORAGE ---------- */
  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [expenses]);

  /* ---------- ADD EXPENSE ---------- */
  const addExpense = (expense) => {
    setExpenses((prev) => [
      {
        id: Date.now(), // unique id
        ...expense,
      },
      ...prev,
    ]);
  };

  /* ---------- DELETE EXPENSE ---------- */
  const deleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  /* ---------- UPDATE EXPENSE ---------- */
  const updateExpense = (id, updatedData) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, ...updatedData } : e
      )
    );
  };

  /* ---------- GET EXPENSE BY ID (FOR EDIT) ---------- */
  const getExpenseById = (id) => {
    return expenses.find((e) => e.id === Number(id));
  };

  /* ---------- TOTALS (FOR SUMMARY / REPORTS) ---------- */
  const totalExpense = expenses.reduce(
    (sum, e) => sum + Number(e.totalAmount || 0),
    0
  );

  const totalGST = expenses.reduce(
    (sum, e) => sum + Number(e.gstAmount || 0),
    0
  );

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        addExpense,
        deleteExpense,
        updateExpense,
        getExpenseById,   // ✅ EDIT SUPPORT
        totalExpense,     // ✅ SUMMARY
        totalGST,         // ✅ GST REPORT
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

/* ---------------- HOOK ---------------- */
export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error("useExpenses must be used inside ExpenseProvider");
  }
  return context;
}
