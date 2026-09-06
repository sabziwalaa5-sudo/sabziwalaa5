import { prisma } from "../db";
import {
  INITIAL_COUPONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_VENDORS,
  INITIAL_WALLETS,
} from "../catalogSeed";

let platformReady = false;

/** Always safe in production — ensures platform settings row exists. */
export async function ensurePlatformSettings(): Promise<void> {
  if (platformReady) return;
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  platformReady = true;
}

function demoSeedEnabled(): boolean {
  if (process.env.SEED_DEMO_DATA === "1") return true;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.SEED_DEMO_DATA !== "0";
}

let demoSeeded = false;

/**
 * Seeds demo catalog/orders only when explicitly enabled or in non-production dev.
 * Never runs automatically in production unless SEED_DEMO_DATA=1.
 */
export async function seedDemoCatalogIfEnabled(): Promise<void> {
  if (!demoSeedEnabled() || demoSeeded) return;
  const count = await prisma.product.count();
  if (count > 0) {
    demoSeeded = true;
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const vendor of INITIAL_VENDORS) {
      await tx.vendor.upsert({
        where: { id: vendor.vendor_id },
        create: {
          id: vendor.vendor_id,
          vendorName: vendor.vendor_name,
          shopName: vendor.shop_name,
          mobile: vendor.mobile,
          email: vendor.email.toLowerCase(),
          address: vendor.address,
          status: vendor.status,
          latitude: vendor.lat,
          longitude: vendor.lng,
        },
        update: {},
      });
    }

    for (const product of INITIAL_PRODUCTS) {
      await tx.product.upsert({
        where: { id: product.id },
        create: {
          id: product.id,
          vendorId: product.vendorId,
          name: product.name,
          hindiName: product.hindiName,
          price: product.price,
          oldPrice: product.oldPrice,
          unit: product.unit,
          image: product.image,
          imageUrl: product.imageUrl,
          category: product.category,
          stock: product.stock,
          rating: product.rating,
          reviewsCount: product.reviewsCount,
          badge: product.badge,
          isSeasonal: product.isSeasonal,
          isFarmFresh: product.isFarmFresh,
          isActive: true,
        },
        update: {},
      });
    }

    for (const coupon of INITIAL_COUPONS) {
      await tx.coupon.upsert({
        where: { code: coupon.code },
        create: {
          id: coupon.code,
          code: coupon.code,
          discountType: coupon.discountType,
          discount: coupon.discountValue,
          minOrder: coupon.minOrder,
          maxDiscount: coupon.maxDiscount ?? null,
          isActive: true,
        },
        update: {},
      });
    }

    for (const [email, wallet] of Object.entries(INITIAL_WALLETS)) {
      await tx.wallet.upsert({
        where: { customerEmail: email.toLowerCase() },
        create: {
          customerEmail: email.toLowerCase(),
          pointsBalance: wallet.pointsBalance,
          lifetimeEarned: wallet.lifetimeEarned,
          lifetimeRedeemed: wallet.lifetimeRedeemed,
          history: wallet.history,
        },
        update: {},
      });
    }

    for (const order of INITIAL_ORDERS) {
      await tx.order.upsert({
        where: { id: order.id },
        create: {
          id: order.id,
          customerEmail: order.customerEmail.toLowerCase(),
          customerName: order.customerName,
          customerMobile: order.customerMobile,
          vendorId: order.vendorId,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          subtotal: order.subtotal,
          deliveryCharge: order.deliveryCharges,
          discount: order.discount,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              productName: item.name,
              quantity: item.qty,
              unitPrice: item.price,
              subtotal: item.subtotal,
            })),
          },
        },
        update: {},
      });
    }
  });

  demoSeeded = true;
}

/** Called by API/repository layers before reads/writes. */
export async function ensureDatabaseReady(): Promise<void> {
  await ensurePlatformSettings();
  await seedDemoCatalogIfEnabled();
}

/** @deprecated Use ensureDatabaseReady */
export async function ensureDatabaseSeeded(): Promise<void> {
  await ensureDatabaseReady();
}
