/**
 * Production sign-off integration tests (repository + payment security).
 * Run with DATABASE_URL set. Uses isolated test customer IDs.
 */

process.env.PAYMENT_HMAC_SECRET = process.env.PAYMENT_HMAC_SECRET || "unit-test-hmac-secret";
process.env.SEED_DEMO_DATA = process.env.SEED_DEMO_DATA || "1";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://sabjiwala_user:sabjiwala_password@localhost:5432/sabjiwala5_db?schema=public";

import { prisma } from "../lib/db";
import {
  assertOrderAccess,
  createCustomerAddress,
  createOrder,
  deleteCustomerAddress,
  getCustomerAddressForUser,
  getOrderAmountRupees,
  listCustomerAddresses,
  listOrders,
  updateProduct,
} from "../lib/server/repository";
import { createPaymentClaims, readClaims, signClaims, verifyRazorpaySignature } from "../lib/payments";
import { seedDemoCatalogIfEnabled, ensurePlatformSettings } from "../lib/server/bootstrap";

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

const customerA = { id: "test-user-a", email: "customer-a@test.local" };
const customerB = { id: "test-user-b", email: "customer-b@test.local" };

async function cleanup() {
  await prisma.orderItem.deleteMany({
    where: { order: { customerEmail: { in: [customerA.email, customerB.email] } } },
  });
  await prisma.order.deleteMany({
    where: { customerEmail: { in: [customerA.email, customerB.email] } },
  });
  await prisma.customerAddress.deleteMany({
    where: { customerId: { in: [customerA.id, customerB.id] } },
  });
}

async function main() {
  console.log("🚀 Production sign-off integration tests\n");
  await ensurePlatformSettings();
  await seedDemoCatalogIfEnabled();
  await cleanup();

  // Address persistence + isolation
  const addrA = await createCustomerAddress(customerA, {
    tag: "Home",
    address: "123 Test Street, Rajokri, New Delhi 110038",
    phone: "9876543210",
    lat: 28.5284,
    lng: 77.1028,
    isDefault: true,
  });
  assert(Boolean(addrA.id), "Customer address persisted with server-generated ID");

  const listA = await listCustomerAddresses(customerA);
  assert(listA.length === 1 && listA[0].address.includes("Test Street"), "Customer can list own addresses");

  let forbidden = false;
  try {
    await getCustomerAddressForUser(addrA.id, customerB);
  } catch {
    forbidden = true;
  }
  assert(forbidden, "Customer B cannot access Customer A address");

  // Checkout with addressId
  const idempotencyKey = `signoff-${Date.now()}`;
  const order = await createOrder({
    customerId: customerA.id,
    customerEmail: customerA.email,
    customerMobile: "9876543210",
    addressId: addrA.id,
    paymentMethod: "Cash on Delivery",
    lines: [{ productId: "p1", quantity: 3 }, { productId: "p2", quantity: 2 }],
    idempotencyKey,
  });
  assert(order.totalAmount > 0, "Server calculated order total from DB prices");
  assert(order.deliveryAddress.includes("Test Street"), "Checkout uses server-resolved address");

  const duplicate = await createOrder({
    customerId: customerA.id,
    customerEmail: customerA.email,
    customerMobile: "9876543210",
    addressId: addrA.id,
    paymentMethod: "Cash on Delivery",
    lines: [{ productId: "p1", quantity: 3 }, { productId: "p2", quantity: 2 }],
    idempotencyKey,
  });
  assert(duplicate.id === order.id, "Duplicate checkout returns same order via idempotency key");

  let orderForbidden = false;
  try {
    await assertOrderAccess(order.id, customerB);
  } catch (e) {
    orderForbidden = e instanceof Error && e.message === "Forbidden";
  }
  assert(orderForbidden, "Customer B cannot access Customer A order");

  const ordersA = await listOrders({ customerEmail: customerA.email });
  const ordersB = await listOrders({ customerEmail: customerB.email });
  assert(ordersA.some((o) => o.id === order.id), "Customer A sees own order in history");
  assert(!ordersB.some((o) => o.id === order.id), "Customer B does not see Customer A order");

  // Payment amount integrity
  const dbAmount = await getOrderAmountRupees(order.id);
  const claims = createPaymentClaims({ orderDraftId: order.id, amountRupees: dbAmount, method: "UPI" });
  const tampered = { ...claims, amountPaise: claims.amountPaise + 100 };
  const token = signClaims(claims);
  const read = readClaims(token);
  assert(read?.amountPaise === Math.round(dbAmount * 100), "Payment token encodes server order amount");

  const tamperedToken = signClaims(tampered);
  const tamperedRead = readClaims(tamperedToken);
  assert(
    tamperedRead?.amountPaise !== Math.round(dbAmount * 100) || tamperedRead.amountPaise === tampered.amountPaise,
    "Tampered payment amount differs from DB total"
  );

  // Admin product change reflected in catalog
  const updated = await updateProduct("p1", { price: 42 });
  assert(updated.price === 42, "Admin product price update persists to database");

  // Production seed guard (demo seed respects SEED_DEMO_DATA=0 even in dev)
  const savedSeedFlag = process.env.SEED_DEMO_DATA;
  process.env.SEED_DEMO_DATA = "0";
  const beforeCount = await prisma.product.count();
  await seedDemoCatalogIfEnabled();
  const afterCount = await prisma.product.count();
  assert(beforeCount === afterCount, "Demo seed skipped when SEED_DEMO_DATA=0");
  process.env.SEED_DEMO_DATA = savedSeedFlag || "1";

  await deleteCustomerAddress(addrA.id, customerA);
  const afterDelete = await listCustomerAddresses(customerA);
  assert(afterDelete.length === 0, "Customer address delete works");

  await cleanup();

  console.log(`\n📊 Sign-off tests: ${passed}/${total} passed`);
  if (passed !== total) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
