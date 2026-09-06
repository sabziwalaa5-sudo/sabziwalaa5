import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireStaff } from "../../../../../../lib/server/auth";
import { requireDatabase, jsonOk } from "../../../../../../lib/server/routeUtils";
import { removeProductFromSection } from "../../../../../../lib/server/catalog";

type RouteContext = { params: Promise<{ id: string; productId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    requireStaff(request, ["ADMIN"]);
    const { id, productId } = await context.params;
    await removeProductFromSection(id, productId);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
