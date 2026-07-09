const express = require("express");
const multer = require("multer");
const adminAuth = require("../middleware/adminAuth");
const productUpload = require("../middleware/productUpload");
const ctrl = require("../controllers/productController");

const router = express.Router();
const importUpload = multer({ dest: "uploads/" });

// ---- List / detail / stats ----
router.get("/", adminAuth, ctrl.getProducts);
router.get("/stats", adminAuth, ctrl.getProductStats);
router.get("/export", adminAuth, ctrl.exportProducts);
router.get("/:id", adminAuth, ctrl.getProduct);

// ---- CRUD ----
router.post("/", adminAuth, ctrl.createProduct);
router.put("/:id", adminAuth, ctrl.updateProduct);
router.delete("/:id", adminAuth, ctrl.deleteProduct);
router.post("/bulk-delete", adminAuth, ctrl.bulkDeleteProducts);

// ---- Import ----
router.post("/import", adminAuth, importUpload.single("file"), ctrl.importProducts);

// ---- Images ----
router.post("/upload-image", adminAuth, ...productUpload.single("image"), ctrl.uploadPrimaryImage);
router.post("/:id/images", adminAuth, ...productUpload.array("images", 8), ctrl.addImages);
router.delete("/:id/images/:imageId", adminAuth, ctrl.deleteImage);
router.patch("/:id/images/:imageId/primary", adminAuth, ctrl.setPrimaryImage);
router.patch("/:id/images/reorder", adminAuth, ctrl.reorderImages);

// ---- Attributes ----
router.get("/:id/attributes", adminAuth, ctrl.getAttributes);
router.put("/:id/attributes", adminAuth, ctrl.saveAttributes);

// ---- Variations ----
router.get("/:id/variations", adminAuth, ctrl.getVariations);
router.post("/:id/variations/generate", adminAuth, ctrl.generateVariations);
router.post("/:id/variations", adminAuth, ctrl.createVariation);
router.put("/:id/variations/:variationId", adminAuth, ctrl.updateVariation);
router.delete("/:id/variations/:variationId", adminAuth, ctrl.deleteVariation);

module.exports = router;
