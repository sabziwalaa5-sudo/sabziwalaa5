import { calculateOrderTotals } from "../lib/server/orderMath";
import { INITIAL_PRODUCTS } from "../lib/catalogSeed";

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://sabjiwala_user:sabjiwala_password@localhost:5432/sabjiwala5_db?schema=public";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${message}`);
  } else {
    console.error(`❌ [FAIL] ${message}`);
  }
}

async function main() {
  console.log("🚀 Starting store API / order math integration tests...\n");

  const settings = {
    id: 1,
    maintenanceMode: false,
    minOrderThreshold: 100 as unknown as import("@prisma/client").Prisma.Decimal,
    freeDeliveryThreshold: 200 as unknown as import("@prisma/client").Prisma.Decimal,
    deliveryCharge: 30 as unknown as import("@prisma/client").Prisma.Decimal,
    rewardEnabled: true,
    rewardEarningRate: 5 as unknown as import("@prisma/client").Prisma.Decimal,
    rewardPointValue: 1 as unknown as import("@prisma/client").Prisma.Decimal,
  };

  const products = INITIAL_PRODUCTS.slice(0, 2).map((p) => ({
    id: p.id,
    name: p.name,
    price: { toString: () => String(p.price) },
    stock: { toString: () => String(p.stock) },
    isActive: true,
    vendorId: p.vendorId,
  }));

  const calculated = calculateOrderTotals({
    lines: [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }],
    products,
    settings,
  });

  assert(calculated.subtotal === 140, "Server calculates subtotal from database product prices");
  assert(calculated.totalAmount === 170, "Server adds delivery charge below free-delivery threshold");
  assert(calculated.items.every((item) => item.unitPrice > 0), "Order items snapshot positive unit prices");

  try {
    calculateOrderTotals({
      lines: [{ productId: "p1", quantity: 1 }],
      products,
      settings,
    });
    assert(false, "Minimum order threshold should reject small carts");
  } catch (error) {
    assert(error instanceof Error && error.message.includes("Minimum order"), "Minimum order enforced server-side");
  }

  try {
    calculateOrderTotals({
      lines: [{ productId: "p1", quantity: 2 }, { productId: "p3", quantity: 1 }],
      products: [
        ...products,
        {
          id: "p3",
          name: "Tomato",
          price: { toString: () => "45" },
          stock: { toString: () => "10" },
          isActive: true,
          vendorId: "v2",
        },
      ],
      settings,
    });
    assert(false, "Multi-vendor carts should be rejected");
  } catch (error) {
    assert(error instanceof Error && error.message.includes("one vendor"), "Single-vendor rule enforced");
  }

  console.log(`\n📊 Store API Tests: ${passedTests}/${totalTests} passed`);
  if (passedTests !== totalTests) process.exit(1);
}

main();
