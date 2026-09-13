import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireCustomerAsync } from "../../../../lib/server/auth";
import { requireDatabase } from "../../../../lib/server/routeUtils";
import { deleteCustomerAddress, updateCustomerAddress } from "../../../../lib/server/repository";
import { checkServerRateLimit, clientIp } from "../../../../lib/serverRateLimit";
import { jsonOk } from "../../../../lib/server/routeUtils";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    const limit = checkServerRateLimit(`addresses:${clientIp(request)}`, 40, 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const customer = await requireCustomerAsync(request);
    const { id } = await context.params;
    const body = await request.json();
    const address = await updateCustomerAddress(id, customer, {
      ...(body.tag != null ? { tag: String(body.tag) } : {}),
      ...(body.address != null ? { address: String(body.address) } : {}),
      ...(body.phone != null ? { phone: String(body.phone) } : {}),
      ...(body.lat != null ? { lat: Number(body.lat) } : {}),
      ...(body.lng != null ? { lng: Number(body.lng) } : {}),
      ...(body.isDefault != null ? { isDefault: Boolean(body.isDefault) } : {}),
    });
    return jsonOk({ address });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    const limit = checkServerRateLimit(`addresses:${clientIp(request)}`, 40, 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const customer = await requireCustomerAsync(request);
    const { id } = await context.params;
    await deleteCustomerAddress(id, customer);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
