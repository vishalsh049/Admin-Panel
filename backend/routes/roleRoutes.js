const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const requireAdminRole = require("../middleware/requireAdminRole");
const { getRoles, createRole, updateRole, deleteRole, getMyPermissions } = require("../controllers/roleController");

// Any authenticated panel user may ask what they're allowed to do.
router.get("/my-permissions", adminAuth, getMyPermissions);

// Managing roles is restricted to full administrators.
router.use(adminAuth, requireAdminRole);
router.get("/", getRoles);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

module.exports = router;
