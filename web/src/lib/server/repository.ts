import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { calculateOrderTotals, generateOrderId, settingsToClient } from "./orderMath";
import { decimalToNumber, toJson } from "./serialize";
import { ensureDatabaseReady } from "./bootstrap";
import { resolveCategoryId, setProductManualSections } from "./catalog";
import { validateAddress, validateCoordinates, validatePhone } from "../validation";
import { pointsEarnedForOrder } from "../platformSettingsServer";

export type ClientAddress = {
  id: string;
  tag: string;
  address: string;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
};

export type ClientProduct = {
  id: string;
  name: string;
  hindiName?: string | null;
  price: number;
  oldPrice?: number | null;
  unit: string;
  image?: string | null;
  imageUrl?: string | null;
  category: string;
  categoryId?: string | null;
  stock: number;
  rating?: number | null;
  reviewsCount: number;
  vendorId: string;
  badge?: string | null;
  isSeasonal: boolean;
  isFarmFresh: boolean;
  isActive: boolean;
};

export type ClientVendor = {
  vendor_id: string;
  vendor_name: string;
  shop_name: string;
  mobile: string;
  email: string;
  address: string;
  status: string;
  lat: number;
  lng: number;
};

export type ClientOrderItem = {
  productId: string | null;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
};

export type ClientOrder = {
  id: string;
  date: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerMobile?: string | null;
  deliveryAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  items: ClientOrderItem[];
  subtotal: number;
  deliveryCharges: number;
  discount: number;
  totalAmount: number;
  vendorId?: string | null;
  paymentId?: string | null;
};

export type ClientCoupon = {
  code: string;
  discountType: string;
  discountValue: number;
  minOrder: number;
  maxDiscount?: number | null;
};

export type ClientWallet = {
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  history: Array<Record<string, unknown>>;
};

function serializeProduct(product: {
  id: string;
  name: string;
  hindiName: string | null;
  price: Prisma.Decimal;
  oldPrice: Prisma.Decimal | null;
  unit: string;
  image: string | null;
  imageUrl: string | null;
  imageStoragePath?: string | null;
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

function serializeVendor(vendor: {
  id: string;
  vendorName: string;
  shopName: string;
  mobile: string;
  email: string;
  address: string;
  status: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
}): ClientVendor {
  return {
    vendor_id: vendor.id,
    vendor_name: vendor.vendorName,
    shop_name: vendor.shopName,
    mobile: vendor.mobile,
    email: vendor.email,
    address: vendor.address,
    status: vendor.status,
    lat: decimalToNumber(vendor.latitude),
    lng: decimalToNumber(vendor.longitude),
  };
}

function serializeOrder(order: {
  id: string;
  createdAt: Date;
  customerName: string | null;
  customerEmail: string | null;
  customerMobile: string | null;
  deliveryAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  subtotal: Prisma.Decimal;
  deliveryCharge: Prisma.Decimal;
  discount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  vendorId: string | null;
  paymentId: string | null;
  items: Array<{
    productId: string | null;
    productName: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    subtotal: Prisma.Decimal;
  }>;
}): ClientOrder {
  return {
    id: order.id,
    date: order.createdAt.toLocaleString("en-IN"),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerMobile: order.customerMobile,
    deliveryAddress: order.deliveryAddress,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      qty: item.quantity,
      price: decimalToNumber(item.unitPrice),
      subtotal: decimalToNumber(item.subtotal),
    })),
    subtotal: decimalToNumber(order.subtotal),
    deliveryCharges: decimalToNumber(order.deliveryCharge),
    discount: decimalToNumber(order.discount),
    totalAmount: decimalToNumber(order.totalAmount),
    vendorId: order.vendorId,
    paymentId: order.paymentId,
  };
}

function serializeCoupon(coupon: {
  code: string;
  discountType: string;
  discount: Prisma.Decimal;
  minOrder: Prisma.Decimal;
  maxDiscount: Prisma.Decimal | null;
}): ClientCoupon {
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: decimalToNumber(coupon.discount),
    minOrder: decimalToNumber(coupon.minOrder),
    maxDiscount: coupon.maxDiscount ? decimalToNumber(coupon.maxDiscount) : null,
  };
}

