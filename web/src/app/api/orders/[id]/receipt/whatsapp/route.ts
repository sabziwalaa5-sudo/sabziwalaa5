import { NextRequest } from "next/server";
import { getCustomerFromRequest, getStaffFromRequest, handleApiError, ApiError } from "../../../../../../lib/server/auth";
import { requireDatabase, jsonOk } from "../../../../../../lib/server/routeUtils";
import { assertReceiptAccess, buildReceiptPayload } from "../../../../../../lib/server/receipt";
import { buildWhatsAppShareUrl, getTwilioWhatsAppConfig, sendReceiptWhatsApp } from "../../../../../../lib/server/receiptDelivery";
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
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : order.customerMobile;
    const receiptUrl = `${getApiBaseUrl()}/orders/${id}/receipt`;
    const shareUrl = buildWhatsAppShareUrl(receipt, receiptUrl, phone);

    if (body.mode === "share") {
      return jsonOk({ shareUrl, configured: Boolean(getTwilioWhatsAppConfig()) });
    }

    if (!phone) throw new ApiError("Recipient phone number is required", 400);
    await sendReceiptWhatsApp({ receipt, toPhone: phone, receiptUrl });
    return jsonOk({ sent: true, phone, shareUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
