const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const { adminGetItems, adminCreateItem, adminUpdateItem, adminDeleteItem } = require("../controllers/menuController");

router.get("/", adminAuth, requirePermission("menus"), adminGetItems);
router.post("/", adminAuth, requirePermission("menus"), adminCreateItem);
router.put("/:id", adminAuth, requirePermission("menus"), adminUpdateItem);
router.delete("/:id", adminAuth, requirePermission("menus"), adminDeleteItem);

module.exports = router;