async function ready() {
  await ensureDatabaseReady();
}

export async function listProducts(options?: { activeOnly?: boolean; vendorId?: string }) {
  await ready();
  const products = await prisma.product.findMany({
    where: {
      ...(options?.activeOnly ? { isActive: true } : {}),
      ...(options?.vendorId ? { vendorId: options.vendorId } : {}),
    },
    orderBy: { name: "asc" },
  });
  return products.map(serializeProduct);
}

export async function getProductById(id: string) {
  await ready();
  const product = await prisma.product.findUnique({ where: { id } });
  return product ? serializeProduct(product) : null;
}

export async function createProduct(input: {
  id?: string;
  vendorId: string;
  name: string;
  hindiName?: string;
  price: number;
  oldPrice?: number;
  unit: string;
  image?: string;
  imageUrl?: string;
  imageStoragePath?: string;
  category: string;
  categoryId?: string;
  stock: number;
  badge?: string | null;
  isSeasonal?: boolean;
  isFarmFresh?: boolean;
  sectionIds?: string[];
}) {
  await ready();
  const resolved = await resolveCategoryId(input.categoryId, input.category, { requireActive: true });
  const product = await prisma.product.create({
    data: {
      id: input.id || `p_${Date.now()}`,
      vendorId: input.vendorId,
      name: input.name,
      hindiName: input.hindiName,
      price: input.price,
      oldPrice: input.oldPrice,
      unit: input.unit,
      image: input.image,
      imageUrl: input.imageUrl,
      imageStoragePath: input.imageStoragePath,
      category: resolved.categoryName,
      categoryId: resolved.categoryId,
      stock: input.stock,
      badge: input.badge,
      isSeasonal: input.isSeasonal ?? false,
      isFarmFresh: input.isFarmFresh ?? false,
      isActive: true,
    },
  });
  if (input.sectionIds?.length) {
    await setProductManualSections(product.id, input.sectionIds);
  }
  return serializeProduct(product);
}

export async function updateProduct(
  id: string,
  input: Partial<{
    name: string;
    hindiName: string;
    price: number;
    oldPrice: number;
    unit: string;
    image: string;
    imageUrl: string;
    imageStoragePath: string | null;
    category: string;
    categoryId: string | null;
    stock: number;
    badge: string | null;
    isSeasonal: boolean;
    isFarmFresh: boolean;
    isActive: boolean;
    vendorId: string;
    sectionIds?: string[];
  }>
) {
  await ready();
  const { sectionIds, categoryId, category, ...rest } = input;
  let data: Prisma.ProductUpdateInput = { ...rest };
  if (categoryId != null || category != null) {
    const existing = await prisma.product.findUnique({ where: { id }, select: { categoryId: true } });
    const resolved = await resolveCategoryId(categoryId, category, {
      existingCategoryId: existing?.categoryId,
      requireActive: true,
    });
    data = {
      ...data,
      category: resolved.categoryName,
      productCategory: resolved.categoryId
        ? { connect: { id: resolved.categoryId } }
        : { disconnect: true },
    };
  }
  const product = await prisma.product.update({ where: { id }, data });
  if (sectionIds) {
    await setProductManualSections(id, sectionIds);
  }
  return serializeProduct(product);
}

export async function deleteProduct(id: string) {
  await ready();
  await prisma.product.update({ where: { id }, data: { isActive: false } });
}

export async function listVendors() {
  await ready();
  const vendors = await prisma.vendor.findMany({ orderBy: { shopName: "asc" } });
  return vendors.map(serializeVendor);
}

