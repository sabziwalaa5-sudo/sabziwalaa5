"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Printer, Share2, ArrowLeft } from "lucide-react";
import OrderReceipt from "../../../../components/OrderReceipt";
import { fetchOrderReceipt, type ReceiptPayload } from "../../../../lib/storeApi";
import AppLoadingShell from "../../../../components/AppLoadingShell";

export default function OrderReceiptPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId;
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetchOrderReceipt(orderId)
      .then(setReceipt)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load receipt"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (!receipt || !navigator.share) return;
    try {
      await navigator.share({
        title: `Receipt ${receipt.order.invoiceNumber}`,
        text: `Your Sabjiwala order ${receipt.order.id} — Total ${receipt.totals.grandTotal}`,
        url: window.location.href,
      });
    } catch {
      // user cancelled share
    }
  };

  if (loading) return <AppLoadingShell label="Loading receipt…" />;
  if (error || !receipt) {
    return (
      <div className="receipt-page-shell">
        <div className="receipt-page-error">
          <h1>Receipt unavailable</h1>
          <p>{error || "Please sign in and verify you have access to this order."}</p>
          <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
            <ArrowLeft size={16} /> Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-page-shell">
      <div className="receipt-toolbar no-print">
        <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="receipt-toolbar-actions">
          <button type="button" className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Print
          </button>
          <button type="button" className="btn btn-secondary" onClick={handlePrint}>
            <Download size={16} /> Download PDF
          </button>
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <button type="button" className="btn btn-primary" onClick={handleShare}>
              <Share2 size={16} /> Share
            </button>
          ) : null}
        </div>
      </div>

      <div className="receipt-page-paper">
        <OrderReceipt receipt={receipt} />
      </div>
    </div>
  );
}
