const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requireAdminRole = require("../middleware/requireAdminRole");
const integrations = require("../controllers/integrationsController");

// Integration Settings (Razorpay/Fship credentials) are restricted to the
// "admin" role, not just any authenticated admin-panel user.
router.use(adminAuth, requireAdminRole);

router.get("/", integrations.list);
router.get("/:providerCode", integrations.getOne);
router.put("/:providerCode", integrations.save);
router.post("/:providerCode/test", integrations.testConnection);
router.post("/:providerCode/enable", integrations.enable);
router.post("/:providerCode/disable", integrations.disable);

module.exports = router;
