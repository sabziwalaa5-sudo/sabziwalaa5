import { NextRequest, NextResponse } from "next/server";
import { withApiHandler, jsonOk } from "../../../lib/server/routeUtils";
import { listProducts, createProduct } from "../../../lib/server/repository";
import { requireStaff } from "../../../lib/server/auth";

export const GET = withApiHandler(async (request: NextRequest) => {
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
  const vendorId = request.nextUrl.searchParams.get("vendorId") || undefined;
  const products = await listProducts({ activeOnly, vendorId });
  return jsonOk({ products });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  requireStaff(request, ["ADMIN", "VENDOR"]);
  const body = await request.json();
  const product = await createProduct({
    vendorId: String(body.vendorId || ""),
    name: String(body.name || ""),
    hindiName: body.hindiName ? String(body.hindiName) : undefined,
    price: Number(body.price),
    oldPrice: body.oldPrice != null ? Number(body.oldPrice) : undefined,
    unit: String(body.unit || "1 kg"),
    image: body.image ? String(body.image) : undefined,
    imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
    category: body.category ? String(body.category) : "",
    categoryId: body.categoryId ? String(body.categoryId) : undefined,
    stock: Number(body.stock ?? 0),
    badge: body.badge ?? null,
    isSeasonal: Boolean(body.isSeasonal),
    isFarmFresh: Boolean(body.isFarmFresh),
    sectionIds: Array.isArray(body.sectionIds) ? body.sectionIds.map(String) : undefined,
  });
  return jsonOk({ product }, { status: 201 });
});
