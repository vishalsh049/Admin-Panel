const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const categoryUpload = require("../middleware/categoryUpload");

const {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  bulkDeleteCategories,
  uploadCategoryImage,
} = require("../controllers/categoryController");

router.get("/", getCategories);
router.post("/", adminAuth, requirePermission("categories"), addCategory);
router.put("/:id", adminAuth, requirePermission("categories"), updateCategory);
router.delete("/:id", adminAuth, requirePermission("categories"), deleteCategory);
router.post("/bulk-delete", adminAuth, requirePermission("categories"), bulkDeleteCategories);
router.post("/upload-image", adminAuth, requirePermission("categories"), ...categoryUpload.single("image"), uploadCategoryImage);

module.exports = router;
