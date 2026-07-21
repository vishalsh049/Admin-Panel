// Unified GST tax-invoice PDF renderer shared by the customer-facing invoice
// route and the new admin invoice route (Phase 3) — one code path, one
// visual output, so "download my invoice" and "admin views/prints invoice"
// can never drift apart again. Also used for credit notes (layout flag).
const QRCode = require("qrcode");
const Product = require("../models/Products");
const { parseJsonField } = require("./orderHelpers");
const { amountInWords } = require("./purchaseBillHelpers");

const A4_WIDTH = 595.28; // pt
const THERMAL_WIDTH = 227; // ~80mm thermal roll

async function enrichItems(items) {
  const productIds = items.map((i) => i.id).filter((id) => Number.isInteger(Number(id)));
  const products = productIds.length
    ? await Product.findAll({ where: { id: productIds }, attributes: ["id", "hsn", "gst_percent", "sku"] })
    : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  return items.map((item) => {
    const product = byId.get(Number(item.id));
    const qty = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const gross = qty * price;
    // Historical orders never snapshotted GST-at-purchase-time — fall back to
    // the product's current rate, or a flat 18% if the product was deleted.
    const gstPercent = product?.gst_percent != null ? Number(product.gst_percent) : 18;
    const taxable = gross / (1 + gstPercent / 100);
    const gstAmount = gross - taxable;
    return {
      name: item.name,
      sku: item.sku || product?.sku || "—",
      hsn: product?.hsn || "—",
      qty,
      price,
      gstPercent,
      taxable,
      gstAmount,
      total: gross,
    };
  });
}

