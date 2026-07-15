import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { RefreshCw, Copy, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { getIntegrationConfig, saveIntegrationConfig, testIntegrationConnection, toggleIntegration } from "../services/integrationsService";
import { BASE_URL } from "../utils/api";
import ConfirmModal from "../components/ConfirmModal";
import ToggleSwitch from "../components/ToggleSwitch";

const emptyForm = {
  keyId: "",
  keySecret: "",
  webhookSecret: "",
  currency: "INR",
  environment: "sandbox",
};

const webhookOrigin = BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
const webhookUrl = `${webhookOrigin}/api/store/payments/webhook`;

export default function RazorpayConfig() {
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
  const [secretsSet, setSecretsSet] = useState({ keySecretIsSet: false, webhookSecretIsSet: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const { data } = await getIntegrationConfig("razorpay");
      const cfg = data.config || {};
      setForm({
        keyId: cfg.keyId || "",
        keySecret: "",
        webhookSecret: "",
        currency: cfg.currency || "INR",
        environment: data.environment || "sandbox",
      });
      setSecretsSet({ keySecretIsSet: Boolean(cfg.keySecretIsSet), webhookSecretIsSet: Boolean(cfg.webhookSecretIsSet) });
      setEnabled(Boolean(data.enabled));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load Razorpay settings");
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
    if (!form.keyId.trim()) {
      toast.error("Key ID is required");
      return;
    }
    if (!secretsSet.keySecretIsSet && !form.keySecret.trim()) {
      toast.error("Key Secret is required");
      return;
    }
    setIsSaving(true);
    try {
      await saveIntegrationConfig("razorpay", form);
      toast.success("Razorpay settings saved");
      await fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save Razorpay settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const data = await testIntegrationConnection("razorpay", form);
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
      await toggleIntegration("razorpay", next);
      setEnabled(next);
      toast.success(`Razorpay ${next ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-sm font-medium text-slate-600">Loading Razorpay settings...</p>
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
          <h1 className="text-2xl font-bold">Razorpay Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Configure the payment gateway used for online checkout.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">{enabled ? "Enabled" : "Disabled"}</span>
          <ToggleSwitch checked={enabled} onChange={handleToggleAttempt} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Key ID</label>
            <input
              type="text"
              value={form.keyId}
              onChange={(e) => handleChange("keyId", e.target.value)}
              placeholder="rzp_test_xxxxxxxxxxxx"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Key Secret</label>
            <input
              type="password"
              value={form.keySecret}
              onChange={(e) => handleChange("keySecret", e.target.value)}
              placeholder={secretsSet.keySecretIsSet ? "•••••••• (unchanged)" : "Enter key secret"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Webhook Secret</label>
            <input
              type="password"
              value={form.webhookSecret}
              onChange={(e) => handleChange("webhookSecret", e.target.value)}
              placeholder={secretsSet.webhookSecretIsSet ? "•••••••• (unchanged)" : "Enter webhook secret"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL</label>
            <div className="flex gap-2">
              <input type="text" value={webhookUrl} readOnly className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
              <button type="button" onClick={handleCopyWebhook} className="shrink-0 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">Paste this into Razorpay Dashboard → Settings → Webhooks. Razorpay does not accept webhook URLs from merchant apps.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <select value={form.currency} onChange={(e) => handleChange("currency", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Environment</label>
            <select value={form.environment} onChange={(e) => handleChange("environment", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
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
        title="Disable Razorpay?"
        message="Disabling Razorpay will fall back the storefront to Cash on Delivery only. Existing paid orders are unaffected."
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
