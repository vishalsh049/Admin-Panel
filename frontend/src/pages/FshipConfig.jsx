import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { RefreshCw, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import {
  getIntegrationConfig,
  saveIntegrationConfig,
  testIntegrationConnection,
  toggleIntegration,
} from "../services/integrationsService";
import ConfirmModal from "../components/ConfirmModal";
import ToggleSwitch from "../components/ToggleSwitch";

const emptyForm = {
  apiUrl: "",
  clientId: "",
  clientSecret: "",
  username: "",
  password: "",
  pickupAddressId: "",
  defaultWeight: 1,
  defaultLength: 10,
  defaultWidth: 10,
  defaultHeight: 10,
  defaultCourierId: "",
  environment: "production",
};

export default function FshipConfig() {
  const navigate = useNavigate();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();
  const role = (user?.role || "admin").toLowerCase();

  const [form, setForm] = useState(emptyForm);
  const [enabled, setEnabled] = useState(false);
  const [secretsSet, setSecretsSet] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const { data } = await getIntegrationConfig("fship");
      const cfg = data.config || {};
      setForm({
        apiUrl: cfg.apiUrl || "",
        clientId: "",
        clientSecret: "",
        username: "",
        password: "",
        pickupAddressId: cfg.pickupAddressId ?? "",
        defaultWeight: cfg.defaultWeight ?? 1,
        defaultLength: cfg.defaultLength ?? 10,
        defaultWidth: cfg.defaultWidth ?? 10,
        defaultHeight: cfg.defaultHeight ?? 10,
        defaultCourierId: cfg.defaultCourierId ?? "",
        environment: data.environment || "production",
      });
      setSecretsSet({
        clientIdIsSet: Boolean(cfg.clientIdIsSet),
        clientSecretIsSet: Boolean(cfg.clientSecretIsSet),
        usernameIsSet: Boolean(cfg.usernameIsSet),
        passwordIsSet: Boolean(cfg.passwordIsSet),
      });
      setEnabled(Boolean(data.enabled));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load FShip settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.apiUrl.trim()) {
      toast.error("API URL is required");
      return;
    }
    if (!secretsSet.clientSecretIsSet && !form.clientSecret.trim()) {
      toast.error("Client Secret is required");
      return;
    }
    if (!form.pickupAddressId) {
      toast.error("Pickup Location (address id) is required");
      return;
    }
    setIsSaving(true);
    try {
      await saveIntegrationConfig("fship", form);
      toast.success("FShip settings saved");
      await fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save FShip settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const data = await testIntegrationConnection("fship", form);
      if (data.success) {
        toast.success(data.message || "Connection successful");
      } else {
        toast.error(data.message || "Connection failed");
      }
      await fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to run connection test");
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleAttempt = (next) => {
    if (!next) {
      setConfirmDisable(true);
      return;
    }
    void doToggle(true);
  };

  const doToggle = async (next) => {
    try {
      await toggleIntegration("fship", next);
      setEnabled(next);
      toast.success(`FShip ${next ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-sm font-medium text-slate-600">Loading FShip settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/settings/integrations")} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Integrations
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FShip Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Configure the courier aggregator used for order shipment and tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">{enabled ? "Enabled" : "Disabled"}</span>
          <ToggleSwitch checked={enabled} onChange={handleToggleAttempt} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API URL</label>
            <input
              type="text"
              value={form.apiUrl}
              onChange={(e) => handleChange("apiUrl", e.target.value)}
              placeholder="https://capi.fship.in"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Environment</label>
            <select value={form.environment} onChange={(e) => handleChange("environment", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client ID</label>
            <input
              type="text"
              value={form.clientId}
              onChange={(e) => handleChange("clientId", e.target.value)}
              placeholder={secretsSet.clientIdIsSet ? "•••••••• (unchanged)" : "Not used by current FShip API"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client Secret</label>
            <input
              type="password"
              value={form.clientSecret}
              onChange={(e) => handleChange("clientSecret", e.target.value)}
              placeholder={secretsSet.clientSecretIsSet ? "•••••••• (unchanged)" : "Enter client secret / signature"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value)}
              placeholder={secretsSet.usernameIsSet ? "•••••••• (unchanged)" : "Not used by current FShip API"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder={secretsSet.passwordIsSet ? "•••••••• (unchanged)" : "Not used by current FShip API"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <p className="md:col-span-2 -mt-3 text-xs text-gray-400">
            Client ID, Username, and Password are reserved for a future FShip authentication mode — the current FShip API only checks Client Secret.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Location (Address ID)</label>
            <input
              type="number"
              value={form.pickupAddressId}
              onChange={(e) => handleChange("pickupAddressId", e.target.value)}
              placeholder="From FShip Dashboard → Manage Warehouse"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Courier</label>
            <input
              type="number"
              value={form.defaultCourierId}
              onChange={(e) => handleChange("defaultCourierId", e.target.value)}
              placeholder="0 = let FShip choose"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Weight (kg)</label>
            <input type="number" min="0.1" step="0.1" value={form.defaultWeight} onChange={(e) => handleChange("defaultWeight", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Length (cm)</label>
            <input type="number" min="1" value={form.defaultLength} onChange={(e) => handleChange("defaultLength", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Width (cm)</label>
            <input type="number" min="1" value={form.defaultWidth} onChange={(e) => handleChange("defaultWidth", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Height (cm)</label>
            <input type="number" min="1" value={form.defaultHeight} onChange={(e) => handleChange("defaultHeight", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#7c3aed_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(59,130,246,0.28)] transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={() => navigate("/settings/integrations")} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isTesting ? "animate-spin" : ""}`} />
            {isTesting ? "Testing..." : "Test Connection"}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmDisable}
        title="Disable FShip?"
        message="Disabling FShip will stop new shipments from being created automatically for future orders. Existing shipments are unaffected."
        confirmLabel="Disable"
        tone="danger"
        onConfirm={() => {
          setConfirmDisable(false);
          void doToggle(false);
        }}
        onCancel={() => setConfirmDisable(false)}
      />
    </div>
  );
}
