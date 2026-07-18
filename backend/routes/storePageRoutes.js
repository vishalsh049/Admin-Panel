const express = require("express");
const router = express.Router();
const { publicGetPageBySlug } = require("../controllers/pageController");

// Public, unauthenticated — mounted at /api/store/pages in server.js.
router.get("/:slug", publicGetPageBySlug);

module.exports = router;
