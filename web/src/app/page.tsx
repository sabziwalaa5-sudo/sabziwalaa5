"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { validateOrder, validateCouponCode, validateEmail } from "../lib/validation";
import { RateLimits } from "../lib/rateLimiter";
import { buildCartItems, computeBill, nextCartQuantity, orderFingerprint } from "../lib/orderEngine";
import { createPaymentOnServer, displayPaymentMethod, verifyPaymentOnServer } from "../lib/paymentClient";
import {
  ShoppingBag,
  MapPin,
  CheckCircle,
  Clock,
  Truck,
  AlertTriangle,
  Plus,
  Minus,
  Info,
  Eye,
  User,
  ShoppingBasket,
  Heart,
  Wallet,
  Sparkles,
  X,
  Gift,
  Search,
  Home as HomeIcon,
  Mic,
  Bell,
  ChevronRight,
  Star,
  ShieldCheck,
  Zap,
  ArrowRight,
  Filter,
  SlidersHorizontal
} from "lucide-react";
import ProfileDashboard from "../components/ProfileDashboard";
import PortalNav, { StaffLoginLinks } from "../components/PortalNav";
import AppLoadingShell from "../components/AppLoadingShell";
import { type AppRole, portalPathForRole } from "../lib/roles";
import { resolveUserRole } from "../lib/resolveRole";
import { getAdminWebHref } from "../lib/config";
import { getPlatformSettings, pointsEarnedForOrder, rupeesFromPoints, type PlatformSettings } from "../lib/platformSettings";
import {
  STATE_KEYS,
  getStoredState,
  setStoredState,
  INITIAL_VENDORS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_WALLETS,
  INITIAL_COUPONS,
  INITIAL_CAMPAIGNS,
  INITIAL_CATEGORIES,
  INITIAL_REVIEWS
} from "../lib/sharedState";

