import crypto from "crypto";
import { Request, Response } from "express";

type Method = "COD" | "UPI" | "CARD";

interface PaymentClaims {
  paymentId: string;
  orderDraftId: string;
  amountPaise: number;
  method: Method;
  exp: number;
}

const captured = new Set<string>();
const orderLocks = new Map<string, number>();

function secret(): string {
  return process.env.PAYMENT_HMAC_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
}

function hmac(value: string, key: string): string {
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

function signClaims(claims: PaymentClaims): string {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const key = secret();
  if (!key) {
    if (claims.method !== "COD") throw new Error("Missing payment secret");
    return `cod.${body}`;
  }
  return `${body}.${hmac(body, key)}`;
}

function readClaims(token: string): PaymentClaims | null {
  try {
    if (token.startsWith("cod.")) {
      const claims = JSON.parse(Buffer.from(token.slice(4), "base64url").toString()) as PaymentClaims;
      if (claims.method !== "COD" || claims.exp < Date.now()) return null;
      return claims;
    }
    const key = secret();
    if (!key) return null;
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const expected = Buffer.from(hmac(body, key), "hex");
    const received = Buffer.from(signature, "hex");
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as PaymentClaims;
    if (claims.exp < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export class PaymentController {
  static create(req: Request, res: Response) {
    const { orderDraftId, amountRupees, method } = req.body as {
      orderDraftId?: string;
      amountRupees?: number;
      method?: Method;
    };

    if (!orderDraftId || !method || !["COD", "UPI", "CARD"].includes(method)) {
      return res.status(400).json({ error: "Invalid payment request" });
    }
    if (!amountRupees || amountRupees < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (method !== "COD" && !secret()) {
      return res.status(503).json({ error: "Online payments are not enabled. Use COD." });
    }

    const claims: PaymentClaims = {
      paymentId: `pay_${crypto.randomBytes(8).toString("hex")}`,
      orderDraftId,
      amountPaise: Math.round(amountRupees * 100),
      method,
      exp: Date.now() + 15 * 60 * 1000,
    };

    return res.json({
      paymentId: claims.paymentId,
      amountPaise: claims.amountPaise,
      method,
      gatewayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      checkoutToken: signClaims(claims),
    });
  }

  static verify(req: Request, res: Response) {
    const { checkoutToken, razorpay_order_id, razorpay_payment_id, razorpay_signature, outcome } = req.body;
    const claims = readClaims(String(checkoutToken || ""));
    if (!claims) return res.status(401).json({ error: "Invalid or expired checkout token" });

    if (outcome === "failure" || outcome === "cancelled") {
      return res.json({
        paymentId: claims.paymentId,
        status: outcome === "cancelled" ? "CANCELLED" : "FAILED",
        method: claims.method,
      });
    }

    if (claims.method === "COD") {
      return res.json({ paymentId: claims.paymentId, status: "PENDING", method: "COD", amountPaise: claims.amountPaise });
    }

    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
    if (!rzpSecret) {
      return res.status(503).json({ error: "Razorpay is not configured" });
    }
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = hmac(payload, rzpSecret);
    try {
      const ok = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(String(razorpay_signature || ""), "hex"));
      if (!ok) return res.status(401).json({ error: "Payment signature verification failed" });
    } catch {
      return res.status(401).json({ error: "Payment signature verification failed" });
    }

    const duplicate = captured.has(String(razorpay_payment_id));
    captured.add(String(razorpay_payment_id));
    return res.json({
      paymentId: claims.paymentId,
      status: "PAID",
      method: claims.method,
      amountPaise: claims.amountPaise,
      duplicate,
    });
  }

  static webhook(req: Request, res: Response) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(503).json({ error: "Webhook secret is not configured" });
    }
    const signature = String(req.headers["x-razorpay-signature"] || "");
    const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body || {});
    const expected = hmac(raw, webhookSecret);
    try {
      const ok = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
      if (!ok) return res.status(401).json({ error: "Invalid webhook signature" });
    } catch {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
    return res.json({ received: true });
  }
}

export function lockOrderFingerprint(fingerprint: string): boolean {
  const now = Date.now();
  const last = orderLocks.get(fingerprint) || 0;
  if (now - last < 60_000) return false;
  orderLocks.set(fingerprint, now);
  return true;
}