export async function createVendor(input: {
  vendor_id?: string;
  vendor_name: string;
  shop_name: string;
  mobile: string;
  email: string;
  address: string;
  status: string;
  lat: number;
  lng: number;
}) {
  await ready();
  const vendor = await prisma.vendor.create({
    data: {
      id: input.vendor_id || `v_${Date.now()}`,
      vendorName: input.vendor_name,
      shopName: input.shop_name,
      mobile: input.mobile,
      email: input.email.toLowerCase(),
      address: input.address,
      status: input.status,
      latitude: input.lat,
      longitude: input.lng,
    },
  });
  return serializeVendor(vendor);
}

export async function updateVendor(
  id: string,
  input: Partial<{
    vendor_name: string;
    shop_name: string;
    mobile: string;
    email: string;
    address: string;
    status: string;
    lat: number;
    lng: number;
  }>
) {
  await ready();
  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      ...(input.vendor_name ? { vendorName: input.vendor_name } : {}),
      ...(input.shop_name ? { shopName: input.shop_name } : {}),
      ...(input.mobile ? { mobile: input.mobile } : {}),
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
      ...(input.address ? { address: input.address } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.lat != null ? { latitude: input.lat } : {}),
      ...(input.lng != null ? { longitude: input.lng } : {}),
    },
  });
  return serializeVendor(vendor);
}

export async function getPlatformSettings() {
  await ready();
  const settings = await prisma.platformSettings.findUniqueOrThrow({ where: { id: 1 } });
  return settingsToClient(settings);
}

export async function updatePlatformSettings(input: {
  maintenanceMode?: boolean;
  minOrderThreshold?: number;
  freeDeliveryThreshold?: number;
  deliveryCharge?: number;
  rewardEnabled?: boolean;
  rewardEarningRate?: number;
  rewardPointValue?: number;
}) {
  await ready();
  const settings = await prisma.platformSettings.update({
    where: { id: 1 },
    data: {
      ...(input.maintenanceMode != null ? { maintenanceMode: input.maintenanceMode } : {}),
      ...(input.minOrderThreshold != null ? { minOrderThreshold: input.minOrderThreshold } : {}),
      ...(input.freeDeliveryThreshold != null ? { freeDeliveryThreshold: input.freeDeliveryThreshold } : {}),
      ...(input.deliveryCharge != null ? { deliveryCharge: input.deliveryCharge } : {}),
      ...(input.rewardEnabled != null ? { rewardEnabled: input.rewardEnabled } : {}),
      ...(input.rewardEarningRate != null ? { rewardEarningRate: input.rewardEarningRate } : {}),
      ...(input.rewardPointValue != null ? { rewardPointValue: input.rewardPointValue } : {}),
    },
  });
  return settingsToClient(settings);
}

export async function listCoupons(activeOnly = false) {
  await ready();
  const coupons = await prisma.coupon.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { code: "asc" },
  });
  return coupons.map(serializeCoupon);
}

export async function upsertCoupon(input: ClientCoupon & { isActive?: boolean }) {
  await ready();
  const coupon = await prisma.coupon.upsert({
    where: { code: input.code },
    create: {
      id: input.code,
      code: input.code,
      discountType: input.discountType,
      discount: input.discountValue,
      minOrder: input.minOrder,
      maxDiscount: input.maxDiscount ?? null,
      isActive: input.isActive ?? true,
    },
    update: {
      discountType: input.discountType,
      discount: input.discountValue,
      minOrder: input.minOrder,
      maxDiscount: input.maxDiscount ?? null,
      isActive: input.isActive ?? true,
    },
  });
  return serializeCoupon(coupon);
}

export async function deleteCoupon(code: string) {
  await ready();
  await prisma.coupon.update({ where: { code }, data: { isActive: false } });
}

export async function getWallet(customerEmail: string): Promise<ClientWallet> {
  await ready();
  const wallet = await prisma.wallet.findUnique({
    where: { customerEmail: customerEmail.toLowerCase() },
  });
  if (!wallet) {
    return { pointsBalance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, history: [] };
  }
  return {
    pointsBalance: decimalToNumber(wallet.pointsBalance),
    lifetimeEarned: decimalToNumber(wallet.lifetimeEarned),
    lifetimeRedeemed: decimalToNumber(wallet.lifetimeRedeemed),
    history: toJson(wallet.history as Array<Record<string, unknown>>),
  };
}