export default function Home() {
  // Navigation & View Subtab
  const [customerSubTab, setCustomerSubTab] = useState<"catalog" | "rewards" | "orders" | "profile">("catalog");
  const [cartOpen, setCartOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRequiredFor, setLoginRequiredFor] = useState<string>("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const lastOrderFingerprint = useRef("");
  const lastOrderAt = useRef(0);

  // Auth State
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Geolocation & Map State (Rajokri, New Delhi)
  const [customerCoords, setCustomerCoords] = useState({ lat: 28.5284, lng: 77.1028 });
  const [locationName, setLocationName] = useState("Rajokri Crossroad, New Delhi");
  const [distanceKm, setDistanceKm] = useState(0.35);
  const [isOutOfRange, setIsOutOfRange] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // Delivery Zone Engine States
  const [deliveryCharge, setDeliveryCharge] = useState<number>(30);
  const [platformSettings, setPlatformSettingsState] = useState<PlatformSettings>(() => getPlatformSettings());
  const [minOrderValue, setMinOrderValue] = useState<number>(getPlatformSettings().minOrderThreshold);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<number>(30);
  const [expressAvailable, setExpressAvailable] = useState<boolean>(true);

  // Synchronized States from localStorage
  const [vendorsList, setVendorsList] = useState(() => getStoredState(STATE_KEYS.VENDORS, INITIAL_VENDORS));
  const [productsList, setProductsList] = useState(() => getStoredState(STATE_KEYS.PRODUCTS, INITIAL_PRODUCTS));
  const [ordersList, setOrdersList] = useState(() => getStoredState(STATE_KEYS.ORDERS, INITIAL_ORDERS));
  const [wallets, setWallets] = useState(() => getStoredState(STATE_KEYS.WALLETS, INITIAL_WALLETS));
  const [availableCoupons, setAvailableCoupons] = useState(() => getStoredState(STATE_KEYS.COUPONS, INITIAL_COUPONS));
  const [bonusCampaigns, setBonusCampaigns] = useState(() => getStoredState(STATE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS));

  // Address list management
  const [addresses, setAddresses] = useState<any[]>([
    { id: "a1", tag: "Home", address: "Rajokri Crossroad, New Delhi", lat: 28.5284, lng: 77.1028, isDefault: true },
    { id: "a2", tag: "Office", address: "Vasant Kunj Sector B, Delhi", lat: 28.5450, lng: 77.1560, isDefault: false }
  ]);
  const [newAddressTag, setNewAddressTag] = useState("Home");
  const [newAddressText, setNewAddressText] = useState("");

  // Cart & Orders
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<"cod" | "upi" | "card">("cod");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [wishlist, setWishlist] = useState<{ [id: string]: boolean }>({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState("");
  const [redeemedPointsInput, setRedeemedPointsInput] = useState<number>(0);

  // Notifications Bell dropdown
  const [notificationBellOpen, setNotificationBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    { id: "n1", message: "🌱 Fresh organic harvest arrived from Rajokri Hub!", date: "10 mins ago", unread: true },
    { id: "n2", message: "🎟️ Use coupon FRESH20 for 20% OFF your order.", date: "1 hour ago", unread: true }
  ]);

  // Leaflet map container ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);

  // Check auth session
  useEffect(() => {
    setMounted(true);
    const applySession = async (sessionUser: { id?: string; email?: string | null } | null) => {
      if (!sessionUser) {
        setUserEmail(null);
        setUserRole(null);
        return;
      }
      const role = await resolveUserRole(sessionUser);
      setUserEmail(sessionUser.email || null);
      setUserRole(role);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen to cross-tab localStorage sync
  useEffect(() => {
    const handleSync = () => {
      setVendorsList(getStoredState(STATE_KEYS.VENDORS, INITIAL_VENDORS));
      setProductsList(getStoredState(STATE_KEYS.PRODUCTS, INITIAL_PRODUCTS));
      setOrdersList(getStoredState(STATE_KEYS.ORDERS, INITIAL_ORDERS));
      setWallets(getStoredState(STATE_KEYS.WALLETS, INITIAL_WALLETS));
      setAvailableCoupons(getStoredState(STATE_KEYS.COUPONS, INITIAL_COUPONS));
      setBonusCampaigns(getStoredState(STATE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS));
      const settings = getPlatformSettings();
      setPlatformSettingsState(settings);
      setMinOrderValue(settings.minOrderThreshold);
    };

    window.addEventListener("sabjiwala_state_update", handleSync);
    window.addEventListener("storage", handleSync);
    handleSync();
    return () => {
      window.removeEventListener("sabjiwala_state_update", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Google Sign-In helper
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || "Google Sign-In failed. Use email login instead.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = validateEmail(loginEmail);
    if (!emailCheck.valid) {
      setAuthError(emailCheck.error || "Invalid email");
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      setAuthError("Password must be at least 6 characters");
      return;
    }
    if (!RateLimits.signIn(emailCheck.sanitized).allowed) {
      setAuthError("Too many sign-in attempts. Please wait and try again.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError(null);
      const action = isRegistering
        ? supabase.auth.signUp({ email: emailCheck.sanitized, password: loginPassword })
        : supabase.auth.signInWithPassword({ email: emailCheck.sanitized, password: loginPassword });
      const { data, error } = await action;
      if (error) throw error;
      if (data.user?.email) {
        const role = await resolveUserRole(data.user);
        setUserEmail(data.user.email);
        setUserRole(role);
        setShowLoginModal(false);
        if (role !== "CUSTOMER") {
          window.location.assign(role === "ADMIN" ? getAdminWebHref() : portalPathForRole(role));
        }
      } else if (isRegistering) {
        setAuthError("Check your email to confirm the account, then sign in.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserRole(null);
  };

  // Distance calculation helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Location update
  const updateLocation = (name: string, lat: number, lng: number) => {
    setLocationName(name);
    setCustomerCoords({ lat, lng });
    const vendorLat = vendorsList[0]?.lat || 28.5305;
    const vendorLng = vendorsList[0]?.lng || 77.1048;
    const dist = calculateDistance(lat, lng, vendorLat, vendorLng);
    setDistanceKm(parseFloat(dist.toFixed(2)));
    setIsOutOfRange(dist > 5.0);
    setShowMapModal(false);
  };

  const handleGPSDetect = async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import("@capacitor/geolocation");
        const perm = await Geolocation.requestPermissions();
        if (perm.location === "denied") {
          updateLocation("Rajokri, New Delhi", 28.5284, 77.1028);
          return;
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
        updateLocation("GPS Location", pos.coords.latitude, pos.coords.longitude);
        return;
      }
    } catch {
      // Fall through to browser geolocation.
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateLocation("GPS Location", pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          updateLocation("Rajokri, New Delhi", 28.5284, 77.1028);
        }
      );
    } else {
      updateLocation("Rajokri, New Delhi", 28.5284, 77.1028);
    }
  };

  // Navigation click guard for protected routes
  const handleNavClick = (tab: "catalog" | "rewards" | "orders" | "profile") => {
    if ((tab === "rewards" || tab === "orders" || tab === "profile") && !userEmail) {
      setLoginRequiredFor(tab);
      setShowLoginModal(true);
      return;
    }
    setCustomerSubTab(tab);
  };

  // Cart operations
  const addToCart = (productId: string) => {
    const product = productsList.find((p) => p.id === productId);
    if (!product) return;
    if ((product.stock || 0) <= 0) {
      alert("This product is currently unavailable.");
      return;
    }
    setCart((prev) => {
      const nextQty = nextCartQuantity(prev[productId] || 0, 1, product.stock);
      if (nextQty <= 0) return prev;
      if (nextQty === (prev[productId] || 0)) {
        alert(`Only ${product.stock} units available.`);
        return prev;
      }
      return { ...prev, [productId]: nextQty };
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[productId] > 1) {
        next[productId] -= 1;
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const product = productsList.find((p) => p.id === id);
      return total + (product ? product.price * qty : 0);
    }, 0);
  };

  const getCouponDiscount = () => {
    if (!appliedCoupon) return 0;
    const total = getCartTotal();
    if (appliedCoupon.discountType === "percentage") {
      const val = (total * appliedCoupon.discountValue) / 100;
      return appliedCoupon.maxDiscount ? Math.min(val, appliedCoupon.maxDiscount) : val;
    } else {
      return appliedCoupon.discountValue;
    }
  };

  const handleApplyCoupon = () => {
    setCouponError("");
    const code = couponCode.trim().toUpperCase();
    const result = validateCouponCode(code);
    if (!result.valid) {
      setCouponError(result.error || "Invalid coupon code");
      return;
    }
    const found = availableCoupons.find((c: any) => c.code === result.sanitized);
    if (!found) {
      setCouponError("Coupon code not found or expired");
      return;
    }
    if (found.minOrder && getCartTotal() < found.minOrder) {
      setCouponError(`Minimum order amount of ₹${found.minOrder} required for this coupon`);
      return;
    }
    setAppliedCoupon(found);
  };


  // Address operations
  const handleAddAddress = () => {
    if (!newAddressText.trim()) return;
    const newAddr = {
      id: `a_${Date.now()}`,
      tag: newAddressTag,
      address: newAddressText,
      lat: customerCoords.lat,
      lng: customerCoords.lng,
      isDefault: addresses.length === 0
    };
    setAddresses((prev) => [...prev, newAddr]);
    setNewAddressText("");
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefaultAddress = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  };

  // Order Placement logic
  const handlePlaceOrder = async () => {
    if (placingOrder) return;
    if (!userEmail) {
      setLoginRequiredFor("checkout");
      setShowLoginModal(true);
      return;
    }

    if (platformSettings.maintenanceMode) {
      setCheckoutError("The storefront is in maintenance mode. Checkout is temporarily closed by the administrator.");
      return;
    }

    if (isOutOfRange) {
      setCheckoutError("Delivery is unavailable for the selected location.");
      return;
    }

    const cartItems = buildCartItems(cart, productsList);
    if (cartItems.length === 0) {
      setCheckoutError("Your cart is empty or contains unavailable items.");
      return;
    }

    if (!RateLimits.placeOrder(userEmail).allowed) {
      setCheckoutError("Rate limit exceeded. Please wait a moment before placing another order.");
      return;
    }

    const wallet = wallets[userEmail] || { pointsBalance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, history: [] };
    const safeRedeem = Math.max(0, Math.min(rupeesFromPoints(redeemedPointsInput || 0, platformSettings), wallet.pointsBalance, getCartTotal()));
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const couponDiscount = getCouponDiscount();
    const bill = computeBill({
      subtotal,
      couponDiscount,
      redeemedPoints: safeRedeem,
      deliveryCharge,
      freeDeliveryThreshold: platformSettings.freeDeliveryThreshold,
    });

    if (subtotal < minOrderValue) {
      setCheckoutError(`Minimum order value is ₹${minOrderValue}.`);
      return;
    }

    const defaultAddress = addresses.find((a) => a.isDefault)?.address || locationName;
    const orderDraftId = `SBJ${Date.now().toString().slice(-8)}`;
    const fingerprint = orderFingerprint({
      email: userEmail,
      items: cartItems,
      totalAmount: bill.totalAmount,
    });
    if (fingerprint === lastOrderFingerprint.current && Date.now() - lastOrderAt.current < 60000) {
      setCheckoutError("Duplicate order blocked. Please wait a minute before retrying the same cart.");
      return;
    }

    const orderPayload = {
      id: orderDraftId,
      date: new Date().toLocaleString("en-IN"),
      customerName: userEmail.split("@")[0],
      customerEmail: userEmail,
      customerMobile: "9876543210",
      deliveryAddress: defaultAddress,
      paymentMethod: displayPaymentMethod(paymentMode),
      paymentStatus: paymentMode === "cod" ? "Pending" : "Pending",
      orderStatus: "Pending",
      items: cartItems,
      subtotal,
      deliveryCharges: bill.deliveryCharges,
      discount: bill.discount,
      totalAmount: bill.totalAmount,
      vendorId: vendorsList[0]?.vendor_id || "v1",
      paymentId: "",
    };

    const valResult = validateOrder(orderPayload);
    if (!valResult.valid) {
      setCheckoutError(`Order validation failed: ${valResult.errors.join(", ")}`);
      return;
    }

    setPlacingOrder(true);
    setCheckoutError("");

    try {
      let paymentStatus = "Pending";
      let paymentId = "";

      if (paymentMode === "cod") {
        try {
          const created = await createPaymentOnServer({
            orderDraftId,
            amountRupees: bill.totalAmount,
            method: "cod",
          });
          const verified = await verifyPaymentOnServer({
            paymentId: created.paymentId,
            checkoutToken: created.checkoutToken,
            outcome: "success",
          });
          paymentId = verified.paymentId;
          paymentStatus = "Pending";
        } catch {
          paymentStatus = "Pending";
        }
      } else {
        const created = await createPaymentOnServer({
          orderDraftId,
          amountRupees: bill.totalAmount,
          method: paymentMode,
        });
        if (!created.gatewayConfigured || !created.razorpayKeyId) {
          throw new Error("Online payments are not configured on the server. Use Cash on Delivery or retry after gateway setup.");
        }

        const verified = await new Promise<{ paymentId: string; status: string }>((resolve, reject) => {
          const scriptId = "razorpay-checkout-js";
          const startCheckout = () => {
            const RazorpayCtor = (window as any).Razorpay;
            if (!RazorpayCtor) {
              reject(new Error("Unable to load payment checkout"));
              return;
            }
            const rzp = new RazorpayCtor({
              key: created.razorpayKeyId,
              amount: created.amountPaise,
              currency: "INR",
              name: "Sabjiwala",
              description: `Order ${orderDraftId}`,
              order_id: created.razorpayOrderId,
              handler: async (response: any) => {
                try {
                  const result = await verifyPaymentOnServer({
                    paymentId: created.paymentId,
                    checkoutToken: created.checkoutToken,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    outcome: "success",
                  });
                  if (result.status !== "PAID") {
                    reject(new Error("Payment was not verified by the server"));
                    return;
                  }
                  resolve({ paymentId: result.paymentId, status: result.status });
                } catch (err: any) {
                  reject(err);
                }
              },
              modal: {
                ondismiss: async () => {
                  await verifyPaymentOnServer({
                    paymentId: created.paymentId,
                    checkoutToken: created.checkoutToken,
                    outcome: "cancelled",
                  }).catch(() => undefined);
                  reject(new Error("Payment cancelled"));
                },
              },
            });
            rzp.on("payment.failed", async () => {
              await verifyPaymentOnServer({
                paymentId: created.paymentId,
                checkoutToken: created.checkoutToken,
                outcome: "failure",
              }).catch(() => undefined);
              reject(new Error("Payment failed"));
            });
            rzp.open();
          };

          if ((window as any).Razorpay) {
            startCheckout();
            return;
          }
          if (document.getElementById(scriptId)) {
            startCheckout();
            return;
          }
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = startCheckout;
          script.onerror = () => reject(new Error("Unable to load payment checkout"));
          document.body.appendChild(script);
        });

        paymentId = verified.paymentId;
        paymentStatus = verified.status === "PAID" ? "Paid" : "Pending";
        if (paymentStatus !== "Paid") {
          throw new Error("Payment verification failed");
        }
      }

      orderPayload.paymentStatus = paymentStatus;
      orderPayload.paymentId = paymentId;

      const updatedOrders = [orderPayload, ...ordersList];
      setOrdersList(updatedOrders);
      setStoredState(STATE_KEYS.ORDERS, updatedOrders);
      setActiveOrder(orderPayload);
      lastOrderFingerprint.current = fingerprint;
      lastOrderAt.current = Date.now();

      const pointsEarned = pointsEarnedForOrder(bill.totalAmount, platformSettings);
      const newBalance = wallet.pointsBalance - safeRedeem + pointsEarned;
      const updatedWallet = {
        ...wallet,
        pointsBalance: newBalance,
        lifetimeEarned: wallet.lifetimeEarned + pointsEarned,
        lifetimeRedeemed: wallet.lifetimeRedeemed + safeRedeem,
        history: [
          ...wallet.history,
          ...(safeRedeem > 0 ? [{ id: `tx_${Date.now()}_r`, type: "REDEEMED", points: safeRedeem, orderId: orderPayload.id, date: orderPayload.date, balance: wallet.pointsBalance - safeRedeem }] : []),
          { id: `tx_${Date.now()}_e`, type: "EARNED", points: pointsEarned, orderId: orderPayload.id, date: orderPayload.date, balance: newBalance }
        ]
      };

      const updatedWallets = { ...wallets, [userEmail]: updatedWallet };
      setWallets(updatedWallets);
      setStoredState(STATE_KEYS.WALLETS, updatedWallets);

      const stockUpdated = productsList.map((product) => {
        const purchased = cartItems.find((item) => item.productId === product.id);
        if (!purchased) return product;
        return { ...product, stock: Math.max(0, (product.stock || 0) - purchased.qty) };
      });
      setProductsList(stockUpdated);
      setStoredState(STATE_KEYS.PRODUCTS, stockUpdated);

      setCart({});
      setCartOpen(false);
      setAppliedCoupon(null);
      setRedeemedPointsInput(0);
      setCustomerSubTab("orders");

      try {
        await supabase.from("orders").insert([
          {
            id: orderPayload.id,
            customer_email: orderPayload.customerEmail,
            total_amount: orderPayload.totalAmount,
            order_status: orderPayload.orderStatus,
            payment_status: orderPayload.paymentStatus,
            created_at: new Date().toISOString()
          }
        ]);
      } catch {
        console.log("Supabase insert skipped (running in local mode).");
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Checkout failed. Your card/UPI was not charged as paid.");
    } finally {
      setPlacingOrder(false);
    }
  };

  // Filter products by selected category and search query
  const activeVendorIds = new Set(vendorsList.filter((v) => v.status === "Active").map((v) => v.vendor_id));
  const liveCatalog = productsList.filter((prod) => !prod.vendorId || activeVendorIds.has(prod.vendorId));
  const filteredProducts = liveCatalog.filter((prod) => {
    const matchesCat = selectedCategory === "All" || prod.category === selectedCategory;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.hindiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const bestSellerProducts = liveCatalog.filter((p) => p.badge === "bestseller" || p.rating >= 4.8);
  const seasonalProducts = liveCatalog.filter((p) => p.isSeasonal);
  const farmFreshProducts = liveCatalog.filter((p) => p.isFarmFresh);

  const totalCartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

  if (!mounted) return <AppLoadingShell label="Loading marketplace…" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ═══════ 1. DESKTOP STICKY HEADER ═══════ */}
      <header className="desktop-header">
        <div className="desktop-header-inner">
          {/* Brand Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flexShrink: 0 }} onClick={() => handleNavClick("catalog")}>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "var(--accent)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 800, boxShadow: "var(--shadow-green)" }}>
              🥬
            </div>
            <div>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.5px", margin: 0, color: "var(--accent)", lineHeight: 1.1 }}>
                SABJIWALAA ५
              </h1>
              <span className="t-label" style={{ fontSize: "10px", color: "var(--text-3)", letterSpacing: "0.5px" }}>Organic Hyperlocal Market</span>
            </div>
          </div>

          {/* Location Trigger Pill */}
          <div className="location-card" style={{ padding: "8px 14px", margin: 0, cursor: "pointer", minWidth: "220px" }} onClick={() => setShowMapModal(true)}>
            <MapPin size={18} color="var(--accent)" />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <span className="t-label" style={{ fontSize: "9px", display: "block" }}>Delivering to</span>
              <strong style={{ fontSize: "12px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{locationName}</strong>
            </div>
            <ChevronRight size={16} color="var(--text-4)" />
          </div>

          {/* Apple-Style Search Bar */}
          <div style={{ flex: 1, maxWidth: "460px", marginInline: "16px", position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-4)" }} />
            <input
              type="text"
              placeholder="Search fresh spinach, mangoes, milk..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (customerSubTab !== "catalog") setCustomerSubTab("catalog"); }}
              className="search-bar-premium"
              style={{ paddingRight: "40px" }}
            />
            <Mic size={16} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-4)", cursor: "pointer" }} onClick={() => alert("Voice search listening...")} />
          </div>

          {/* Nav Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => handleNavClick("rewards")} className="btn btn-ghost" style={{ gap: "6px", fontSize: "13px", fontWeight: 600, color: customerSubTab === "rewards" ? "var(--accent)" : "var(--text-2)" }}>
              <Gift size={18} />
              <span>Rewards{userEmail && wallets[userEmail] && wallets[userEmail].pointsBalance > 0 ? ` (${wallets[userEmail].pointsBalance})` : ""}</span>
            </button>

            <button onClick={() => handleNavClick("orders")} className="btn btn-ghost" style={{ gap: "6px", fontSize: "13px", fontWeight: 600, color: customerSubTab === "orders" ? "var(--accent)" : "var(--text-2)" }}>
              <ShoppingBag size={18} />
              <span>Orders</span>
            </button>

            <button onClick={() => handleNavClick("profile")} className="btn btn-ghost" style={{ gap: "6px", fontSize: "13px", fontWeight: 600, color: customerSubTab === "profile" ? "var(--accent)" : "var(--text-2)" }}>
              <User size={18} />
              <span>Profile</span>
            </button>

            {/* Cart Trigger */}
            <button onClick={() => setCartOpen(true)} className="btn btn-primary" style={{ padding: "9px 20px", fontSize: "13px", position: "relative", marginLeft: "4px", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-green)" }}>
              <ShoppingBasket size={18} />
              <span>Cart</span>
              {totalCartItemsCount > 0 && (
                <span className="notif-badge" style={{ top: "-8px", right: "-8px" }}>{totalCartItemsCount}</span>
              )}
            </button>

            {userEmail ? (
              <button onClick={handleSignOut} className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: "13px" }}>Sign Out</button>
            ) : (
            <button onClick={() => { setLoginRequiredFor("account"); setShowLoginModal(true); }} className="btn btn-green-outline" style={{ padding: "8px 16px", fontSize: "13px" }}>Sign In</button>
            )}
            <PortalNav role={userRole} current="storefront" compact />
          </div>
        </div>
      </header>

      {/* ═══════ 2. MOBILE TOP APP BAR ═══════ */}
      <header className="mobile-app-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => handleNavClick("catalog")}>
          <span style={{ fontSize: "1.8rem" }}>🥬</span>
          <div>
            <span style={{ fontSize: "16px", fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>SABJIWALAA ५</span>
            <span style={{ display: "block", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-3)", fontWeight: 700 }}>Farm Fresh Organic</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setNotificationBellOpen(!notificationBellOpen)}>
            <Bell size={22} color="var(--text-2)" />
            {notifications.filter((n) => n.unread).length > 0 && <span className="notif-dot" />}
          </div>
          {userEmail ? (
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "var(--accent)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px", cursor: "pointer" }} onClick={() => handleNavClick("profile")}>
              {userEmail.charAt(0).toUpperCase()}
            </div>
          ) : (
            <button onClick={() => { setLoginRequiredFor("account"); setShowLoginModal(true); }} className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "12px", height: "34px", borderRadius: "var(--r-md)" }}>Sign In</button>
          )}
          {userRole && userRole !== "CUSTOMER" && <PortalNav role={userRole} current="storefront" compact />}
        </div>
      </header>

      {/* ═══════ 3. MOBILE STICKY APPLE SEARCH ═══════ */}
      <div className="mobile-search-sticky">
        <div style={{ position: "relative", width: "100%" }}>
          <Search size={17} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-4)" }} />
          <input
            type="text"
            placeholder="Search organic fruits, vegetables..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (customerSubTab !== "catalog") setCustomerSubTab("catalog"); }}
            className="search-bar-premium"
            style={{ height: "44px", fontSize: "14px" }}
          />
          <Mic size={17} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-4)", cursor: "pointer" }} onClick={() => alert("Voice search activated")} />
        </div>
      </div>

      {/* ═══════ NOTIFICATION DROPDOWN ═══════ */}
      {notificationBellOpen && (
        <div style={{ position: "fixed", top: "64px", right: "16px", width: "min(360px, calc(100vw - 32px))", background: "var(--card)", borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-xl)", border: "1px solid var(--border)", zIndex: 500, maxHeight: "400px", overflow: "hidden" }} className="animate-scale-in">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "15px" }}>Notifications</span>
            <button onClick={() => setNotificationBellOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
          </div>
          <div style={{ overflowY: "auto", maxHeight: "340px" }}>
            {notifications.map((n) => (
              <div key={n.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--divider)", display: "flex", gap: "10px", alignItems: "flex-start", background: n.unread ? "var(--accent-light)" : "transparent" }}>
                <CheckCircle size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text)", lineHeight: 1.4 }}>{n.message}</p>
                  <span style={{ fontSize: "11px", color: "var(--text-4)", marginTop: "4px", display: "block" }}>{n.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ MAIN VIEW ROUTER ═══════ */}
      <main style={{ flex: 1 }}>

        {/* ─── CATALOG & HOME TAB ─── */}
        {customerSubTab === "catalog" && (
          <div className="main-layout">
            <div className="main-feed">

              {/* Location Card */}
              <div className="location-card" onClick={() => setShowMapModal(true)} style={{ animation: "fadeUp 0.4s var(--ease) both" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "var(--r-md)", background: "var(--green-50)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MapPin size={22} color="var(--accent)" />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600, display: "block" }}>Delivering to</span>
                  <strong style={{ fontSize: "14px", color: "var(--text)" }}>{locationName}</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-4)", display: "block" }}>Nearest Hub: Akshay Farms ({distanceKm} KM)</span>
                </div>
                <ChevronRight size={20} color="var(--text-4)" />
              </div>

              {/* Promotional Hero Banner */}
              <div className="hero-banner" style={{ animation: "fadeUp 0.5s var(--ease) both", animationDelay: "80ms" }}>
                <div className="hero-content">
                  <div className="hero-tag">🌿 100% Pesticide Free</div>
                  <h2 className="hero-title">Fresh Organic Produce<br />Direct to Your Door</h2>
                  <p className="hero-sub">Harvested daily from Rajokri partner farms. Guaranteed 100% organic, zero chemicals.</p>
                  <div className="hero-stats">
                    <span className="hero-stat"><CheckCircle size={14} /> Farm Certified</span>
                    <span className="hero-stat"><Truck size={14} /> Free Shipping ₹200+</span>
                    <span className="hero-stat"><Sparkles size={14} /> 5× Cash Points</span>
                  </div>
                </div>
              </div>

              {/* Out of Range Alert */}
              {isOutOfRange && (
                <div style={{ background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "var(--r-xl)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <AlertTriangle size={22} color="var(--danger)" />
                  <div>
                    <strong style={{ color: "var(--danger)", fontSize: "14px" }}>Out of Delivery Radius</strong>
                    <p style={{ fontSize: "13px", color: "var(--text-2)", margin: "2px 0 0" }}>We deliver within 5 KM of our vendor hubs. Please select a closer location.</p>
                  </div>
                </div>
              )}

              {platformSettings.maintenanceMode && (
                <div style={{ background: "#FFF7ED", border: "1px solid rgba(234,88,12,0.25)", borderRadius: "var(--r-xl)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <AlertTriangle size={22} color="#C2410C" />
                  <div>
                    <strong style={{ color: "#C2410C", fontSize: "14px" }}>Storefront maintenance</strong>
                    <p style={{ fontSize: "13px", color: "var(--text-2)", margin: "2px 0 0" }}>The administrator has paused checkout. You can still browse the catalog.</p>
                  </div>
                </div>
              )}

              {/* Trust Badges Strip */}
              <div className="trust-strip" style={{ animation: "fadeUp 0.5s var(--ease) both", animationDelay: "120ms" }}>
                {[
                  { icon: "🌿", title: "100% Organic", sub: "Certified produce" },
                  { icon: "🚚", title: "Same Day Shipping", sub: "Hyperlocal speed" },
                  { icon: "🔒", title: "Secure Checkout", sub: "UPI, Cards, COD" },
                  { icon: "🎁", title: "Instant Cashback", sub: "5× Reward points" }
                ].map((b, i) => (
                  <div className="trust-badge" key={i}>
                    <div className="trust-icon"><span style={{ fontSize: "20px" }}>{b.icon}</span></div>
                    <div>
                      <strong style={{ fontSize: "13px", color: "var(--text)", display: "block", whiteSpace: "nowrap" }}>{b.title}</strong>
                      <span style={{ fontSize: "11px", color: "var(--text-3)", whiteSpace: "nowrap" }}>{b.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Category Rail with Unsplash Images */}
              <div style={{ marginBlockStart: "8px" }}>
                <div className="section-header" style={{ animation: "fadeUp 0.5s var(--ease) both", animationDelay: "160ms", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" }}>Shop by Category</h3>
                </div>
                <div className="category-rail-container">
                  <div className="category-rail">
                    {INITIAL_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`cat-chip ${selectedCategory === cat.id ? "active" : ""}`}
                      >
                        <div className="cat-chip-img-wrap" style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <img src={cat.imageUrl} alt={cat.label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 🌟 BEST SELLERS SECTION 🌟 */}
              {selectedCategory === "All" && (
                <div style={{ animation: "fadeUp 0.5s var(--ease) both", animationDelay: "200ms" }}>
                  <div className="section-header">
                    <div>
                      <span className="badge badge-bestseller" style={{ marginBottom: "4px" }}>🔥 Popular Demand</span>
                      <h3 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" }}>Best Sellers</h3>
                    </div>
                    <span className="t-caption">Top rated items</span>
                  </div>
                  <div className="products-grid">
                    {bestSellerProducts.map((prod) => {
                      const itemQty = cart[prod.id] || 0;
                      return (
                        <div key={prod.id} className="product-card animate-fade-up">
                          <div className="product-image-wrap" onClick={() => setSelectedProduct(prod)} style={{ cursor: "pointer" }}>
                            <img src={prod.imageUrl} alt={prod.name} loading="lazy" />
                            {prod.badge && (
                              <span className={`badge ${prod.badge === "organic" ? "badge-organic" : "badge-bestseller"}`} style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}>
                                {prod.badge === "organic" ? "🌿 Organic" : "🔥 Best Seller"}
                              </span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setWishlist((prev) => ({ ...prev, [prod.id]: !prev[prod.id] })); }}
                              style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)", border: "none", borderRadius: "50%", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2 }}
                            >
                              <Heart size={16} fill={wishlist[prod.id] ? "var(--danger)" : "none"} color={wishlist[prod.id] ? "var(--danger)" : "var(--text-3)"} />
                            </button>
                          </div>
                          <div className="product-body">
                            <span className="t-caption" style={{ fontSize: "11px" }}>{prod.unit}</span>
                            <h4 className="t-product" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "38px" }}>
                              {prod.name}
                            </h4>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Star size={13} fill="#EAB308" color="#EAB308" />
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>{prod.rating}</span>
                              <span style={{ fontSize: "11px", color: "var(--text-4)" }}>({prod.reviewsCount})</span>
                            </div>
                            <div className="product-qty-row">
                              <div>
                                <span style={{ fontWeight: 800, fontSize: "16px", color: "var(--text)" }}>₹{prod.price}</span>
                                {prod.oldPrice && <span style={{ textDecoration: "line-through", fontSize: "12px", color: "var(--text-4)", marginLeft: "4px" }}>₹{prod.oldPrice}</span>}
                              </div>
                              {itemQty > 0 ? (
                                <div className="qty-stepper">
                                  <button className="qty-btn" onClick={() => removeFromCart(prod.id)}>−</button>
                                  <span className="qty-count">{itemQty}</span>
                                  <button className="qty-btn" onClick={() => addToCart(prod.id)}>+</button>
                                </div>
                              ) : (
                                <button className="add-btn" onClick={() => addToCart(prod.id)} disabled={isOutOfRange}>
                                  <Plus size={14} /> Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 🍁 SEASONAL OFFERS BANNER 🍁 */}
              {selectedCategory === "All" && (
                <div style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)", border: "1px solid rgba(234,88,12,0.15)", borderRadius: "var(--r-xl)", padding: "24px", marginBlock: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <span className="badge badge-sale" style={{ fontSize: "11px" }}>🎟️ Limited Time Offer</span>
                    <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#C2410C", margin: "8px 0 4px" }}>Get 20% OFF Your First Order</h3>
                    <p style={{ fontSize: "14px", color: "#9A3412", margin: 0 }}>Use coupon code <strong style={{ background: "white", padding: "2px 8px", borderRadius: "6px", border: "1px solid #FDBA74" }}>FRESH20</strong> at checkout.</p>
                  </div>
                  <button onClick={() => setCartOpen(true)} className="btn btn-primary" style={{ background: "#C2410C", padding: "12px 24px" }}>
                    Claim Discount <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* 🥬 FARM FRESH SECTION 🥬 */}
              {selectedCategory === "All" && (
                <div style={{ background: "var(--green-50)", borderRadius: "var(--r-xl)", padding: "24px", marginBlockEnd: "20px", border: "1px solid var(--green-100)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <ShieldCheck size={26} color="var(--accent)" />
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)", margin: 0 }}>Direct Farm-to-Table Promise</h3>
                      <span className="t-caption">Partnered with Rajokri Organic Farmers</span>
                    </div>
                  </div>
                  <p className="t-body" style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-2)", margin: 0 }}>
                    Our produce is harvested every morning at 5:00 AM from local Rajokri & Vasant Kunj farms, quality-inspected, and delivered straight to your kitchen with 0 artificial preservatives.
                  </p>
                </div>
              )}

              {/* RECOMMENDED / CATALOG PRODUCTS GRID */}
              <div style={{ animation: "fadeUp 0.5s var(--ease) both", animationDelay: "240ms" }}>
                <div className="section-header">
                  <h3 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" }}>
                    {selectedCategory === "All" ? "All Organic Produce" : selectedCategory}
                  </h3>
                  <span className="t-caption">{filteredProducts.length} items available</span>
                </div>
                {filteredProducts.length === 0 ? (
                  <div className="card-premium" style={{ padding: "32px", textAlign: "center" }}>
                    <p style={{ fontWeight: 700 }}>No products found</p>
                    <p className="t-caption">Try another category or search term.</p>
                  </div>
                ) : (
                <div className="products-grid stagger">
                  {filteredProducts.map((prod) => {
                    const itemQty = cart[prod.id] || 0;
                    return (
                      <div key={prod.id} className="product-card animate-fade-up">
                        <div className="product-image-wrap" onClick={() => setSelectedProduct(prod)} style={{ cursor: "pointer" }}>
                          <img src={prod.imageUrl} alt={prod.name} loading="lazy" />
                          {prod.badge && (
                            <span className={`badge ${prod.badge === "organic" ? "badge-organic" : "badge-bestseller"}`} style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}>
                              {prod.badge === "organic" ? "🌿 Organic" : "🔥 Bestseller"}
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setWishlist((prev) => ({ ...prev, [prod.id]: !prev[prod.id] })); }}
                            style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)", border: "none", borderRadius: "50%", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2 }}
                          >
                            <Heart size={16} fill={wishlist[prod.id] ? "var(--danger)" : "none"} color={wishlist[prod.id] ? "var(--danger)" : "var(--text-3)"} />
                          </button>
                        </div>
                        <div className="product-body">
                          <span className="t-caption" style={{ fontSize: "11px" }}>{prod.unit}</span>
                          <h4 className="t-product" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "38px" }}>
                            {prod.name}
                          </h4>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Star size={13} fill="#EAB308" color="#EAB308" />
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>{prod.rating}</span>
                          </div>
                          <div className="product-qty-row">
                            <div>
                              <span style={{ fontWeight: 800, fontSize: "16px", color: "var(--text)" }}>₹{prod.price}</span>
                              {prod.oldPrice && <span style={{ textDecoration: "line-through", fontSize: "12px", color: "var(--text-4)", marginLeft: "4px" }}>₹{prod.oldPrice}</span>}
                            </div>
                            {itemQty > 0 ? (
                              <div className="qty-stepper">
                                <button className="qty-btn" onClick={() => removeFromCart(prod.id)}>−</button>
                                <span className="qty-count">{itemQty}</span>
                                <button className="qty-btn" onClick={() => addToCart(prod.id)}>+</button>
                              </div>
                            ) : (
                              <button className="add-btn" onClick={() => addToCart(prod.id)} disabled={isOutOfRange}>
                                <Plus size={14} /> Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              {/* ⭐ CUSTOMER REVIEWS SECTION ⭐ */}
              {selectedCategory === "All" && (
                <div style={{ marginTop: "40px", animation: "fadeUp 0.5s var(--ease) both" }}>
                  <div className="section-header">
                    <h3 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" }}>What Our Customers Say</h3>
                    <span className="t-caption">Verified Buyer Feedback</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                    {INITIAL_REVIEWS.map((rev) => (
                      <div key={rev.id} className="card-premium" style={{ padding: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                          <img src={rev.avatar} alt={rev.name} style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }} />
                          <div>
                            <strong style={{ fontSize: "14px", display: "block" }}>{rev.name}</strong>
                            <span className="t-caption">{rev.location} · {rev.date}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
                          {[...Array(rev.rating)].map((_, idx) => (
                            <Star key={idx} size={14} fill="#EAB308" color="#EAB308" />
                          ))}
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ═══════ RIGHT SIDEBAR (Desktop) ═══════ */}
            <div className="sidebar-sticky">
              {/* Delivery Hub Location Card */}
              <div className="card-premium" style={{ padding: "20px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <MapPin size={18} color="var(--accent)" /> Delivery Address
                </h4>
                <strong style={{ fontSize: "15px", display: "block" }}>{locationName}</strong>
                <p className="t-caption" style={{ marginTop: "4px" }}>Hub: Akshay Farms ({distanceKm} KM)</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <button onClick={handleGPSDetect} className="btn btn-secondary" style={{ flex: 1, fontSize: "12px", padding: "8px" }}>📍 Detect GPS</button>
                  <button onClick={() => setShowMapModal(true)} className="btn btn-primary" style={{ flex: 1.5, fontSize: "12px", padding: "8px" }}>Radar Map</button>
                </div>
              </div>

              {/* Live Cart Card */}
              <div className="card-premium" style={{ padding: "20px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShoppingBasket size={18} color="var(--accent)" /> Your Cart ({totalCartItemsCount})
                </h4>
                {totalCartItemsCount === 0 ? (
                  <p className="t-caption">Your shopping cart is empty.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {Object.entries(cart).map(([id, qty]) => {
                        const prod = productsList.find((p) => p.id === id);
                        if (!prod) return null;
                        return (
                          <div key={id} className="cart-item" style={{ padding: "8px 0" }}>
                            <img src={prod.imageUrl} alt={prod.name} style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ fontSize: "13px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prod.name}</strong>
                              <span className="t-caption">{prod.unit} × {qty}</span>
                            </div>
                            <strong style={{ color: "var(--accent)", fontSize: "14px" }}>₹{prod.price * qty}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <div className="divider" style={{ margin: "4px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "15px" }}>Subtotal</span>
                      <span style={{ fontWeight: 800, fontSize: "18px", color: "var(--accent)" }}>₹{getCartTotal()}</span>
                    </div>
                    <button onClick={() => setCartOpen(true)} className="btn btn-primary" style={{ width: "100%", padding: "12px", borderRadius: "var(--r-lg)" }}>
                      Proceed to Checkout
                    </button>
                  </div>
                )}
              </div>

              {/* Rewards Wallet Card */}
              <div className="card-premium" style={{ padding: "20px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} color="#D97706" /> Reward Offers
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {bonusCampaigns.filter((c: any) => c.active).map((campaign: any) => (
                    <div key={campaign.id} style={{ background: "var(--accent-light)", borderRadius: "var(--r-md)", padding: "12px" }}>
                      <span className="t-label" style={{ color: "var(--accent)", fontSize: "10px" }}>Active Campaign</span>
                      <h5 style={{ fontWeight: 800, fontSize: "13px", margin: "4px 0 2px" }}>{campaign.name}</h5>
                      <p className="t-caption" style={{ margin: 0 }}>Earn <strong>{campaign.points} bonus pts</strong> on orders</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── REWARDS TAB ─── */}
        {customerSubTab === "rewards" && userEmail && (
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 16px" }}>
            <div className="wallet-card" style={{ marginBottom: "24px" }}>
              <div style={{ position: "relative", zIndex: 2 }}>
                <span style={{ fontSize: "13px", opacity: 0.7, fontWeight: 500 }}>Available Reward Balance</span>
                <div style={{ fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.1, margin: "8px 0" }}>{(wallets[userEmail]?.pointsBalance || 0)} <span style={{ fontSize: "20px", fontWeight: 600, opacity: 0.7 }}>pts</span></div>
                <span style={{ fontSize: "14px", opacity: 0.7 }}>≈ ₹{wallets[userEmail]?.pointsBalance || 0} instant discount value</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <div className="card-premium" style={{ padding: "20px", textAlign: "center" }}>
                <span className="t-caption">Lifetime Earned</span>
                <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>{wallets[userEmail]?.lifetimeEarned || 0}</div>
              </div>
              <div className="card-premium" style={{ padding: "20px", textAlign: "center" }}>
                <span className="t-caption">Lifetime Redeemed</span>
                <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px", color: "var(--danger)" }}>{wallets[userEmail]?.lifetimeRedeemed || 0}</div>
              </div>
            </div>

            <div className="card-premium" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>Points History</h3>
              {!(wallets[userEmail]?.history?.length) ? (
                <p className="t-caption">No transactions recorded yet. Place an order to start earning points.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th><th>Type</th><th>Description</th><th style={{ textAlign: "right" }}>Amount</th><th style={{ textAlign: "right" }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wallets[userEmail].history.slice().reverse().map((tx: any, idx: number) => (
                        <tr key={idx}>
                          <td>{tx.date?.split(" ")[0]}</td>
                          <td>
                            <span className={`badge ${tx.type === "EARNED" || tx.type === "BONUS" ? "badge-organic" : "badge-sale"}`}>{tx.type}</span>
                          </td>
                          <td>{tx.orderId ? `Order ${tx.orderId}` : tx.campaignName || "Adjustment"}</td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: tx.type === "EARNED" || tx.type === "BONUS" ? "var(--accent)" : "var(--danger)" }}>
                            {tx.type === "EARNED" || tx.type === "BONUS" ? `+${tx.points}` : `-${tx.points}`}
                          </td>
                          <td style={{ textAlign: "right", color: "var(--text-3)" }}>{tx.balance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ORDERS TAB ─── */}
        {customerSubTab === "orders" && userEmail && (
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 16px" }}>
            {activeOrder && activeOrder.orderStatus !== "Delivered" && activeOrder.orderStatus !== "Cancelled" && (
              <div className="card-premium" style={{ padding: "24px", borderLeft: "4px solid var(--accent)", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <span className="badge badge-new">📡 Live Order Radar</span>
                    <h3 style={{ fontWeight: 800, fontSize: "18px", marginTop: "8px" }}>Order {activeOrder.id} — {activeOrder.orderStatus}</h3>
                    <p className="t-caption" style={{ marginTop: "4px" }}>ETA: {activeOrder.orderStatus === "Out for Delivery" ? "< 10 mins" : "~30 mins"}</p>
                  </div>
                  <span style={{ fontSize: "3rem" }}>🛵</span>
                </div>
              </div>
            )}

            <div className="card-premium" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>Your Past Orders</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {ordersList.filter((o: any) => o.customerEmail?.toLowerCase() === userEmail.toLowerCase()).length === 0 ? (
                  <p className="t-caption">No orders placed yet.</p>
                ) : (
                  ordersList
                    .filter((o: any) => o.customerEmail?.toLowerCase() === userEmail.toLowerCase())
                    .map((order: any) => (
                      <div key={order.id} className="order-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <strong style={{ color: "var(--accent)", fontSize: "15px" }}>{order.id}</strong>
                            <span className="t-caption">{order.date}</span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                            {order.items.map((item: any, idx: number) => (
                              <span key={idx} className="badge" style={{ background: "var(--bg-alt)", color: "var(--text-2)", fontSize: "12px" }}>
                                {item.name} ×{item.qty}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                          <span className={`status-pill ${order.orderStatus === "Delivered" ? "status-delivered" : order.orderStatus === "Cancelled" ? "status-cancelled" : "status-pending"}`}>
                            {order.orderStatus}
                          </span>
                          <button onClick={() => setSelectedOrderDetails(order)} className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>
                            <Eye size={14} /> Receipt
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── PROFILE TAB ─── */}
        {customerSubTab === "profile" && userEmail && (
          <ProfileDashboard
            userEmail={userEmail}
            ordersList={ordersList}
            wallets={wallets}
            addresses={addresses}
            setAddresses={setAddresses}
            handleAddAddress={(tag, text) => {
              const newAddr = {
                id: `a_${Date.now()}`,
                tag: tag,
                address: text,
                lat: customerCoords.lat,
                lng: customerCoords.lng,
                isDefault: addresses.length === 0
              };
              setAddresses((prev) => [...prev, newAddr]);
            }}
            handleDeleteAddress={handleDeleteAddress}
            handleSetDefaultAddress={handleSetDefaultAddress}
            handleSignOut={handleSignOut}
            productsList={productsList}
            setCart={setCart}
          />
        )}
      </main>

      {/* ═══════ CART DRAWER OVERLAY ═══════ */}
      <div className={`cart-overlay ${cartOpen ? "open" : ""}`} onClick={() => setCartOpen(false)} />

      {/* ═══════ CART DRAWER PANEL ═══════ */}
      <div className={`cart-drawer ${cartOpen ? "open" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--divider)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShoppingBasket size={24} color="var(--accent)" />
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: "20px" }}>My Shopping Cart</h3>
          </div>
          <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {Object.keys(cart).length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: "64px" }}>
              <ShoppingBasket size={64} style={{ margin: "0 auto 20px", color: "var(--text-4)" }} />
              <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>Your cart is empty!</p>
              <p className="t-caption" style={{ marginTop: "4px" }}>Add fresh organic items to start checkout.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div>
                {Object.entries(cart).map(([id, qty]) => {
                  const prod = productsList.find((p) => p.id === id);
                  if (!prod) return null;
                  return (
                    <div key={id} className="cart-item">
                      <img src={prod.imageUrl} alt={prod.name} style={{ width: "48px", height: "48px", borderRadius: "10px", objectFit: "cover" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: "14px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prod.name}</strong>
                        <span className="t-caption">₹{prod.price} · {prod.unit}</span>
                      </div>
                      <div className="qty-stepper">
                        <button className="qty-btn" onClick={() => removeFromCart(id)}>−</button>
                        <span className="qty-count">{qty}</span>
                        <button className="qty-btn" onClick={() => addToCart(id)}>+</button>
                      </div>
                      <strong style={{ fontSize: "15px", color: "var(--text)", flexShrink: 0, minWidth: "44px", textAlign: "right" }}>₹{prod.price * qty}</strong>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Section */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px" }}>🎟️ Apply Coupon</h4>
                <div className="coupon-wrap">
                  <input type="text" placeholder="e.g. FRESH20" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                  <button onClick={handleApplyCoupon} className="btn btn-secondary" style={{ padding: "10px 18px" }}>Apply</button>
                </div>
                {couponError && <p style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px" }}>{couponError}</p>}
                {appliedCoupon && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--accent-light)", padding: "10px 14px", borderRadius: "var(--r-md)", marginTop: "8px", fontSize: "13px", color: "var(--accent)" }}>
                    <span>✅ Coupon <strong>{appliedCoupon.code}</strong> applied!</span>
                    <button onClick={() => setAppliedCoupon(null)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                  </div>
                )}
              </div>

              {userEmail && (wallets[userEmail]?.pointsBalance || 0) > 0 && (
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px" }}>🎁 Redeem Reward Points</h4>
                  <input
                    className="input-premium"
                    type="number"
                    min={0}
                    max={wallets[userEmail].pointsBalance}
                    value={redeemedPointsInput}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const max = Math.min(wallets[userEmail].pointsBalance, getCartTotal());
                      setRedeemedPointsInput(Number.isFinite(value) ? Math.max(0, Math.min(value, max)) : 0);
                    }}
                  />
                  <p className="t-caption" style={{ marginTop: "6px" }}>
                    Available {wallets[userEmail].pointsBalance} pts. 1 point = ₹1.
                  </p>
                </div>
              )}

              {/* Payment selector */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "10px" }}>Payment Method</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { mode: "cod" as const, label: "Cash on Delivery", icon: "💵" },
                    { mode: "upi" as const, label: "UPI Apps (GPay, PhonePe, Paytm)", icon: "📱" },
                    { mode: "card" as const, label: "Credit / Debit Card", icon: "💳" }
                  ].map(({ mode, label, icon }) => (
                    <div key={mode} className={`payment-card ${paymentMode === mode ? "selected" : ""}`} onClick={() => setPaymentMode(mode)}>
                      <div className="payment-radio"><div className="payment-radio-dot" /></div>
                      <span style={{ fontSize: "20px" }}>{icon}</span>
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Details */}
              <div style={{ borderTop: "1px solid var(--divider)", paddingTop: "16px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "12px" }}>Bill Summary</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>₹{getCartTotal()}</span></div>
                  {getCouponDiscount() > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)" }}><span>Coupon Discount</span><span>-₹{getCouponDiscount()}</span></div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Delivery Charge</span>
                    <span>{getCartTotal() - getCouponDiscount() > platformSettings.freeDeliveryThreshold || getCartTotal() === 0 ? <strong style={{ color: "var(--accent)" }}>FREE</strong> : `₹${deliveryCharge}`}</span>
                  </div>
                  <div className="divider" style={{ margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "18px", color: "var(--accent)" }}>
                    <span>Grand Total</span>
                    <span>₹{Math.max(0, getCartTotal() - getCouponDiscount()) + (getCartTotal() - getCouponDiscount() > platformSettings.freeDeliveryThreshold || getCartTotal() === 0 ? 0 : deliveryCharge)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {Object.keys(cart).length > 0 && (
          <div style={{ padding: "20px 24px", borderTop: "1px solid var(--divider)", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
            {checkoutError && <p style={{ color: "var(--danger)", fontSize: "13px", marginBottom: "10px" }}>{checkoutError}</p>}
            <button
              onClick={handlePlaceOrder}
              disabled={placingOrder || isOutOfRange || platformSettings.maintenanceMode}
              className="btn btn-primary"
              style={{ width: "100%", padding: "16px", fontSize: "16px", borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-green)", minHeight: "48px" }}
            >
              {placingOrder ? "Processing…" : paymentMode === "cod" ? "Place Order (COD)" : "Pay & Place Order"}
            </button>
          </div>
        )}
      </div>

      {/* ═══════ LOGIN MODAL ═══════ */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: "3.2rem", display: "block", marginBottom: "16px" }}>🥬</span>
            <h3 style={{ fontWeight: 900, fontSize: "24px", color: "var(--text)" }}>Welcome to SABJIWALAA ५</h3>
            <p style={{ color: "var(--text-3)", margin: "8px 0 24px", fontSize: "14px", lineHeight: 1.5 }}>
              Sign in to access <strong>{loginRequiredFor || "your account"}</strong>, earn rewards, and track deliveries.
            </p>
            <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left", marginBottom: "16px" }}>
              <input className="input-premium" type="email" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} autoComplete="email" />
              <input className="input-premium" type="password" placeholder="Password (min 6 characters)" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} autoComplete={isRegistering ? "new-password" : "current-password"} />
              {authError && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{authError}</p>}
              <button type="submit" className="btn btn-primary" disabled={authLoading} style={{ width: "100%", padding: "14px", borderRadius: "var(--r-xl)" }}>
                {authLoading ? "Please wait…" : isRegistering ? "Create account" : "Sign in with email"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setIsRegistering((v) => !v)} style={{ width: "100%" }}>
                {isRegistering ? "Have an account? Sign in" : "New here? Create an account"}
              </button>
            </form>
            <button
              onClick={() => { setShowLoginModal(false); handleGoogleSignIn(); }}
              className="btn btn-secondary"
              style={{ width: "100%", padding: "14px", fontSize: "15px", gap: "12px", borderRadius: "var(--r-xl)" }}
            >
              Continue with Google
            </button>
            <StaffLoginLinks />
          </div>
        </div>
      )}

      {/* ═══════ FLOATING MOBILE CART BUTTON ═══════ */}
      {totalCartItemsCount > 0 && (
        <button className="floating-cart" onClick={() => setCartOpen(true)}>
          <ShoppingBasket size={22} />
          <span>{totalCartItemsCount} Items · ₹{getCartTotal()}</span>
        </button>
      )}

      {/* ═══════ MAP MODAL ═══════ */}
      {showMapModal && (
        <div className="map-overlay" onClick={() => setShowMapModal(false)}>
          <div className="map-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <MapPin size={22} color="var(--accent)" /> Live Delivery Radar
              </h3>
              <button onClick={() => setShowMapModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={22} /></button>
            </div>
            <div ref={mapContainerRef} style={{ width: "100%", height: "280px", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", zIndex: 10 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <p className="t-caption">
                Coordinates: <strong>{customerCoords.lat.toFixed(4)}, {customerCoords.lng.toFixed(4)}</strong>
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={handleGPSDetect} className="btn btn-primary" style={{ fontSize: "12px", padding: "8px 14px" }}>📍 Detect GPS</button>
                <button onClick={() => updateLocation("Rajokri, New Delhi", 28.5284, 77.1028)} className="btn btn-secondary" style={{ fontSize: "12px", padding: "8px 14px" }}>Rajokri</button>
                <button onClick={() => updateLocation("Vasant Kunj, Delhi", 28.5450, 77.1560)} className="btn btn-secondary" style={{ fontSize: "12px", padding: "8px 14px" }}>Vasant Kunj</button>
              </div>
            </div>
            <button onClick={() => setShowMapModal(false)} className="btn btn-primary" style={{ width: "100%", padding: "14px", borderRadius: "var(--r-lg)" }}>
              Confirm Location
            </button>
          </div>
        </div>
      )}

      {/* ═══════ STAFF PORTAL LINKS ═══════ */}
      <footer style={{ padding: "16px 16px calc(88px + env(safe-area-inset-bottom))", textAlign: "center" }}>
        <StaffLoginLinks compact />
      </footer>

      {/* ═══════ STICKY BOTTOM NAV ═══════ */}
      <nav className="bottom-nav">
        {[
          { tab: "catalog" as const, icon: HomeIcon, label: "Home" },
          { tab: "orders" as const, icon: ShoppingBag, label: "Orders" },
          { tab: "rewards" as const, icon: Gift, label: "Rewards" },
          { tab: "profile" as const, icon: User, label: "Profile" }
        ].map(({ tab, icon: Icon, label }) => (
          <button
            key={tab}
            onClick={() => handleNavClick(tab)}
            className="nav-tab"
            style={{ color: customerSubTab === tab ? "var(--accent)" : "var(--text-3)" }}
          >
            <Icon size={22} color={customerSubTab === tab ? "var(--accent)" : "var(--text-3)"} strokeWidth={customerSubTab === tab ? 2.5 : 1.8} />
            <span className="nav-tab-label" style={{ color: customerSubTab === tab ? "var(--accent)" : "var(--text-3)" }}>{label}</span>
            {customerSubTab === tab && <div style={{ position: "absolute", top: "-1px", width: "24px", height: "3px", borderRadius: "2px", background: "var(--accent)" }} />}
          </button>
        ))}
      </nav>

      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: "left", maxWidth: 480, padding: 0, overflow: "hidden" }}>
            <img src={selectedProduct.imageUrl} alt={selectedProduct.name} style={{ width: "100%", height: 220, objectFit: "cover" }} />
            <div style={{ padding: 24 }}>
              <h3 style={{ fontSize: 22, fontWeight: 800 }}>{selectedProduct.name}</h3>
              <p className="t-caption" style={{ marginTop: 4 }}>{selectedProduct.hindiName} · {selectedProduct.unit}</p>
              <p style={{ marginTop: 12, fontSize: 15, color: "var(--text-2)" }}>Farm-fresh item from our hyperlocal hub. Stock: {selectedProduct.stock}.</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                <strong style={{ fontSize: 22 }}>₹{selectedProduct.price}</strong>
                <button className="btn btn-primary" disabled={isOutOfRange || (selectedProduct.stock || 0) <= 0} onClick={() => { addToCart(selectedProduct.id); setSelectedProduct(null); setCartOpen(true); }}>
                  {(selectedProduct.stock || 0) <= 0 ? "Out of stock" : "Add to cart"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
