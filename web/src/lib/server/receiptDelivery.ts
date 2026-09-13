import nodemailer from "nodemailer";
import type { ReceiptPayload } from "./receipt";
import { generateReceiptPdf } from "./receiptPdf";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
  if (!host || !user || !pass || !from) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    user,
    pass,
    from,
  };
}

export function getTwilioWhatsAppConfig(): { accountSid: string; authToken: string; from: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

export function buildReceiptShareText(receipt: ReceiptPayload, receiptUrl: string): string {
  return [
    `${receipt.business.name} — Receipt`,
    `Invoice: ${receipt.order.invoiceNumber}`,
    `Order: ${receipt.order.id}`,
    `Date: ${receipt.order.orderDate}`,
    `Total: Rs. ${receipt.totals.grandTotal.toFixed(2)}`,
    `Payment: ${receipt.order.paymentMethodLabel} (${receipt.order.paymentStatus})`,
    `View receipt: ${receiptUrl}`,
  ].join("\n");
}

export function buildWhatsAppShareUrl(receipt: ReceiptPayload, receiptUrl: string, phone?: string | null): string {
  const text = buildReceiptShareText(receipt, receiptUrl);
  const digits = phone?.replace(/\D/g, "") || "";
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  const base = normalized ? `https://wa.me/${normalized}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

function buildReceiptHtml(receipt: ReceiptPayload, receiptUrl: string): string {
  const rows = receipt.items
    .map(
      (item) =>
        `<tr><td>${item.name}${item.unit ? `<br><small>${item.unit}</small>` : ""}</td><td>${item.quantity}</td><td>Rs. ${item.unitPrice.toFixed(2)}</td><td>Rs. ${item.amount.toFixed(2)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111;">
    <h2 style="color:#15803d;">${receipt.business.name}</h2>
    <p>${receipt.business.tagline || ""}</p>
    <p><strong>Invoice:</strong> ${receipt.order.invoiceNumber}<br>
    <strong>Order:</strong> ${receipt.order.id}<br>
    <strong>Date:</strong> ${receipt.order.orderDate} ${receipt.order.orderTime}</p>
    <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:640px;">
      <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Grand Total:</strong> Rs. ${receipt.totals.grandTotal.toFixed(2)}</p>
    <p><a href="${receiptUrl}">View receipt online</a></p>
    <p>Thank you for shopping with ${receipt.business.name}!</p>
  </body></html>`;
}

export async function sendReceiptEmail(input: {
  receipt: ReceiptPayload;
  to: string;
  receiptUrl: string;
}): Promise<void> {
  const smtp = getSmtpConfig();
  if (!smtp) {
    throw new Error("Email delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }

  const pdf = await generateReceiptPdf(input.receipt);
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject: `${input.receipt.business.name} receipt ${input.receipt.order.invoiceNumber}`,
    html: buildReceiptHtml(input.receipt, input.receiptUrl),
    text: buildReceiptShareText(input.receipt, input.receiptUrl),
    attachments: [
      {
        filename: `${input.receipt.order.invoiceNumber}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendReceiptWhatsApp(input: {
  receipt: ReceiptPayload;
  toPhone: string;
  receiptUrl: string;
}): Promise<void> {
  const twilio = getTwilioWhatsAppConfig();
  if (!twilio) {
    throw new Error("WhatsApp API is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.");
  }

  const digits = input.toPhone.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `whatsapp:+91${digits}` : `whatsapp:+${digits}`;
  const body = buildReceiptShareText(input.receipt, input.receiptUrl);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`;
  const payload = new URLSearchParams({
    From: twilio.from,
    To: normalized,
    Body: body,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WhatsApp delivery failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
}