export async function updateWalletAfterOrder(input: {
  customerEmail: string;
  pointsRedeemed: number;
  pointsEarned: number;
  orderId: string;
  orderDate: string;
}) {
  await ready();
  const email = input.customerEmail.toLowerCase();
  const existing = await prisma.wallet.findUnique({ where: { customerEmail: email } });
  const base = existing || {
    pointsBalance: 0,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
    history: [] as Array<Record<string, unknown>>,
  };
  const history = Array.isArray(base.history) ? [...base.history] : [];
  const redeemed = Math.max(0, input.pointsRedeemed);
  const earned = Math.max(0, input.pointsEarned);
  let balance = decimalToNumber(base.pointsBalance);
  if (redeemed > 0) {
    balance -= redeemed;
    history.push({
      id: `tx_${Date.now()}_r`,
      type: "REDEEMED",
      points: redeemed,
      orderId: input.orderId,
      date: input.orderDate,
      balance,
    });
  }
  balance += earned;
  history.push({
    id: `tx_${Date.now()}_e`,
    type: "EARNED",
    points: earned,
    orderId: input.orderId,
    date: input.orderDate,
    balance,
  });

  await prisma.wallet.upsert({
    where: { customerEmail: email },
    create: {
      customerEmail: email,
      pointsBalance: balance,
      lifetimeEarned: decimalToNumber(base.lifetimeEarned) + earned,
      lifetimeRedeemed: decimalToNumber(base.lifetimeRedeemed) + redeemed,
      history: history as object,
    },
    update: {
      pointsBalance: balance,
      lifetimeEarned: { increment: earned },
      lifetimeRedeemed: { increment: redeemed },
      history: history as object,
    },
  });
}

export function newGuestToken(): string {
  return randomBytes(16).toString("hex");
}

export async function getOrCreateCart(input: { userId?: string | null; guestToken?: string | null }) {
  await ready();
  if (input.userId) {
    const existing = await prisma.cart.findUnique({ where: { userId: input.userId } });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId: input.userId } });
  }
  if (input.guestToken) {
    const existing = await prisma.cart.findUnique({ where: { guestToken: input.guestToken } });
    if (existing) return existing;
    return prisma.cart.create({ data: { guestToken: input.guestToken } });
  }
  const guestToken = newGuestToken();
  return prisma.cart.create({ data: { guestToken } });
}

export async function mergeGuestCartIntoUser(guestToken: string, userId: string) {
  await ready();
  const guestCart = await prisma.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });
  if (!guestCart || guestCart.items.length === 0) return;

  const userCart = await getOrCreateCart({ userId });
  for (const item of guestCart.items) {
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(99, existing.quantity + item.quantity) },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: userCart.id, productId: item.productId, quantity: item.quantity },
      });
    }
  }
  await prisma.cart.delete({ where: { id: guestCart.id } });
}

export async function getCartMap(cartId: string): Promise<Record<string, number>> {
  const items = await prisma.cartItem.findMany({ where: { cartId } });
  const map: Record<string, number> = {};
  for (const item of items) map[item.productId] = item.quantity;
  return map;
}

export async function setCartItemQuantity(cartId: string, productId: string, quantity: number) {
  await ready();
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw new Error("Product unavailable");
  const stock = decimalToNumber(product.stock);
  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { cartId, productId } });
    return;
  }
  if (quantity > stock) throw new Error(`Only ${stock} units available`);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity },
    update: { quantity },
  });
}

export async function clearCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}

function couponDiscountAmount(
  coupon: { discountType: string; discount: Prisma.Decimal; maxDiscount: Prisma.Decimal | null },
  subtotal: number
): number {
  const value = decimalToNumber(coupon.discount);
  if (coupon.discountType === "percentage") {
    const raw = (subtotal * value) / 100;
    const max = coupon.maxDiscount ? decimalToNumber(coupon.maxDiscount) : raw;
    return Math.min(raw, max);
  }
  return value;
}

