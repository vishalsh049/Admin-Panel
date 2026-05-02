const express = require("express");
const Expense = require("../models/Expense");
const WooCommerce = require("../config/woocommerce");

const router = express.Router();

function getMonthKey(date) {
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

router.get("/", async (req, res) => {
  try {
   const [expensesResult] = await Promise.allSettled([
  Expense.findAll(),
]);

const orders = [];
const customers = [];

  
    const expenses = expensesResult.status === "fulfilled" ? expensesResult.value : [];

    if (expensesResult.status === "rejected") {
      console.log("Dashboard expenses fetch warning:", expensesResult.reason?.message || expensesResult.reason);
    }

    const today = new Date();

    const completedOrders = orders.filter((order) => order.status === "completed");
    const totalSales = completedOrders.reduce(
      (sum, order) => sum + (parseFloat(order.total) || 0),
      0
    );
    const totalExpenses = expenses.reduce(
  (sum, expense) => sum + (parseFloat(expense.amount) || 0),
  0
);
    const profit = totalSales - totalExpenses;

    const orderStatus = {
      completed: orders.filter((order) => order.status === "completed").length,
      pending: orders.filter((order) => order.status === "pending").length,
      cancelled: orders.filter((order) => order.status === "cancelled").length,
    };

    const monthlyMap = {};
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = getMonthKey(date);

      monthlyMap[key] = {
        name: key,
        sales: 0,
        expenses: 0,
        profit: 0,
        sortDate: date.getTime(),
      };
    }

    completedOrders.forEach((order) => {
      const orderDate = new Date(order.date_created);
      const key = getMonthKey(orderDate);

      if (monthlyMap[key]) {
        monthlyMap[key].sales += parseFloat(order.total) || 0;
      }
    });

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.createdAt);
      if (Number.isNaN(expenseDate.getTime())) return;

      const key = getMonthKey(expenseDate);
      if (monthlyMap[key]) {
       monthlyMap[key].expenses += parseFloat(expense.amount) || 0;
      }
    });

    const monthlySales = Object.values(monthlyMap)
      .map((item) => ({
        ...item,
        profit: item.sales - item.expenses,
      }))
      .sort((a, b) => a.sortDate - b.sortDate)
      .map(({ sortDate, ...rest }) => rest);

    const todayOrders = completedOrders.filter((order) =>
      isSameDay(new Date(order.date_created), today)
    );
    const todaySales = todayOrders.reduce(
      (sum, order) => sum + (parseFloat(order.total) || 0),
      0
    );

    const currentMonthKey = getMonthKey(today);
    const currentMonthData =
      monthlySales.find((item) => item.name === currentMonthKey) || {
        name: currentMonthKey,
        sales: 0,
        expenses: 0,
        profit: 0,
      };

    const productSalesMap = {};
    completedOrders.forEach((order) => {
      (order.line_items || []).forEach((item) => {
        const productKey = item.product_id || item.name;
        if (!productSalesMap[productKey]) {
          productSalesMap[productKey] = {
            name: item.name || "Product",
            sales: 0,
            quantity: 0,
          };
        }

        productSalesMap[productKey].sales += parseFloat(item.total) || 0;
        productSalesMap[productKey].quantity += parseFloat(item.quantity) || 0;
      });
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
      .map((product) => ({
        name: product.name,
        sales: product.sales,
        quantity: product.quantity,
      }));

    const customerMap = {};
    completedOrders.forEach((order) => {
      const customerKey = order.customer_id || order.billing?.email || order.id;
      const firstName = order.billing?.first_name || "";
      const lastName = order.billing?.last_name || "";
      const name = `${firstName} ${lastName}`.trim() || "Customer";

      if (!customerMap[customerKey]) {
        customerMap[customerKey] = {
          name,
          amount: 0,
          orders: 0,
        };
      }

      customerMap[customerKey].amount += parseFloat(order.total) || 0;
      customerMap[customerKey].orders += 1;
    });

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const activityFeed = orders
      .slice()
      .sort((a, b) => new Date(b.date_created) - new Date(a.date_created))
      .slice(0, 5)
      .map((order) => ({
        id: order.id,
        text: `Order #${order.number} by ${order.billing?.first_name || "Customer"}`,
        amount: parseFloat(order.total) || 0,
        status: order.status,
        time: new Date(order.date_created).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

    res.json({
      kpis: {
        totalSales,
        totalOrders: completedOrders.length,
        totalCustomers: customers.length,
        totalExpenses,
        profit,
      },
      orderStatus,
      monthlySales,
      topProducts,
      topCustomers,
      activityFeed,
      summary: {
        today: {
          sales: todaySales,
          orders: todayOrders.length,
          expenses: 0,
          profit: todaySales,
        },
        month: {
          sales: currentMonthData.sales,
          orders: completedOrders.filter(
            (order) => getMonthKey(new Date(order.date_created)) === currentMonthKey
          ).length,
          expenses: currentMonthData.expenses,
          profit: currentMonthData.profit,
        },
        year: {
          sales: totalSales,
          orders: completedOrders.length,
          expenses: totalExpenses,
          profit,
        },
      },
      wooConfigured: Boolean(WooCommerce),
    });
  } catch (error) {
    console.log("Dashboard Error:", error.message);
    res.status(500).json({
      message: "Dashboard error",
      error: error.message,
    });
  }
});

module.exports = router;
