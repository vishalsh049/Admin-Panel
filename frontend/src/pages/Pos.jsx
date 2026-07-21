import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, PauseCircle, Undo2, Moon, Sun, CreditCard } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import {
  createPosSale,
  updatePosSale,
  completePosSale,
  fetchPosSale,
} from "../services/posService";
import ProductSearchGrid from "./pos/ProductSearchGrid";
import CartPanel from "./pos/CartPanel";
import CustomerPanel from "./pos/CustomerPanel";
import DiscountCouponBar from "./pos/DiscountCouponBar";
import PaymentModal from "./pos/PaymentModal";
import HoldResumeDrawer from "./pos/HoldResumeDrawer";
import ReturnsModal from "./pos/ReturnsModal";
import { printReceipt } from "./pos/receiptPrint";
import { inr, computeCartTotals, newIdempotencyKey } from "./pos/constants";

function currentUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
}

export default function Pos() {
  const { theme, toggleTheme } = useTheme();
  const searchInputRef = useRef(null);
  const user = currentUser();

  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [billDiscount, setBillDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [heldSaleId, setHeldSaleId] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey());

  const [showPayment, setShowPayment] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totals = computeCartTotals(items, { bill_discount: billDiscount, coupon_discount: couponDiscount });

  function addToCart(product, variation) {
    const key = `${product.id}:${variation ? variation.id : "simple"}`;
    const price = variation ? Number(variation.price) : Number(product.price);
    const stock = variation ? Number(variation.stock) : Number(product.stock);

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      if (idx >= 0) {
        const existing = prev[idx];
        if (existing.maxStock != null && existing.quantity + 1 > existing.maxStock) {
          toast.error(`Only ${existing.maxStock} of "${product.name}" available`);
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...existing, quantity: existing.quantity + 1 };
        return next;
      }
      if (stock <= 0) {
        toast.error(`"${product.name}" is out of stock`);
        return prev;
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          variation_id: variation ? variation.id : null,
          product_name: product.name,
          sku: variation ? variation.sku : product.sku,
          hsn: product.hsn || "",
          unit: "pcs",
          quantity: 1,
          unit_price: price,
          mrp: variation ? Number(variation.regular_price) : Number(product.mrp),
          discount_percent: 0,
          discount_amount: 0,
          gst_percent: Number(product.gst_percent) || 0,
          maxStock: stock,
        },
      ];
    });
  }

  function updateQty(key, qty) {
    setItems((prev) =>
      prev.flatMap((it) => {
        if (it.key !== key) return [it];
        if (qty <= 0) return [];
        if (it.maxStock != null && qty > it.maxStock) {
          toast.error(`Only ${it.maxStock} available`);
          return [{ ...it, quantity: it.maxStock }];
        }
        return [{ ...it, quantity: qty }];
      })
    );
  }

  function updateGst(key, gst_percent) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, gst_percent } : it)));
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function resetCart() {
    setItems([]);
    setCustomer(null);
    setBillDiscount(0);
    setCouponCode("");
    setCouponDiscount(0);
    setHeldSaleId(null);
    setIdempotencyKey(newIdempotencyKey());
  }

  const buildPayload = useCallback(() => ({
    items: items.map((it) => ({
      product_id: it.product_id,
      variation_id: it.variation_id,
      product_name: it.product_name,
      sku: it.sku,
      hsn: it.hsn,
      unit: it.unit,
      quantity: it.quantity,
      unit_price: it.unit_price,
      mrp: it.mrp,
      discount_percent: it.discount_percent,
      discount_amount: it.discount_amount,
      gst_percent: it.gst_percent,
    })),
    customer_id: customer?.id || null,
    customer_name: customer?.name || null,
    customer_phone: customer?.phone || null,
    customer_email: customer?.email || null,
    gst_type: "intra",
    bill_discount: billDiscount,
    coupon_code: couponCode || null,
    coupon_discount: couponDiscount,
  }), [items, customer, billDiscount, couponCode, couponDiscount]);

  async function handleHold() {
    if (!items.length) return toast.error("Cart is empty");
    try {
      const payload = { ...buildPayload(), status: "held" };
      if (heldSaleId) await updatePosSale({ id: heldSaleId, ...payload });
      else await createPosSale(payload);
      toast.success("Sale held for later");
      resetCart();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to hold sale");
    }
  }

  function openPayment() {
    if (!items.length) return toast.error("Cart is empty");
    setShowPayment(true);
  }

  async function handlePaymentConfirm(payments) {
    setSubmitting(true);
    try {
      let sale;
      if (heldSaleId) {
        await updatePosSale({ id: heldSaleId, ...buildPayload() });
        const result = await completePosSale({ id: heldSaleId, payments });
        sale = result.sale;
      } else {
        const result = await createPosSale({
          ...buildPayload(),
          status: "completed",
          payments,
          idempotency_key: idempotencyKey,
        });
        sale = result.sale;
        if (result.deduped) toast("This sale was already recorded");
      }

      toast.success(`Sale ${sale.sale_number} completed`);
      setShowPayment(false);

      const detail = await fetchPosSale(sale.id);
      printReceipt({ sale: detail.sale, items: detail.items, payments: detail.payments });

      resetCart();
    } catch (err) {
      toast.error(err.response?.data?.error || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResume(saleSummary) {
    try {
      const detail = await fetchPosSale(saleSummary.id);
      setItems(
        detail.items.map((it) => ({
          key: `${it.product_id}:${it.variation_id || "simple"}`,
          product_id: it.product_id,
          variation_id: it.variation_id,
          product_name: it.product_name,
          sku: it.sku,
          hsn: it.hsn,
          unit: it.unit,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          mrp: Number(it.mrp),
          discount_percent: Number(it.discount_percent),
          discount_amount: Number(it.discount_amount),
          gst_percent: Number(it.gst_percent),
          maxStock: null,
        }))
      );
      setCustomer(
        detail.sale.customer_id || detail.sale.customer_name
          ? {
              id: detail.sale.customer_id,
              name: detail.sale.customer_name,
              phone: detail.sale.customer_phone,
              email: detail.sale.customer_email,
            }
          : null
      );
      setBillDiscount(Number(detail.sale.bill_discount) || 0);
      setCouponCode(detail.sale.coupon_code || "");
      setCouponDiscount(Number(detail.sale.coupon_discount) || 0);
      setHeldSaleId(detail.sale.id);
      setShowHold(false);
      toast.success(`Resumed ${detail.sale.sale_number}`);
    } catch {
      toast.error("Failed to resume sale");
    }
  }

  useKeyboardShortcuts({
    F2: () => searchInputRef.current?.focus(),
    F4: () => openPayment(),
    F6: () => handleHold(),
    F7: () => setShowHold(true),
    F8: () => setShowReturns(true),
    Escape: { allowInInput: true, handler: () => { setShowPayment(false); setShowHold(false); setShowReturns(false); } },
  });

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* POS chrome — dedicated header instead of the generic admin TopNavbar */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 bg-clip-text text-sm font-bold text-transparent">
            Point of Sale
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReturns(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Returns & Refunds (F8)"
          >
            <Undo2 className="h-3.5 w-3.5" /> Returns
          </button>
          <button
            type="button"
            onClick={() => setShowHold(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Held Orders (F7)"
          >
            <PauseCircle className="h-3.5 w-3.5" /> Held Orders
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
            <div className="h-6 w-6 rounded-full bg-indigo-500/20" />
            <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-200">{user?.name || "Cashier"}</span>
          </div>
        </div>
      </header>

      {/* Main split: products | cart */}
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 border-r border-slate-200 dark:border-slate-800">
          <ProductSearchGrid onAddToCart={addToCart} searchInputRef={searchInputRef} />
        </div>

        <div className="flex w-[400px] shrink-0 flex-col bg-white dark:bg-slate-900">
          <div className="shrink-0 space-y-2.5 px-4 pt-4">
            <CustomerPanel customer={customer} onSelect={setCustomer} />
            <DiscountCouponBar
              billDiscount={billDiscount}
              onBillDiscountChange={setBillDiscount}
              couponCode={couponCode}
              onCouponCodeChange={setCouponCode}
              couponDiscount={couponDiscount}
              onCouponDiscountChange={setCouponDiscount}
            />
          </div>

          <CartPanel items={items} onUpdateQty={updateQty} onUpdateGst={updateGst} onRemove={removeItem} />

          <div className="shrink-0 space-y-2 border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Subtotal</span><span>{inr(totals.subtotal)}</span>
            </div>
            {(totals.itemDiscount + totals.billDiscount + totals.couponDiscount) > 0 && (
              <div className="flex justify-between text-xs text-emerald-600">
                <span>Discount</span><span>- {inr(totals.itemDiscount + totals.billDiscount + totals.couponDiscount)}</span>
              </div>
            )}
            {totals.gst > 0 && (
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>GST</span><span>{inr(totals.gst)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-2 text-base font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
              <span>Total</span><span>{inr(totals.grandTotal)}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleHold}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Hold Sale (F6)"
              >
                Hold
              </button>
              <button
                type="button"
                onClick={openPayment}
                disabled={!items.length}
                className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                title="Take Payment (F4)"
              >
                <CreditCard className="h-4 w-4" /> Pay {inr(totals.grandTotal)}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PaymentModal
        open={showPayment}
        grandTotal={totals.grandTotal}
        onClose={() => setShowPayment(false)}
        onConfirm={handlePaymentConfirm}
        submitting={submitting}
      />
      <HoldResumeDrawer open={showHold} onClose={() => setShowHold(false)} onResume={handleResume} />
      <ReturnsModal open={showReturns} onClose={() => setShowReturns(false)} />
    </div>
  );
}
