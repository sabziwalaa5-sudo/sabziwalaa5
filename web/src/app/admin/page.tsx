"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Eye, Edit2, Trash2, Shield, Plus, Minus, Info, Check, X, ArrowLeft, Settings, Gift, FileText, ShoppingBag, Store, Users, Tag, AlertTriangle, Truck } from "lucide-react";
import { STATE_KEYS, getStoredState, setStoredState, INITIAL_VENDORS, INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_WALLETS, INITIAL_COUPONS, INITIAL_CAMPAIGNS } from "../../lib/sharedState";
import { resolveUserRole } from "../../lib/resolveRole";
import { getPlatformSettings, setPlatformSettings, INITIAL_SETTINGS } from "../../lib/platformSettings";
import PortalNav, { StaffLoginLinks } from "../../components/PortalNav";

export default function AdminPortal() {
  const [mounted, setMounted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"vendors" | "riders" | "customers" | "orders" | "products" | "coupons" | "rewards" | "reports" | "settings">("vendors");

  // Auth State
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Shared States from localStorage
  const [vendorsList, setVendorsList] = useState(() => getStoredState(STATE_KEYS.VENDORS, INITIAL_VENDORS));
  const [productsList, setProductsList] = useState(() => getStoredState(STATE_KEYS.PRODUCTS, INITIAL_PRODUCTS));
  const [ordersList, setOrdersList] = useState(() => getStoredState(STATE_KEYS.ORDERS, INITIAL_ORDERS));
  const [wallets, setWallets] = useState(() => getStoredState(STATE_KEYS.WALLETS, INITIAL_WALLETS));
  const [availableCoupons, setAvailableCoupons] = useState(() => getStoredState(STATE_KEYS.COUPONS, INITIAL_COUPONS));
  const [bonusCampaigns, setBonusCampaigns] = useState(() => getStoredState(STATE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS));

  // Edit / Add product states
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    hindiName: "",
    price: 0,
    unit: "1 kg",
    image: "🥬",
    category: "Vegetables",
    stock: 100,
    vendorId: ""
  });

  // Edit / Add Vendor states
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    vendor_name: "",
    shop_name: "",
    mobile: "",
    email: "",
    address: "",
    status: "Active",
    lat: 28.5305,
    lng: 77.1048
  });

  // Edit / Add Coupon states
  const [couponFormOpen, setCouponFormOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: 10,
    minOrder: 100,
    maxDiscount: 50
  });

  const [rewardSettings, setRewardSettings] = useState(INITIAL_SETTINGS.rewardSettings);
  const [maintenanceMode, setMaintenanceMode] = useState(INITIAL_SETTINGS.maintenanceMode);
  const [minOrderThreshold, setMinOrderThreshold] = useState(INITIAL_SETTINGS.minOrderThreshold);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(INITIAL_SETTINGS.freeDeliveryThreshold);
  const [settingsSavedAt, setSettingsSavedAt] = useState<string | null>(null);

  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
    const syncState = () => {
      setVendorsList(getStoredState(STATE_KEYS.VENDORS, INITIAL_VENDORS));
      setProductsList(getStoredState(STATE_KEYS.PRODUCTS, INITIAL_PRODUCTS));
      setOrdersList(getStoredState(STATE_KEYS.ORDERS, INITIAL_ORDERS));
      setWallets(getStoredState(STATE_KEYS.WALLETS, INITIAL_WALLETS));
      setAvailableCoupons(getStoredState(STATE_KEYS.COUPONS, INITIAL_COUPONS));
      setBonusCampaigns(getStoredState(STATE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS));
      const settings = getPlatformSettings();
      setRewardSettings(settings.rewardSettings);
      setMaintenanceMode(settings.maintenanceMode);
      setMinOrderThreshold(settings.minOrderThreshold);
      setFreeDeliveryThreshold(settings.freeDeliveryThreshold);
    };

    window.addEventListener("sabjiwala_state_update", syncState);
    window.addEventListener("storage", syncState);
    syncState();

    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        verifySessionRole(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        verifySessionRole(session.user);
      } else {
        setUserEmail(null);
        setUserRole(null);
      }
    });

    return () => {
      window.removeEventListener("sabjiwala_state_update", syncState);
      window.removeEventListener("storage", syncState);
      subscription.unsubscribe();
    };
  }, []);

  const persistPlatformSettings = (next: Partial<{
    maintenanceMode: boolean;
    minOrderThreshold: number;
    freeDeliveryThreshold: number;
    rewardSettings: typeof rewardSettings;
  }>) => {
    const merged = {
      maintenanceMode: next.maintenanceMode ?? maintenanceMode,
      minOrderThreshold: next.minOrderThreshold ?? minOrderThreshold,
      freeDeliveryThreshold: next.freeDeliveryThreshold ?? freeDeliveryThreshold,
      rewardSettings: next.rewardSettings ?? rewardSettings,
    };
    setPlatformSettings(merged);
    setSettingsSavedAt(new Date().toLocaleTimeString("en-IN"));
  };

  const verifySessionRole = async (user: any) => {
    const email = user.email || "";
    const role = await resolveUserRole(user);

    if (role === "ADMIN") {
      setUserEmail(email);
      setUserRole(role);
    } else {
      await supabase.auth.signOut();
      setAuthError("Access Denied: Only Administrator accounts are authorized to access the Admin Panel.");
      setUserEmail(null);
      setUserRole(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || "Google Sign-In failed.");
      setAuthLoading(false);
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || "Invalid login credentials.");
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      setUserEmail(null);
      setUserRole(null);
      setAuthLoading(false);
    }
  };

  // Vendor actions
  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVendor) {
      const updated = vendorsList.map(v => v.vendor_id === editingVendor.vendor_id ? {
        ...v,
        vendor_name: vendorForm.vendor_name,
        shop_name: vendorForm.shop_name,
        mobile: vendorForm.mobile,
        email: vendorForm.email,
        address: vendorForm.address,
        status: vendorForm.status
      } : v);
      setVendorsList(updated);
      setStoredState(STATE_KEYS.VENDORS, updated);
    } else {
      const newVendor = {
        vendor_id: `v_${Date.now()}`,
        vendor_name: vendorForm.vendor_name,
        shop_name: vendorForm.shop_name,
        mobile: vendorForm.mobile,
        email: vendorForm.email,
        address: vendorForm.address,
        status: vendorForm.status,
        lat: 28.5305,
        lng: 77.1048
      };
      const updated = [...vendorsList, newVendor];
      setVendorsList(updated);
      setStoredState(STATE_KEYS.VENDORS, updated);
    }
    setVendorFormOpen(false);
    setEditingVendor(null);
  };

  const toggleVendorStatus = (vendorId: string) => {
    const updated = vendorsList.map(v => {
      if (v.vendor_id === vendorId) {
        return { ...v, status: v.status === "Active" ? "Inactive" : "Active" };
      }
      return v;
    });
    setVendorsList(updated);
    setStoredState(STATE_KEYS.VENDORS, updated);
  };

  // Order actions
  const handleUpdateOrderStatus = (orderId: string, status: string) => {
    const updated = ordersList.map(o => o.id === orderId ? { ...o, orderStatus: status } : o);
    setOrdersList(updated);
    setStoredState(STATE_KEYS.ORDERS, updated);
    if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
      setSelectedOrderDetails(prev => prev ? { ...prev, orderStatus: status } : null);
    }
  };

  // Product actions
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const updated = productsList.map(p => p.id === editingProduct.id ? {
        ...p,
        name: productForm.name,
        hindiName: productForm.hindiName,
        price: productForm.price,
        unit: productForm.unit,
        image: productForm.image,
        category: productForm.category,
        stock: productForm.stock,
        vendorId: productForm.vendorId
      } : p);
      setProductsList(updated);
      setStoredState(STATE_KEYS.PRODUCTS, updated);
    } else {
      const newProduct = {
        id: `p_${Date.now()}`,
        name: productForm.name,
        hindiName: productForm.hindiName,
        price: productForm.price,
        oldPrice: Math.round(productForm.price * 1.25),
        unit: productForm.unit,
        image: productForm.image,
        imageUrl: "",
        category: productForm.category,
        stock: productForm.stock,
        rating: 5.0,
        reviewsCount: 1,
        vendorId: productForm.vendorId || vendorsList[0]?.vendor_id,
        badge: null as string | null,
        isSeasonal: false,
        isFarmFresh: true
      };

      const updated = [...productsList, newProduct];
      setProductsList(updated);
      setStoredState(STATE_KEYS.PRODUCTS, updated);
    }
    setProductFormOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Delete product?")) {
      const updated = productsList.filter(p => p.id !== id);
      setProductsList(updated);
      setStoredState(STATE_KEYS.PRODUCTS, updated);
    }
  };

  // Coupon actions
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const newCoupon = {
      code: couponForm.code.toUpperCase(),
      discountType: couponForm.discountType,
      discountValue: couponForm.discountValue,
      minOrder: couponForm.minOrder,
      maxDiscount: couponForm.maxDiscount
    };
    const updated = [...availableCoupons, newCoupon];
    setAvailableCoupons(updated);
    setStoredState(STATE_KEYS.COUPONS, updated);
    setCouponFormOpen(false);
    setCouponForm({ code: "", discountType: "percentage", discountValue: 10, minOrder: 100, maxDiscount: 50 });
  };

  const handleDeleteCoupon = (code: string) => {
    if (confirm("Delete coupon?")) {
      const updated = availableCoupons.filter(c => c.code !== code);
      setAvailableCoupons(updated);
      setStoredState(STATE_KEYS.COUPONS, updated);
    }
  };

  // Campaigns
  const toggleCampaignStatus = (id: string) => {
    const updated = bonusCampaigns.map(c => c.id === id ? { ...c, active: !c.active } : c);
    setBonusCampaigns(updated);
    setStoredState(STATE_KEYS.CAMPAIGNS, updated);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Order ID", "Date", "Customer Name", "Customer Email", "Delivery Address", "Payment Method", "Payment Status", "Status", "Subtotal", "Delivery Fee", "Discount", "Total Amount"];
    const rows = ordersList.map(o => [
      o.id,
      o.date,
      o.customerName,
      o.customerEmail,
      `"${o.deliveryAddress}"`,
      o.paymentMethod,
      o.paymentStatus,
      o.orderStatus,
      o.subtotal,
      o.deliveryCharges,
      o.discount,
      o.totalAmount
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sabjiwala_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#ffffff" }} />;
  }

  // Analytics summary calculations
  const totalRevenue = ordersList.filter(o => o.orderStatus === "Delivered").reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCommission = totalRevenue * 0.08;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "var(--font-sans), sans-serif" }}>
      {/* 1. ADMIN AUTH GATE */}
      {!userEmail ? (
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div className="card" style={{ maxWidth: "450px", width: "100%", padding: "2.5rem", borderRadius: "16px", backgroundColor: "white", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center", marginBlockEnd: "2rem" }}>
              <span style={{ fontSize: "3rem" }}>🛡️</span>
              <h2 style={{ fontWeight: "900", fontSize: "1.6rem", marginBlockStart: "0.5rem" }}>SABJIWALAA ५</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Administrator Terminal Gate</p>
            </div>

            {authError && (
              <div style={{ backgroundColor: "hsla(0, 84%, 60%, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "8px", marginBlockEnd: "1.5rem", fontSize: "0.85rem", display: "flex", gap: "0.5rem" }}>
                <Info size={16} style={{ flexShrink: 0, marginBlockStart: "2px" }} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailPasswordLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600" }}>Admin Username / Email</label>
                <input
                  type="email"
                  placeholder="e.g. sabziwalaa5@gmail.com"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600" }}>Security Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", fontWeight: "700", marginBlockStart: "0.5rem" }}
              >
                {authLoading ? "Decrypting..." : "Administrator Sign In"}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBlockStart: "1.25rem" }}>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>OR</span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="btn btn-secondary"
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", fontWeight: "700", marginBlockStart: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign In with Google
            </button>

            <div style={{ marginBlockStart: "1.5rem", textAlign: "center" }}>
              <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600", textDecoration: "none" }}>
                <ArrowLeft size={16} /> Back to Grocery Marketplace
              </a>
              <StaffLoginLinks />
            </div>
          </div>
        </div>
      ) : (
        // 2. ADMIN DASHBOARD INTERFACE
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          {/* Header */}
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 2rem", borderBottom: "1px solid var(--border)", backgroundColor: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "2rem" }}>🛡️</span>
              <div>
                <h1 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>Administrator Dashboard</h1>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>Superuser: {userEmail}</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <PortalNav role={userRole === "ADMIN" ? "ADMIN" : null} current="admin" compact />
              <span className="badge badge-success" style={{ fontSize: "0.7rem", backgroundColor: "#7c3aed", color: "white" }}>Platform Owner</span>
              <button onClick={handleSignOut} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px" }}>Sign Out</button>
            </div>
          </header>

          {/* Sub Navigation Tabs */}
          <nav style={{ backgroundColor: "white", borderBottom: "1px solid var(--border)", padding: "0 2rem", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            {[
              { id: "vendors", label: "Vendors", icon: <Store size={15} /> },
              { id: "riders", label: "Delivery Riders", icon: <Truck size={15} /> },
              { id: "customers", label: "Customers Profiles", icon: <Users size={15} /> },
              { id: "orders", label: "All Orders", icon: <ShoppingBag size={15} /> },
              { id: "products", label: "Organic Catalog", icon: <Plus size={15} /> },
              { id: "coupons", label: "Coupons", icon: <Tag size={15} /> },
              { id: "rewards", label: "Rewards Ledger", icon: <Gift size={15} /> },
              { id: "reports", label: "System Telemetry", icon: <FileText size={15} /> },
              { id: "settings", label: "App Config", icon: <Settings size={15} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "1rem 0.35rem",
                  border: "none",
                  background: "none",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  color: activeSubTab === tab.id ? "var(--accent)" : "var(--text-secondary)",
                  borderBottom: activeSubTab === tab.id ? "3px solid var(--accent)" : "3px solid transparent",
                  transition: "all 0.15s"
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Body */}
          <main style={{ flex: 1, padding: "2rem", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
            
            {/* A. VENDORS TAB */}
            {activeSubTab === "vendors" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Manage Shop Vendors</h3>
                  <button onClick={() => {
                    setEditingVendor(null);
                    setVendorForm({ vendor_name: "", shop_name: "", mobile: "", email: "", address: "", status: "Active", lat: 28.5305, lng: 77.1048 });
                    setVendorFormOpen(true);
                  }} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", borderRadius: "8px" }}><Plus size={16} /> Add Vendor</button>
                </div>

                <div className="card" style={{ padding: 0, borderRadius: "16px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <th style={{ padding: "1rem" }}>Shop Name</th>
                        <th style={{ padding: "1rem" }}>Vendor Name</th>
                        <th style={{ padding: "1rem" }}>Registered Email</th>
                        <th style={{ padding: "1rem" }}>Contact</th>
                        <th style={{ padding: "1rem" }}>Status</th>
                        <th style={{ padding: "1rem" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorsList.map(v => (
                        <tr key={v.vendor_id} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                          <td style={{ padding: "1rem" }}><strong>{v.shop_name}</strong></td>
                          <td style={{ padding: "1rem" }}>{v.vendor_name}</td>
                          <td style={{ padding: "1rem" }}>{v.email}</td>
                          <td style={{ padding: "1rem" }}>+91 {v.mobile}</td>
                          <td style={{ padding: "1rem" }}><span className={`badge ${v.status === "Active" ? "badge-success" : "badge-danger"}`}>{v.status}</span></td>
                          <td style={{ padding: "1rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button onClick={() => {
                                setEditingVendor(v);
                                setVendorForm({ vendor_name: v.vendor_name, shop_name: v.shop_name, mobile: v.mobile, email: v.email, address: v.address, status: v.status, lat: v.lat, lng: v.lng });
                                setVendorFormOpen(true);
                              }} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                              <button onClick={() => toggleVendorStatus(v.vendor_id)} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: v.status === "Active" ? "var(--danger)" : "var(--accent)" }}>
                                {v.status === "Active" ? "Suspend" : "Approve"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* B. RIDERS TAB */}
            {activeSubTab === "riders" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Delivery Rider Directory</h3>
                <div className="card" style={{ padding: 0, borderRadius: "16px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <th style={{ padding: "1rem" }}>Rider Agent</th>
                        <th style={{ padding: "1rem" }}>Contact Info</th>
                        <th style={{ padding: "1rem" }}>Role</th>
                        <th style={{ padding: "1rem" }}>Assigned Trips</th>
                        <th style={{ padding: "1rem" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <td style={{ padding: "1rem" }}><strong>Rider Agent (Raman)</strong></td>
                        <td style={{ padding: "1rem" }}>rider@gmail.com</td>
                        <td style={{ padding: "1rem" }}>Rider / Delivery Partner</td>
                        <td style={{ padding: "1rem" }}>{ordersList.filter(o => o.orderStatus === "Delivered").length} trips</td>
                        <td style={{ padding: "1rem" }}><span className="badge badge-success">Online / Active</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* C. CUSTOMERS TAB */}
            {activeSubTab === "customers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Customer Profiles Registry</h3>
                <div className="card" style={{ padding: 0, borderRadius: "16px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <th style={{ padding: "1rem" }}>Email Account</th>
                        <th style={{ padding: "1rem" }}>Name</th>
                        <th style={{ padding: "1rem" }}>Earning points Balance</th>
                        <th style={{ padding: "1rem" }}>Total Orders Placed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(wallets).map(([email, w]: any) => (
                        <tr key={email} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                          <td style={{ padding: "1rem" }}><strong>{email}</strong></td>
                          <td style={{ padding: "1rem" }}>{email.split("@")[0]}</td>
                          <td style={{ padding: "1rem", color: "var(--accent)", fontWeight: "bold" }}>{w.pointsBalance} pts</td>
                          <td style={{ padding: "1rem" }}>{ordersList.filter(o => o.customerEmail?.toLowerCase() === email.toLowerCase()).length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* D. ORDERS TAB */}
            {activeSubTab === "orders" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Global Market Orders Dispatch</h3>
                
                <div className="grid-two-cols" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
                  <div className="card" style={{ padding: 0, borderRadius: "16px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                          <th style={{ padding: "0.75rem 1rem" }}>Order ID</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Date</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Customer</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Total</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersList.map(o => (
                          <tr key={o.id} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.8rem" }}>
                            <td style={{ padding: "0.75rem 1rem" }}><strong>{o.id}</strong></td>
                            <td style={{ padding: "0.75rem 1rem" }}>{o.date.split(" ")[0]}</td>
                            <td style={{ padding: "0.75rem 1rem" }}>{o.customerName}</td>
                            <td style={{ padding: "0.75rem 1rem", fontWeight: "700" }}>₹{o.totalAmount}</td>
                            <td style={{ padding: "0.75rem 1rem" }}><span className="badge badge-success">{o.orderStatus}</span></td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <div style={{ display: "flex", gap: "0.35rem" }}>
                                <button onClick={() => setSelectedOrderDetails(o)} className="btn btn-secondary" style={{ padding: "0.2rem 0.4rem", fontSize: "0.7rem" }}><Eye size={12} /></button>
                                <select
                                  value={o.orderStatus}
                                  onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                  style={{ padding: "0.2rem", fontSize: "0.7rem", borderRadius: "4px" }}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Packed">Packed</option>
                                  <option value="Out for Delivery">Out for Delivery</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    {selectedOrderDetails ? (
                      <div className="card" style={{ borderRadius: "16px" }}>
                        <h4 style={{ fontWeight: "800", borderBottom: "1px solid var(--border)", paddingBlockEnd: "0.5rem" }}>Bill Detail: {selectedOrderDetails.id}</h4>
                        <div style={{ marginBlock: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
                          {selectedOrderDetails.items.map((it: any, idx: number) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>{it.name} (x{it.qty})</span>
                              <span>₹{it.subtotal}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ borderTop: "1px solid var(--border)", paddingBlockStart: "0.75rem", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>₹{selectedOrderDetails.subtotal}</span></div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Delivery charge</span><span>₹{selectedOrderDetails.deliveryCharges}</span></div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "var(--accent)" }}><span>Total Amount</span><span>₹{selectedOrderDetails.totalAmount}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)", padding: "3rem 1.5rem", borderRadius: "16px" }}>
                        <p>Select an order receipt details.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* E. PRODUCTS CATALOG TAB */}
            {activeSubTab === "products" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "800" }}>Platform Products Catalog</h3>
                  <button onClick={() => {
                    setEditingProduct(null);
                    setProductForm({ name: "", hindiName: "", price: 0, unit: "1 kg", image: "🥦", category: "Vegetables", stock: 100, vendorId: vendorsList[0]?.vendor_id });
                    setProductFormOpen(true);
                  }} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", borderRadius: "8px" }}><Plus size={16} /> Add Product</button>
                </div>

                <div className="card" style={{ padding: 0, borderRadius: "16px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <th style={{ padding: "1rem" }}>Product</th>
                        <th style={{ padding: "1rem" }}>Hindi Translation</th>
                        <th style={{ padding: "1rem" }}>Price</th>
                        <th style={{ padding: "1rem" }}>Stock</th>
                        <th style={{ padding: "1rem" }}>Shop Assignment</th>
                        <th style={{ padding: "1rem" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsList.map(prod => {
                        const vendor = vendorsList.find(v => v.vendor_id === prod.vendorId);
                        return (
                          <tr key={prod.id} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                            <td style={{ padding: "1rem" }}><span style={{ fontSize: "1.5rem", marginInlineEnd: "0.5rem" }}>{prod.image}</span>{prod.name}</td>
                            <td style={{ padding: "1rem" }}>{prod.hindiName}</td>
                            <td style={{ padding: "1rem", fontWeight: "700" }}>₹{prod.price} / {prod.unit}</td>
                            <td style={{ padding: "1rem" }}>{prod.stock} {prod.unit}</td>
                            <td style={{ padding: "1rem" }}><span className="badge badge-secondary">{vendor ? vendor.shop_name : "General Hub"}</span></td>
                            <td style={{ padding: "1rem" }}>
                              <div style={{ display: "flex", gap: "0.35rem" }}>
                                <button onClick={() => {
                                  setEditingProduct(prod);
                                  setProductForm({ name: prod.name, hindiName: prod.hindiName, price: prod.price, unit: prod.unit, image: prod.image, category: prod.category, stock: prod.stock, vendorId: prod.vendorId });
                                  setProductFormOpen(true);
                                }} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                                <button onClick={() => handleDeleteProduct(prod.id)} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderColor: "var(--danger)", color: "var(--danger)" }}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* F. COUPONS TAB */}
            {activeSubTab === "coupons" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Market Discount Coupons</h3>
                  <button onClick={() => setCouponFormOpen(true)} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", borderRadius: "8px" }}><Plus size={16} /> Create Coupon</button>
                </div>

                <div className="card" style={{ padding: 0, borderRadius: "16px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <th style={{ padding: "1rem" }}>Coupon Code</th>
                        <th style={{ padding: "1rem" }}>Discount Type</th>
                        <th style={{ padding: "1rem" }}>Discount Value</th>
                        <th style={{ padding: "1rem" }}>Min Order Value</th>
                        <th style={{ padding: "1rem" }}>Max Discount Cap</th>
                        <th style={{ padding: "1rem" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableCoupons.map(c => (
                        <tr key={c.code} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                          <td style={{ padding: "1rem" }}><span className="badge badge-success" style={{ fontSize: "0.85rem", textTransform: "uppercase" }}>{c.code}</span></td>
                          <td style={{ padding: "1rem" }}>{c.discountType === "percentage" ? "Percentage Discount" : "Flat Cash Discount"}</td>
                          <td style={{ padding: "1rem", fontWeight: "700" }}>{c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                          <td style={{ padding: "1rem" }}>₹{c.minOrder}</td>
                          <td style={{ padding: "1rem" }}>{c.maxDiscount ? `₹${c.maxDiscount}` : "No Limit"}</td>
                          <td style={{ padding: "1rem" }}><button onClick={() => handleDeleteCoupon(c.code)} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderColor: "var(--danger)", color: "var(--danger)" }}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* G. REWARDS LEDGER TAB */}
            {activeSubTab === "rewards" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Rewards Earning Configuration</h3>
                
                <div className="card" style={{ borderRadius: "16px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={rewardSettings.enabled}
                      onChange={(e) => {
                        const next = { ...rewardSettings, enabled: e.target.checked };
                        setRewardSettings(next);
                        persistPlatformSettings({ rewardSettings: next });
                      }}
                    />
                    <label style={{ fontWeight: "700" }}>Enable Earning & Redemption of Points on Platform</label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: "600" }}>Earning Rate (Points per ₹100 spent)</label>
                      <input
                        type="number"
                        value={rewardSettings.earningRate}
                        onChange={(e) => {
                          const next = { ...rewardSettings, earningRate: parseInt(e.target.value) || 0 };
                          setRewardSettings(next);
                          persistPlatformSettings({ rewardSettings: next });
                        }}
                        style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: "600" }}>Point Redemption Value (in ₹ per 1 Point)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={rewardSettings.pointValue}
                        onChange={(e) => {
                          const next = { ...rewardSettings, pointValue: parseFloat(e.target.value) || 0 };
                          setRewardSettings(next);
                          persistPlatformSettings({ rewardSettings: next });
                        }}
                        style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Campaigns */}
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", marginBlockStart: "1rem" }}>Bonus Campaigns Manager</h3>
                <div className="card" style={{ padding: 0, borderRadius: "16px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <th style={{ padding: "1rem" }}>Campaign Name</th>
                        <th style={{ padding: "1rem" }}>Bonus Points</th>
                        <th style={{ padding: "1rem" }}>Status</th>
                        <th style={{ padding: "1rem" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bonusCampaigns.map(c => (
                        <tr key={c.id} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                          <td style={{ padding: "1rem" }}><strong>{c.name}</strong></td>
                          <td style={{ padding: "1rem", color: "var(--accent)", fontWeight: "bold" }}>+{c.points} points</td>
                          <td style={{ padding: "1rem" }}><span className={`badge ${c.active ? "badge-success" : "badge-secondary"}`}>{c.active ? "Active" : "Disabled"}</span></td>
                          <td style={{ padding: "1rem" }}><button onClick={() => toggleCampaignStatus(c.id)} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>{c.active ? "Deactivate" : "Activate"}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* H. SYSTEM TELEMETRY REPORTS */}
            {activeSubTab === "reports" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>System Telemetry & Reports</h3>
                  <button onClick={handleExportCSV} className="btn btn-primary" style={{ padding: "0.5rem 1rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <FileText size={16} /> Export Telemetry to CSV
                  </button>
                </div>

                <div className="layout-three-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Global Platform Sales</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900", color: "var(--accent)" }}>₹{totalRevenue}</span>
                  </div>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Admin Platform Fees (8%)</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900" }}>₹{totalCommission.toFixed(2)}</span>
                  </div>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Net Merchant Settlements (92%)</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900" }}>₹{(totalRevenue * 0.92).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* I. APP CONFIG SETTINGS */}
            {activeSubTab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>App Configuration Settings</h3>

                <div className="card" style={{ borderRadius: "16px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      id="maintenance-toggle"
                      checked={maintenanceMode}
                      onChange={(e) => {
                        setMaintenanceMode(e.target.checked);
                        persistPlatformSettings({ maintenanceMode: e.target.checked });
                      }}
                    />
                    <label htmlFor="maintenance-toggle" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <AlertTriangle size={16} style={{ color: "var(--danger)" }} />
                      Enable Storefront Maintenance Mode (Closes Checkout for customers)
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", borderTop: "1px solid var(--border)", paddingBlockStart: "1.25rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: "600" }}>Minimum Order Basket Value (₹)</label>
                      <input
                        type="number"
                        value={minOrderThreshold}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setMinOrderThreshold(value);
                          persistPlatformSettings({ minOrderThreshold: value });
                        }}
                        style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: "600" }}>Free Shipping Delivery Threshold (₹)</label>
                      <input
                        type="number"
                        value={freeDeliveryThreshold}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setFreeDeliveryThreshold(value);
                          persistPlatformSettings({ freeDeliveryThreshold: value });
                        }}
                        style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>
                  <p className="t-caption" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    These settings apply immediately to the customer storefront and native apps at the same origin.
                    {settingsSavedAt ? ` Last synced ${settingsSavedAt}.` : ""}
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Vendor Form Modal */}
      {vendorFormOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(2px)" }}>
          <div className="card" style={{ maxWidth: "500px", width: "90%", padding: "2rem", borderRadius: "16px", backgroundColor: "white" }}>
            <h3 style={{ fontWeight: "800", fontSize: "1.2rem", borderBottom: "1px solid var(--border)", paddingBlockEnd: "0.5rem" }}>
              {editingVendor ? `Edit Merchant: ${editingVendor.shop_name}` : "Create New Shop Merchant"}
            </h3>
            
            <form onSubmit={handleSaveVendor} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBlockStart: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Owner / Vendor Name</label>
                <input
                  type="text"
                  placeholder="Vendor Name"
                  required
                  value={vendorForm.vendor_name}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, vendor_name: e.target.value }))}
                  style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Shop Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vasant Kunj Organics"
                  required
                  value={vendorForm.shop_name}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, shop_name: e.target.value }))}
                  style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Contact Mobile</label>
                  <input
                    type="text"
                    placeholder="10-digit number"
                    required
                    value={vendorForm.mobile}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, mobile: e.target.value }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Merchant Email</label>
                  <input
                    type="email"
                    placeholder="Merchant Email"
                    required
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Hub Shop Address</label>
                <input
                  type="text"
                  placeholder="Enter full physical address"
                  required
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, address: e.target.value }))}
                  style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginBlockStart: "1rem" }}>
                <button type="button" onClick={() => { setVendorFormOpen(false); setEditingVendor(null); }} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Save Merchant</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {productFormOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(2px)" }}>
          <div className="card" style={{ maxWidth: "500px", width: "90%", padding: "2rem", borderRadius: "16px", backgroundColor: "white" }}>
            <h3 style={{ fontWeight: "800", fontSize: "1.2rem", borderBottom: "1px solid var(--border)", paddingBlockEnd: "0.5rem" }}>
              {editingProduct ? `Edit Catalog: ${editingProduct.name}` : "Create New Catalog Product"}
            </h3>
            
            <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBlockStart: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>English Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Organic Cauliflower"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Hindi Product Translation</label>
                <input
                  type="text"
                  placeholder="e.g. जैविक गोभी"
                  required
                  value={productForm.hindiName}
                  onChange={(e) => setProductForm(prev => ({ ...prev, hindiName: e.target.value }))}
                  style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Price (₹)</label>
                  <input
                    type="number"
                    placeholder="Price"
                    min="1"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Sales Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 kg or 250 g"
                    required
                    value={productForm.unit}
                    onChange={(e) => setProductForm(prev => ({ ...prev, unit: e.target.value }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Emoji Icon Image</label>
                  <input
                    type="text"
                    placeholder="e.g. 🥦 or 🥬"
                    required
                    value={productForm.image}
                    onChange={(e) => setProductForm(prev => ({ ...prev, image: e.target.value }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Inventory Stock</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    min="0"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm(prev => ({ ...prev, stock: parseFloat(e.target.value) || 0 }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Assign to Merchant</label>
                  <select
                    value={productForm.vendorId}
                    onChange={(e) => setProductForm(prev => ({ ...prev, vendorId: e.target.value }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  >
                    {vendorsList.map(v => (
                      <option key={v.vendor_id} value={v.vendor_id}>{v.shop_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginBlockStart: "1rem" }}>
                <button type="button" onClick={() => { setProductFormOpen(false); setEditingProduct(null); }} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Form Modal */}
      {couponFormOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(2px)" }}>
          <div className="card" style={{ maxWidth: "450px", width: "90%", padding: "2rem", borderRadius: "16px", backgroundColor: "white" }}>
            <h3 style={{ fontWeight: "800", fontSize: "1.2rem", borderBottom: "1px solid var(--border)", paddingBlockEnd: "0.5rem" }}>Create New Discount Coupon</h3>
            
            <form onSubmit={handleSaveCoupon} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBlockStart: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. FLASH30"
                  required
                  value={couponForm.code}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value }))}
                  style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Discount Type</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, discountType: e.target.value }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, discountValue: parseInt(e.target.value) || 0 }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Min Basket Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={couponForm.minOrder}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, minOrder: parseInt(e.target.value) || 0 }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={couponForm.maxDiscount}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, maxDiscount: parseInt(e.target.value) || 0 }))}
                    style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginBlockStart: "1rem" }}>
                <button type="button" onClick={() => setCouponFormOpen(false)} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Create Coupon</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
