import { NextRequest, NextResponse } from "next/server";
import type { StorefrontSectionType } from "@prisma/client";
import { ApiError, handleApiError, requireStaff } from "../../../../lib/server/auth";
import { requireDatabase, jsonOk, parseJsonBody } from "../../../../lib/server/routeUtils";
import { deleteSection, getSectionById, updateSection } from "../../../../lib/server/catalog";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    const { id } = await context.params;
    const section = await getSectionById(id);
    if (!section) throw new ApiError("Section not found", 404);
    return jsonOk({ section });
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
    const section = await updateSection(id, {
      ...(body.name != null ? { name: String(body.name) } : {}),
      ...(body.slug != null ? { slug: String(body.slug) } : {}),
      ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
      ...(body.sectionType != null ? { sectionType: String(body.sectionType) as StorefrontSectionType } : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId ? String(body.categoryId) : null } : {}),
      ...(body.isActive != null ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.displayOrder != null ? { displayOrder: Number(body.displayOrder) } : {}),
      ...(body.maxProducts != null ? { maxProducts: Number(body.maxProducts) } : {}),
    });
    return jsonOk({ section });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    requireStaff(request, ["ADMIN"]);
    const { id } = await context.params;
    await deleteSection(id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
