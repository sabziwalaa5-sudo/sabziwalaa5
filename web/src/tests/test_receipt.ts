/**
 * Receipt / invoice generation integration tests.
 * Requires DATABASE_URL. Uses isolated test customer emails.
 */

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://sabjiwala_user:sabjiwala_password@localhost:5432/sabjiwala5_db?schema=public";
process.env.SEED_DEMO_DATA = process.env.SEED_DEMO_DATA || "1";

import { prisma } from "../lib/db";
import { createOrder } from "../lib/server/repository";
import {
  assertReceiptAccess,
  buildReceiptPayload,
  ensureOrderInvoiceNumber,
} from "../lib/server/receipt";
import { formatInvoiceNumber } from "../lib/server/invoiceNumber";
import { ensurePlatformSettings, seedDemoCatalogIfEnabled } from "../lib/server/bootstrap";
import { ApiError } from "../lib/server/auth";

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

const customerA = { id: "receipt-test-user-a", email: "receipt-a@test.local" };
const customerB = { id: "receipt-test-user-b", email: "receipt-b@test.local" };

async function cleanup() {
  await prisma.orderItem.deleteMany({
    where: { order: { customerEmail: { in: [customerA.email, customerB.email] } } },
  });
  await prisma.order.deleteMany({
    where: { customerEmail: { in: [customerA.email, customerB.email] } },
  });
}

