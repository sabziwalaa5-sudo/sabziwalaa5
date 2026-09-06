import { NextRequest } from "next/server";
import { withApiHandler, jsonOk } from "../../../lib/server/routeUtils";
import {
  createOrder,
  getOrderById,
  listOrders,
  updateOrderStatus,
  updateOrderPayment,
  assertOrderAccess,
} from "../../../lib/server/repository";
import { getCustomerFromRequest, getStaffFromRequest, requireStaff, vendorEmailForStaff } from "../../../lib/server/auth";

export const GET = withApiHandler(async (request: NextRequest) => {
  const customer = await getCustomerFromRequest(request);
  const staff = getStaffFromRequest(request);
  const orderId = request.nextUrl.searchParams.get("id");

  if (orderId) {
    const order = await getOrderById(orderId);
    if (!order) throw new Error("Order not found");
    if (staff?.role === "ADMIN") return jsonOk({ order });
    if (staff?.role === "VENDOR") {
      const vendorEmail = vendorEmailForStaff(staff);
      const vendorOrders = await listOrders({ vendorEmail: vendorEmail || undefined });
      if (!vendorOrders.find((o) => o.id === orderId)) throw new Error("Forbidden");
      return jsonOk({ order });
    }
    if (customer) {
      await assertOrderAccess(orderId, customer);
      return jsonOk({ order });
    }
    throw new Error("Unauthorized");
  }

  if (staff?.role === "ADMIN") {
    return jsonOk({ orders: await listOrders() });
  }
  if (staff?.role === "VENDOR" || staff?.role === "DELIVERY_PARTNER") {
    const vendorEmail = staff.role === "VENDOR" ? vendorEmailForStaff(staff) : undefined;
    if (staff.role === "VENDOR" && vendorEmail) {
      return jsonOk({ orders: await listOrders({ vendorEmail }) });
    }
    return jsonOk({ orders: await listOrders() });
  }
  if (customer) {
    return jsonOk({ orders: await listOrders({ customerEmail: customer.email, customerId: customer.id }) });
  }
  throw new Error("Unauthorized");
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const customer = await getCustomerFromRequest(request);
  if (!customer) throw new Error("Login required to place orders");

  const body = await request.json();
  const lines = Array.isArray(body.lines)
    ? body.lines.map((l: { productId: string; quantity: number }) => ({
        productId: String(l.productId),
        quantity: Number(l.quantity),
      }))
    : [];

  const order = await createOrder({
    customerId: customer.id,
    customerEmail: customer.email,
    customerName: body.customerName ? String(body.customerName) : undefined,
    customerMobile: String(body.customerMobile || "0000000000"),
    deliveryAddress: String(body.deliveryAddress || ""),
    latitude: body.latitude != null ? Number(body.latitude) : undefined,
    longitude: body.longitude != null ? Number(body.longitude) : undefined,
    paymentMethod: String(body.paymentMethod || "Cash on Delivery"),
    lines,
    couponCode: body.couponCode ? String(body.couponCode) : undefined,
    redeemedPoints: body.redeemedPoints != null ? Number(body.redeemedPoints) : 0,
    idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : undefined,
  });

  return jsonOk({ order }, { status: 201 });
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  const staff = getStaffFromRequest(request);
  const customer = await getCustomerFromRequest(request);
  const body = await request.json();
  const orderId = String(body.orderId || "");

  if (body.orderStatus && staff) {
    requireStaff(request, ["ADMIN", "VENDOR", "DELIVERY_PARTNER"]);
    const order = await updateOrderStatus(orderId, String(body.orderStatus));
    return jsonOk({ order });
  }

  if (body.paymentStatus && (staff || customer)) {
    if (customer) await assertOrderAccess(orderId, customer);
    const order = await updateOrderPayment({
      orderId,
      paymentId: String(body.paymentId || ""),
      paymentStatus: String(body.paymentStatus),
      razorpayOrderId: body.razorpayOrderId ? String(body.razorpayOrderId) : undefined,
      razorpayPaymentId: body.razorpayPaymentId ? String(body.razorpayPaymentId) : undefined,
      checkoutToken: body.checkoutToken ? String(body.checkoutToken) : undefined,
    });
    return jsonOk({ order });
  }

  throw new Error("Invalid order update");
});
