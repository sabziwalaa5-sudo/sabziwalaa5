import { NextRequest, NextResponse } from "next/server";
import { handleApiError, getCustomerFromRequest, GUEST_CART_COOKIE } from "../../../lib/server/auth";
import { requireDatabase } from "../../../lib/server/routeUtils";
import {
  clearCart,
  getCartMap,
  getOrCreateCart,
  mergeGuestCartIntoUser,
  newGuestToken,
  setCartItemQuantity,
} from "../../../lib/server/repository";

async function resolveCart(request: NextRequest) {
  const customer = await getCustomerFromRequest(request);
  const guestToken = request.cookies.get(GUEST_CART_COOKIE)?.value || null;
  const cart = await getOrCreateCart({ userId: customer?.id, guestToken });
  return { cart, customer, guestToken };
}

export async function GET(request: NextRequest) {
  try {
    requireDatabase();
    const { cart } = await resolveCart(request);
    const items = await getCartMap(cart.id);
    const response = NextResponse.json({ items, cartId: cart.id });
    if (!request.cookies.get(GUEST_CART_COOKIE)?.value && cart.guestToken) {
      response.cookies.set(GUEST_CART_COOKIE, cart.guestToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireDatabase();
    const body = await request.json();
    const productId = String(body.productId || "");
    const quantity = Number(body.quantity);
    const { cart, customer, guestToken } = await resolveCart(request);

    if (customer && guestToken) {
      await mergeGuestCartIntoUser(guestToken, customer.id);
    }

    const activeCart = customer
      ? await getOrCreateCart({ userId: customer.id })
      : cart;

    await setCartItemQuantity(activeCart.id, productId, quantity);

    const response = NextResponse.json({
      items: await getCartMap(activeCart.id),
      cartId: activeCart.id,
    });

    if (!customer && activeCart.guestToken) {
      response.cookies.set(GUEST_CART_COOKIE, activeCart.guestToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    requireDatabase();
    const { cart } = await resolveCart(request);
    await clearCart(cart.id);
    return NextResponse.json({ items: {} });
  } catch (error) {
    return handleApiError(error);
  }
}
