import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft, Copy, PauseCircle, PlayCircle, Printer, XCircle,
} from "lucide-react";
import OrderShippingSection from "../components/OrderShippingSection";
import OrderPaymentSection from "../components/OrderPaymentSection";
import OrderTimeline from "../components/orders/OrderTimeline";
import OrderNotesPanel from "../components/orders/OrderNotesPanel";
import OrderTagsPanel from "../components/orders/OrderTagsPanel";
import StaffAssignmentPanel from "../components/orders/StaffAssignmentPanel";
import OrderRequestsPanel from "../components/orders/OrderRequestsPanel";
import OrderRefundsPanel from "../components/orders/OrderRefundsPanel";
import ConfirmModal from "../components/ConfirmModal";
import {
  duplicateOrder, fetchOrder, holdOrder, updateOrderStatus,
} from "../services/orderService";
import { statusInfo } from "./orders/constants";
import { useMemo, useState } from "react";

const card = "bg-white p-6 rounded-xl shadow dark:bg-slate-900 dark:shadow-none dark:border dark:border-slate-800";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(null);
  const isReadOnly = useMemo(() => {
    try { return (JSON.parse(localStorage.getItem("user"))?.role || "").toLowerCase() === "support"; }
    catch { return false; }
  }, []);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["order-timeline", id] });
    qc.invalidateQueries({ queryKey: ["order-stats"] });
  };

  const statusMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => { toast.success("Status updated"); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || "Status update failed"),
  });

  const holdMutation = useMutation({
    mutationFn: holdOrder,
    onSuccess: (_r, vars) => { toast.success(vars.isHold ? "Order put on hold" : "Hold released"); invalidate(); },
    onError: () => toast.error("Failed to update hold state"),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateOrder,
    onSuccess: (r) => { toast.success(`Duplicated as order #${r.data.id}`); navigate(`/orders/${r.data.id}`); },
    onError: () => toast.error("Duplicate failed"),
  });

  if (isLoading || !order) {
    return <p className="text-gray-500 dark:text-slate-400">Loading order details...</p>;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const totalQuantity = items.reduce((sum, i) => sum + Number(i.quantity || 1), 0);
  const subtotal = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 1), 0);
  const shippingAddress = order.shippingAddress || {};
  const billingAddress = order.billingAddress || shippingAddress;
  const st = statusInfo(order.status);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Link to="/orders" className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <div className="flex flex-wrap gap-2">
          {!isReadOnly && (
            <button onClick={() => duplicateMutation.mutate(order.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200">
              <Copy className="h-3.5 w-3.5" /> Duplicate / Reorder
            </button>
          )}
          {!isReadOnly && (order.isHold ? (
            <button onClick={() => holdMutation.mutate({ id: order.id, isHold: false })} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <PlayCircle className="h-3.5 w-3.5" /> Release Hold
            </button>
          ) : (
            <button onClick={() => holdMutation.mutate({ id: order.id, isHold: true, reason: "" })} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <PauseCircle className="h-3.5 w-3.5" /> Put on Hold
            </button>
          ))}
          <Link to={`/invoice/${order.id}?orderId=${order.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200">
            <Printer className="h-3.5 w-3.5" /> Invoice / Print / Email
          </Link>
          {!isReadOnly && order.status !== "cancelled" && (
            <button
              onClick={() => setConfirm({
                title: "Cancel this order?",
                message: `Order #${order.id} will be marked cancelled.`,
                onConfirm: () => statusMutation.mutate({ id: order.id, status: "cancelled" }),
              })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300"
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-3xl font-semibold dark:text-slate-100">Order #{order.id}</h2>
        <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${st.badge}`}>{st.label}</span>
        {order.isHold && <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">On Hold{order.holdReason ? `: ${order.holdReason}` : ""}</span>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className={card}>
            <h3 className="text-lg font-semibold mb-3 dark:text-slate-100">Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-12 text-sm dark:text-slate-300">
              <div><p className="font-semibold dark:text-slate-100">Name:</p><p>{order.customerName}</p></div>
              <div><p className="font-semibold dark:text-slate-100">Email:</p><p>{order.customerEmail}</p></div>
              <div><p className="font-semibold dark:text-slate-100">Phone:</p><p>{order.customerPhone || "—"}</p></div>
              <div><p className="font-semibold dark:text-slate-100">Order Date:</p><p>{new Date(order.created_at).toLocaleString("en-IN")}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={card}>
              <h3 className="text-base font-semibold mb-2 dark:text-slate-100">Shipping Address</h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-0.5">
                <p>{shippingAddress.address}</p>
                <p>{shippingAddress.city}{shippingAddress.city ? ", " : ""}{shippingAddress.state} {shippingAddress.postalCode}</p>
                <p>{shippingAddress.country}</p>
              </div>
            </div>
            <div className={card}>
              <h3 className="text-base font-semibold mb-2 dark:text-slate-100">Billing Address</h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-0.5">
                <p>{billingAddress.address}</p>
                <p>{billingAddress.city}{billingAddress.city ? ", " : ""}{billingAddress.state} {billingAddress.postalCode}</p>
                <p>{billingAddress.country}</p>
              </div>
            </div>
          </div>

          <div className={card}>
            <h3 className="text-lg font-semibold mb-2 dark:text-slate-100">Order Items</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-slate-800">
                  <th className="p-2 text-left dark:text-slate-300">Product</th>
                  <th className="p-2 text-left dark:text-slate-300">Qty</th>
                  <th className="p-2 text-left dark:text-slate-300">Price</th>
                  <th className="p-2 text-left dark:text-slate-300">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, index) => (
                  <tr key={index} className="border-b dark:border-slate-800">
                    <td className="p-2 dark:text-slate-200">{i.name}</td>
                    <td className="p-2 dark:text-slate-200">{i.quantity}</td>
                    <td className="p-2 dark:text-slate-200">₹{Number(i.price).toFixed(2)}</td>
                    <td className="p-2 dark:text-slate-200">₹{(Number(i.price) * Number(i.quantity)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4">
              <div className="w-[280px] space-y-2 text-sm dark:text-slate-300">
                <div className="flex items-center justify-between"><span>Items Subtotal ({totalQuantity} qty):</span><span className="font-medium">₹{subtotal.toFixed(2)}</span></div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex items-center justify-between"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}:</span><span className="font-medium">-₹{Number(order.discountAmount).toFixed(2)}</span></div>
                )}
                <div className="flex items-center justify-between"><span>Shipping:</span><span className="font-medium">₹{Number(order.shippingCharges || 0).toFixed(2)}</span></div>
                {Number(order.gstAmount) > 0 && (
                  <div className="flex items-center justify-between"><span>GST:</span><span className="font-medium">₹{Number(order.gstAmount).toFixed(2)}</span></div>
                )}
                <div className="border-t dark:border-slate-800 pt-2 flex items-center justify-between text-lg font-bold dark:text-slate-100">
                  <span>Grand Total:</span><span>₹{Number(order.totalPrice).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <OrderPaymentSection order={order} onChanged={invalidate} />
          <OrderShippingSection orderId={order.id} />
          <OrderRequestsPanel orderId={order.id} readOnly={isReadOnly} onNeedsRefund={() => toast("Head to the Payment section above to process the gateway refund.", { icon: "💳" })} />
        </div>

        <div className="space-y-4">
          <StaffAssignmentPanel orderId={order.id} assignedTo={order.assignedTo} readOnly={isReadOnly} />
          <OrderTagsPanel orderId={order.id} tags={order.tags || []} readOnly={isReadOnly} />
          <OrderNotesPanel orderId={order.id} readOnly={isReadOnly} />
          <OrderRefundsPanel orderId={order.id} readOnly={isReadOnly} />
          <OrderTimeline orderId={order.id} />
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          open
          title={confirm.title}
          message={confirm.message}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </motion.div>
  );
}
