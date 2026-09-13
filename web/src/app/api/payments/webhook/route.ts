import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { updateOrderPayment } from "../../../../lib/server/repository";
import { checkServerRateLimit, clientIp } from "../../../../lib/serverRateLimit";
import { prisma } from "../../../../lib/db";

export async function POST(req: NextRequest) {
  const limit = checkServerRateLimit(`payments-webhook:${clientIp(req)}`, 120, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many webhook requests" }, { status: 429 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  try {
    const left = Buffer.from(expected, "hex");
    const right = Buffer.from(signature, "hex");
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          status?: string;
        };
      };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event || "";
  if (event && event !== "payment.captured" && event !== "payment.authorized") {
    return NextResponse.json({ received: true, ignored: event });
  }

  const payment = payload.payload?.payment?.entity;
  const razorpayPaymentId = payment?.id;
  const razorpayOrderId = payment?.order_id;

  if (!razorpayPaymentId || !razorpayOrderId) {
    return NextResponse.json({ received: true, status: "ignored" });
  }

  const order = await prisma.order.findFirst({ where: { razorpayOrderId } });
  if (!order) {
    return NextResponse.json({ received: true, status: "order_not_found" });
  }

  const existing = await prisma.paymentCapture.findUnique({ where: { providerPaymentId: razorpayPaymentId } });
  if (existing) {
    return NextResponse.json({ received: true, status: "duplicate", orderId: order.id });
  }

  await updateOrderPayment({
    orderId: order.id,
    paymentId: razorpayPaymentId,
    paymentStatus: "Paid",
    razorpayOrderId,
    razorpayPaymentId,
  });

  return NextResponse.json({ received: true, status: "PAID", orderId: order.id });
}
