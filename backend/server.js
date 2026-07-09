require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const sequelize = require("./config/db");
require("./models");
const ensureUserColumns = require("./utils/ensureUserColumns");
const { run: runMigrations } = require("./scripts/migrate");
const syncLegacyProductImages = require("./utils/syncLegacyProductImages");

const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenseRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const productRoutes = require("./routes/productRoutes");
const expenseCategoryRoutes = require("./routes/expenseCategoryRoutes");
const saleBills = require("./routes/saleBills");
const usersRoutes = require("./routes/users");
const customersRoute = require("./routes/customers");
const storeRoutes = require("./routes/storeRoutes");
const contactRoutes = require("./routes/contactRoutes");
const StoreCustomer = require("./models/StoreCustomer");
const StoreContactMessage = require("./models/StoreContactMessage");
const StoreOrder = require("./models/StoreOrder");
const StoreOrderStatusHistory = require("./models/StoreOrderStatusHistory");
const StoreOrderRequest = require("./models/StoreOrderRequest");
const StoreWishlist = require("./models/StoreWishlist");
const StoreAddress = require("./models/StoreAddress");

const app = express();
const SHOULD_SYNC_DB = (process.env.DB_SYNC || "false").toLowerCase() === "true";

// Middlewares
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : [];

if (allowedOrigins.length === 0) {
  console.warn(
    "WARNING: CLIENT_ORIGIN is not set — CORS will reject all cross-origin browser requests. " +
      "Set CLIENT_ORIGIN to a comma-separated list of allowed origins (admin panel + website URLs)."
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // same-origin / non-browser requests (curl, server-to-server)
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
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/sale-bills", saleBills);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/customers", customersRoute);
app.use("/api/store", storeRoutes);
app.use("/api/store/contact", contactRoutes);

// Serve built frontend on the same app when deploying to Hostinger.
// Toggle with SERVE_FRONTEND=true after running `npm run build` inside frontend.
if (process.env.SERVE_FRONTEND === "true") {
  const distPath = path.join(__dirname, "..", "frontend", "dist");
  app.use(express.static(distPath));
  app.get("/*splat", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    return res.sendFile(path.join(distPath, "index.html"));
  });
}

// Health route
app.get("/", (req, res) => {
  res.send("Backend running with MySQL");
});

// Global error handler — catches errors passed via next(err) (e.g. multer
// file-type/size rejections, CORS denials) so clients get structured JSON
// instead of Express's default HTML error page.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message || err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
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

    await runMigrations();
    console.log("Product/category schema migrations verified");

    await syncLegacyProductImages();
    console.log("Legacy product image column reconciled with gallery table");

    await ensureUserColumns(sequelize);
    console.log("users table columns verified");

    await StoreCustomer.sync({ alter: SHOULD_SYNC_DB });
    console.log("store_customers table verified");

    await StoreOrder.sync({ alter: SHOULD_SYNC_DB });
    console.log("store_orders table verified");

    await StoreOrderStatusHistory.sync();
    console.log("store_order_status_history table verified");

    await StoreOrderRequest.sync();
    console.log("store_order_requests table verified");

    await StoreWishlist.sync({ alter: SHOULD_SYNC_DB });
    console.log("store_wishlists table verified");

    await StoreAddress.sync({ alter: SHOULD_SYNC_DB });
    console.log("store_addresses table verified");

    await StoreContactMessage.sync({ alter: SHOULD_SYNC_DB });
    console.log("store_contact_messages table verified");

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
