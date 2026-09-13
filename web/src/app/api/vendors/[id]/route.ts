import { NextRequest } from "next/server";
import { withApiHandler, jsonOk } from "../../../../lib/server/routeUtils";
import { updateVendor } from "../../../../lib/server/repository";
import { requireStaff } from "../../../../lib/server/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { requireDatabase } = await import("../../../../lib/server/routeUtils");
    requireDatabase();
    requireStaff(request, ["ADMIN"]);
    const { id } = await context.params;
    const body = await request.json();
    const vendor = await updateVendor(id, {
      ...(body.vendor_name != null ? { vendor_name: String(body.vendor_name) } : {}),
      ...(body.shop_name != null ? { shop_name: String(body.shop_name) } : {}),
      ...(body.mobile != null ? { mobile: String(body.mobile) } : {}),
      ...(body.email != null ? { email: String(body.email) } : {}),
      ...(body.address != null ? { address: String(body.address) } : {}),
      ...(body.status != null ? { status: String(body.status) } : {}),
      ...(body.lat != null ? { lat: Number(body.lat) } : {}),
      ...(body.lng != null ? { lng: Number(body.lng) } : {}),
    });
    return jsonOk({ vendor });
  } catch (error) {
    const { handleApiError } = await import("../../../../lib/server/auth");
    return handleApiError(error);
  }
}