export async function createOrder(input: {
  customerId?: string | null;
  customerEmail: string;
  customerName?: string;
  customerMobile: string;
  deliveryAddress?: string;
  addressId?: string;
  latitude?: number;
  longitude?: number;
  paymentMethod: string;
  lines: Array<{ productId: string; quantity: number }>;
  couponCode?: string;
  redeemedPoints?: number;
  idempotencyKey?: string;
}) {
  await ready();

  if (input.idempotencyKey) {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      const full = await prisma.order.findUniqueOrThrow({
        where: { id: existing.id },
        include: { items: true },
      });
      return serializeOrder(full);
    }
  }

  let deliveryAddress = input.deliveryAddress || "";
  let latitude = input.latitude;
  let longitude = input.longitude;
  let customerMobile = input.customerMobile;
  let addressId: string | null = null;

  if (input.addressId && input.customerId) {
    const addr = await getCustomerAddressForUser(input.addressId, {
      id: input.customerId,
      email: input.customerEmail,
    });
    deliveryAddress = addr.address;
    latitude = addr.lat ?? latitude;
    longitude = addr.lng ?? longitude;
    if (addr.phone) customerMobile = addr.phone;
    addressId = addr.id;
  }

  const addressCheck = validateAddress(deliveryAddress);
  if (!addressCheck.valid) throw new Error(addressCheck.error || "Invalid delivery address");

  if (latitude != null && longitude != null) {
    const coordCheck = validateCoordinates(latitude, longitude);
    if (!coordCheck.valid) throw new Error(coordCheck.error || "Invalid coordinates");
  }

  const phoneCheck = validatePhone(customerMobile.replace(/\D/g, "").slice(-10) || customerMobile);
  if (!phoneCheck.valid && customerMobile !== "0000000000") {
    throw new Error(phoneCheck.error || "Invalid mobile number");
  }
  if (phoneCheck.valid) customerMobile = phoneCheck.sanitized;

  const settings = await prisma.platformSettings.findUniqueOrThrow({ where: { id: 1 } });
  const productIds = input.lines.map((l) => l.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  let couponDiscount = 0;
  if (input.couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: input.couponCode.toUpperCase(), isActive: true },
    });
    if (!coupon) throw new Error("Invalid coupon code");
    const subtotalPreview = input.lines.reduce((sum, line) => {
      const p = products.find((x) => x.id === line.productId);
      return sum + (p ? decimalToNumber(p.price) * line.quantity : 0);
    }, 0);
    if (subtotalPreview < decimalToNumber(coupon.minOrder)) {
      throw new Error(`Minimum order of ₹${decimalToNumber(coupon.minOrder)} required for coupon`);
    }
    couponDiscount = couponDiscountAmount(coupon, subtotalPreview);
  }

  const wallet = await getWallet(input.customerEmail);
  const pointValue = decimalToNumber(settings.rewardPointValue);
  const maxRedeem = Math.floor(wallet.pointsBalance * pointValue);
  const redeemedPoints = Math.max(0, Math.min(input.redeemedPoints || 0, maxRedeem));

  const calculated = calculateOrderTotals({
    lines: input.lines,
    products,
    settings,
    couponDiscount,
    redeemedPoints,
  });

  const orderId = generateOrderId();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        id: orderId,
        customerId: input.customerId || null,
        customerEmail: input.customerEmail.toLowerCase(),
        customerName: input.customerName || input.customerEmail.split("@")[0],
        customerMobile: input.customerMobile,
        vendorId: calculated.vendorId,
        orderStatus: "Pending",
        paymentStatus: "Pending",
        paymentMethod: input.paymentMethod,
        subtotal: calculated.subtotal,
        deliveryCharge: calculated.deliveryCharge,
        discount: calculated.discount,
        totalAmount: calculated.totalAmount,
        deliveryAddress: addressCheck.sanitized,
        latitude,
        longitude,
        addressId,
        idempotencyKey: input.idempotencyKey,
        items: {
          create: calculated.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of calculated.items) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) {
        throw new Error(`Insufficient stock for ${item.productName}`);
      }
    }

    return created;
  });

  const earned = pointsEarnedForOrder(calculated.totalAmount, settingsToClient(settings));
  await updateWalletAfterOrder({
    customerEmail: input.customerEmail,
    pointsRedeemed: redeemedPoints,
    pointsEarned: earned,
    orderId,
    orderDate: order.createdAt.toLocaleString("en-IN"),
  });

  return serializeOrder(order);
}

