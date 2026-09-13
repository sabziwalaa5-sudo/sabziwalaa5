import { NextRequest } from "next/server";
import type { StorefrontSectionType } from "@prisma/client";
import { withApiHandler, jsonOk, parseJsonBody } from "../../../lib/server/routeUtils";
import { requireStaff } from "../../../lib/server/auth";
import { createSection, listSections, reorderSections } from "../../../lib/server/catalog";

export const GET = withApiHandler(async (request: NextRequest) => {
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
  const includeProducts = request.nextUrl.searchParams.get("includeProducts") === "true";
  const sections = await listSections({ activeOnly, includeProducts });
  return jsonOk({ sections });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  requireStaff(request, ["ADMIN"]);
  const body = await parseJsonBody<Record<string, unknown>>(request);
  const section = await createSection({
    name: String(body.name || ""),
    slug: body.slug ? String(body.slug) : undefined,
    description: body.description ? String(body.description) : undefined,
    sectionType: String(body.sectionType || "MANUAL") as StorefrontSectionType,
    categoryId: body.categoryId ? String(body.categoryId) : undefined,
    isActive: body.isActive == null ? undefined : Boolean(body.isActive),
    displayOrder: body.displayOrder == null ? undefined : Number(body.displayOrder),
    maxProducts: body.maxProducts == null ? undefined : Number(body.maxProducts),
  });
  return jsonOk({ section }, { status: 201 });
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  requireStaff(request, ["ADMIN"]);
  const body = await parseJsonBody<{ orderedIds?: string[] }>(request);
  if (!Array.isArray(body.orderedIds) || !body.orderedIds.length) {
    throw new Error("orderedIds is required");
  }
  const sections = await reorderSections(body.orderedIds.map(String));
  return jsonOk({ sections });
});
