require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const sequelize = require("./config/db");
require("./models");
const Category = require("./models/Category");
const Product = require("./models/Products");
const ensureProductSourceColumn = require("./utils/ensureProductSourceColumn");
const ensureUserColumns = require("./utils/ensureUserColumns");

const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenseRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const wooRoutes = require("./routes/wooRoutes");
const productRoutes = require("./routes/productRoutes");
const expenseCategoryRoutes = require("./routes/expenseCategoryRoutes");
const saleBills = require("./routes/saleBills");
const usersRoutes = require("./routes/users");
const orderRoutes = require("./routes/orderRoutes");
const customersRoute = require("./routes/customers");

const app = express();
const SHOULD_SYNC_DB = (process.env.DB_SYNC || "false").toLowerCase() === "true";

// Middlewares
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      return allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/expenses", expenseRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/woo", wooRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/sale-bills", saleBills);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/customers", customersRoute);

// Serve built frontend on the same app when deploying to Hostinger.
// Toggle with SERVE_FRONTEND=true after running `npm run build` inside frontend.
if (process.env.SERVE_FRONTEND === "true") {
  const distPath = path.join(__dirname, "..", "frontend", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    return res.sendFile(path.join(distPath, "index.html"));
  });
}

// Health route
app.get("/", (req, res) => {
  res.send("Backend running with MySQL");
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("MySQL connected");

    if (SHOULD_SYNC_DB) {
      await sequelize.sync();
      console.log("Database synced");
    }

    await Category.sync();
    console.log("categories table verified");

    await Product.sync();
    console.log("products table verified");

    await ensureProductSourceColumn(sequelize);
    console.log("Product source column verified");

    await ensureUserColumns(sequelize);
    console.log("users table columns verified");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(
      "Database connection failed:",
      err.message || err.parent?.sqlMessage || err.parent?.message || err.parent?.code || err
    );
    process.exit(1);
  }
}

startServer();
