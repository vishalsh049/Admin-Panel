import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { RefreshCw, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { getIntegrationConfig, saveIntegrationConfig, testIntegrationConnection, toggleIntegration } from "../services/integrationsService";
import ConfirmModal from "../components/ConfirmModal";
import ToggleSwitch from "../components/ToggleSwitch";

const emptyForm = { appId: "", appSecret: "" };

export default function FacebookOAuthConfig() {
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
  const [secretsSet, setSecretsSet] = useState({ appSecretIsSet: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const { data } = await getIntegrationConfig("facebook");
      const cfg = data.config || {};
      setForm({ appId: cfg.appId || "", appSecret: "" });
      setSecretsSet({ appSecretIsSet: Boolean(cfg.appSecretIsSet) });
      setEnabled(Boolean(data.enabled));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load Facebook OAuth settings");
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
    if (!form.appId.trim()) {
      toast.error("App ID is required");
      return;
    }
    if (!secretsSet.appSecretIsSet && !form.appSecret.trim()) {
      toast.error("App Secret is required");
      return;
    }
    setIsSaving(true);
    try {
      await saveIntegrationConfig("facebook", form);
      toast.success("Facebook OAuth settings saved");
      await fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save Facebook OAuth settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const data = await testIntegrationConnection("facebook", form);
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
      await toggleIntegration("facebook", next);
      setEnabled(next);
      toast.success(`Facebook sign-in ${next ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-sm font-medium text-slate-600">Loading Facebook OAuth settings...</p>
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
          <h1 className="text-2xl font-bold">Facebook OAuth Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Controls the "Continue with Facebook" button on the storefront login/register pages.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">{enabled ? "Enabled" : "Disabled"}</span>
          <ToggleSwitch checked={enabled} onChange={handleToggleAttempt} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">App ID</label>
            <input
              type="text"
              value={form.appId}
              onChange={(e) => handleChange("appId", e.target.value)}
              placeholder="e.g. 1234567890123456"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">App Secret</label>
            <input
              type="password"
              value={form.appSecret}
              onChange={(e) => handleChange("appSecret", e.target.value)}
              placeholder={secretsSet.appSecretIsSet ? "•••••••• (unchanged)" : "Enter app secret"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          From Meta for Developers → your app → Settings → Basic. Add the storefront's domains under "App Domains" and enable
          Facebook Login → Settings → "Valid OAuth Redirect URIs" for your production domain and localhost:5173 for local dev.
        </p>

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
        title="Disable Facebook sign-in?"
        message="Disabling Facebook OAuth immediately hides the &quot;Continue with Facebook&quot; button on the storefront. Existing customers who signed up via Facebook are unaffected and can still reset a password to sign in normally."
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
