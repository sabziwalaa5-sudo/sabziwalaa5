import type { Prisma, StorefrontSectionType } from "@prisma/client";
import { prisma } from "../db";
import { ensurePlatformSettings } from "./bootstrap";
import { slugify, validateName, validateSlug } from "./slug";
import { ApiError } from "./auth";
import { decimalToNumber } from "./serialize";
import type { ClientProduct } from "./repository";

let catalogStructureReady = false;

export type ClientCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  isActive: boolean;
  displayOrder: number;
  productCount?: number;
};

export type ClientSection = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sectionType: StorefrontSectionType;
  categoryId?: string | null;
  categoryName?: string | null;
  isActive: boolean;
  displayOrder: number;
  maxProducts: number;
  productIds?: string[];
};

export type StorefrontSectionPayload = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sectionType: StorefrontSectionType;
  products: ClientProduct[];
};

async function ready() {
  await ensureCatalogReady();
  await ensureDefaultCatalogStructure();
}

async function ensureCatalogReady() {
  await ensurePlatformSettings();
}

function serializeCategory(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  products?: { id: string }[];
}): ClientCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    icon: row.icon,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    productCount: row.products?.length,
  };
}

function serializeSection(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sectionType: StorefrontSectionType;
  categoryId: string | null;
  isActive: boolean;
  displayOrder: number;
  maxProducts: number;
  category?: { name: string } | null;
  products?: Array<{ productId: string; displayOrder: number }>;
}): ClientSection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sectionType: row.sectionType,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    maxProducts: row.maxProducts,
    productIds: row.products?.sort((a, b) => a.displayOrder - b.displayOrder).map((p) => p.productId),
  };
}

function serializeProductRow(product: {
  id: string;
  name: string;
  hindiName: string | null;
  price: Prisma.Decimal;
  oldPrice: Prisma.Decimal | null;
  unit: string;
  image: string | null;
  imageUrl: string | null;
  category: string;
  categoryId: string | null;
  stock: Prisma.Decimal;
  rating: Prisma.Decimal | null;
  reviewsCount: number;
  vendorId: string;
  badge: string | null;
  isSeasonal: boolean;
  isFarmFresh: boolean;
  isActive: boolean;
}): ClientProduct {
  return {
    id: product.id,
    name: product.name,
    hindiName: product.hindiName,
    price: decimalToNumber(product.price),
    oldPrice: product.oldPrice ? decimalToNumber(product.oldPrice) : null,
    unit: product.unit,
    image: product.image,
    imageUrl: product.imageUrl,
    category: product.category,
    categoryId: product.categoryId,
    stock: decimalToNumber(product.stock),
    rating: product.rating ? decimalToNumber(product.rating) : null,
    reviewsCount: product.reviewsCount,
    vendorId: product.vendorId,
    badge: product.badge,
    isSeasonal: product.isSeasonal,
    isFarmFresh: product.isFarmFresh,
    isActive: product.isActive,
  };
}

const PAID_STATUSES = ["Paid", "PAID", "Captured"];
const COMPLETED_ORDER_STATUSES = ["Delivered", "Completed", "Paid"];

export async function listCategories(options?: { activeOnly?: boolean; includeCounts?: boolean }) {
  await ready();
  const rows = await prisma.productCategory.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: options?.includeCounts ? { products: { where: { isActive: true }, select: { id: true } } } : undefined,
  });
  return rows.map(serializeCategory);
}

export async function getCategoryById(id: string) {
  await ready();
  const row = await prisma.productCategory.findUnique({
    where: { id },
    include: { products: { where: { isActive: true }, select: { id: true } } },
  });
  return row ? serializeCategory(row) : null;
}

