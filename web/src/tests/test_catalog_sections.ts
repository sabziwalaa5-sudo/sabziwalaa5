/**
 * Catalog, sections, and image validation tests.
 */
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://sabjiwala_user:sabjiwala_password@localhost:5432/sabjiwala5_db?schema=public";
process.env.SEED_DEMO_DATA = process.env.SEED_DEMO_DATA || "1";

import { prisma } from "../lib/db";
import { slugify, validateSlug, validateName } from "../lib/server/slug";
import { detectImageMime, extensionForMime, validateImageUpload, readAndValidateImage, buildProductImagePath } from "../lib/server/imageStorage";
import {
  createCategory,
  createSection,
  deleteCategory,
  deleteSection,
  ensureDefaultCatalogStructure,
  getStorefrontPayload,
  listCategories,
  listSections,
  assignProductToSection,
  removeProductFromSection,
  updateCategory,
  resolveCategoryId,
} from "../lib/server/catalog";
import { createProduct } from "../lib/server/repository";

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
  console.log("🚀 Catalog & section tests\n");

  assert(slugify("Organic Products") === "organic-products", "slugify normalizes category names");
  assert(validateSlug("organic-products") === null, "valid slug passes validation");
  assert(validateName("") === "Name is required", "validateName rejects empty values");

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(detectImageMime(png) === "image/png", "detectImageMime validates PNG signature");
  assert(extensionForMime("image/png") === "png", "extensionForMime maps png");

  let invalidTypeRejected = false;
  try {
    const bad = new File([new Uint8Array([1, 2, 3])], "evil.exe", { type: "application/x-msdownload" });
    validateImageUpload(bad);
  } catch {
    invalidTypeRejected = true;
  }
  assert(invalidTypeRejected, "invalid file type rejected");

  let mimeMismatchRejected = false;
  try {
    const fake = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], "bad.png", { type: "image/png" });
    await readAndValidateImage(fake);
  } catch {
    mimeMismatchRejected = true;
  }
  assert(mimeMismatchRejected, "mime/content mismatch rejected");

  const storagePath = buildProductImagePath("p1", "image/png");
  assert(!storagePath.includes(".."), "storage path prevents traversal");
  assert(storagePath.startsWith("products/"), "storage path uses safe prefix");

  await ensureDefaultCatalogStructure();
  const unique = `test-cat-${Date.now()}`;
  const created = await createCategory({ name: `Organic ${unique}`, slug: unique });
  assert(created.isActive === true, "category create works");

  const product = await createProduct({
    vendorId: "v1",
    name: `Cat Product ${unique}`,
    price: 10,
    unit: "1 kg",
    category: created.name,
    categoryId: created.id,
    stock: 5,
  });
  assert(product.categoryId === created.id, "product category relationship persists");

  const updated = await updateCategory(created.id, { isActive: false, description: "Test category" });
  assert(updated.isActive === false, "category deactivate works");

  let blocked = false;
  try {
    await deleteCategory(created.id);
  } catch (error) {
    blocked = error instanceof Error && error.message.includes("active products");
  }
  assert(blocked, "delete category blocked when products exist");

  await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });
  await deleteCategory(created.id);
  const categories = await listCategories();
  assert(!categories.some((c) => c.id === created.id), "category delete after products removed");

  const slug = `deals-${Date.now()}`;
  const section = await createSection({
    name: "Test Deals",
    slug,
    sectionType: "DEALS",
    maxProducts: 4,
  });
  assert(section.sectionType === "DEALS", "manual section create works");

  const dealProduct = await createProduct({
    vendorId: "v1",
    name: `Deal Product ${Date.now()}`,
    price: 20,
    unit: "500 g",
    category: "Vegetables",
    stock: 3,
  });
  await assignProductToSection(section.id, dealProduct.id);
  const refreshed = await listSections({ includeProducts: true });
  const found = refreshed.find((s) => s.id === section.id);
  assert(Boolean(found?.productIds?.includes(dealProduct.id)), "assign product to section");

  await removeProductFromSection(section.id, dealProduct.id);
  const afterRemove = (await listSections({ includeProducts: true })).find((s) => s.id === section.id);
  assert(!afterRemove?.productIds?.includes(dealProduct.id), "remove product from section");

  await deleteSection(section.id);

  const payload = await getStorefrontPayload();
  assert(payload.categories.length > 0, "storefront categories returned");
  assert(payload.sections.length > 0, "active storefront sections returned");
  assert(payload.sections.every((s) => s.products.length > 0), "empty sections hidden from storefront");

  const sections = await listSections();
  assert(sections.some((s) => s.sectionType === "BEST_SELLERS"), "best sellers section exists");
  assert(sections.some((s) => s.sectionType === "NEW_ARRIVALS"), "new arrivals section exists");

  const inactive = await createCategory({ name: `Inactive ${unique}`, slug: `${unique}-inactive` });
  await updateCategory(inactive.id, { isActive: false });
  let inactiveBlocked = false;
  try {
    await resolveCategoryId(inactive.id, undefined, { requireActive: true });
  } catch (error) {
    inactiveBlocked = error instanceof Error && error.message.includes("inactive");
  }
  assert(inactiveBlocked, "inactive category rejected for new product assignment");
  await prisma.productCategory.delete({ where: { id: inactive.id } });

  console.log(`\n📊 Catalog/Section Tests: ${passed}/${total} passed`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
