import PDFDocument from "pdfkit";
import type { ReceiptPayload } from "./receipt";

function money(value: number): string {
  return `Rs. ${value.toFixed(2)}`;
}

export async function generateReceiptPdf(receipt: ReceiptPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { business, order, customer, items, totals } = receipt;

    doc.fontSize(20).fillColor("#15803d").text(business.name, { align: "left" });
    if (business.tagline) {
      doc.moveDown(0.2).fontSize(10).fillColor("#444444").text(business.tagline);
    }
    doc.moveDown(0.5).fontSize(9).fillColor("#333333");
    if (business.address) doc.text(business.address);
    const contact = [business.phone, business.email].filter(Boolean).join(" | ");
    if (contact) doc.text(contact);
    if (business.gstin) doc.text(`GSTIN: ${business.gstin}`);

    doc.moveDown(1).fontSize(14).fillColor("#111111").text("Tax Invoice / Receipt", { underline: true });
    doc.moveDown(0.5).fontSize(10);
    doc.text(`Invoice No: ${order.invoiceNumber}`);
    doc.text(`Order ID: ${order.id}`);
    doc.text(`Date: ${order.orderDate} ${order.orderTime}`);
    doc.text(`Order Status: ${order.orderStatus}`);
    doc.text(`Payment: ${order.paymentMethodLabel} (${order.paymentStatus})`);

    doc.moveDown(0.8).fontSize(11).text("Customer", { underline: true });
    doc.fontSize(10);
    if (customer.name) doc.text(customer.name);
    if (customer.mobile) doc.text(`Phone: ${customer.mobile}`);
    if (customer.email) doc.text(`Email: ${customer.email}`);
    doc.text(`Delivery: ${customer.deliveryAddress}`);

    doc.moveDown(0.8).fontSize(11).text("Items", { underline: true });
    doc.moveDown(0.3);

    const tableTop = doc.y;
    const colProduct = 48;
    const colQty = 300;
    const colRate = 360;
    const colAmount = 430;

    doc.fontSize(9).fillColor("#666666");
    doc.text("Product", colProduct, tableTop);
    doc.text("Qty", colQty, tableTop);
    doc.text("Rate", colRate, tableTop);
    doc.text("Amount", colAmount, tableTop);
    doc.moveDown(0.2);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.3);

    doc.fillColor("#111111");
    for (const item of items) {
      const y = doc.y;
      doc.fontSize(9).text(item.name, colProduct, y, { width: 240 });
      if (item.unit) {
        doc.fontSize(8).fillColor("#666666").text(item.unit, colProduct, doc.y, { width: 240 });
        doc.fillColor("#111111");
      }
      const rowY = y;
      doc.text(String(item.quantity), colQty, rowY);
      doc.text(money(item.unitPrice), colRate, rowY);
      doc.text(money(item.amount), colAmount, rowY);
      doc.moveDown(0.6);
    }

    doc.moveDown(0.5);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.5);

    const totalX = 360;
    doc.fontSize(10);
    doc.text("Subtotal:", totalX, doc.y, { continued: true }).text(money(totals.subtotal), { align: "right" });
    if (totals.couponCode && totals.couponDiscount > 0) {
      doc.text(`Coupon (${totals.couponCode}):`, totalX, doc.y, { continued: true }).text(`-${money(totals.couponDiscount)}`, { align: "right" });
    }
    const otherDiscount = totals.discount - totals.couponDiscount;
    if (otherDiscount > 0) {
      doc.text("Other Discount:", totalX, doc.y, { continued: true }).text(`-${money(otherDiscount)}`, { align: "right" });
    } else if (totals.discount > 0 && totals.couponDiscount === 0) {
      doc.text("Discount:", totalX, doc.y, { continued: true }).text(`-${money(totals.discount)}`, { align: "right" });
    }
    doc.text("Delivery:", totalX, doc.y, { continued: true }).text(money(totals.deliveryCharge), { align: "right" });
    doc.fontSize(12).fillColor("#15803d");
    doc.text("Grand Total:", totalX, doc.y, { continued: true }).text(money(totals.grandTotal), { align: "right" });

    doc.moveDown(1.2).fontSize(10).fillColor("#15803d").text(`Thank you for shopping with ${business.name}!`, { align: "center" });

    doc.end();
  });
}
