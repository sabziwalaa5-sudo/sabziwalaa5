import { NextRequest, NextResponse } from "next/server";
import {
  consumeRazorpayPayment,
  razorpayKeysConfigured,
  readClaims,
  verifyRazorpaySignature,
} from "../../../../lib/payments";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const checkoutToken = String(body.checkoutToken || "");
    const outcome = body.outcome as "success" | "failure" | "cancelled" | undefined;
    const claims = readClaims(checkoutToken);

    if (!claims || (body.paymentId && body.paymentId !== claims.paymentId)) {
      return NextResponse.json({ error: "Invalid or expired checkout token" }, { status: 401 });
    }

    if (outcome === "failure" || outcome === "cancelled") {
      return NextResponse.json({
        paymentId: claims.paymentId,
        status: outcome === "cancelled" ? "CANCELLED" : "FAILED",
        method: claims.method,
        amountPaise: claims.amountPaise,
        gatewayConfigured: razorpayKeysConfigured(),
      });
    }

    if (claims.method === "COD") {
      return NextResponse.json({
        paymentId: claims.paymentId,
        status: "PENDING",
        method: claims.method,
        amountPaise: claims.amountPaise,
        gatewayConfigured: razorpayKeysConfigured(),
      });
    }

    if (!razorpayKeysConfigured()) {
      return NextResponse.json(
        {
          error:
            "Online payments are not enabled. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server. Cash on Delivery remains available.",
        },
        { status: 503 }
      );
    }

    const ok = verifyRazorpaySignature({
      razorpay_order_id: String(body.razorpay_order_id || ""),
      razorpay_payment_id: String(body.razorpay_payment_id || ""),
      razorpay_signature: String(body.razorpay_signature || ""),
    });
    if (!ok) {
      return NextResponse.json({ error: "Payment signature verification failed" }, { status: 401 });
    }

    const firstCapture = consumeRazorpayPayment(String(body.razorpay_payment_id));
    return NextResponse.json({
      paymentId: claims.paymentId,
      status: "PAID",
      method: claims.method,
      amountPaise: claims.amountPaise,
      gatewayConfigured: true,
      duplicate: !firstCapture,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
