import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireStaff } from "../../../../../lib/server/auth";
import { requireDatabase, jsonOk, parseJsonBody } from "../../../../../lib/server/routeUtils";
import { assignProductToSection } from "../../../../../lib/server/catalog";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    requireStaff(request, ["ADMIN"]);
    const { id } = await context.params;
    const body = await parseJsonBody<{ productId?: string }>(request);
    if (!body.productId) throw new Error("productId is required");
    await assignProductToSection(id, String(body.productId));
    return jsonOk({ ok: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
