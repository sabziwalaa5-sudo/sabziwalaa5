import { NextRequest, NextResponse } from "next/server";
import { attachRazorpayOrder, createPaymentClaims, razorpayKeysConfigured, signClaims } from "../../../../lib/payments";
import { checkServerRateLimit, clientIp } from "../../../../lib/serverRateLimit";

export async function POST(req: NextRequest) {
  try {
    const limit = checkServerRateLimit(`payments-create:${clientIp(req)}`, 20, 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many payment requests." }, { status: 429 });
    }

    const body = await req.json();
    const amountRupees = Number(body.amountRupees);
    const method = body.method as "COD" | "UPI" | "CARD";
    const orderDraftId = String(body.orderDraftId || "");

    if (!orderDraftId || !["COD", "UPI", "CARD"].includes(method)) {
      return NextResponse.json({ error: "Invalid payment request" }, { status: 400 });
    }
    if (!Number.isFinite(amountRupees) || amountRupees < 1 || amountRupees > 100000) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const canSign = Boolean(process.env.PAYMENT_HMAC_SECRET || process.env.RAZORPAY_KEY_SECRET);
    if (method !== "COD" && !canSign) {
      return NextResponse.json(
        { error: "Online payments are not enabled on the server. Please use Cash on Delivery." },
        { status: 503 }
      );
    }

    let claims = createPaymentClaims({ orderDraftId, amountRupees, method });
    if (method !== "COD" && razorpayKeysConfigured()) {
      claims = await attachRazorpayOrder(claims);
    }

    return NextResponse.json({
      paymentId: claims.paymentId,
      amountPaise: claims.amountPaise,
      method: claims.method,
      gatewayConfigured: razorpayKeysConfigured(),
      razorpayKeyId: razorpayKeysConfigured() ? process.env.RAZORPAY_KEY_ID : null,
      razorpayOrderId: claims.razorpayOrderId || null,
      checkoutToken: signClaims(claims),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to create payment";
    const status = message.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