async function main() {
  console.log("🚀 Receipt / invoice integration tests\n");
  await ensurePlatformSettings();
  await seedDemoCatalogIfEnabled();
  await cleanup();

  // COD order with purchase-time prices
  const codOrder = await createOrder({
    customerId: customerA.id,
    customerEmail: customerA.email,
    customerMobile: "9876543210",
    paymentMethod: "Cash on Delivery",
    deliveryAddress: "12 Receipt Lane, New Delhi 110038",
    lines: [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }],
    idempotencyKey: `receipt-cod-${Date.now()}`,
  });

  assert(Boolean(codOrder.invoiceNumber), "New order receives server-generated invoice number");
  assert(/^SZ-\d{4}-\d{6}$/.test(codOrder.invoiceNumber || ""), "Invoice number matches SZ-YYYY-NNNNNN format");

  const receipt = await buildReceiptPayload(codOrder.id);
  assert(receipt.order.invoiceNumber === codOrder.invoiceNumber, "Receipt uses persisted invoice number");
  assert(receipt.items.length === 2, "Receipt lists all order items");
  assert(receipt.items.every((item) => item.unitPrice > 0 && item.amount > 0), "Receipt item prices are positive");
  assert(
    receipt.totals.grandTotal === codOrder.totalAmount,
    "Receipt grand total matches authoritative order total"
  );
  assert(
    Math.abs(receipt.totals.subtotal - codOrder.subtotal) < 0.01,
    "Receipt subtotal matches order record"
  );
  assert(receipt.order.paymentMethodLabel === "Cash on Delivery", "COD payment method label is correct");
  assert(receipt.order.paymentStatus === "Pending", "COD order shows pending payment status");
  assert(!receipt.order.paymentReference, "COD receipt does not show online payment reference");

  // Purchase-time price snapshot: change product price, receipt should keep original
  const itemBefore = receipt.items.find((i) => i.name.toLowerCase().includes("potato") || i.name);
  const originalUnitPrice = itemBefore?.unitPrice ?? 0;
  await prisma.product.update({ where: { id: "p1" }, data: { price: 999 } });
  const receiptAfterPriceChange = await buildReceiptPayload(codOrder.id);
  const sameItem = receiptAfterPriceChange.items.find((i) => i.name === itemBefore?.name);
  assert(
    sameItem?.unitPrice === originalUnitPrice,
    "Receipt uses purchase-time unit price, not current catalog price"
  );
  await prisma.product.update({ where: { id: "p1" }, data: { price: 40 } });

  // Authorization: customer A can access own receipt
  await assertReceiptAccess(codOrder.id, { customer: customerA, staff: null });
  assert(true, "Customer A can access own order receipt");

  // Customer B forbidden
  let forbidden = false;
  try {
    await assertReceiptAccess(codOrder.id, { customer: customerB, staff: null });
  } catch (e) {
    forbidden = e instanceof ApiError && e.status === 403;
  }
  assert(forbidden, "Customer B cannot access Customer A receipt");

  // Admin staff can access any receipt
  await assertReceiptAccess(codOrder.id, {
    customer: null,
    staff: { email: "admin@test.local", role: "ADMIN" },
  });
  assert(true, "Admin staff can access customer receipt");

  // Online payment order with failed status
  const onlineOrder = await createOrder({
    customerId: customerA.id,
    customerEmail: customerA.email,
    customerMobile: "9876543210",
    paymentMethod: "UPI",
    deliveryAddress: "12 Receipt Lane, New Delhi 110038",
    lines: [{ productId: "p1", quantity: 3 }],
    idempotencyKey: `receipt-upi-${Date.now()}`,
  });
  await prisma.order.update({
    where: { id: onlineOrder.id },
    data: {
      paymentStatus: "Failed",
      razorpayOrderId: "order_test_123",
      razorpayPaymentId: null,
    },
  });
  const failedReceipt = await buildReceiptPayload(onlineOrder.id);
  assert(failedReceipt.order.paymentStatus === "Failed", "Failed payment shows Failed status");
  assert(!failedReceipt.order.paymentReference, "Failed payment does not show Paid reference");

  // Paid online order shows reference
  await prisma.order.update({
    where: { id: onlineOrder.id },
    data: {
      paymentStatus: "Paid",
      razorpayPaymentId: "pay_test_456",
    },
  });
  const paidReceipt = await buildReceiptPayload(onlineOrder.id);
  assert(paidReceipt.order.paymentStatus === "Paid", "Successful online payment shows Paid");
  assert(paidReceipt.order.paymentReference === "pay_test_456", "Paid receipt shows payment reference");
  assert(paidReceipt.order.paymentMethodLabel === "Online Payment", "Online payment method label");

  // Invoice number allocation is unique under concurrent-style sequential calls
  const legacyOrder = await prisma.order.create({
    data: {
      id: `RCPT-LEG-${Date.now()}`,
      customerEmail: customerA.email,
      paymentMethod: "Cash on Delivery",
      orderStatus: "Delivered",
      paymentStatus: "Pending",
      subtotal: 100,
      deliveryCharge: 30,
      discount: 0,
      totalAmount: 130,
      deliveryAddress: "Legacy address",
      invoiceNumber: null,
      items: {
        create: [{
          productName: "Legacy Tomato",
          unit: "1 kg",
          quantity: 1,
          unitPrice: 100,
          subtotal: 100,
        }],
      },
    },
  });
  const allocated = await ensureOrderInvoiceNumber(legacyOrder.id);
  assert(/^SZ-\d{4}-\d{6}$/.test(allocated), "Legacy order without invoice gets allocated number");
  const reallocated = await ensureOrderInvoiceNumber(legacyOrder.id);
  assert(allocated === reallocated, "Invoice number is stable after first allocation");

  // Business settings appear on receipt when configured
  await prisma.platformSettings.update({
    where: { id: 1 },
    data: {
      businessName: "Sabjiwala Test Store",
      businessAddress: "Rajokri, New Delhi",
      businessPhone: "9999999999",
      businessGstin: "29TEST0000TEST1Z5",
    },
  });
  const branded = await buildReceiptPayload(codOrder.id);
  assert(branded.business.name === "Sabjiwala Test Store", "Receipt loads business name from platform settings");
  assert(branded.business.address?.includes("Rajokri"), "Receipt loads business address from settings");
  assert(branded.business.gstin === "29TEST0000TEST1Z5", "Receipt shows GSTIN when configured");
  assert(branded.business.logoUrl === "/images/logo.png", "Receipt includes logo path");

  // Format helper
  assert(formatInvoiceNumber(2026, 1) === "SZ-2026-000001", "Invoice format helper produces padded sequence");

  await prisma.orderItem.deleteMany({ where: { orderId: legacyOrder.id } });
  await prisma.order.deleteMany({ where: { id: legacyOrder.id } });
  await cleanup();

  console.log(`\n📊 Receipt tests: ${passed}/${total} passed`);
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