export async function createCategory(input: {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  isActive?: boolean;
  displayOrder?: number;
}) {
  await ready();
  const nameError = validateName(input.name, "Category name");
  if (nameError) throw new ApiError(nameError, 400);
  const slug = slugify(input.slug || input.name);
  const slugError = validateSlug(slug);
  if (slugError) throw new ApiError(slugError, 400);

  const existing = await prisma.productCategory.findUnique({ where: { slug } });
  if (existing) throw new ApiError("Category slug already exists", 409);

  const maxOrder = await prisma.productCategory.aggregate({ _max: { displayOrder: true } });
  const row = await prisma.productCategory.create({
    data: {
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      icon: input.icon?.trim() || null,
      isActive: input.isActive ?? true,
      displayOrder: input.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
    },
  });
  return serializeCategory(row);
}

export async function updateCategory(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    icon: string | null;
    isActive: boolean;
    displayOrder: number;
  }>
) {
  await ready();
  const current = await prisma.productCategory.findUnique({ where: { id } });
  if (!current) throw new ApiError("Category not found", 404);

  let slug = current.slug;
  if (input.slug != null) {
    slug = slugify(input.slug);
    const slugError = validateSlug(slug);
    if (slugError) throw new ApiError(slugError, 400);
    const existing = await prisma.productCategory.findFirst({ where: { slug, NOT: { id } } });
    if (existing) throw new ApiError("Category slug already exists", 409);
  }

  const name = input.name != null ? input.name.trim() : current.name;
  if (input.name != null) {
    const nameError = validateName(name, "Category name");
    if (nameError) throw new ApiError(nameError, 400);
  }

  const row = await prisma.productCategory.update({
    where: { id },
    data: {
      ...(input.name != null ? { name } : {}),
      ...(input.slug != null ? { slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
      ...(input.displayOrder != null ? { displayOrder: input.displayOrder } : {}),
    },
  });

  if (input.name != null && input.name !== current.name) {
    await prisma.product.updateMany({ where: { categoryId: id }, data: { category: name } });
  }

  return serializeCategory(row);
}

export async function deleteCategory(id: string) {
  await ready();
  const activeCount = await prisma.product.count({ where: { categoryId: id, isActive: true } });
  if (activeCount > 0) {
    throw new ApiError("Cannot delete category with active products. Reassign or deactivate products first.", 409);
  }
  await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.storefrontSection.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.productCategory.delete({ where: { id } });
}

export async function reorderCategories(orderedIds: string[]) {
  await ready();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.productCategory.update({ where: { id }, data: { displayOrder: index + 1 } })
    )
  );
  return listCategories();
}

export async function listSections(options?: { activeOnly?: boolean; includeProducts?: boolean }) {
  await ready();
  const rows = await prisma.storefrontSection.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      category: { select: { name: true } },
      ...(options?.includeProducts
        ? { products: { select: { productId: true, displayOrder: true }, orderBy: { displayOrder: "asc" } } }
        : {}),
    },
  });
  return rows.map(serializeSection);
}

export async function getSectionById(id: string) {
  await ready();
  const row = await prisma.storefrontSection.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      products: { select: { productId: true, displayOrder: true }, orderBy: { displayOrder: "asc" } },
    },
  });
  return row ? serializeSection(row) : null;
}

export async function createSection(input: {
  name: string;
  slug?: string;
  description?: string;
  sectionType: StorefrontSectionType;
  categoryId?: string;
  isActive?: boolean;
  displayOrder?: number;
  maxProducts?: number;
}) {
  await ready();
  const nameError = validateName(input.name, "Section name");
  if (nameError) throw new ApiError(nameError, 400);
  const slug = slugify(input.slug || input.name);
  const slugError = validateSlug(slug);
  if (slugError) throw new ApiError(slugError, 400);

  if (input.sectionType === "CATEGORY" && !input.categoryId) {
    throw new ApiError("Category sections require a category", 400);
  }
  if (input.categoryId) {
    const cat = await prisma.productCategory.findUnique({ where: { id: input.categoryId } });
    if (!cat) throw new ApiError("Category not found", 404);
  }

  const existing = await prisma.storefrontSection.findUnique({ where: { slug } });
  if (existing) throw new ApiError("Section slug already exists", 409);

  const maxOrder = await prisma.storefrontSection.aggregate({ _max: { displayOrder: true } });
  const row = await prisma.storefrontSection.create({
    data: {
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      sectionType: input.sectionType,
      categoryId: input.sectionType === "CATEGORY" ? input.categoryId : null,
      isActive: input.isActive ?? true,
      displayOrder: input.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
      maxProducts: Math.min(Math.max(input.maxProducts ?? 12, 1), 48),
    },
    include: { category: { select: { name: true } } },
  });
  return serializeSection(row);
}

