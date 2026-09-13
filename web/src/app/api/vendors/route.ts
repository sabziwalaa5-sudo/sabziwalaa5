import { NextRequest } from "next/server";
import { withApiHandler, jsonOk } from "../../../lib/server/routeUtils";
import { listVendors, createVendor } from "../../../lib/server/repository";
import { requireStaff } from "../../../lib/server/auth";

export const GET = withApiHandler(async () => {
  const vendors = await listVendors();
  return jsonOk({ vendors });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  requireStaff(request, ["ADMIN"]);
  const body = await request.json();
  const vendor = await createVendor({
    vendor_id: body.vendor_id ? String(body.vendor_id) : undefined,
    vendor_name: String(body.vendor_name || ""),
    shop_name: String(body.shop_name || ""),
    mobile: String(body.mobile || ""),
    email: String(body.email || ""),
    address: String(body.address || ""),
    status: String(body.status || "Active"),
    lat: Number(body.lat ?? 28.53),
    lng: Number(body.lng ?? 77.1),
  });
  return jsonOk({ vendor }, { status: 201 });
});
