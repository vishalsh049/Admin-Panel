import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CreditCard, Truck, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getIntegrations, toggleIntegration } from "../services/integrationsService";
import ToggleSwitch from "../components/ToggleSwitch";

const STATUS_BADGES = {
  connected: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  untested: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS = {
  connected: "Connected",
  failed: "Connection Failed",
  untested: "Not Tested",
};

const PROVIDER_META = {
  razorpay: { label: "Razorpay", description: "Online payment gateway for the storefront checkout.", icon: CreditCard, configurePath: "/settings/integrations/razorpay" },
  fship: { label: "FShip", description: "Courier aggregator for order shipment and tracking.", icon: Truck, configurePath: "/settings/integrations/fship" },
};

function formatDate(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function Integrations() {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();
  const role = (user?.role || "admin").toLowerCase();

  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingCode, setTogglingCode] = useState(null);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const data = await getIntegrations();
      setIntegrations(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load integrations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") fetchIntegrations();
  }, [role]);

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const handleToggle = async (providerCode, nextEnabled) => {
    setTogglingCode(providerCode);
    try {
      await toggleIntegration(providerCode, nextEnabled);
      toast.success(`${PROVIDER_META[providerCode]?.label || providerCode} ${nextEnabled ? "enabled" : "disabled"}`);
      await fetchIntegrations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update integration status");
    } finally {
      setTogglingCode(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Manage payment and shipping provider credentials for the store.</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-medium text-slate-600">Loading integrations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => {
            const meta = PROVIDER_META[integration.providerCode] || {};
            const Icon = meta.icon || CreditCard;
            const statusKey = integration.connectionStatus || "untested";

            return (
              <div key={integration.providerCode} className="bg-white rounded-xl shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{meta.label || integration.providerName}</h2>
                      <p className="text-sm text-gray-500">{meta.description}</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={integration.enabled}
                    disabled={togglingCode === integration.providerCode}
                    onChange={(next) => handleToggle(integration.providerCode, next)}
                  />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[statusKey] || STATUS_BADGES.untested}`}>
                    {STATUS_LABELS[statusKey] || statusKey}
                  </span>
                  <span className="text-xs text-gray-400">{integration.enabled ? "Enabled" : "Disabled"}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Last Tested</p>
                    <p className="font-medium">{formatDate(integration.lastTestedAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Environment</p>
                    <p className="font-medium capitalize">{integration.environment}</p>
                  </div>
                </div>

                {integration.lastError && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="truncate">{integration.lastError}</p>
                  </div>
                )}

                <div className="mt-5 pt-4 border-t">
                  <Link
                    to={meta.configurePath}
                    className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2563eb_0%,#7c3aed_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(59,130,246,0.28)] transition duration-200 hover:-translate-y-0.5"
                  >
                    Configure
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
