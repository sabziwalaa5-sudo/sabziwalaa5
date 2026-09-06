import { computeBill } from "../orderEngine";
import { decimalToNumber } from "./serialize";
import type { PlatformSettings } from "@prisma/client";

export type OrderLineInput = { productId: string; quantity: number };

export type CalculatedOrder = {
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    vendorId: string;
  }>;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  totalAmount: number;
  vendorId: string;
};

export function settingsToClient(settings: PlatformSettings) {
  return {
    maintenanceMode: settings.maintenanceMode,
    minOrderThreshold: decimalToNumber(settings.minOrderThreshold),
    freeDeliveryThreshold: decimalToNumber(settings.freeDeliveryThreshold),
    deliveryCharge: decimalToNumber(settings.deliveryCharge),
    rewardSettings: {
      enabled: settings.rewardEnabled,
      earningRate: decimalToNumber(settings.rewardEarningRate),
      pointValue: decimalToNumber(settings.rewardPointValue),
    },
  };
}

export function calculateOrderTotals(input: {
  lines: OrderLineInput[];
  products: Array<{
    id: string;
    name: string;
    price: { toString(): string };
    stock: { toString(): string };
    isActive: boolean;
    vendorId: string;
  }>;
  settings: PlatformSettings;
  couponDiscount?: number;
  redeemedPoints?: number;
}): CalculatedOrder {
  const couponDiscount = Math.max(0, input.couponDiscount || 0);
  const redeemedPoints = Math.max(0, input.redeemedPoints || 0);
  const deliveryCharge = decimalToNumber(input.settings.deliveryCharge);
  const freeDeliveryThreshold = decimalToNumber(input.settings.freeDeliveryThreshold);
  const minOrder = decimalToNumber(input.settings.minOrderThreshold);

  const items: CalculatedOrder["items"] = [];
  let vendorId = "";

  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
      throw new Error(`Invalid quantity for product ${line.productId}`);
    }
    const product = input.products.find((p) => p.id === line.productId);
    if (!product || !product.isActive) {
      throw new Error(`Product ${line.productId} is unavailable`);
    }
    const stock = decimalToNumber(product.stock as { toString(): string });
    if (line.quantity > stock) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    const unitPrice = decimalToNumber(product.price as { toString(): string });
    if (unitPrice <= 0) throw new Error(`Invalid price for ${product.name}`);
    vendorId = product.vendorId;
    items.push({
      productId: product.id,
      productName: product.name,
      quantity: line.quantity,
      unitPrice,
      subtotal: unitPrice * line.quantity,
      vendorId: product.vendorId,
    });
  }

  if (items.length === 0) throw new Error("Cart is empty");

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  if (subtotal < minOrder) {
    throw new Error(`Minimum order value is ₹${minOrder}`);
  }

  const bill = computeBill({
    subtotal,
    couponDiscount,
    redeemedPoints,
    deliveryCharge,
    freeDeliveryThreshold,
  });

  const uniqueVendors = new Set(items.map((i) => i.vendorId));
  if (uniqueVendors.size > 1) {
    throw new Error("Please order from one vendor at a time");
  }

  return {
    items,
    subtotal,
    deliveryCharge: bill.deliveryCharges,
    discount: bill.discount,
    totalAmount: bill.totalAmount,
    vendorId,
  };
}

export function generateOrderId(): string {
  return `SBJ${Date.now().toString().slice(-8)}`;
}
