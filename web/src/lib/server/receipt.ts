import { prisma } from "../db";
import { ApiError } from "./auth";
import type { CustomerIdentity, StaffIdentity } from "./auth";
import { decimalToNumber } from "./serialize";
import { allocateInvoiceNumber } from "./invoiceNumber";
import { ensureDatabaseReady } from "./bootstrap";

export type ReceiptBusiness = {
  name: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  logoUrl: string;
};

export type ReceiptItem = {
  name: string;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type ReceiptPayload = {
  business: ReceiptBusiness;
  order: {
    id: string;
    invoiceNumber: string;
    invoiceGeneratedAt: string;
    orderDate: string;
    orderTime: string;
    orderStatus: string;
    paymentMethod: string;
    paymentMethodLabel: string;
    paymentStatus: string;
    paymentReference?: string | null;
    razorpayOrderId?: string | null;
  };
  customer: {
    name?: string | null;
    email?: string | null;
    mobile?: string | null;
    deliveryAddress: string;
  };
  items: ReceiptItem[];
  totals: {
    subtotal: number;
    discount: number;
    deliveryCharge: number;
    grandTotal: number;
  };
};

function paymentMethodLabel(method: string): string {
  const value = method.trim().toLowerCase();
  if (value === "cod" || value.includes("cash")) return "Cash on Delivery";
  if (value.includes("upi") || value.includes("online") || value.includes("card") || value.includes("razorpay")) {
    return "Online Payment";
  }
  return method;
}

function isOnlinePayment(method: string): boolean {
  const value = method.trim().toLowerCase();
  return value.includes("upi") || value.includes("online") || value.includes("card") || value.includes("razorpay");
}

export async function ensureOrderInvoiceNumber(orderId: string): Promise<string> {
  await ensureDatabaseReady();
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { invoiceNumber: true },
  });
  if (!existing) throw new ApiError("Order not found", 404);
  if (existing.invoiceNumber) return existing.invoiceNumber;

  return prisma.$transaction(async (tx) => {
    const locked = await tx.order.findUnique({
      where: { id: orderId },
      select: { invoiceNumber: true, createdAt: true },
    });
    if (!locked) throw new ApiError("Order not found", 404);
    if (locked.invoiceNumber) return locked.invoiceNumber;

    const invoiceNumber = await allocateInvoiceNumber(tx, locked.createdAt);
    await tx.order.update({
      where: { id: orderId },
      data: { invoiceNumber, invoiceGeneratedAt: new Date() },
    });
    return invoiceNumber;
  });
}

export async function assertReceiptAccess(
  orderId: string,
  options: { customer?: CustomerIdentity | null; staff?: StaffIdentity | null }
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError("Order not found", 404);

  const staff = options.staff;
  if (staff?.role === "ADMIN") return order;
  if (staff?.role === "VENDOR") {
    const vendor = await prisma.vendor.findUnique({ where: { email: staff.email.toLowerCase() } });
    if (vendor && order.vendorId === vendor.id) return order;
    throw new ApiError("Forbidden", 403);
  }
  if (staff?.role === "DELIVERY_PARTNER") return order;

  const customer = options.customer;
  if (!customer) throw new ApiError("Unauthorized", 401);
  if (order.customerId && order.customerId !== customer.id) throw new ApiError("Forbidden", 403);
  if (order.customerEmail && order.customerEmail !== customer.email.toLowerCase()) {
    throw new ApiError("Forbidden", 403);
  }
  return order;
}

async function loadBusinessSettings(): Promise<ReceiptBusiness> {
  const settings = await prisma.platformSettings.findUniqueOrThrow({ where: { id: 1 } });
  return {
    name: settings.businessName?.trim() || "Sabjiwala",
    tagline: settings.businessTagline?.trim() || "Fresh Groceries Delivered",
    address: settings.businessAddress?.trim() || null,
    phone: settings.businessPhone?.trim() || null,
    email: settings.businessEmail?.trim() || null,
    gstin: settings.businessGstin?.trim() || null,
    logoUrl: "/images/logo.png",
  };
}

export async function buildReceiptPayload(orderId: string): Promise<ReceiptPayload> {
  await ensureDatabaseReady();
  const invoiceNumber = await ensureOrderInvoiceNumber(orderId);

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { orderBy: { productName: "asc" } } },
  });

  const createdAt = order.invoiceGeneratedAt || order.createdAt;
  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const online = isOnlinePayment(order.paymentMethod);
  const paymentReference =
    order.paymentStatus === "Paid"
      ? order.razorpayPaymentId || order.paymentId || order.razorpayOrderId
      : null;

  return {
    business: await loadBusinessSettings(),
    order: {
      id: order.id,
      invoiceNumber: order.invoiceNumber || invoiceNumber,
      invoiceGeneratedAt: createdAt.toISOString(),
      orderDate: dateFormatter.format(order.createdAt),
      orderTime: timeFormatter.format(order.createdAt),
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentMethodLabel: paymentMethodLabel(order.paymentMethod),
      paymentStatus: order.paymentStatus,
      paymentReference: online ? paymentReference : null,
      razorpayOrderId: online ? order.razorpayOrderId : null,
    },
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      mobile: order.customerMobile,
      deliveryAddress: order.deliveryAddress,
    },
    items: order.items.map((item) => ({
      name: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: decimalToNumber(item.unitPrice),
      amount: decimalToNumber(item.subtotal),
    })),
    totals: {
      subtotal: decimalToNumber(order.subtotal),
      discount: decimalToNumber(order.discount),
      deliveryCharge: decimalToNumber(order.deliveryCharge),
      grandTotal: decimalToNumber(order.totalAmount),
    },
  };
}
