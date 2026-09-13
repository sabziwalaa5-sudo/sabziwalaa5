/**
 * Search recommendation API tests.
 */
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://sabjiwala_user:sabjiwala_password@localhost:5432/sabjiwala5_db?schema=public";
process.env.SEED_DEMO_DATA = process.env.SEED_DEMO_DATA || "1";

import { prisma } from "../lib/db";
import { getSearchRecommendations } from "../lib/server/search";
import { ensureDefaultCatalogStructure } from "../lib/server/catalog";
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
  console.log("🚀 Search recommendation tests\n");

  await ensureDefaultCatalogStructure();

  const empty = await getSearchRecommendations("");
  assert(empty.popular.length > 0, "popular recommendations returned for empty query");
  assert(empty.popular.some((item) => item.type === "category"), "popular includes categories");

  const unique = `search-${Date.now()}`;
  const product = await createProduct({
    vendorId: "v1",
    name: `Alphonso Mango ${unique}`,
    hindiName: "हापुस आम",
    price: 120,
    unit: "1 dozen",
    category: "Fruits",
    stock: 10,
  });

  const typed = await getSearchRecommendations("Alphonso");
  assert(typed.suggestions.some((s) => s.type === "product" && s.id === product.id), "typed query returns matching product");
  assert(typed.suggestions.some((s) => s.label.toLowerCase().includes("alphonso")), "suggestion label matches query");

  const categoryMatch = await getSearchRecommendations("fruit");
  assert(categoryMatch.suggestions.some((s) => s.type === "category" || s.type === "product"), "partial query returns category or product matches");

  const longQuery = await getSearchRecommendations("x".repeat(120));
  assert(longQuery.query.length <= 100, "search query is sanitized to max length");

  console.log(`\n📊 Search Recommendation Tests: ${passed}/${total} passed`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
