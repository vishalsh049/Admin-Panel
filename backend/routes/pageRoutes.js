const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const {
  adminGetPages,
  adminGetPage,
  adminCreatePage,
  adminUpdatePage,
  adminDeletePage,
} = require("../controllers/pageController");

router.use(adminAuth, requirePermission("pages"));

router.get("/", adminGetPages);
router.get("/:id", adminGetPage);
router.post("/", adminCreatePage);
router.put("/:id", adminUpdatePage);
router.delete("/:id", adminDeletePage);

module.exports = router;