export async function listOrders(filters?: {
  customerEmail?: string;
  customerId?: string;
  vendorId?: string;
  vendorEmail?: string;
}) {
  await ready();
  let vendorId = filters?.vendorId;
  if (filters?.vendorEmail && !vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { email: filters.vendorEmail.toLowerCase() } });
    vendorId = vendor?.id;
  }

  const orders = await prisma.order.findMany({
    where: {
      ...(filters?.customerEmail ? { customerEmail: filters.customerEmail.toLowerCase() } : {}),
      ...(filters?.customerId ? { customerId: filters.customerId } : {}),
      ...(vendorId ? { vendorId } : {}),
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return orders.map(serializeOrder);
}

export async function getOrderById(id: string) {
  await ready();
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  return order ? serializeOrder(order) : null;
}

export async function updateOrderStatus(id: string, orderStatus: string) {
  await ready();
  const order = await prisma.order.update({
    where: { id },
    data: { orderStatus },
    include: { items: true },
  });
  return serializeOrder(order);
}

export async function updateOrderPayment(input: {
  orderId: string;
  paymentId: string;
  paymentStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  checkoutToken?: string;
}) {
  await ready();

  if (input.razorpayPaymentId) {
    const captured = await prisma.paymentCapture.findUnique({
      where: { providerPaymentId: input.razorpayPaymentId },
    });
    if (captured) {
      const order = await getOrderById(input.orderId);
      if (!order) throw new Error("Order not found");
      return order;
    }
  }

  const order = await prisma.order.findUniqueOrThrow({ where: { id: input.orderId } });
  const expectedPaise = Math.round(decimalToNumber(order.totalAmount) * 100);

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: input.orderId },
      data: {
        paymentId: input.paymentId,
        paymentStatus: input.paymentStatus,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        checkoutToken: input.checkoutToken,
      },
    });
    if (input.razorpayPaymentId && input.paymentStatus === "Paid") {
      await tx.paymentCapture.create({
        data: {
          providerPaymentId: input.razorpayPaymentId,
          orderId: input.orderId,
          amountPaise: expectedPaise,
        },
      });
    }
  });

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: input.orderId },
    include: { items: true },
  });
  return serializeOrder(updated);
}

export async function getOrderAmountRupees(orderId: string): Promise<number> {
  await ready();
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  return decimalToNumber(order.totalAmount);
}

export async function assertOrderAccess(orderId: string, customer?: { id: string; email: string } | null) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!customer) throw new Error("Unauthorized");
  if (order.customerId && order.customerId !== customer.id) throw new Error("Forbidden");
  if (order.customerEmail && order.customerEmail !== customer.email.toLowerCase()) {
    throw new Error("Forbidden");
  }
}

export async function listWallets() {
  await ready();
  const wallets = await prisma.wallet.findMany();
  const result: Record<string, ClientWallet> = {};
  for (const w of wallets) {
    result[w.customerEmail] = {
      pointsBalance: decimalToNumber(w.pointsBalance),
      lifetimeEarned: decimalToNumber(w.lifetimeEarned),
      lifetimeRedeemed: decimalToNumber(w.lifetimeRedeemed),
      history: toJson(w.history as Array<Record<string, unknown>>),
    };
  }
  return result;
}

