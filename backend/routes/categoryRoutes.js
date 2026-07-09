const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
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
router.post("/", adminAuth, addCategory);
router.put("/:id", adminAuth, updateCategory);
router.delete("/:id", adminAuth, deleteCategory);
router.post("/bulk-delete", adminAuth, bulkDeleteCategories);
router.post("/upload-image", adminAuth, ...categoryUpload.single("image"), uploadCategoryImage);

module.exports = router;
