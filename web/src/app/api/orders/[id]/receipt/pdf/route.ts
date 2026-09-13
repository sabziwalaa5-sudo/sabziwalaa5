import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest, getStaffFromRequest, handleApiError } from "../../../../../../lib/server/auth";
import { requireDatabase } from "../../../../../../lib/server/routeUtils";
import { assertReceiptAccess, buildReceiptPayload } from "../../../../../../lib/server/receipt";
import { generateReceiptPdf } from "../../../../../../lib/server/receiptPdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    const { id } = await context.params;
    const customer = await getCustomerFromRequest(request);
    const staff = getStaffFromRequest(request);

    await assertReceiptAccess(id, { customer, staff });
    const receipt = await buildReceiptPayload(id);
    const pdf = await generateReceiptPdf(receipt);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${receipt.order.invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