export async function updateSection(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    description: string | null;
    sectionType: StorefrontSectionType;
    categoryId: string | null;
    isActive: boolean;
    displayOrder: number;
    maxProducts: number;
  }>
) {
  await ready();
  const current = await prisma.storefrontSection.findUnique({ where: { id } });
  if (!current) throw new ApiError("Section not found", 404);

  const sectionType = input.sectionType ?? current.sectionType;
  const categoryId = input.categoryId !== undefined ? input.categoryId : current.categoryId;
  if (sectionType === "CATEGORY" && !categoryId) {
    throw new ApiError("Category sections require a category", 400);
  }

  let slug = current.slug;
  if (input.slug != null) {
    slug = slugify(input.slug);
    const slugError = validateSlug(slug);
    if (slugError) throw new ApiError(slugError, 400);
    const existing = await prisma.storefrontSection.findFirst({ where: { slug, NOT: { id } } });
    if (existing) throw new ApiError("Section slug already exists", 409);
  }

  const row = await prisma.storefrontSection.update({
    where: { id },
    data: {
      ...(input.name != null ? { name: input.name.trim() } : {}),
      ...(input.slug != null ? { slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.sectionType != null ? { sectionType: input.sectionType } : {}),
      ...(input.sectionType != null || input.categoryId !== undefined
        ? { categoryId: sectionType === "CATEGORY" ? categoryId : null }
        : {}),
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
      ...(input.displayOrder != null ? { displayOrder: input.displayOrder } : {}),
      ...(input.maxProducts != null ? { maxProducts: Math.min(Math.max(input.maxProducts, 1), 48) } : {}),
    },
    include: {
      category: { select: { name: true } },
      products: { select: { productId: true, displayOrder: true }, orderBy: { displayOrder: "asc" } },
    },
  });
  return serializeSection(row);
}

export async function deleteSection(id: string) {
  await ready();
  await prisma.storefrontSection.delete({ where: { id } });
}

export async function reorderSections(orderedIds: string[]) {
  await ready();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.storefrontSection.update({ where: { id }, data: { displayOrder: index + 1 } })
    )
  );
  return listSections({ includeProducts: true });
}

export async function assignProductToSection(sectionId: string, productId: string) {
  await ready();
  const section = await prisma.storefrontSection.findUnique({ where: { id: sectionId } });
  if (!section) throw new ApiError("Section not found", 404);
  if (!["MANUAL", "FEATURED", "DEALS"].includes(section.sectionType)) {
    throw new ApiError("Only manual sections support direct product assignment", 400);
  }
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw new ApiError("Product not found", 404);

  const maxOrder = await prisma.sectionProduct.aggregate({
    where: { sectionId },
    _max: { displayOrder: true },
  });

  await prisma.sectionProduct.upsert({
    where: { sectionId_productId: { sectionId, productId } },
    create: { sectionId, productId, displayOrder: (maxOrder._max.displayOrder ?? 0) + 1 },
    update: {},
  });
}

export async function removeProductFromSection(sectionId: string, productId: string) {
  await ready();
  await prisma.sectionProduct.deleteMany({ where: { sectionId, productId } });
}

