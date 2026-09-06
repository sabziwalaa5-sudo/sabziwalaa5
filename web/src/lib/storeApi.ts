"use client";

import { supabase } from "./supabase";
import { getApiBaseUrl } from "./config";
import type { PlatformSettings } from "./platformSettings";
import type { ClientOrder, ClientProduct, ClientVendor, ClientCoupon, ClientWallet } from "./server/repository";

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

const base = () => getApiBaseUrl();

export async function fetchProducts(activeOnly = true): Promise<ClientProduct[]> {
  const res = await fetch(`${base()}/api/products?activeOnly=${activeOnly}`, { credentials: "include" });
  const data = await parseJson<{ products: ClientProduct[] }>(res);
  return data.products;
}

export async function fetchAllProducts(): Promise<ClientProduct[]> {
  const res = await fetch(`${base()}/api/products`, { credentials: "include" });
  const data = await parseJson<{ products: ClientProduct[] }>(res);
  return data.products;
}

export async function saveProduct(product: Partial<ClientProduct> & { vendorId: string; name: string; price: number }) {
  const headers = await authHeaders();
  if (product.id) {
    const res = await fetch(`${base()}/api/products/${product.id}`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(product),
    });
    const data = await parseJson<{ product: ClientProduct }>(res);
    return data.product;
  }
  const res = await fetch(`${base()}/api/products`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(product),
  });
  const data = await parseJson<{ product: ClientProduct }>(res);
  return data.product;
}

export async function removeProduct(id: string) {
  const headers = await authHeaders();
  await fetch(`${base()}/api/products/${id}`, { method: "DELETE", headers, credentials: "include" });
}

export async function fetchVendors(): Promise<ClientVendor[]> {
  const res = await fetch(`${base()}/api/vendors`, { credentials: "include" });
  const data = await parseJson<{ vendors: ClientVendor[] }>(res);
  return data.vendors;
}

export async function saveVendor(vendor: Partial<ClientVendor> & { vendor_name: string; shop_name: string; email: string }) {
  const headers = await authHeaders();
  if (vendor.vendor_id) {
    const res = await fetch(`${base()}/api/vendors/${vendor.vendor_id}`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(vendor),
    });
    const data = await parseJson<{ vendor: ClientVendor }>(res);
    return data.vendor;
  }
  const res = await fetch(`${base()}/api/vendors`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(vendor),
  });
  const data = await parseJson<{ vendor: ClientVendor }>(res);
  return data.vendor;
}

export async function fetchSettings(): Promise<PlatformSettings & { deliveryCharge?: number }> {
  const res = await fetch(`${base()}/api/settings`, { credentials: "include" });
  const data = await parseJson<{ settings: PlatformSettings & { deliveryCharge?: number } }>(res);
  return data.settings;
}

export async function saveSettings(settings: Record<string, unknown>) {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/settings`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(settings),
  });
  const data = await parseJson<{ settings: PlatformSettings }>(res);
  return data.settings;
}

export async function fetchCoupons(): Promise<ClientCoupon[]> {
  const res = await fetch(`${base()}/api/coupons`, { credentials: "include" });
  const data = await parseJson<{ coupons: ClientCoupon[] }>(res);
  return data.coupons;
}

export async function saveCoupon(coupon: ClientCoupon) {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/coupons`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(coupon),
  });
  const data = await parseJson<{ coupon: ClientCoupon }>(res);
  return data.coupon;
}

export async function fetchOrders(): Promise<ClientOrder[]> {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/orders`, { headers, credentials: "include" });
  const data = await parseJson<{ orders: ClientOrder[] }>(res);
  return data.orders;
}

export async function fetchAllOrdersForStaff(): Promise<ClientOrder[]> {
  const res = await fetch(`${base()}/api/orders`, { credentials: "include" });
  const data = await parseJson<{ orders: ClientOrder[] }>(res);
  return data.orders;
}

export async function createOrderOnServer(input: {
  lines: Array<{ productId: string; quantity: number }>;
  customerMobile: string;
  deliveryAddress?: string;
  addressId?: string;
  paymentMethod: string;
  couponCode?: string;
  redeemedPoints?: number;
  idempotencyKey?: string;
  latitude?: number;
  longitude?: number;
}) {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/orders`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ order: ClientOrder }>(res);
  return data.order;
}

export async function updateOrderStatusOnServer(orderId: string, orderStatus: string) {
  const res = await fetch(`${base()}/api/orders`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, orderStatus }),
  });
  const data = await parseJson<{ order: ClientOrder }>(res);
  return data.order;
}

export async function fetchCart(): Promise<Record<string, number>> {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/cart`, { headers, credentials: "include" });
  const data = await parseJson<{ items: Record<string, number> }>(res);
  return data.items;
}

export async function setCartItemOnServer(productId: string, quantity: number) {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/cart`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ productId, quantity }),
  });
  const data = await parseJson<{ items: Record<string, number> }>(res);
  return data.items;
}

export async function clearCartOnServer() {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/cart`, { method: "DELETE", headers, credentials: "include" });
  const data = await parseJson<{ items: Record<string, number> }>(res);
  return data.items;
}

export async function fetchWallet(email?: string): Promise<ClientWallet> {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/wallets`, { headers, credentials: "include" });
  const data = await parseJson<{ wallet: ClientWallet }>(res);
  return data.wallet;
}

export async function fetchAllWallets(): Promise<Record<string, ClientWallet>> {
  const res = await fetch(`${base()}/api/wallets?all=true`, { credentials: "include" });
  const data = await parseJson<{ wallets: Record<string, ClientWallet> }>(res);
  return data.wallets;
}

export async function refreshStoreData() {
  const [products, vendors, settings, coupons] = await Promise.all([
    fetchProducts(false),
    fetchVendors(),
    fetchSettings(),
    fetchCoupons(),
  ]);
  return { products, vendors, settings, coupons };
}

export type ClientAddress = {
  id: string;
  tag: string;
  address: string;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
};

export async function fetchAddresses(): Promise<ClientAddress[]> {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/addresses`, { headers, credentials: "include" });
  const data = await parseJson<{ addresses: ClientAddress[] }>(res);
  return data.addresses;
}

export async function saveAddress(input: {
  tag: string;
  address: string;
  phone?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}): Promise<ClientAddress> {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/addresses`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ address: ClientAddress }>(res);
  return data.address;
}

export async function updateAddressOnServer(
  id: string,
  input: Partial<{ tag: string; address: string; phone: string; lat: number; lng: number; isDefault: boolean }>
): Promise<ClientAddress> {
  const headers = await authHeaders();
  const res = await fetch(`${base()}/api/addresses/${id}`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ address: ClientAddress }>(res);
  return data.address;
}

export async function deleteAddressOnServer(id: string): Promise<void> {
  const headers = await authHeaders();
  await fetch(`${base()}/api/addresses/${id}`, { method: "DELETE", headers, credentials: "include" });
}
