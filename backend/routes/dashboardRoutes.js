const express = require("express");
const Expense = require("../models/Expense");
const StoreOrder = require("../models/StoreOrder");
const StoreCustomer = require("../models/StoreCustomer");

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
  const period = req.query.period || "30D";

const selectedDate = req.query.date
  ? new Date(req.query.date)
  : new Date();

const fromDate = req.query.from
  ? new Date(req.query.from)
  : null;

const toDate = req.query.to
  ? new Date(req.query.to)
  : selectedDate;

const today = toDate;
let startDate = new Date();
if (fromDate && toDate) {
  startDate = fromDate;
}
else {
switch (period) {

  case "7D":
    startDate = new Date();
    startDate.setDate(today.getDate() - 6);
    break;

  case "1M":
    // Current month from day 1 to today
    startDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );
    break;

  case "3M":
    // First day of two months ago
    startDate = new Date(
      today.getFullYear(),
      today.getMonth() - 2,
      1
    );
    break;

  case "1Y":
    startDate = new Date(
      today.getFullYear(),
      0,
      1
    );
    break;

  default:
    startDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );
}
}

const [expensesResult, ordersResult, customersResult] = await Promise.allSettled([
  Expense.findAll(),
  StoreOrder.findAll({ order: [["created_at", "DESC"]] }),
  StoreCustomer.count(),
]);

const allOrders =
  ordersResult.status === "fulfilled"
    ? ordersResult.value.map((o) => o.toJSON())
    : [];

const orders = allOrders.filter(order => {
  const orderDate = new Date(order.created_at);

  return (
    orderDate >= startDate &&
    orderDate <= today
  );
});

const totalCustomers =
  customersResult.status === "fulfilled" ? customersResult.value : 0;

console.log("Orders Result Status:", ordersResult.status);
console.log("Orders Count:", orders.length);

console.log("Customers Result Status:", customersResult.status);
console.log("Total Customers:", totalCustomers);

   const allExpenses = expensesResult.status === "fulfilled"
  ? expensesResult.value
  : [];

const expenses = allExpenses.filter(expense => {
  const expenseDate = new Date(expense.createdAt);

  return (
    expenseDate >= startDate &&
    expenseDate <= today
  );
});

    if (expensesResult.status === "rejected") {
      console.log("Dashboard expenses fetch warning:", expensesResult.reason?.message || expensesResult.reason);
    }

    // "delivered" is the fulfilled/completed equivalent for the site's own orders
    const completedOrders = orders.filter((order) => order.status === "delivered");
    console.log(
  completedOrders.map(order => ({
    id: order.id,
    status: order.status,
    total: order.totalPrice,
    date: order.created_at
  }))
);
    const totalSales = completedOrders.reduce(
      (sum, order) => sum + (parseFloat(order.totalPrice) || 0),
      0
    );
    console.log("Total Sales =", totalSales);
    const totalExpenses = expenses.reduce(
  (sum, expense) => sum + (parseFloat(expense.amount) || 0),
  0
);
    const profit = totalSales - totalExpenses;

   const orderStatus = {
  completed: orders.filter(o => o.status === "delivered").length,
  processing: orders.filter(o => o.status === "processing" || o.status === "shipped").length,
  failed: 0,
  cancelled: orders.filter(o => o.status === "cancelled").length,
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
      const orderDate = new Date(order.created_at);
      const key = getMonthKey(orderDate);

      if (monthlyMap[key]) {
        monthlyMap[key].sales += parseFloat(order.totalPrice) || 0;
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
     console.log("Monthly Sales", monthlySales);

    const todayOrders = completedOrders.filter((order) =>
      isSameDay(new Date(order.created_at), today)
    );
    const todaySales = todayOrders.reduce(
      (sum, order) => sum + (parseFloat(order.totalPrice) || 0),
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
      (order.items || []).forEach((item) => {
        const productKey = item.id || item.name;
        if (!productSalesMap[productKey]) {
          productSalesMap[productKey] = {
            name: item.name || "Product",
            sales: 0,
            quantity: 0,
          };
        }

        productSalesMap[productKey].sales += (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0);
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
      const customerKey = order.customerId || order.customerEmail || order.id;
      const name = order.customerName || "Customer";

      if (!customerMap[customerKey]) {
        customerMap[customerKey] = {
          name,
          amount: 0,
          orders: 0,
        };
      }

      customerMap[customerKey].amount += parseFloat(order.totalPrice) || 0;
      customerMap[customerKey].orders += 1;
    });

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const activityFeed = orders
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((order) => ({
        id: order.id,
        text: `Order #${order.id} by ${order.customerName || "Customer"}`,
        amount: parseFloat(order.totalPrice) || 0,
        status: order.status,
        time: new Date(order.created_at).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

    res.json({
      kpis: {
        totalSales,
        totalOrders: orders.length,
        totalCustomers,
        totalExpenses,
        profit,
      },
      orderStatus,
      monthlySales,
      topProducts,
      topCustomers,
      activityFeed,

 summary: {
  "7D": {
    sales: totalSales,
    orders: orders.length,
    expenses: totalExpenses,
    profit,
  },
  "1M": {
    sales: totalSales,
    orders: orders.length,
    expenses: totalExpenses,
    profit,
  },
  "3M": {
    sales: totalSales,
    orders: orders.length,
    expenses: totalExpenses,
    profit,
  },
  "1Y": {
    sales: totalSales,
    orders: orders.length,
    expenses: totalExpenses,
    profit,
  }
},
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
