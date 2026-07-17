// TEMPORARY — one-time WooCommerce product migration endpoints.
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requireAdminRole = require("../middleware/requireAdminRole");
const ctrl = require("../controllers/wooImportController");

// Bulk-writes the live product catalog and carries WooCommerce credentials —
// restricted to the "admin" role, same bar as routes/integrationRoutes.js.
router.use(adminAuth, requireAdminRole);

router.get("/test-connection", ctrl.testConnection);
router.post("/sync-products", ctrl.syncProducts);

module.exports = router;
