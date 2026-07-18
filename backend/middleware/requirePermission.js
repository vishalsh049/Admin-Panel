const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const { getPermissionsForRole, hasPermission } = require("../services/rolePermissionService");

const ACTION_BY_METHOD = { GET: "view", POST: "add", PUT: "edit", PATCH: "edit", DELETE: "delete" };

// Factory: requirePermission("blog") — must run after adminAuth. Infers the
// action from the HTTP method (view/add/edit/delete). Users with role
// "admin" always pass (hardcoded bypass, independent of the roles table, so
// a bad roles edit can never lock every administrator out).
module.exports = function requirePermission(module) {
  return async function permissionCheck(req, res, next) {
    try {
      const users = await sequelize.query(
        "SELECT id, name, email, role FROM users WHERE id = :id LIMIT 1",
        { replacements: { id: req.adminId }, type: QueryTypes.SELECT }
      );
      const user = users[0];
      if (!user) return res.status(401).json({ success: false, message: "Not authorized" });
      req.currentUser = user;

      const roleName = String(user.role || "").trim().toLowerCase();
      if (roleName === "admin") return next();

      const action = ACTION_BY_METHOD[req.method] || "view";
      if (hasPermission(getPermissionsForRole(roleName), module, action)) return next();

      return res.status(403).json({
        success: false,
        message: `Your role does not allow "${action}" on ${module}. Contact an administrator.`,
      });
    } catch (err) {
      console.error("requirePermission ERROR:", err.message);
      res.status(500).json({ success: false, message: "Authorization check failed" });
    }
  };
};
