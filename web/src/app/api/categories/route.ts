import { NextRequest } from "next/server";
import { withApiHandler, jsonOk, parseJsonBody } from "../../../lib/server/routeUtils";
import { requireStaff } from "../../../lib/server/auth";
import { createCategory, listCategories, reorderCategories } from "../../../lib/server/catalog";

export const GET = withApiHandler(async (request: NextRequest) => {
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
  const categories = await listCategories({ activeOnly, includeCounts: !activeOnly });
  return jsonOk({ categories });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  requireStaff(request, ["ADMIN"]);
  const body = await parseJsonBody<Record<string, unknown>>(request);
  const category = await createCategory({
    name: String(body.name || ""),
    slug: body.slug ? String(body.slug) : undefined,
    description: body.description ? String(body.description) : undefined,
    imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
    icon: body.icon ? String(body.icon) : undefined,
    isActive: body.isActive == null ? undefined : Boolean(body.isActive),
    displayOrder: body.displayOrder == null ? undefined : Number(body.displayOrder),
  });
  return jsonOk({ category }, { status: 201 });
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  requireStaff(request, ["ADMIN"]);
  const body = await parseJsonBody<{ orderedIds?: string[] }>(request);
  if (!Array.isArray(body.orderedIds) || !body.orderedIds.length) {
    throw new Error("orderedIds is required");
  }
  const categories = await reorderCategories(body.orderedIds.map(String));
  return jsonOk({ categories });
});
