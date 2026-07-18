const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requirePermission = require("../middleware/requirePermission");
const mediaUpload = require("../middleware/mediaUpload");
const {
  listMedia,
  uploadMedia,
  updateMediaMeta,
  deleteMedia,
} = require("../controllers/mediaController");

// Media Library is an admin-only tool — no public listing needed.
router.get("/", adminAuth, requirePermission("media"), listMedia);
router.post("/upload", adminAuth, requirePermission("media"), ...mediaUpload.single("file"), uploadMedia);
router.put("/:id", adminAuth, requirePermission("media"), updateMediaMeta);
router.delete("/:id", adminAuth, requirePermission("media"), deleteMedia);

module.exports = router;
