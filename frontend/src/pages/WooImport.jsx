import { useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { RefreshCw, PlugZap, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { BASE_URL } from "../utils/api";
import ConfirmModal from "../components/ConfirmModal";

const API = `${BASE_URL}/api/admin/woo-import`;

const STAT_LABELS = [
  ["categoriesImported", "Categories Created"],
  ["categoriesUpdated", "Categories Updated"],
  ["productsCreated", "Products Created"],
  ["productsUpdated", "Products Updated"],
  ["productsSkipped", "Products Skipped"],
  ["imagesImported", "Images Imported"],
  ["variationsImported", "Variations Imported"],
];

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState(null);
  const [syncError, setSyncError] = useState(null);

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

  const handleSync = async () => {
    setConfirmOpen(false);
    setSyncing(true);
    setReport(null);
    setSyncError(null);
    try {
      const { data } = await axios.post(`${API}/sync-products`, {}, { timeout: 0 });
      setReport(data.report);
      toast.success("Sync finished");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WooCommerce Product Migration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Temporary one-time import: pulls products, categories, images, and variations from WooCommerce into this
          app's own database. The website and admin panel always read from this database, never from WooCommerce
          directly — safe to run again, existing products are matched by WooCommerce ID or SKU and updated in place
          rather than duplicated.
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

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">2. Sync WooCommerce Products</h2>
              <p className="text-sm text-gray-500">
                Imports all products, categories, images, attributes, and variations. Can take several minutes for a
                large catalog — do not close this page while it runs.
              </p>
            </div>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={syncing}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Sync WooCommerce Products"}
          </button>
        </div>

        {syncError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{syncError}</p>
          </div>
        )}

        {report && (
          <div className="mt-5 pt-5 border-t">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Migration Report</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STAT_LABELS.map(([key, label]) => (
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
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Sync WooCommerce products?"
        message="This imports every product, category, image, and variation from WooCommerce into this database. Existing imported products are updated, not duplicated. This can take several minutes."
        confirmLabel="Start Sync"
        tone="primary"
        onConfirm={handleSync}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
