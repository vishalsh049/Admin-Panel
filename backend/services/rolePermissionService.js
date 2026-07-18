const Role = require("../models/Role");

// In-memory role→permissions cache, loaded at startup and refreshed on any
// role write (same pattern as integrationConfigService). MySQL JSON columns
// come back as raw strings from this Sequelize setup — parse defensively.
let cache = new Map();

function parsePermissions(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

async function refreshRoleCache() {
  const roles = await Role.findAll();
  const next = new Map();
  for (const role of roles) {
    next.set(String(role.name).trim().toLowerCase(), parsePermissions(role.permissions));
  }
  cache = next;
}

function getPermissionsForRole(roleName) {
  return cache.get(String(roleName || "").trim().toLowerCase()) || null;
}

// permissions shape: { module: [actions] }, "*" wildcard at either level.
function hasPermission(permissions, module, action) {
  if (!permissions) return false;
  const actions = permissions["*"] || permissions[module];
  if (!Array.isArray(actions)) return false;
  return actions.includes("*") || actions.includes(action);
}

module.exports = { refreshRoleCache, getPermissionsForRole, hasPermission, parsePermissions };
