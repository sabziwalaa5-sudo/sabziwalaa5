import { prisma } from "../db";
import {
  INITIAL_COUPONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_VENDORS,
  INITIAL_WALLETS,
} from "../catalogSeed";

let seeded = false;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (seeded) return;
  const count = await prisma.product.count();
  if (count > 0) {
    seeded = true;
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const vendor of INITIAL_VENDORS) {
      await tx.vendor.create({
        data: {
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
      });
    }

    for (const product of INITIAL_PRODUCTS) {
      await tx.product.create({
        data: {
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
      });
    }

    for (const coupon of INITIAL_COUPONS) {
      await tx.coupon.create({
        data: {
          id: coupon.code,
          code: coupon.code,
          discountType: coupon.discountType,
          discount: coupon.discountValue,
          minOrder: coupon.minOrder,
          maxDiscount: coupon.maxDiscount ?? null,
          isActive: true,
        },
      });
    }

    await tx.platformSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });

    for (const [email, wallet] of Object.entries(INITIAL_WALLETS)) {
      await tx.wallet.create({
        data: {
          customerEmail: email.toLowerCase(),
          pointsBalance: wallet.pointsBalance,
          lifetimeEarned: wallet.lifetimeEarned,
          lifetimeRedeemed: wallet.lifetimeRedeemed,
          history: wallet.history,
        },
      });
    }

    for (const order of INITIAL_ORDERS) {
      await tx.order.create({
        data: {
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
      });
    }
  });

  seeded = true;
}
