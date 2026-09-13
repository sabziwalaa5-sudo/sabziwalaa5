import { prisma } from "../db";
import { validateSearchQuery } from "../validation";
import { ensureDefaultCatalogStructure } from "./catalog";

const PAID_STATUSES = ["Paid", "PAID", "Captured"];
const COMPLETED_ORDER_STATUSES = ["Delivered", "Completed", "Paid"];

export type SearchRecommendation = {
  type: "product" | "category" | "query";
  id?: string;
  label: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  query: string;
};

async function getTrendingProductIds(limit: number): Promise<string[]> {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: {
        OR: [
          { paymentStatus: { in: PAID_STATUSES } },
          { orderStatus: { in: COMPLETED_ORDER_STATUSES } },
        ],
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  return rows.map((r) => r.productId!).filter(Boolean);
}

async function activeVendorFilter() {
  const activeVendorIds = await prisma.vendor.findMany({ where: { status: "Active" }, select: { id: true } });
  return { vendorId: { in: activeVendorIds.map((v) => v.id) }, isActive: true };
}

function uniqueByLabel(items: SearchRecommendation[]): SearchRecommendation[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.label.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getSearchRecommendations(
  rawQuery: string,
  limit = 8
): Promise<{ query: string; suggestions: SearchRecommendation[]; popular: SearchRecommendation[] }> {
  const { sanitized } = validateSearchQuery(rawQuery);
  const q = sanitized.trim();
  const qLower = q.toLowerCase();

  await ensureDefaultCatalogStructure();
  const vendorFilter = await activeVendorFilter();

  const popular: SearchRecommendation[] = [];

  const topCategories = await prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    take: 4,
  });
  for (const cat of topCategories) {
    popular.push({
      type: "category",
      id: cat.id,
      label: cat.name,
      subtitle: "Shop category",
      imageUrl: cat.imageUrl,
      query: cat.name,
    });
  }

  const trendingIds = await getTrendingProductIds(4);
  if (trendingIds.length) {
    const trendingProducts = await prisma.product.findMany({
      where: { id: { in: trendingIds }, ...vendorFilter },
      select: { id: true, name: true, category: true, imageUrl: true, hindiName: true },
    });
    const orderMap = new Map(trendingIds.map((id, index) => [id, index]));
    trendingProducts
      .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
      .forEach((product) => {
        popular.push({
          type: "product",
          id: product.id,
          label: product.name,
          subtitle: product.hindiName || product.category,
          imageUrl: product.imageUrl,
          category: product.category,
          query: product.name,
        });
      });
  } else {
    const fallback = await prisma.product.findMany({
      where: vendorFilter,
      orderBy: [{ rating: "desc" }, { reviewsCount: "desc" }],
      take: 4,
      select: { id: true, name: true, category: true, imageUrl: true, hindiName: true },
    });
    for (const product of fallback) {
      popular.push({
        type: "product",
        id: product.id,
        label: product.name,
        subtitle: product.hindiName || product.category,
        imageUrl: product.imageUrl,
        category: product.category,
        query: product.name,
      });
    }
  }

  const suggestions: SearchRecommendation[] = [];

  if (qLower.length >= 1) {
    const products = await prisma.product.findMany({
      where: {
        ...vendorFilter,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { hindiName: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ rating: "desc" }, { name: "asc" }],
      take: Math.min(limit, 6),
      select: { id: true, name: true, hindiName: true, category: true, imageUrl: true },
    });

    for (const product of products) {
      suggestions.push({
        type: "product",
        id: product.id,
        label: product.name,
        subtitle: product.hindiName || product.category,
        imageUrl: product.imageUrl,
        category: product.category,
        query: product.name,
      });
    }

    const categories = await prisma.productCategory.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      take: 3,
    });
    for (const cat of categories) {
      suggestions.push({
        type: "category",
        id: cat.id,
        label: cat.name,
        subtitle: "Category",
        imageUrl: cat.imageUrl,
        query: cat.name,
      });
    }

    const queryHints = uniqueByLabel([
      ...suggestions.filter((s) => s.type === "product").map((s) => ({
        type: "query" as const,
        label: s.label,
        query: s.label,
      })),
      ...suggestions.filter((s) => s.type === "category").map((s) => ({
        type: "query" as const,
        label: s.label,
        query: s.label,
      })),
    ]).slice(0, 3);

    suggestions.push(...queryHints);
  }

  return {
    query: sanitized,
    suggestions: uniqueByLabel(suggestions).slice(0, limit),
    popular: uniqueByLabel(popular).slice(0, limit),
  };
}
