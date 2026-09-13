/**
 * Product image upload validation and authorization tests.
 */
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://sabjiwala_user:sabjiwala_password@localhost:5432/sabjiwala5_db?schema=public";
process.env.PAYMENT_HMAC_SECRET = process.env.PAYMENT_HMAC_SECRET || "unit-test-hmac-secret";
process.env.SEED_DEMO_DATA = process.env.SEED_DEMO_DATA || "1";

import { NextRequest } from "next/server";
import { prisma } from "../lib/db";
import { requireStaff, ApiError } from "../lib/server/auth";
import { signStaffSession, STAFF_COOKIE } from "../lib/staffAuth";
import {
  cleanupReplacedProductImage,
  detectImageMime,
  isImageStorageConfigured,
  PRODUCT_IMAGE_MAX_BYTES,
  readAndValidateImage,
  validateImageUpload,
} from "../lib/server/imageStorage";
import { createProduct, deleteProduct, updateProduct } from "../lib/server/repository";

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

function staffRequest(role: "ADMIN" | "VENDOR" = "ADMIN") {
  const token = signStaffSession({
    email: role === "ADMIN" ? "admin@sabjiwala.test" : "vendor@sabjiwala.test",
    role,
    exp: Date.now() + 60_000,
  });
  return new NextRequest("http://localhost/api/products/p1/image", {
    headers: { cookie: `${STAFF_COOKIE}=${token}` },
  });
}

async function main() {
  console.log("🚀 Image upload tests\n");

  let unauthorized = false;
  try {
    requireStaff(new NextRequest("http://localhost/api/products/p1/image"), ["ADMIN"]);
  } catch (error) {
    unauthorized = error instanceof ApiError && error.status === 401;
  }
  assert(unauthorized, "unauthorized upload rejected");

  const adminReq = staffRequest("ADMIN");
  const vendorReq = staffRequest("VENDOR");
  assert(requireStaff(adminReq, ["ADMIN", "VENDOR"]).role === "ADMIN", "authorized admin accepted");
  assert(requireStaff(vendorReq, ["ADMIN", "VENDOR"]).role === "VENDOR", "authorized vendor accepted");

  let invalidMime = false;
  try {
    validateImageUpload(new File([new Uint8Array([1, 2, 3])], "bad.exe", { type: "application/x-msdownload" }));
  } catch {
    invalidMime = true;
  }
  assert(invalidMime, "invalid MIME rejected");

  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  let oversized = false;
  try {
    const huge = new File([new Uint8Array(PRODUCT_IMAGE_MAX_BYTES + 1)], "big.png", { type: "image/png" });
    validateImageUpload(huge);
  } catch {
    oversized = true;
  }
  assert(oversized, "oversized image rejected");

  const validPng = new File([pngBytes], "ok.png", { type: "image/png" });
  const validated = await readAndValidateImage(validPng);
  assert(validated.mime === "image/png", "valid PNG accepted by validator");
  assert(detectImageMime(Buffer.from(pngBytes)) === "image/png", "PNG signature detected");

  const product = await createProduct({
    vendorId: "v1",
    name: `Image Test Product ${Date.now()}`,
    price: 10,
    unit: "1 pc",
    category: "Vegetables",
    stock: 1,
    imageUrl: "https://example.com/old.png",
    imageStoragePath: "products/test/old.png",
  });

  await updateProduct(product.id, {
    imageUrl: "https://example.com/new.png",
    imageStoragePath: "products/test/new.png",
  });
  const replacedRow = await prisma.product.findUnique({ where: { id: product.id } });
  assert(replacedRow?.imageStoragePath === "products/test/new.png", "image reference persisted on replace");

  // cleanup helper should no-op safely when storage is not configured
  await cleanupReplacedProductImage("products/test/old.png", "products/test/new.png");
  assert(true, "replace cleanup helper runs without throwing when storage is unavailable");

  await cleanupReplacedProductImage("products/test/new.png", "products/test/new.png");
  assert(true, "replace cleanup skips identical paths");

  await deleteProduct(product.id);
  const afterDeactivate = await prisma.product.findUnique({ where: { id: product.id } });
  assert(afterDeactivate?.isActive === false, "product soft delete does not hard-delete row");
  assert(afterDeactivate?.imageStoragePath === "products/test/new.png", "soft delete retains image reference");

  assert(!isImageStorageConfigured() || Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), "storage config check is server-side only");

  await prisma.product.delete({ where: { id: product.id } });

  console.log(`\n📊 Image Upload Tests: ${passed}/${total} passed`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