export async function setProductManualSections(productId: string, sectionIds: string[]) {
  await ready();
  const manualSections = await prisma.storefrontSection.findMany({
    where: { sectionType: { in: ["MANUAL", "FEATURED", "DEALS"] } },
    select: { id: true },
  });
  const manualIds = new Set(manualSections.map((s) => s.id));
  const allowed = sectionIds.filter((id) => manualIds.has(id));

  await prisma.$transaction(async (tx) => {
    await tx.sectionProduct.deleteMany({
      where: { productId, section: { sectionType: { in: ["MANUAL", "FEATURED", "DEALS"] } } },
    });
    for (let i = 0; i < allowed.length; i++) {
      await tx.sectionProduct.create({
        data: { sectionId: allowed[i], productId, displayOrder: i + 1 },
      });
    }
  });
}

async function getBestSellerProductIds(limit: number): Promise<string[]> {
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

async function resolveSectionProducts(section: {
  id: string;
  sectionType: StorefrontSectionType;
  categoryId: string | null;
  maxProducts: number;
}): Promise<ClientProduct[]> {
  const limit = section.maxProducts;
  const activeVendorIds = await prisma.vendor.findMany({ where: { status: "Active" }, select: { id: true } });
  const vendorFilter = { vendorId: { in: activeVendorIds.map((v) => v.id) }, isActive: true };

  if (section.sectionType === "CATEGORY" && section.categoryId) {
    const products = await prisma.product.findMany({
      where: { ...vendorFilter, categoryId: section.categoryId },
      orderBy: [{ rating: "desc" }, { name: "asc" }],
      take: limit,
    });
    return products.map(serializeProductRow);
  }

  if (section.sectionType === "BEST_SELLERS") {
    const ids = await getBestSellerProductIds(limit);
    if (!ids.length) {
      const fallback = await prisma.product.findMany({
        where: vendorFilter,
        orderBy: [{ rating: "desc" }, { reviewsCount: "desc" }],
        take: limit,
      });
      return fallback.map(serializeProductRow);
    }
    const products = await prisma.product.findMany({ where: { id: { in: ids }, ...vendorFilter } });
    const orderMap = new Map(ids.map((id, index) => [id, index]));
    return products
      .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
      .map(serializeProductRow);
  }

  if (section.sectionType === "NEW_ARRIVALS") {
    const products = await prisma.product.findMany({
      where: vendorFilter,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return products.map(serializeProductRow);
  }

  const links = await prisma.sectionProduct.findMany({
    where: { sectionId: section.id, product: vendorFilter },
    orderBy: { displayOrder: "asc" },
    take: limit,
    include: { product: true },
  });
  return links.map((link) => serializeProductRow(link.product)).filter((p) => p.isActive);
}

export async function getStorefrontPayload(): Promise<{ categories: ClientCategory[]; sections: StorefrontSectionPayload[] }> {
  await ready();
  const [categories, sections] = await Promise.all([
    listCategories({ activeOnly: true }),
    prisma.storefrontSection.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const payloads: StorefrontSectionPayload[] = [];
  for (const section of sections) {
    const products = await resolveSectionProducts(section);
    if (!products.length) continue;
    payloads.push({
      id: section.id,
      name: section.name,
      slug: section.slug,
      description: section.description,
      sectionType: section.sectionType,
      products,
    });
  }

  return { categories, sections: payloads };
}

export async function ensureDefaultCatalogStructure() {
  if (catalogStructureReady) return;
  await ensureCatalogReady();
  const categoryCount = await prisma.productCategory.count();
  if (categoryCount > 0) {
    catalogStructureReady = true;
    return;
  }

  const defaults = [
    { name: "Vegetables", slug: "vegetables", icon: "🥦", imageUrl: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400&q=80", order: 1 },
    { name: "Fruits", slug: "fruits", icon: "🍎", imageUrl: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80", order: 2 },
    { name: "Dairy", slug: "dairy", icon: "🥛", imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80", order: 3 },
    { name: "Bakery", slug: "bakery", icon: "🍞", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80", order: 4 },
    { name: "Grocery", slug: "grocery", icon: "🧅", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80", order: 5 },
  ];

  const created = new Map<string, string>();
  for (const item of defaults) {
    const row = await prisma.productCategory.create({
      data: {
        name: item.name,
        slug: item.slug,
        icon: item.icon,
        imageUrl: item.imageUrl,
        displayOrder: item.order,
        isActive: true,
      },
    });
    created.set(item.name, row.id);
    created.set(item.slug, row.id);
  }

  const vegId = created.get("vegetables");
  const fruitId = created.get("fruits");
  const dairyId = created.get("dairy");

  const sectionDefaults: Array<{
    name: string;
    slug: string;
    sectionType: StorefrontSectionType;
    categoryId?: string;
    order: number;
    maxProducts: number;
  }> = [
    { name: "Best Sellers", slug: "best-sellers", sectionType: "BEST_SELLERS", order: 1, maxProducts: 8 },
    { name: "New Arrivals", slug: "new-arrivals", sectionType: "NEW_ARRIVALS", order: 2, maxProducts: 8 },
    { name: "Vegetables", slug: "section-vegetables", sectionType: "CATEGORY", categoryId: vegId, order: 3, maxProducts: 8 },
    { name: "Fruits", slug: "section-fruits", sectionType: "CATEGORY", categoryId: fruitId, order: 4, maxProducts: 8 },
    { name: "Dairy Products", slug: "section-dairy", sectionType: "CATEGORY", categoryId: dairyId, order: 5, maxProducts: 8 },
    { name: "Today's Deals", slug: "todays-deals", sectionType: "DEALS", order: 6, maxProducts: 8 },
  ];

  for (const item of sectionDefaults) {
    await prisma.storefrontSection.create({
      data: {
        name: item.name,
        slug: item.slug,
        sectionType: item.sectionType,
        categoryId: item.categoryId ?? null,
        displayOrder: item.order,
        maxProducts: item.maxProducts,
        isActive: true,
      },
    });
  }

  const products = await prisma.product.findMany({ select: { id: true, category: true } });
  for (const product of products) {
    const categoryId = created.get(product.category) || created.get(slugify(product.category));
    if (categoryId) {
      await prisma.product.update({ where: { id: product.id }, data: { categoryId } });
    }
  }

  catalogStructureReady = true;
}

export type ResolveCategoryOptions = {
  /** Allows keeping an existing inactive category on update without re-assigning it. */
  existingCategoryId?: string | null;
  /** When true, new assignments must resolve to an active database category. */
  requireActive?: boolean;
};

function assertCategoryAssignable(
  row: { id: string; isActive: boolean },
  existingCategoryId?: string | null,
  requireActive = true
) {
  if (!requireActive || row.isActive) return;
  if (existingCategoryId && row.id === existingCategoryId) return;
  throw new ApiError("Category is inactive and cannot be assigned", 400);
}

export async function resolveCategoryId(
  categoryId?: string | null,
  categoryName?: string,
  options?: ResolveCategoryOptions
): Promise<{ categoryId: string | null; categoryName: string }> {
  const existingCategoryId = options?.existingCategoryId ?? null;
  const requireActive = options?.requireActive ?? true;
  await ready();

  if (categoryId) {
    const row = await prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!row) throw new ApiError("Category not found", 404);
    assertCategoryAssignable(row, existingCategoryId, requireActive);
    return { categoryId: row.id, categoryName: row.name };
  }

  if (categoryName) {
    const row = await prisma.productCategory.findFirst({
      where: { OR: [{ name: categoryName }, { slug: slugify(categoryName) }] },
    });
    if (row) {
      assertCategoryAssignable(row, existingCategoryId, requireActive);
      return { categoryId: row.id, categoryName: row.name };
    }
    if (requireActive) {
      const activeCount = await prisma.productCategory.count({ where: { isActive: true } });
      if (activeCount > 0) {
        throw new ApiError("A valid active category is required", 400);
      }
    }
    return { categoryId: null, categoryName: categoryName.trim() };
  }

  throw new ApiError("Category is required", 400);
}
