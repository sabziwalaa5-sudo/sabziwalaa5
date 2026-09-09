/**
 * Admin → vendor → storefront catalog consistency tests.
 */
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://sabjiwala_user:sabjiwala_password@localhost:5432/sabjiwala5_db?schema=public";
process.env.SEED_DEMO_DATA = process.env.SEED_DEMO_DATA || "1";

import { prisma } from "../lib/db";
import {
  createCategory,
  createSection,
  updateCategory,
  assignProductToSection,
  getStorefrontPayload,
  listSections,
  reorderSections,
  updateSection,
  resolveCategoryId,
} from "../lib/server/catalog";
import { createProduct, updateProduct } from "../lib/server/repository";

let total = 0;
let passed = 0;

function assert(cond: boolean, msg: string) {
  total++;
  if (cond) {
    passed++;
    console.log(`✅ [PASS] ${msg}`);
  } else {
    console.error(`❌ [FAIL] ${msg}`);
  }
}

async function main() {
  console.log("🚀 Catalog consistency flow tests\n");
  const unique = `organic-${Date.now()}`;

  const category = await createCategory({
    name: `Organic Products ${unique}`,
    slug: unique,
  });
  assert(category.isActive === true, "admin category create works");

  const listed = await prisma.productCategory.findMany({ where: { id: category.id } });
  assert(listed.length === 1, "category appears in database");

  const vendorProduct = await createProduct({
    vendorId: "v1",
    name: `Vendor Organic Item ${unique}`,
    price: 55,
    unit: "1 kg",
    categoryId: category.id,
    category: category.name,
    stock: 12,
  });
  assert(vendorProduct.categoryId === category.id, "vendor product saved with category");

  const storefrontBefore = await getStorefrontPayload();
  assert(
    storefrontBefore.categories.some((c) => c.id === category.id),
    "storefront category rail includes new category"
  );

  await updateCategory(category.id, { isActive: false });
  let blocked = false;
  try {
    await resolveCategoryId(category.id, undefined, { requireActive: true });
  } catch (error) {
    blocked = error instanceof Error && error.message.includes("inactive");
  }
  assert(blocked, "inactive category blocked for new assignments");

  const kept = await resolveCategoryId(category.id, undefined, {
    existingCategoryId: vendorProduct.categoryId,
    requireActive: true,
  });
  assert(kept.categoryId === category.id, "existing product keeps inactive category safely");

  const updated = await updateProduct(vendorProduct.id, {
    name: vendorProduct.name,
    price: 56,
    categoryId: category.id,
  });
  assert(updated.categoryId === category.id, "existing product update with inactive category allowed");

  const sectionSlug = `festival-${Date.now()}`;
  const section = await createSection({
    name: "Festival Specials",
    slug: sectionSlug,
    sectionType: "MANUAL",
    maxProducts: 6,
  });
  await assignProductToSection(section.id, vendorProduct.id);

  let payload = await getStorefrontPayload();
  assert(payload.sections.some((s) => s.id === section.id), "manual section appears on storefront");

  const allSections = await listSections();
  const orderedIds = [section.id, ...allSections.filter((s) => s.id !== section.id).map((s) => s.id)];
  await reorderSections(orderedIds);
  payload = await getStorefrontPayload();
  const first = payload.sections[0];
  assert(first?.id === section.id, "homepage section order follows admin reorder");

  await updateSection(section.id, { isActive: false });
  payload = await getStorefrontPayload();
  assert(!payload.sections.some((s) => s.id === section.id), "deactivated section hidden from homepage");

  await prisma.sectionProduct.deleteMany({ where: { sectionId: section.id } });
  await prisma.storefrontSection.delete({ where: { id: section.id } });
  await prisma.product.update({ where: { id: vendorProduct.id }, data: { isActive: false, categoryId: null } });
  await prisma.productCategory.delete({ where: { id: category.id } });

  console.log(`\n📊 Catalog Consistency Tests: ${passed}/${total} passed`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
