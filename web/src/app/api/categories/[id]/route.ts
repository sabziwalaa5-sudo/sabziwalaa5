import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError, requireStaff } from "../../../../lib/server/auth";
import { requireDatabase, jsonOk, parseJsonBody } from "../../../../lib/server/routeUtils";
import { deleteCategory, getCategoryById, updateCategory } from "../../../../lib/server/catalog";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    const { id } = await context.params;
    const category = await getCategoryById(id);
    if (!category) throw new ApiError("Category not found", 404);
    return jsonOk({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    requireStaff(request, ["ADMIN"]);
    const { id } = await context.params;
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const category = await updateCategory(id, {
      ...(body.name != null ? { name: String(body.name) } : {}),
      ...(body.slug != null ? { slug: String(body.slug) } : {}),
      ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl ? String(body.imageUrl) : null } : {}),
      ...(body.icon !== undefined ? { icon: body.icon ? String(body.icon) : null } : {}),
      ...(body.isActive != null ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.displayOrder != null ? { displayOrder: Number(body.displayOrder) } : {}),
    });
    return jsonOk({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    requireStaff(request, ["ADMIN"]);
    const { id } = await context.params;
    await deleteCategory(id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
