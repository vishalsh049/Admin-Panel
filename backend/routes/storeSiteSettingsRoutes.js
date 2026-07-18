const express = require("express");
const router = express.Router();
const { getSettings } = require("../controllers/siteSettingsController");

// Public, unauthenticated — the storefront Navbar/Footer need this on every page load.
router.get("/", getSettings);

module.exports = router;
