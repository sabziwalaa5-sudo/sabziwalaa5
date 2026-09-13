"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Printer, Share2, ArrowLeft, Mail, MessageCircle } from "lucide-react";
import OrderReceipt from "../../../../components/OrderReceipt";
import {
  fetchOrderReceipt,
  downloadOrderReceiptPdf,
  sendOrderReceiptEmail,
  getReceiptWhatsAppShareUrl,
  type ReceiptPayload,
} from "../../../../lib/storeApi";
import AppLoadingShell from "../../../../components/AppLoadingShell";

export default function OrderReceiptPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId;
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetchOrderReceipt(orderId)
      .then(setReceipt)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load receipt"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!orderId || !receipt) return;
    setBusyAction("pdf");
    setActionMessage(null);
    try {
      await downloadOrderReceiptPdf(orderId, `${receipt.order.invoiceNumber}.pdf`);
      setActionMessage("PDF downloaded.");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Unable to download PDF");
    } finally {
      setBusyAction(null);
    }
  };

  const handleEmail = async () => {
    if (!orderId) return;
    setBusyAction("email");
    setActionMessage(null);
    try {
      const result = await sendOrderReceiptEmail(orderId);
      setActionMessage(`Receipt emailed to ${result.to}.`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Unable to email receipt");
    } finally {
      setBusyAction(null);
    }
  };

  const handleWhatsApp = async () => {
    if (!orderId) return;
    setBusyAction("whatsapp");
    setActionMessage(null);
    try {
      const shareUrl = await getReceiptWhatsAppShareUrl(orderId, receipt?.customer.mobile || undefined);
      window.open(shareUrl, "_blank", "noopener,noreferrer");
      setActionMessage("WhatsApp share opened.");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Unable to open WhatsApp share");
    } finally {
      setBusyAction(null);
    }
  };

  const handleShare = async () => {
    if (!receipt || !navigator.share) return;
    try {
      await navigator.share({
        title: `Receipt ${receipt.order.invoiceNumber}`,
        text: `Your Sabjiwala order ${receipt.order.id} — Total Rs. ${receipt.totals.grandTotal}`,
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
          <button type="button" className="btn btn-secondary" onClick={handleDownloadPdf} disabled={busyAction === "pdf"}>
            <Download size={16} /> {busyAction === "pdf" ? "Downloading…" : "Download PDF"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleEmail} disabled={busyAction === "email"}>
            <Mail size={16} /> {busyAction === "email" ? "Sending…" : "Email"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleWhatsApp} disabled={busyAction === "whatsapp"}>
            <MessageCircle size={16} /> WhatsApp
          </button>
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <button type="button" className="btn btn-primary" onClick={handleShare}>
              <Share2 size={16} /> Share
            </button>
          ) : null}
        </div>
      </div>
      {actionMessage ? <p className="receipt-action-message no-print">{actionMessage}</p> : null}

      <div className="receipt-page-paper">
        <OrderReceipt receipt={receipt} />
      </div>
    </div>
  );
}
