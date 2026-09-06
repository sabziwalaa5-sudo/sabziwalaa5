import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "../../../../lib/server/auth";
import { requireDatabase } from "../../../../lib/server/routeUtils";
import { getProductById, updateProduct, deleteProduct } from "../../../../lib/server/repository";
import { requireStaff } from "../../../../lib/server/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    const { id } = await context.params;
    const product = await getProductById(id);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    requireStaff(request, ["ADMIN", "VENDOR"]);
    const { id } = await context.params;
    const body = await request.json();
    const product = await updateProduct(id, {
      ...(body.name != null ? { name: String(body.name) } : {}),
      ...(body.hindiName != null ? { hindiName: String(body.hindiName) } : {}),
      ...(body.price != null ? { price: Number(body.price) } : {}),
      ...(body.oldPrice != null ? { oldPrice: Number(body.oldPrice) } : {}),
      ...(body.unit != null ? { unit: String(body.unit) } : {}),
      ...(body.image != null ? { image: String(body.image) } : {}),
      ...(body.imageUrl != null ? { imageUrl: String(body.imageUrl) } : {}),
      ...(body.category != null ? { category: String(body.category) } : {}),
      ...(body.stock != null ? { stock: Number(body.stock) } : {}),
      ...(body.badge !== undefined ? { badge: body.badge } : {}),
      ...(body.isSeasonal != null ? { isSeasonal: Boolean(body.isSeasonal) } : {}),
      ...(body.isFarmFresh != null ? { isFarmFresh: Boolean(body.isFarmFresh) } : {}),
      ...(body.isActive != null ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.vendorId != null ? { vendorId: String(body.vendorId) } : {}),
    });
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    requireStaff(request, ["ADMIN", "VENDOR"]);
    const { id } = await context.params;
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
