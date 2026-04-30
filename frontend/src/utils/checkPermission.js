import { rolePermissions } from "./permissions";

export const canAccess = (page) => {

  const role = localStorage.getItem("userRole");

  if (!role) return false;

  return rolePermissions[role]?.includes(page);

};