function drawA4(doc, ctx) {
  const { order, items, siteSettings, invoiceNumber, isCreditNote } = ctx;
  const billing = order.billingAddress || order.shippingAddress || {};

  doc.fontSize(18).fillColor("#7A1212").text(siteSettings?.site_name || "Divya Darshnam", { continued: false });
  doc.fontSize(9).fillColor("#555555").text(isCreditNote ? "CREDIT NOTE" : "TAX INVOICE");
  if (siteSettings?.gstin) doc.text(`GSTIN: ${siteSettings.gstin}`);
  if (siteSettings?.pan) doc.text(`PAN: ${siteSettings.pan}`);
  if (siteSettings?.contact_address) doc.text(siteSettings.contact_address);
  doc.moveDown(0.5);

  doc.fontSize(11).fillColor("#000000");
  doc.text(`${isCreditNote ? "Credit Note" : "Invoice"} No: ${invoiceNumber}`);
  doc.text(`Order ID: #${order.id}`);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`);
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").text("Billed To:");
  doc.font("Helvetica").text(order.customerName);
  if (billing.address) doc.text(billing.address);
  doc.text(`${billing.city || ""}${billing.city ? ", " : ""}${billing.state || ""} ${billing.postalCode || ""}`.trim());
  if (billing.country) doc.text(billing.country);
  doc.moveDown();

  const tableTop = doc.y;
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Item", 50, tableTop, { width: 160 });
  doc.text("HSN", 215, tableTop, { width: 50 });
  doc.text("Qty", 265, tableTop, { width: 30 });
  doc.text("Rate", 300, tableTop, { width: 55 });
  doc.text("GST%", 358, tableTop, { width: 40 });
  doc.text("Tax", 400, tableTop, { width: 55 });
  doc.text("Total", 460, tableTop, { width: 65, align: "right" });
  doc.moveTo(50, tableTop + 14).lineTo(525, tableTop + 14).strokeColor("#e2e8f0").stroke();

  let y = tableTop + 20;
  doc.font("Helvetica").fontSize(9);
  const sign = isCreditNote ? -1 : 1;
  items.forEach((item) => {
    doc.text(item.name, 50, y, { width: 160 });
    doc.text(item.hsn, 215, y, { width: 50 });
    doc.text(String(item.qty), 265, y, { width: 30 });
    doc.text(`Rs.${item.price.toFixed(2)}`, 300, y, { width: 55 });
    doc.text(`${item.gstPercent}%`, 358, y, { width: 40 });
    doc.text(`Rs.${(sign * item.gstAmount).toFixed(2)}`, 400, y, { width: 55 });
    doc.text(`Rs.${(sign * item.total).toFixed(2)}`, 460, y, { width: 65, align: "right" });
    y += 16;
  });
  doc.moveTo(50, y + 4).lineTo(525, y + 4).strokeColor("#e2e8f0").stroke();
  doc.y = y + 14;

  const taxableTotal = items.reduce((s, i) => s + i.taxable, 0);
  const gstTotal = items.reduce((s, i) => s + i.gstAmount, 0);

  doc.font("Helvetica-Bold").text("Summary:");
  doc.font("Helvetica");
  doc.text(`Taxable Amount: Rs.${(sign * taxableTotal).toFixed(2)}`);
  if (Number(order.discountAmount) > 0) doc.text(`Discount: -Rs.${Number(order.discountAmount).toFixed(2)}`);
  if (Number(order.shippingCharges) > 0) doc.text(`Shipping: Rs.${Number(order.shippingCharges).toFixed(2)}`);
  doc.text(`GST: Rs.${(sign * gstTotal).toFixed(2)}`);
  const grandTotal = isCreditNote ? -Number(ctx.creditAmount ?? order.totalPrice) : Number(order.totalPrice);
  doc.font("Helvetica-Bold").text(`${isCreditNote ? "Credit" : "Grand Total"}: Rs.${grandTotal.toFixed(2)}`);
  doc.font("Helvetica").fontSize(8).fillColor("#777777").text(amountInWords(Math.abs(grandTotal)));
  doc.moveDown();

  if (siteSettings?.bank_name) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000").text("Bank Details:");
    doc.font("Helvetica").text(`${siteSettings.bank_name} · A/C ${siteSettings.bank_account_number || "—"} · IFSC ${siteSettings.bank_ifsc || "—"}`);
    doc.moveDown();
  }

  doc.font("Helvetica-Bold").fontSize(9).text("Payment:");
  doc.font("Helvetica");
  doc.text(
    order.paymentMethod === "razorpay"
      ? `Paid Online (Razorpay) — ${order.isPaid ? "PAID" : "PAYMENT PENDING"}`
      : `Cash on Delivery — ${order.isPaid ? "PAID" : "payable on delivery"}`
  );
  if (order.razorpayPaymentId) doc.text(`Payment ID: ${order.razorpayPaymentId}`);

  if (siteSettings?.invoice_terms) {
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Terms & Conditions:");
    doc.font("Helvetica").fontSize(8).text(siteSettings.invoice_terms);
  }
}

function drawThermal(doc, ctx) {
  const { order, items, invoiceNumber, isCreditNote } = ctx;
  const w = THERMAL_WIDTH;
  doc.fontSize(11).text(ctx.siteSettings?.site_name || "Divya Darshnam", { width: w, align: "center" });
  doc.fontSize(8).text(isCreditNote ? "CREDIT NOTE" : "TAX INVOICE", { width: w, align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(7);
  doc.text(`${isCreditNote ? "CN" : "Inv"}: ${invoiceNumber}`);
  doc.text(`Order #${order.id} · ${new Date().toLocaleDateString("en-IN")}`);
  doc.text("-".repeat(38));
  const sign = isCreditNote ? -1 : 1;
  items.forEach((item) => {
    doc.text(`${item.name}`, { width: w });
    doc.text(`  ${item.qty} x Rs.${item.price.toFixed(2)} = Rs.${(sign * item.total).toFixed(2)}`);
  });
  doc.text("-".repeat(38));
  const grandTotal = isCreditNote ? -Number(ctx.creditAmount ?? order.totalPrice) : Number(order.totalPrice);
  doc.fontSize(9).text(`TOTAL: Rs.${grandTotal.toFixed(2)}`, { width: w, align: "right" });
  doc.fontSize(7).moveDown(0.5).text("Thank you!", { width: w, align: "center" });
}

// renderInvoicePdf(doc, { order, siteSettings, layout, isCreditNote, creditAmount })
// `doc` is an already-constructed PDFDocument (caller owns page size/piping).
async function renderInvoicePdf(doc, { order, siteSettings, layout = "a4", isCreditNote = false, creditAmount }) {
  const rawItems = parseJsonField(order.items, []);
  const items = await enrichItems(rawItems);
  const invoiceNumber = isCreditNote ? `CN-${order.invoiceNumber || order.id}` : order.invoiceNumber;

  const qrPayload = JSON.stringify({
    invoiceNumber, orderId: order.id, total: Number(order.totalPrice), date: new Date().toISOString().slice(0, 10),
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 90 });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const ctx = { order, items, siteSettings, invoiceNumber, isCreditNote, creditAmount };
  if (layout === "thermal") {
    drawThermal(doc, ctx);
    doc.image(qrBuffer, { fit: [70, 70], align: "center" });
  } else {
    drawA4(doc, ctx);
    doc.image(qrBuffer, A4_WIDTH - 140, 40, { fit: [80, 80] });
  }
}

module.exports = { renderInvoicePdf, enrichItems };
