"use client";

import { logger } from "./logger";

export {
  INITIAL_RIDERS,
  INITIAL_VENDORS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_REVIEWS,
  INITIAL_ORDERS,
  INITIAL_WALLETS,
  INITIAL_COUPONS,
  INITIAL_CAMPAIGNS,
} from "./catalogSeed";

/** @deprecated Business data is server-backed. Keys retained for legacy UI-only reads. */
export const STATE_KEYS = {
  PRODUCTS: "sabjiwala_products_list",
  ORDERS: "sabjiwala_orders_list",
  VENDORS: "sabjiwala_vendors_list",
  WALLETS: "sabjiwala_wallets_list",
  COUPONS: "sabjiwala_coupons_list",
  CAMPAIGNS: "sabjiwala_campaigns_list",
  SETTINGS: "sabjiwala_platform_settings",
};

/** @deprecated Use server APIs via storeApi instead. */
export function getStoredState<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    logger.error(`Error reading localStorage key: ${String(key)}`, e);
    return defaultValue;
  }
}

/** @deprecated Use server APIs via storeApi instead. */
export function setStoredState<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("sabjiwala_state_update"));
  } catch (e) {
    logger.error(`Error writing localStorage key: ${String(key)}`, e);
  }
}
