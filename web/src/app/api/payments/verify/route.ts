import { NextRequest, NextResponse } from "next/server";
import {
  razorpayKeysConfigured,
  readClaims,
  verifyRazorpaySignature,
} from "../../../../lib/payments";
import { checkServerRateLimit, clientIp } from "../../../../lib/serverRateLimit";
import { getOrderAmountRupees, updateOrderPayment } from "../../../../lib/server/repository";
import { isDatabaseConfigured } from "../../../../lib/db";
import { prisma } from "../../../../lib/db";

async function isPaymentCaptured(providerPaymentId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const row = await prisma.paymentCapture.findUnique({ where: { providerPaymentId } });
  return Boolean(row);
}

async function recordPaymentCapture(providerPaymentId: string, orderId: string, amountPaise: number): Promise<boolean> {
  if (!isDatabaseConfigured()) return true;
  try {
    await prisma.paymentCapture.create({
      data: { providerPaymentId, orderId, amountPaise },
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const limit = checkServerRateLimit(`payments-verify:${clientIp(req)}`, 30, 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many verification requests." }, { status: 429 });
    }

    const body = await req.json();
    const checkoutToken = String(body.checkoutToken || "");
    const outcome = body.outcome as "success" | "failure" | "cancelled" | undefined;
    const claims = readClaims(checkoutToken);
    const orderId = String(body.orderId || claims?.orderDraftId || "");

    if (!claims || (body.paymentId && body.paymentId !== claims.paymentId)) {
      return NextResponse.json({ error: "Invalid or expired checkout token" }, { status: 401 });
    }

    if (isDatabaseConfigured() && orderId) {
      const expected = await getOrderAmountRupees(orderId);
      const expectedPaise = Math.round(expected * 100);
      if (expectedPaise !== claims.amountPaise) {
        return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
      }
    }

    if (outcome === "failure" || outcome === "cancelled") {
      return NextResponse.json({
        paymentId: claims.paymentId,
        status: outcome === "cancelled" ? "CANCELLED" : "FAILED",
        method: claims.method,
        amountPaise: claims.amountPaise,
        gatewayConfigured: razorpayKeysConfigured(),
        orderId,
      });
    }

    if (claims.method === "COD") {
      if (isDatabaseConfigured() && orderId) {
        await updateOrderPayment({
          orderId,
          paymentId: claims.paymentId,
          paymentStatus: "Pending",
          checkoutToken,
        });
      }
      return NextResponse.json({
        paymentId: claims.paymentId,
        status: "PENDING",
        method: claims.method,
        amountPaise: claims.amountPaise,
        gatewayConfigured: razorpayKeysConfigured(),
        orderId,
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

    const razorpayPaymentId = String(body.razorpay_payment_id || "");
    const ok = verifyRazorpaySignature({
      razorpay_order_id: String(body.razorpay_order_id || ""),
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: String(body.razorpay_signature || ""),
    });
    if (!ok) {
      return NextResponse.json({ error: "Payment signature verification failed" }, { status: 401 });
    }

    const alreadyCaptured = await isPaymentCaptured(razorpayPaymentId);
    const firstCapture = !alreadyCaptured && (await recordPaymentCapture(razorpayPaymentId, orderId, claims.amountPaise));

    if (isDatabaseConfigured() && orderId && firstCapture) {
      await updateOrderPayment({
        orderId,
        paymentId: claims.paymentId,
        paymentStatus: "Paid",
        razorpayOrderId: String(body.razorpay_order_id || ""),
        razorpayPaymentId,
        checkoutToken,
      });
    }

    return NextResponse.json({
      paymentId: claims.paymentId,
      status: "PAID",
      method: claims.method,
      amountPaise: claims.amountPaise,
      gatewayConfigured: true,
      duplicate: !firstCapture,
      orderId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
