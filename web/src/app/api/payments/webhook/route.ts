import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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

  let event = "";
  try {
    const parsed = JSON.parse(rawBody) as { event?: string };
    event = parsed.event || "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event && event !== "payment.captured" && event !== "payment.authorized") {
    return NextResponse.json({ received: true, ignored: event });
  }

  return NextResponse.json({ received: true, status: "PAID" });
}
