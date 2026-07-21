import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/api";
import ConfirmModal from "./ConfirmModal";

const STATUS_LABELS = {
  not_created: "Not Created",
  pending: "Pending (creation failed — retry)",
  created: "Shipment Created",
  pickup_registered: "Pickup Registered",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  not_created: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  created: "bg-blue-100 text-blue-700",
  pickup_registered: "bg-indigo-100 text-indigo-700",
  cancelled: "bg-red-100 text-red-700",
};

// Admin shipping panel for one order: shipment lifecycle actions against the
// backend /api/shipping routes (which proxy FShip — credentials stay server-side).
export default function OrderShippingSection({ orderId }) {
  const [shipping, setShipping] = useState(null);
  const [scans, setScans] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null); // { type: "success"|"error", text }
  const [confirmCancel, setConfirmCancel] = useState(false);

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const loadShipping = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/shipping/orders/${orderId}`, authHeaders());
      setShipping(res.data.shipping);
    } catch (err) {
      console.error("Load shipping info error:", err);
    }
  }, [orderId]);

  useEffect(() => {
    loadShipping();
  }, [loadShipping]);

  const runAction = async (name, request, successText) => {
    setBusy(name);
    setMessage(null);
    try {
      const res = await request();
      if (res.data.shipping) setShipping(res.data.shipping);
      setMessage({ type: "success", text: res.data.message || successText });
      return res.data;
    } catch (err) {
      const text = err.response?.data?.message || `${successText} failed`;
      if (err.response?.data?.shipping) setShipping(err.response.data.shipping);
      setMessage({ type: "error", text });
      return null;
    } finally {
      setBusy("");
    }
  };

  const createShipment = () =>
    runAction("create", () => axios.post(`${BASE_URL}/api/shipping/orders/${orderId}/create`, {}, authHeaders()), "Shipment created");

  const registerPickup = () =>
    runAction("pickup", () => axios.post(`${BASE_URL}/api/shipping/orders/${orderId}/pickup`, {}, authHeaders()), "Pickup registered");

  const generateLabel = () =>
    runAction("label", () => axios.post(`${BASE_URL}/api/shipping/orders/${orderId}/label`, {}, authHeaders()), "Documents generated");

  const refreshTracking = () =>
    runAction("refresh", () => axios.post(`${BASE_URL}/api/shipping/orders/${orderId}/refresh-tracking`, {}, authHeaders()), "Tracking refreshed");

  const cancelShipment = () =>
    runAction("cancel", () => axios.post(`${BASE_URL}/api/shipping/orders/${orderId}/cancel`, {}, authHeaders()), "Shipment cancelled");

  const loadTimeline = async () => {
    const data = await runAction("timeline", () => axios.get(`${BASE_URL}/api/shipping/orders/${orderId}/tracking`, authHeaders()), "Timeline loaded");
    if (data) setScans(data.trackingData || []);
  };

  if (!shipping) {
    return (
      <div className="bg-white p-6 rounded-xl shadow mb-4 dark:bg-slate-900 dark:shadow-none dark:border dark:border-slate-800">
        <h3 className="text-lg font-semibold mb-2 dark:text-slate-100">Shipping</h3>
        <p className="text-gray-500 dark:text-slate-400">Loading shipping details...</p>
      </div>
    );
  }

  const hasAwb = Boolean(shipping.awb);
  const canCreate = !hasAwb || shipping.shippingStatus === "cancelled";
  const btn = (extra) =>
    `px-3 py-2 rounded text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed ${extra}`;

  return (
    <div className="bg-white p-6 rounded-xl shadow mb-4 dark:bg-slate-900 dark:shadow-none dark:border dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold dark:text-slate-100">Shipping (FShip)</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[shipping.shippingStatus] || STATUS_COLORS.not_created}`}>
          {STATUS_LABELS[shipping.shippingStatus] || shipping.shippingStatus}
        </span>
      </div>

      {message && (
        <p className={`mb-3 text-sm rounded px-3 py-2 ${message.type === "error" ? "bg-red-50 text-red-700 dark:bg-rose-500/10 dark:text-rose-300" : "bg-green-50 text-green-700 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>
          {message.text}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-8 text-sm mb-4 dark:text-slate-300">
        <div><p className="font-semibold dark:text-slate-100">Courier:</p><p>{shipping.courierName || "—"}</p></div>
        <div><p className="font-semibold dark:text-slate-100">AWB Number:</p><p>{shipping.awb || "—"}</p></div>
        <div><p className="font-semibold dark:text-slate-100">Route Code:</p><p>{shipping.routeCode || "—"}</p></div>
        <div><p className="font-semibold dark:text-slate-100">FShip Order ID:</p><p>{shipping.fshipOrderId || "—"}</p></div>
        <div><p className="font-semibold dark:text-slate-100">Pickup Order ID:</p><p>{shipping.fshipPickupId || "—"}</p></div>
        <div><p className="font-semibold dark:text-slate-100">Last Scan:</p><p>{shipping.lastScanAt ? new Date(shipping.lastScanAt).toLocaleString() : "—"}</p></div>
        <div><p className="font-semibold dark:text-slate-100">Tracking Status:</p><p>{shipping.trackingStatus || "—"}</p></div>
        <div><p className="font-semibold dark:text-slate-100">Location:</p><p>{shipping.trackingLocation || "—"}</p></div>
        <div><p className="font-semibold dark:text-slate-100">Remark:</p><p>{shipping.trackingRemark || "—"}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {canCreate && (
          <button onClick={createShipment} disabled={!!busy} className={btn("bg-blue-600 hover:bg-blue-700")}>
            {busy === "create" ? "Creating..." : "Create Shipment"}
          </button>
        )}
        {hasAwb && !shipping.fshipPickupId && shipping.shippingStatus !== "cancelled" && (
          <button onClick={registerPickup} disabled={!!busy} className={btn("bg-indigo-600 hover:bg-indigo-700")}>
            {busy === "pickup" ? "Registering..." : "Register Pickup"}
          </button>
        )}
        {shipping.fshipPickupId && (
          <button onClick={generateLabel} disabled={!!busy} className={btn("bg-teal-600 hover:bg-teal-700")}>
            {busy === "label" ? "Generating..." : "Generate Label"}
          </button>
        )}
        {shipping.labelUrl && (
          <a href={shipping.labelUrl} target="_blank" rel="noreferrer" className={btn("bg-slate-600 hover:bg-slate-700 inline-block")}>
            Download Label
          </a>
        )}
        {shipping.manifestUrl && (
          <a href={shipping.manifestUrl} target="_blank" rel="noreferrer" className={btn("bg-slate-600 hover:bg-slate-700 inline-block")}>
            Download Manifest
          </a>
        )}
        {shipping.invoiceUrl && (
          <a href={shipping.invoiceUrl} target="_blank" rel="noreferrer" className={btn("bg-slate-600 hover:bg-slate-700 inline-block")}>
            Download Invoice
          </a>
        )}
        {hasAwb && (
          <button onClick={refreshTracking} disabled={!!busy} className={btn("bg-emerald-600 hover:bg-emerald-700")}>
            {busy === "refresh" ? "Refreshing..." : "Refresh Tracking"}
          </button>
        )}
        {hasAwb && (
          <button onClick={loadTimeline} disabled={!!busy} className={btn("bg-gray-500 hover:bg-gray-600")}>
            {busy === "timeline" ? "Loading..." : "View Timeline"}
          </button>
        )}
        {hasAwb && shipping.shippingStatus !== "cancelled" && (
          <button onClick={() => setConfirmCancel(true)} disabled={!!busy} className={btn("bg-red-600 hover:bg-red-700")}>
            {busy === "cancel" ? "Cancelling..." : "Cancel Shipment"}
          </button>
        )}
      </div>

      {scans && (
        <div className="mt-5">
          <h4 className="font-semibold mb-2 dark:text-slate-100">Tracking Timeline</h4>
          {scans.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">No scans available yet.</p>
          ) : (
            <ol className="relative border-l border-gray-200 dark:border-slate-700 ml-2 space-y-4">
              {scans.map((scan, idx) => (
                <li key={idx} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-500" />
                  <p className="text-sm font-semibold dark:text-slate-100">{scan.Status}</p>
                  <p className="text-xs text-gray-600 dark:text-slate-400">{scan.Remark}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-500">
                    {scan.Location} · {scan.DateandTime}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmCancel}
        title="Cancel this shipment?"
        confirmLabel="Cancel Shipment"
        isBusy={busy === "cancel"}
        message="This cancels the shipment with the courier. The order itself stays open and can be re-shipped."
        onConfirm={() => { setConfirmCancel(false); cancelShipment(); }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
