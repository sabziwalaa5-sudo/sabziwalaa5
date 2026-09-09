"use client";

import { useCallback, useEffect, useState } from "react";
import { INITIAL_CAMPAIGNS } from "../lib/catalogSeed";
import type { PlatformSettings } from "../lib/platformSettings";
import {
  fetchAllOrdersForStaff,
  fetchAllProducts,
  fetchAllWallets,
  fetchCart,
  fetchCoupons,
  fetchOrders,
  fetchProducts,
  fetchSettings,
  fetchVendors,
  fetchWallet,
} from "../lib/storeApi";

export function useSabjiwalaStore(options?: { staff?: boolean; includeWallets?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [wallets, setWallets] = useState<Record<string, any>>({});
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [bonusCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [platformSettings, setPlatformSettingsState] = useState<PlatformSettings & { deliveryCharge?: number }>({
    maintenanceMode: false,
    minOrderThreshold: 100,
    freeDeliveryThreshold: 200,
    rewardSettings: { enabled: true, earningRate: 5, pointValue: 1 },
  });
  const [cart, setCart] = useState<Record<string, number>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [products, vendors, settings, coupons] = await Promise.all([
        options?.staff ? fetchAllProducts() : fetchProducts(true),
        fetchVendors(),
        fetchSettings(),
        fetchCoupons(),
      ]);
      setProductsList(products);
      setVendorsList(vendors);
      setPlatformSettingsState(settings);
      setAvailableCoupons(coupons);

      try {
        const cartItems = await fetchCart();
        setCart(cartItems);
      } catch {
        setCart({});
      }

      if (options?.staff) {
        const [orders, allWallets] = await Promise.all([
          fetchAllOrdersForStaff(),
          options.includeWallets ? fetchAllWallets() : Promise.resolve({}),
        ]);
        setOrdersList(orders);
        if (options.includeWallets) setWallets(allWallets);
      } else {
        try {
          const orders = await fetchOrders();
          setOrdersList(orders);
        } catch {
          setOrdersList([]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load store data");
    } finally {
      setLoading(false);
    }
  }, [options?.staff, options?.includeWallets]);

  const reloadWallet = useCallback(async (email: string) => {
    try {
      const wallet = await fetchWallet(email);
      setWallets((prev) => ({ ...prev, [email]: wallet }));
    } catch {
      // guest or unauthorized
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    loading,
    error,
    productsList,
    setProductsList,
    vendorsList,
    setVendorsList,
    ordersList,
    setOrdersList,
    wallets,
    setWallets,
    availableCoupons,
    setAvailableCoupons,
    bonusCampaigns,
    platformSettings,
    setPlatformSettingsState,
    cart,
    setCart,
    reload,
    reloadWallet,
  };
}