function serializeAddress(row: {
  id: string;
  tag: string;
  address: string;
  phone: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  isDefault: boolean;
}): ClientAddress {
  return {
    id: row.id,
    tag: row.tag,
    address: row.address,
    phone: row.phone,
    lat: row.latitude != null ? decimalToNumber(row.latitude) : null,
    lng: row.longitude != null ? decimalToNumber(row.longitude) : null,
    isDefault: row.isDefault,
  };
}

export async function listCustomerAddresses(customer: { id: string; email: string }): Promise<ClientAddress[]> {
  await ready();
  const rows = await prisma.customerAddress.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(serializeAddress);
}

export async function getCustomerAddressForUser(
  addressId: string,
  customer: { id: string; email: string }
): Promise<ClientAddress> {
  await ready();
  const row = await prisma.customerAddress.findFirst({
    where: { id: addressId, customerId: customer.id },
  });
  if (!row) throw new Error("Address not found");
  return serializeAddress(row);
}

export async function createCustomerAddress(
  customer: { id: string; email: string },
  input: { tag: string; address: string; phone?: string; lat?: number; lng?: number; isDefault?: boolean }
): Promise<ClientAddress> {
  await ready();
  const addressCheck = validateAddress(input.address);
  if (!addressCheck.valid) throw new Error(addressCheck.error || "Invalid address");

  let phone: string | null = null;
  if (input.phone) {
    const phoneCheck = validatePhone(input.phone.replace(/\D/g, "").slice(-10));
    if (!phoneCheck.valid) throw new Error(phoneCheck.error || "Invalid phone");
    phone = phoneCheck.sanitized;
  }

  if (input.lat != null && input.lng != null) {
    const coordCheck = validateCoordinates(input.lat, input.lng);
    if (!coordCheck.valid) throw new Error(coordCheck.error || "Invalid coordinates");
  }

  const existing = await prisma.customerAddress.count({ where: { customerId: customer.id } });
  const makeDefault = input.isDefault ?? existing === 0;

  return prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }
    const row = await tx.customerAddress.create({
      data: {
        customerId: customer.id,
        customerEmail: customer.email.toLowerCase(),
        tag: input.tag.slice(0, 40) || "Home",
        address: addressCheck.sanitized,
        phone,
        latitude: input.lat,
        longitude: input.lng,
        isDefault: makeDefault,
      },
    });
    return serializeAddress(row);
  });
}

export async function updateCustomerAddress(
  addressId: string,
  customer: { id: string; email: string },
  input: Partial<{ tag: string; address: string; phone: string; lat: number; lng: number; isDefault: boolean }>
): Promise<ClientAddress> {
  await ready();
  await getCustomerAddressForUser(addressId, customer);

  const data: Prisma.CustomerAddressUpdateInput = {};
  if (input.tag != null) data.tag = input.tag.slice(0, 40);
  if (input.address != null) {
    const addressCheck = validateAddress(input.address);
    if (!addressCheck.valid) throw new Error(addressCheck.error || "Invalid address");
    data.address = addressCheck.sanitized;
  }
  if (input.phone != null) {
    const phoneCheck = validatePhone(input.phone.replace(/\D/g, "").slice(-10));
    if (!phoneCheck.valid) throw new Error(phoneCheck.error || "Invalid phone");
    data.phone = phoneCheck.sanitized;
  }
  if (input.lat != null && input.lng != null) {
    const coordCheck = validateCoordinates(input.lat, input.lng);
    if (!coordCheck.valid) throw new Error(coordCheck.error || "Invalid coordinates");
    data.latitude = input.lat;
    data.longitude = input.lng;
  }

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
      data.isDefault = true;
    }
    const row = await tx.customerAddress.update({ where: { id: addressId }, data });
    return serializeAddress(row);
  });
}

export async function deleteCustomerAddress(addressId: string, customer: { id: string; email: string }): Promise<void> {
  await ready();
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, customerId: customer.id },
  });
  if (!existing) throw new Error("Address not found");
  await prisma.customerAddress.delete({ where: { id: addressId } });
  if (existing.isDefault) {
    const next = await prisma.customerAddress.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
}
