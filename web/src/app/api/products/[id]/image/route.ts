import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { ApiError, handleApiError, requireStaff } from "../../../../../lib/server/auth";
import { requireDatabase, jsonOk } from "../../../../../lib/server/routeUtils";
import { deleteProductImage, isImageStorageConfigured, uploadProductImage } from "../../../../../lib/server/imageStorage";
import { updateProduct } from "../../../../../lib/server/repository";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    requireStaff(request, ["ADMIN", "VENDOR"]);
    if (!isImageStorageConfigured()) {
      return NextResponse.json({ error: "Image storage is not configured" }, { status: 503 });
    }

    const { id } = await context.params;
    const row = await prisma.product.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const oldPath = row.imageStoragePath;
    const uploaded = await uploadProductImage(id, file);
    const product = await updateProduct(id, {
      imageUrl: uploaded.publicUrl,
      imageStoragePath: uploaded.storagePath,
    });

    if (oldPath && oldPath !== uploaded.storagePath) {
      await deleteProductImage(oldPath).catch(() => undefined);
    }

    return NextResponse.json({ product, imageUrl: uploaded.publicUrl });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    requireDatabase();
    requireStaff(request, ["ADMIN", "VENDOR"]);
    const { id } = await context.params;
    const row = await prisma.product.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    if (row.imageStoragePath) {
      await deleteProductImage(row.imageStoragePath).catch(() => undefined);
    }

    const product = await updateProduct(id, {
      imageUrl: "",
      imageStoragePath: null,
    });
    return jsonOk({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
