import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { getRoles, createRole, updateRole, deleteRole } from "../services/roleService";
import ConfirmModal from "../components/ConfirmModal";

// Module keys must match what the backend's requirePermission() calls use.
const MODULES = [
  ["blog", "Blog"],
  ["pages", "Pages"],
  ["media", "Media Library"],
  ["menus", "Menus"],
  ["banners", "Banners"],
  ["testimonials", "Testimonials"],
  ["settings", "Site Settings"],
  ["products", "Products"],
  ["categories", "Categories"],
  ["orders", "Orders"],
  ["customers", "Customers"],
  ["payments", "Payments"],
  ["contact_messages", "Contact Messages"],
  ["sale_bills", "Sale Bills"],
  ["vendors", "Vendors"],
  ["purchase_bills", "Purchase Bills"],
  ["inventory", "Inventory"],
  ["expenses", "Expenses"],
  ["expense_bills", "Expense Bills"],
  ["reports", "Reports"],
];

const ACTIONS = ["view", "add", "edit", "delete"];

function permissionsToMatrix(permissions) {
  const matrix = {};
  for (const [module] of MODULES) {
    const actions = permissions?.["*"] || permissions?.[module] || [];
    matrix[module] = Object.fromEntries(
      ACTIONS.map((a) => [a, actions.includes("*") || actions.includes(a)])
    );
  }
  return matrix;
}

function matrixToPermissions(matrix) {
  const permissions = {};
  for (const [module] of MODULES) {
    const granted = ACTIONS.filter((a) => matrix[module]?.[a]);
    if (granted.length === ACTIONS.length) permissions[module] = ["*"];
    else if (granted.length > 0) permissions[module] = granted;
  }
  return permissions;
}

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id?, display_name, description, matrix }
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setRoles(await getRoles());
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditing({ display_name: "", description: "", matrix: permissionsToMatrix({}) });
  }

  function startEdit(role) {
    setEditing({
      id: role.id,
      name: role.name,
      display_name: role.display_name,
      description: role.description || "",
      matrix: permissionsToMatrix(role.permissions),
    });
  }

  function toggleCell(module, action) {
    setEditing((e) => ({
      ...e,
      matrix: { ...e.matrix, [module]: { ...e.matrix[module], [action]: !e.matrix[module][action] } },
    }));
  }

  function toggleRow(module) {
    setEditing((e) => {
      const allOn = ACTIONS.every((a) => e.matrix[module][a]);
      return {
        ...e,
        matrix: { ...e.matrix, [module]: Object.fromEntries(ACTIONS.map((a) => [a, !allOn])) },
      };
    });
  }

  async function handleSave() {
    if (!editing.display_name.trim()) return toast.error("Role name required");
    setIsSaving(true);
    try {
      const payload = {
        display_name: editing.display_name,
        description: editing.description,
        permissions: matrixToPermissions(editing.matrix),
      };
      if (editing.id) {
        await updateRole(editing.id, payload);
        toast.success("Role updated");
      } else {
        await createRole(payload);
        toast.success("Role created");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    setIsBusy(true);
    try {
      await deleteRole(pendingDelete.id);
      toast.success("Role deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setIsBusy(false);
    }
  }

  function summarize(role) {
    if (role.permissions?.["*"]) return "Full access to every module";
    const mods = Object.keys(role.permissions || {});
    if (mods.length === 0) return "No module access";
    return mods
      .map((m) => MODULES.find(([key]) => key === m)?.[1] || m)
      .slice(0, 5)
      .join(", ") + (mods.length > 5 ? ` +${mods.length - 5} more` : "");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Roles & Permissions</h1>
          <p className="text-sm text-slate-500">
            Control which modules each role can view, add, edit or delete. Assign roles to users on the Users page.
          </p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
          <Plus className="h-4 w-4" /> New Role
        </button>
      </div>

      {editing ? (
        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Role name</label>
              <input
                value={editing.display_name}
                onChange={(e) => setEditing((s) => ({ ...s, display_name: e.target.value }))}
                disabled={!!editing.id}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
              <input
                value={editing.description}
                onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Module (click to toggle all)</th>
                  {ACTIONS.map((a) => <th key={a} className="px-3 py-2.5 text-center capitalize">{a}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MODULES.map(([module, label]) => (
                  <tr key={module} className="hover:bg-indigo-50/40">
                    <td className="cursor-pointer px-4 py-2 font-medium text-slate-700" onClick={() => toggleRow(module)}>{label}</td>
                    {ACTIONS.map((action) => (
                      <td key={action} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={editing.matrix[module][action]}
                          onChange={() => toggleCell(module, action)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={isSaving} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60">
              {isSaving ? "Saving…" : "Save Role"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {loading ? (
            <p className="col-span-full rounded-2xl border border-gray-100 bg-white py-10 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${role.name === "admin" ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-500"}`}>
                      {role.name === "admin" ? <ShieldCheck className="h-4.5 w-4.5" /> : <Lock className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {role.display_name}
                        {role.is_system && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">System</span>}
                      </p>
                      <p className="text-xs text-slate-500">{role.description || summarize(role)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {role.name !== "admin" && (
                      <button onClick={() => startEdit(role)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                    )}
                    {!role.is_system && (
                      <button onClick={() => setPendingDelete(role)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">{summarize(role)}</p>
              </div>
            ))
          )}
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this role?"
        message="Roles still assigned to users cannot be deleted."
        confirmLabel="Delete"
        tone="danger"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
