const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const Role = require("../models/Role");
const { refreshRoleCache, getPermissionsForRole, parsePermissions } = require("../services/rolePermissionService");
const slugify = require("../utils/slugify");

function serializeRole(role) {
  const data = role.toJSON ? role.toJSON() : role;
  return { ...data, permissions: parsePermissions(data.permissions) };
}

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [["is_system", "DESC"], ["name", "ASC"]] });
    res.json(roles.map(serializeRole));
  } catch (err) {
    console.error("GET ROLES ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { display_name, description, permissions } = req.body;
    if (!display_name || !display_name.trim()) return res.status(400).json({ error: "Role name required" });

    const name = slugify(display_name).replace(/-/g, "_");
    if (!name) return res.status(400).json({ error: "Invalid role name" });

    const existing = await Role.findOne({ where: { name } });
    if (existing) return res.status(400).json({ error: "A role with this name already exists" });

    const role = await Role.create({
      name,
      display_name,
      description: description || null,
      permissions: permissions && typeof permissions === "object" ? permissions : {},
      is_system: false,
    });
    await refreshRoleCache();
    res.json({ success: true, role: serializeRole(role) });
  } catch (err) {
    console.error("CREATE ROLE ERROR:", err);
    res.status(500).json({ error: "Failed to create role" });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });
    // The admin role's all-access is a hardcoded invariant, not editable data.
    if (role.name === "admin") return res.status(400).json({ error: "The Administrator role cannot be edited" });

    const { display_name, description, permissions } = req.body;
    await role.update({
      display_name: display_name && display_name.trim() ? display_name : role.display_name,
      description: description !== undefined ? description : role.description,
      permissions: permissions && typeof permissions === "object" ? permissions : parsePermissions(role.permissions),
    });
    await refreshRoleCache();
    res.json({ success: true, role: serializeRole(role) });
  } catch (err) {
    console.error("UPDATE ROLE ERROR:", err);
    res.status(400).json({ error: "Update failed" });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });
    if (role.is_system) return res.status(400).json({ error: "System roles cannot be deleted" });

    const [{ count }] = await sequelize.query(
      "SELECT COUNT(*) as count FROM users WHERE LOWER(TRIM(role)) = :name",
      { replacements: { name: role.name }, type: QueryTypes.SELECT }
    );
    if (Number(count) > 0) {
      return res.status(409).json({ error: `Cannot delete: ${count} user(s) still have this role. Reassign them first.` });
    }

    await role.destroy();
    await refreshRoleCache();
    res.json({ success: true, message: "Role deleted" });
  } catch (err) {
    console.error("DELETE ROLE ERROR:", err);
    res.status(400).json({ error: "Delete failed" });
  }
};

// GET /api/admin/roles/my-permissions — any authenticated admin-panel user;
// lets the frontend adapt navigation to what the user can actually do.
exports.getMyPermissions = async (req, res) => {
  try {
    const users = await sequelize.query(
      "SELECT role FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: req.adminId }, type: QueryTypes.SELECT }
    );
    const roleName = String(users[0]?.role || "").trim().toLowerCase();
    const permissions = roleName === "admin" ? { "*": ["*"] } : getPermissionsForRole(roleName) || {};
    res.json({ role: roleName, permissions });
  } catch (err) {
    console.error("MY PERMISSIONS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};
