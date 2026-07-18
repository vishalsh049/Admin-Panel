const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const { getSettings, updateSettings } = require("../controllers/siteSettingsController");

router.get("/", adminAuth, requirePermission("settings"), getSettings);
router.put("/", adminAuth, requirePermission("settings"), updateSettings);

module.exports = router;
