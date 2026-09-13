"use client";

import type { ReceiptPayload } from "../lib/storeApi";

type Props = {
  receipt: ReceiptPayload;
};

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

export default function OrderReceipt({ receipt }: Props) {
  const { business, order, customer, items, totals } = receipt;
  const paid = order.paymentStatus.toLowerCase() === "paid";

  return (
    <div className="order-receipt">
      <header className="order-receipt-header">
        <div className="order-receipt-brand">
          <img src={business.logoUrl} alt={business.name} className="order-receipt-logo" />
          <div>
            <h1>{business.name}</h1>
            {business.tagline ? <p className="order-receipt-tagline">{business.tagline}</p> : null}
          </div>
        </div>
        {(business.address || business.phone || business.email) && (
          <div className="order-receipt-business-meta">
            {business.address ? <p>{business.address}</p> : null}
            <p>
              {[business.phone, business.email].filter(Boolean).join(" | ")}
            </p>
            {business.gstin ? <p>GSTIN: {business.gstin}</p> : null}
          </div>
        )}
      </header>

      <section className="order-receipt-meta">
        <div>
          <h2>Tax Invoice / Receipt</h2>
          <p><strong>Invoice No:</strong> {order.invoiceNumber}</p>
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Date:</strong> {order.orderDate} · {order.orderTime}</p>
        </div>
        <div className="order-receipt-status-block">
          <span className={`order-receipt-pill ${paid ? "paid" : "pending"}`}>{order.paymentStatus}</span>
          <span className="order-receipt-pill neutral">{order.orderStatus}</span>
        </div>
      </section>

      <section className="order-receipt-customer">
        <h3>Customer</h3>
        {customer.name ? <p><strong>{customer.name}</strong></p> : null}
        {customer.mobile ? <p>Phone: {customer.mobile}</p> : null}
        {customer.email ? <p>Email: {customer.email}</p> : null}
        <p>Delivery: {customer.deliveryAddress}</p>
      </section>

      <section className="order-receipt-items">
        <h3>Items</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td>
                  <div className="order-receipt-product-name">{item.name}</div>
                  {item.unit ? <div className="order-receipt-product-unit">{item.unit}</div> : null}
                </td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="order-receipt-totals">
        <div className="order-receipt-total-row"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
        {totals.discount > 0 ? (
          <div className="order-receipt-total-row"><span>Discount</span><span>-{formatCurrency(totals.discount)}</span></div>
        ) : null}
        <div className="order-receipt-total-row"><span>Delivery Charge</span><span>{formatCurrency(totals.deliveryCharge)}</span></div>
        <div className="order-receipt-total-row grand"><span>Grand Total</span><span>{formatCurrency(totals.grandTotal)}</span></div>
      </section>

      <section className="order-receipt-payment">
        <p><strong>Payment Method:</strong> {order.paymentMethodLabel}</p>
        <p><strong>Payment Status:</strong> {order.paymentStatus}</p>
        {order.paymentReference ? <p><strong>Payment Reference:</strong> {order.paymentReference}</p> : null}
        {order.razorpayOrderId ? <p><strong>Order Reference:</strong> {order.razorpayOrderId}</p> : null}
      </section>

      <footer className="order-receipt-footer">
        <p>Thank you for shopping with {business.name}!</p>
      </footer>
    </div>
  );
}
