export const MAX_ITEM_QTY = 99;
export const MIN_ITEM_QTY = 1;
export const DUPLICATE_ORDER_WINDOW_MS = 60_000;

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  stock?: number;
}

export interface CartMap {
  [productId: string]: number;
}

export function clampQuantity(qty: number, stock = MAX_ITEM_QTY): number {
  if (!Number.isFinite(qty) || qty < MIN_ITEM_QTY) return 0;
  return Math.min(Math.floor(qty), Math.max(0, stock), MAX_ITEM_QTY);
}

export function nextCartQuantity(
  current: number,
  delta: number,
  stock = MAX_ITEM_QTY
): number {
  return clampQuantity((current || 0) + delta, stock);
}

export function buildCartItems(cart: CartMap, products: CatalogProduct[]) {
  return Object.entries(cart)
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === id);
      const safeQty = clampQuantity(qty, product?.stock ?? MAX_ITEM_QTY);
      if (!product || safeQty < 1) return null;
      return {
        productId: id,
        name: product.name,
        qty: safeQty,
        price: product.price,
        subtotal: product.price * safeQty,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function computeBill(input: {
  subtotal: number;
  couponDiscount: number;
  redeemedPoints: number;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
}) {
  const discount = Math.max(0, (input.couponDiscount || 0) + (input.redeemedPoints || 0));
  const payableGoods = Math.max(0, input.subtotal - discount);
  const delivery =
    payableGoods > input.freeDeliveryThreshold || input.subtotal === 0
      ? 0
      : input.deliveryCharge;
  return {
    discount,
    deliveryCharges: delivery,
    totalAmount: payableGoods + delivery,
  };
}

export function orderFingerprint(input: {
  email: string;
  items: Array<{ productId: string; qty: number }>;
  totalAmount: number;
}): string {
  const items = [...input.items]
    .sort((a, b) => a.productId.localeCompare(b.productId))
    .map((i) => `${i.productId}:${i.qty}`)
    .join(",");
  return `${input.email.toLowerCase()}|${items}|${input.totalAmount}`;
}

const recentOrders = new Map<string, number>();

export function registerOrderFingerprint(fingerprint: string, now = Date.now()): boolean {
  const last = recentOrders.get(fingerprint);
  if (last && now - last < DUPLICATE_ORDER_WINDOW_MS) return false;
  recentOrders.set(fingerprint, now);
  return true;
}
