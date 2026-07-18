const express = require("express");
const multer = require("multer");
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const productUpload = require("../middleware/productUpload");
const ctrl = require("../controllers/productController");

const router = express.Router();
const IMPORT_MIME_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const importUpload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!IMPORT_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only CSV or Excel (.xlsx/.xls) files are allowed"));
    }
    cb(null, true);
  },
});

// ---- List / detail / stats ----
router.get("/", adminAuth, requirePermission("products"), ctrl.getProducts);
router.get("/stats", adminAuth, requirePermission("products"), ctrl.getProductStats);
router.get("/export", adminAuth, requirePermission("products"), ctrl.exportProducts);
router.get("/:id", adminAuth, requirePermission("products"), ctrl.getProduct);

// ---- CRUD ----
router.post("/", adminAuth, requirePermission("products"), ctrl.createProduct);
router.put("/:id", adminAuth, requirePermission("products"), ctrl.updateProduct);
router.delete("/:id", adminAuth, requirePermission("products"), ctrl.deleteProduct);
router.post("/bulk-delete", adminAuth, requirePermission("products"), ctrl.bulkDeleteProducts);

// ---- Import ----
router.post("/import", adminAuth, requirePermission("products"), importUpload.single("file"), ctrl.importProducts);

// ---- Images ----
router.post("/upload-image", adminAuth, requirePermission("products"), ...productUpload.single("image"), ctrl.uploadPrimaryImage);
router.post("/:id/images", adminAuth, requirePermission("products"), ...productUpload.array("images", 8), ctrl.addImages);
router.delete("/:id/images/:imageId", adminAuth, requirePermission("products"), ctrl.deleteImage);
router.patch("/:id/images/:imageId/primary", adminAuth, requirePermission("products"), ctrl.setPrimaryImage);
router.patch("/:id/images/reorder", adminAuth, requirePermission("products"), ctrl.reorderImages);

// ---- Attributes ----
router.get("/:id/attributes", adminAuth, requirePermission("products"), ctrl.getAttributes);
router.put("/:id/attributes", adminAuth, requirePermission("products"), ctrl.saveAttributes);

// ---- Variations ----
router.get("/:id/variations", adminAuth, requirePermission("products"), ctrl.getVariations);
router.post("/:id/variations/generate", adminAuth, requirePermission("products"), ctrl.generateVariations);
router.post("/:id/variations", adminAuth, requirePermission("products"), ctrl.createVariation);
router.put("/:id/variations/:variationId", adminAuth, requirePermission("products"), ctrl.updateVariation);
router.delete("/:id/variations/:variationId", adminAuth, requirePermission("products"), ctrl.deleteVariation);

module.exports = router;
