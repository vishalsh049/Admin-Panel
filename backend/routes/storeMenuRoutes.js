const express = require("express");
const router = express.Router();
const { publicGetMenu } = require("../controllers/menuController");

// Public, unauthenticated — mounted at /api/store/menu in server.js.
router.get("/:location", publicGetMenu);

module.exports = router;
