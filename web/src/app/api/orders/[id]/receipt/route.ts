import { NextRequest } from "next/server";
import { getCustomerFromRequest, getStaffFromRequest, handleApiError } from "../../../../../lib/server/auth";
import { requireDatabase, jsonOk } from "../../../../../lib/server/routeUtils";
import { assertReceiptAccess, buildReceiptPayload } from "../../../../../lib/server/receipt";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    const { id } = await context.params;
    const customer = await getCustomerFromRequest(request);
    const staff = getStaffFromRequest(request);

    await assertReceiptAccess(id, { customer, staff });
    const receipt = await buildReceiptPayload(id);
    return jsonOk({ receipt });
  } catch (error) {
    return handleApiError(error);
  }
}
