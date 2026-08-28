"use client";

import { getApiBaseUrl } from "./config";

export type CheckoutPaymentMode = "cod" | "upi" | "card";

export interface VerifiedPayment {
  paymentId: string;
  status: "PENDING" | "PAID";
  method: "COD" | "UPI" | "CARD";
  amountPaise: number;
  gatewayConfigured: boolean;
}

export function mapPaymentMode(mode: CheckoutPaymentMode): "COD" | "UPI" | "CARD" {
  if (mode === "upi") return "UPI";
  if (mode === "card") return "CARD";
  return "COD";
}

export function displayPaymentMethod(mode: CheckoutPaymentMode): string {
  if (mode === "upi") return "UPI";
  if (mode === "card") return "Card Payment";
  return "Cash on Delivery";
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Payment request failed (${res.status})`);
  }
  return data;
}

export async function createPaymentOnServer(input: {
  orderDraftId: string;
  amountRupees: number;
  method: CheckoutPaymentMode;
}): Promise<{
  paymentId: string;
  amountPaise: number;
  method: "COD" | "UPI" | "CARD";
  razorpayKeyId?: string | null;
  razorpayOrderId?: string | null;
  gatewayConfigured: boolean;
  checkoutToken: string;
}> {
  const res = await fetch(`${getApiBaseUrl()}/api/payments/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderDraftId: input.orderDraftId,
      amountRupees: input.amountRupees,
      method: mapPaymentMode(input.method),
    }),
  });
  return parseJson(res);
}

export async function verifyPaymentOnServer(input: {
  paymentId: string;
  checkoutToken: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  outcome?: "success" | "failure" | "cancelled";
}): Promise<VerifiedPayment> {
  const res = await fetch(`${getApiBaseUrl()}/api/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}
