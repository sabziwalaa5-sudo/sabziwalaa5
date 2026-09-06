import { NextRequest } from "next/server";
import { withApiHandler, jsonOk } from "../../../lib/server/routeUtils";
import { listCoupons, upsertCoupon, deleteCoupon } from "../../../lib/server/repository";
import { requireStaff } from "../../../lib/server/auth";

export const GET = withApiHandler(async (request: NextRequest) => {
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
  const coupons = await listCoupons(activeOnly);
  return jsonOk({ coupons });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  requireStaff(request, ["ADMIN"]);
  const body = await request.json();
  const coupon = await upsertCoupon({
    code: String(body.code || "").toUpperCase(),
    discountType: String(body.discountType || "fixed"),
    discountValue: Number(body.discountValue ?? body.discount ?? 0),
    minOrder: Number(body.minOrder ?? 0),
    maxDiscount: body.maxDiscount != null ? Number(body.maxDiscount) : null,
    isActive: body.isActive != null ? Boolean(body.isActive) : true,
  });
  return jsonOk({ coupon }, { status: 201 });
});

export const DELETE = withApiHandler(async (request: NextRequest) => {
  requireStaff(request, ["ADMIN"]);
  const code = request.nextUrl.searchParams.get("code");
  if (!code) throw new Error("Coupon code required");
  await deleteCoupon(code.toUpperCase());
  return jsonOk({ ok: true });
});
