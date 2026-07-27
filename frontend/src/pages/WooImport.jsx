import { useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { RefreshCw, PlugZap, CheckCircle2, XCircle, AlertTriangle, Users, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import { BASE_URL } from "../utils/api";
import ConfirmModal from "../components/ConfirmModal";

const API = `${BASE_URL}/api/admin/woo-import`;

const PRODUCT_STAT_LABELS = [
  ["categoriesImported", "Categories Created"],
  ["categoriesUpdated", "Categories Updated"],
  ["productsCreated", "Products Created"],
  ["productsUpdated", "Products Updated"],
  ["productsSkipped", "Products Skipped"],
  ["imagesImported", "Images Imported"],
  ["variationsImported", "Variations Imported"],
];

const CUSTOMER_STAT_LABELS = [
  ["customersCreated", "Customers Created"],
  ["customersUpdated", "Customers Updated"],
  ["customersSkippedSpam", "Non-Paying/Spam Skipped"],
  ["customersSkipped", "Errored"],
];

const ORDER_STAT_LABELS = [
  ["ordersCreated", "Orders Created"],
  ["ordersUpdated", "Orders Updated"],
  ["ordersSkipped", "Orders Skipped"],
  ["unresolvedItems", "Unmatched Line Items"],
];

// Shared UI for one "test → sync → report" block. All three WooCommerce
// imports (products, customers, orders) follow the identical request/report
// shape from wooImportController.js, so this is the one place that renders
// the sync button + confirm modal + stat-tile report for all of them.
function SyncSection({
  step,
  title,
  description,
  icon: Icon,
  iconClass,
  buttonClass,
  buttonLabel,
  syncingLabel,
  endpoint,
  statLabels,
  confirmTitle,
  confirmMessage,
  disabled,
  disabledReason,
  onDone,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const handleSync = async () => {
    setConfirmOpen(false);
    setSyncing(true);
    setReport(null);
    setSyncError(null);
    try {
      const { data } = await axios.post(`${API}/${endpoint}`, {}, { timeout: 0 });
      setReport(data.report);
      toast.success("Sync finished");
      onDone?.();
    } catch (err) {
      const data = err.response?.data;
      setSyncError(data?.message || err.message);
      if (data?.report) setReport(data.report);
      toast.error(data?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
            <Icon className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {step}. {title}
            </h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={syncing || disabled}
          title={disabled ? disabledReason : undefined}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60 ${buttonClass}`}
        >
          {syncing ? syncingLabel : buttonLabel}
        </button>
      </div>

      {disabled && disabledReason && (
        <p className="mt-3 text-xs text-amber-700">{disabledReason}</p>
      )}

      {syncError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{syncError}</p>
        </div>
      )}

      {report && (
        <div className="mt-5 pt-5 border-t">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Sync Report</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statLabels.map(([key, label]) => (
              <div key={key} className="rounded-xl bg-slate-50 px-3 py-3">
                <p className="text-xl font-bold text-slate-900">{report[key] ?? 0}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {report.errors?.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                {report.errors.length} item(s) had errors
              </div>
              <ul className="mt-2 max-h-56 overflow-y-auto space-y-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                {report.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel="Start Sync"
        tone="primary"
        onConfirm={handleSync}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default function WooImport() {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();
  const role = (user?.role || "").toLowerCase();

  const [testing, setTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);
  const [customersSynced, setCustomersSynced] = useState(false);

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionResult(null);
    try {
      const { data } = await axios.get(`${API}/test-connection`);
      setConnectionResult(data);
      if (data.success) toast.success("WooCommerce connection successful");
      else toast.error(data.message || "Connection failed");
    } catch (err) {
      const data = err.response?.data;
      setConnectionResult(data || { success: false, message: err.message });
      toast.error(data?.message || "Connection failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WooCommerce Data Migration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Temporary one-time import: pulls products, customers, and orders from WooCommerce into this app's own
          database, unchanged. The website and admin panel always read from this database, never from WooCommerce
          directly — safe to run again, existing rows are matched by WooCommerce ID (or email/SKU as a fallback) and
          updated in place rather than duplicated.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <PlugZap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">1. Test Connection</h2>
              <p className="text-sm text-gray-500">Verify the WooCommerce REST API credentials before importing.</p>
            </div>
          </div>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="rounded-xl bg-[linear-gradient(135deg,#2563eb_0%,#7c3aed_100%)] px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
        </div>

        {connectionResult && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
              connectionResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {connectionResult.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <div>
              <p>{connectionResult.message}</p>
              {connectionResult.totalProducts != null && (
                <p className="text-xs opacity-80 mt-0.5">{connectionResult.totalProducts} products available on WooCommerce</p>
              )}
            </div>
          </div>
        )}
      </div>

      <SyncSection
        step={2}
        title="Sync WooCommerce Products"
        description="Imports all products, categories, images, attributes, and variations. Can take several minutes for a large catalog — do not close this page while it runs."
        icon={RefreshCw}
        iconClass="bg-emerald-50 text-emerald-600"
        buttonClass="bg-emerald-600 hover:bg-emerald-700"
        buttonLabel="Sync WooCommerce Products"
        syncingLabel="Syncing..."
        endpoint="sync-products"
        statLabels={PRODUCT_STAT_LABELS}
        confirmTitle="Sync WooCommerce products?"
        confirmMessage="This imports every product, category, image, and variation from WooCommerce into this database. Existing imported products are updated, not duplicated. This can take several minutes."
      />

      <SyncSection
        step={3}
        title="Sync WooCommerce Customers"
        description="Imports customer accounts (name, email, phone) who have placed at least one real order — WooCommerce marks non-purchasing/bot-registered accounts and they're skipped automatically. Imported accounts get a random password — they set a real one via the normal 'forgot password' flow. Run this before syncing orders."
        icon={Users}
        iconClass="bg-sky-50 text-sky-600"
        buttonClass="bg-sky-600 hover:bg-sky-700"
        buttonLabel="Sync WooCommerce Customers"
        syncingLabel="Syncing..."
        endpoint="sync-customers"
        statLabels={CUSTOMER_STAT_LABELS}
        confirmTitle="Sync WooCommerce customers?"
        confirmMessage="This imports every customer account from WooCommerce into this database, unchanged. Existing imported customers are updated, not duplicated."
        onDone={() => setCustomersSynced(true)}
      />

      <SyncSection
        step={4}
        title="Sync WooCommerce Orders"
        description="Imports order history (items, totals, addresses, status, payment info) as-is. Run Sync Customers first so orders can be linked to the right account — guest orders are imported without a linked account either way."
        icon={ShoppingBag}
        iconClass="bg-amber-50 text-amber-600"
        buttonClass="bg-amber-600 hover:bg-amber-700"
        buttonLabel="Sync WooCommerce Orders"
        syncingLabel="Syncing..."
        endpoint="sync-orders"
        statLabels={ORDER_STAT_LABELS}
        confirmTitle="Sync WooCommerce orders?"
        confirmMessage="This imports every order from WooCommerce into this database, unchanged. Existing imported orders are updated, not duplicated. Run this after Sync Customers so orders link to the right accounts."
        disabled={!customersSynced}
        disabledReason="Run “Sync WooCommerce Customers” first in this session (or it's already been run previously) so orders can be linked to accounts."
      />
    </div>
  );
}
