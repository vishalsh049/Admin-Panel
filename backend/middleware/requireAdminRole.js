const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");

// Restricts a route to users with role "admin" (the existing top-level
// role — this codebase has no separate "Super Admin" role). Must run after
// adminAuth (needs req.adminId). Also resolves req.currentUser so callers
// have a real name/email for audit-log attribution — adminAuth's
// req.adminEmail is normally null since the login JWT only carries { id }.
module.exports = async function requireAdminRole(req, res, next) {
  try {
    const users = await sequelize.query(
      "SELECT id, name, email, role FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: req.adminId }, type: QueryTypes.SELECT }
    );
    const user = users[0];
    if (!user || String(user.role || "").trim().toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, message: "Admin role required" });
    }
    req.currentUser = user;
    next();
  } catch (err) {
    console.error("requireAdminRole ERROR:", err.message);
    res.status(500).json({ success: false, message: "Authorization check failed" });
  }
};
