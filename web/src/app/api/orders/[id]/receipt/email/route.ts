import { NextRequest } from "next/server";
import { getCustomerFromRequest, getStaffFromRequest, handleApiError, ApiError } from "../../../../../../lib/server/auth";
import { requireDatabase, jsonOk } from "../../../../../../lib/server/routeUtils";
import { assertReceiptAccess, buildReceiptPayload } from "../../../../../../lib/server/receipt";
import { sendReceiptEmail } from "../../../../../../lib/server/receiptDelivery";
import { getApiBaseUrl } from "../../../../../../lib/config";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    const { id } = await context.params;
    const customer = await getCustomerFromRequest(request);
    const staff = getStaffFromRequest(request);
    const order = await assertReceiptAccess(id, { customer, staff });
    const receipt = await buildReceiptPayload(id);

    const body = await request.json().catch(() => ({}));
    const to = typeof body.to === "string" && body.to.trim() ? body.to.trim() : order.customerEmail;
    if (!to) throw new ApiError("Recipient email is required", 400);

    const receiptUrl = `${getApiBaseUrl()}/orders/${id}/receipt`;
    await sendReceiptEmail({ receipt, to, receiptUrl });

    return jsonOk({ sent: true, to });
  } catch (error) {
    return handleApiError(error);
  }
}
