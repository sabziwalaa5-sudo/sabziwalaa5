import { createHmac, timingSafeEqual, randomBytes } from "crypto";

export type PaymentMethodCode = "COD" | "UPI" | "CARD";

export interface PaymentClaims {
  paymentId: string;
  orderDraftId: string;
  amountPaise: number;
  method: PaymentMethodCode;
  exp: number;
  razorpayOrderId?: string;
}

function getHmacSecret(): string {
  return process.env.PAYMENT_HMAC_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
}

export function rupeesToPaise(amount: number): number {
  return Math.round(amount * 100);
}

export function razorpayKeysConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function hmacHex(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function createPaymentClaims(input: {
  orderDraftId: string;
  amountRupees: number;
  method: PaymentMethodCode;
}): PaymentClaims {
  if (!input.orderDraftId) throw new Error("orderDraftId is required");
  if (!Number.isFinite(input.amountRupees) || input.amountRupees <= 0) {
    throw new Error("Invalid payment amount");
  }
  if (!["COD", "UPI", "CARD"].includes(input.method)) {
    throw new Error("Invalid payment method");
  }

  return {
    paymentId: `pay_${randomBytes(8).toString("hex")}`,
    orderDraftId: input.orderDraftId,
    amountPaise: rupeesToPaise(input.amountRupees),
    method: input.method,
    exp: Date.now() + 15 * 60 * 1000,
  };
}

export function signClaims(claims: PaymentClaims): string {
  const secret = getHmacSecret();
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  if (!secret) {
    if (claims.method !== "COD") {
      throw new Error("PAYMENT_HMAC_SECRET or RAZORPAY_KEY_SECRET is not configured");
    }
    return `cod.${body}`;
  }
  return `${body}.${hmacHex(body, secret)}`;
}

export function readClaims(token: string): PaymentClaims | null {
  try {
    if (token.startsWith("cod.")) {
      const claims = JSON.parse(Buffer.from(token.slice(4), "base64url").toString()) as PaymentClaims;
      if (claims.method !== "COD") return null;
      if (claims.exp < Date.now()) return null;
      return claims;
    }
    const secret = getHmacSecret();
    if (!secret) return null;
    const [body, signature] = token.split(".");
    if (!body || !signature || !safeEqualHex(hmacHex(body, secret), signature)) return null;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as PaymentClaims;
    if (claims.exp < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function attachRazorpayOrder(claims: PaymentClaims): Promise<PaymentClaims> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret || claims.method === "COD") return claims;

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: claims.amountPaise,
      currency: "INR",
      receipt: claims.orderDraftId.slice(0, 40),
      notes: { localPaymentId: claims.paymentId },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Razorpay order creation failed: ${details.slice(0, 180)}`);
  }

  const data = (await response.json()) as { id?: string };
  return { ...claims, razorpayOrderId: data.id };
}

export function verifyRazorpaySignature(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const payload = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
  return safeEqualHex(hmacHex(payload, secret), params.razorpay_signature);
}

const capturedRazorpayPayments = new Set<string>();

export function consumeRazorpayPayment(razorpayPaymentId: string): boolean {
  if (!razorpayPaymentId) return false;
  if (capturedRazorpayPayments.has(razorpayPaymentId)) return false;
  capturedRazorpayPayments.add(razorpayPaymentId);
  return true;
}
