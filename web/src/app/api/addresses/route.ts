import { NextRequest } from "next/server";
import { withApiHandler, jsonOk } from "../../../lib/server/routeUtils";
import {
  createCustomerAddress,
  listCustomerAddresses,
} from "../../../lib/server/repository";
import { requireCustomerAsync } from "../../../lib/server/auth";
import { checkServerRateLimit, clientIp } from "../../../lib/serverRateLimit";

function rateLimitAddresses(request: NextRequest) {
  const limit = checkServerRateLimit(`addresses:${clientIp(request)}`, 40, 60 * 1000);
  if (!limit.allowed) throw new Error("Too many address requests. Please wait.");
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const customer = await requireCustomerAsync(request);
  const addresses = await listCustomerAddresses(customer);
  return jsonOk({ addresses });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  rateLimitAddresses(request);
  const customer = await requireCustomerAsync(request);
  const body = await request.json();
  const address = await createCustomerAddress(customer, {
    tag: String(body.tag || "Home"),
    address: String(body.address || ""),
    phone: body.phone ? String(body.phone) : undefined,
    lat: body.lat != null ? Number(body.lat) : body.latitude != null ? Number(body.latitude) : undefined,
    lng: body.lng != null ? Number(body.lng) : body.longitude != null ? Number(body.longitude) : undefined,
    isDefault: body.isDefault != null ? Boolean(body.isDefault) : undefined,
  });
  return jsonOk({ address }, { status: 201 });
});
