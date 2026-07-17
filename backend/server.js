require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const sequelize = require("./config/db");
require("./models");
const ensureUserColumns = require("./utils/ensureUserColumns");
const { run: runMigrations } = require("./scripts/migrate");
const syncLegacyProductImages = require("./utils/syncLegacyProductImages");
const { QueryTypes } = require("sequelize");

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
const shippingRoutes = require("./routes/shippingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const integrationRoutes = require("./routes/integrationRoutes");
const wooImportRoutes = require("./routes/wooImportRoutes");
const { initIntegrationConfigCache } = require("./services/integrationConfigService");
const { syncActiveShipments } = require("./controllers/shippingController");
const StoreCustomer = require("./models/StoreCustomer");
const StoreContactMessage = require("./models/StoreContactMessage");
const StoreOrder = require("./models/StoreOrder");
const StoreOrderStatusHistory = require("./models/StoreOrderStatusHistory");
const StoreOrderRequest = require("./models/StoreOrderRequest");
const StoreWishlist = require("./models/StoreWishlist");
const StoreAddress = require("./models/StoreAddress");

const app = express();
const SHOULD_SYNC_DB = (process.env.DB_SYNC || "false").toLowerCase() === "true";

// Render sits behind a reverse proxy — without this, req.protocol/req.ip and
// anything relying on X-Forwarded-* (secure cookies, rate limiting) is wrong.
app.set("trust proxy", 1);

// Middlewares
// Baked-in production domains so the site keeps working even if the Render
// dashboard env var is misconfigured or reset. Extend via CLIENT_ORIGIN
// (or the ALLOWED_ORIGINS alias) instead of editing this list where possible.
const DEFAULT_PRODUCTION_ORIGINS = [
  "https://divyadarshnam.divyadarshnam.com",
  "https://www.divyadarshnam.com",
  "https://divyadarshnam.com",
  "https://admin.divyadarshnam.com",
];

const parseOriginList = (value) =>
  (value || "").split(",").map((o) => o.trim()).filter(Boolean);

// CLIENT_ORIGIN is the canonical env var; ALLOWED_ORIGINS is accepted as an
// alias since it's a common name operators reach for — both are merged.
const configuredOrigins = Array.from(
  new Set([
    ...DEFAULT_PRODUCTION_ORIGINS,
    ...parseOriginList(process.env.CLIENT_ORIGIN),
    ...parseOriginList(process.env.ALLOWED_ORIGINS),
  ])
);

const localOriginPatterns = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https?:\/\/0\.0\.0\.0(?::\d+)?$/i,
  /^https?:\/\/\[::1\](?::\d+)?$/i,
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin / non-browser requests (curl, server-to-server)

    const isConfiguredOrigin = configuredOrigins.includes(origin);
    const isLocalDevOrigin = localOriginPatterns.some((pattern) => pattern.test(origin));

    if (isConfiguredOrigin || isLocalDevOrigin) return callback(null, true);

    // 403, not 500: a disallowed origin is a client/config issue, and the
    // log line tells the operator the exact value to add to CLIENT_ORIGIN.
    console.warn(
      `CORS rejected origin: ${origin} (allowed: ${[...configuredOrigins, "localhost/127.0.0.1 dev ports"].join(", ")})`
    );
    const err = new Error(`Origin ${origin} not allowed by CORS`);
    err.status = 403;
    return callback(err);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
// Explicit preflight handler for every route — belt-and-braces alongside the
// global cors() middleware above, since some proxies/clients send OPTIONS
// before Express's routing layer would otherwise short-circuit it.
app.options(/.*/, cors(corsOptions));
// `verify` keeps the exact raw bytes of each JSON body — the Razorpay webhook
// signature is an HMAC over the raw payload, so re-serialized JSON won't do.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
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
app.use("/api/shipping", shippingRoutes);
app.use("/api/store/payments", paymentRoutes);
app.use("/api/admin/integrations", integrationRoutes);
app.use("/api/admin/woo-import", wooImportRoutes);

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

    await initIntegrationConfigCache();
    console.log("Integration provider config cache loaded");

    await syncLegacyProductImages();
    console.log("Legacy product image column reconciled with gallery table");

    await ensureUserColumns(sequelize);
    console.log("users table columns verified");

    try {
      const storeCustomerColumns = await sequelize.query("DESCRIBE store_customers", {
        type: QueryTypes.SELECT,
      });
      const hasResetToken = storeCustomerColumns.some((column) => column.Field === "resetPasswordToken");
      const hasResetExpires = storeCustomerColumns.some((column) => column.Field === "resetPasswordExpires");

      if (!hasResetToken) {
        await sequelize.query("ALTER TABLE store_customers ADD COLUMN resetPasswordToken VARCHAR(255) NULL");
      }
      if (!hasResetExpires) {
        await sequelize.query("ALTER TABLE store_customers ADD COLUMN resetPasswordExpires DATETIME NULL");
      }
      console.log("store_customers reset-password columns verified");
    } catch (schemaErr) {
      console.error("store_customers schema verification failed:", schemaErr.message || schemaErr);
    }

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

    // Opt-in periodic shipment tracking sync (admin can always refresh
    // manually). Set FSHIP_SYNC_INTERVAL_MINUTES=0 or leave unset to disable.
    const syncIntervalMinutes = Number(process.env.FSHIP_SYNC_INTERVAL_MINUTES || 0);
    if (syncIntervalMinutes > 0) {
      setInterval(() => {
        syncActiveShipments()
          .then(({ synced, total }) => {
            if (total > 0) console.log(`FShip tracking sync: ${synced}/${total} shipments updated`);
          })
          .catch((err) => console.error("FShip tracking sync failed:", err.message));
      }, syncIntervalMinutes * 60 * 1000);
      console.log(`FShip tracking sync scheduled every ${syncIntervalMinutes} minute(s)`);
    }
  } catch (err) {
    console.error(
      "Database connection failed:",
      err.message || err.parent?.sqlMessage || err.parent?.message || err.parent?.code || err
    );
    process.exit(1);
  }
}

startServer();
