"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Eye, Edit2, Trash2, Shield, Plus, Minus, Info, Check, X, ArrowLeft, Store, DollarSign, Package, ShoppingBag, BarChart } from "lucide-react";
import { STATE_KEYS, getStoredState, setStoredState, INITIAL_VENDORS, INITIAL_PRODUCTS, INITIAL_ORDERS } from "../../lib/sharedState";
import { resolveUserRole } from "../../lib/resolveRole";
import PortalNav, { StaffLoginLinks } from "../../components/PortalNav";
import AppLoadingShell from "../../components/AppLoadingShell";
import { BrandLogo } from "../../components/BrandLogo";
import { fetchStaffSession, loginStaffPortal, logoutStaffPortal } from "../../lib/staffClient";
import { canAccessPortal } from "../../lib/roles";

export default function VendorPortal() {
  const [mounted, setMounted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"orders" | "products" | "inventory" | "earnings" | "profile">("orders");

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

  // Edit / Add product states
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    hindiName: "",
    price: 0,
    unit: "1 kg",
    image: "🥦",
    category: "Vegetables",
    stock: 100
  });

  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
    const syncState = () => {
      setVendorsList(getStoredState(STATE_KEYS.VENDORS, INITIAL_VENDORS));
      setProductsList(getStoredState(STATE_KEYS.PRODUCTS, INITIAL_PRODUCTS));
      setOrdersList(getStoredState(STATE_KEYS.ORDERS, INITIAL_ORDERS));
    };

    window.addEventListener("sabjiwala_state_update", syncState);
    window.addEventListener("storage", syncState);

    fetchStaffSession().then((session) => {
      if (session && canAccessPortal(session.role, "vendor")) {
        setUserEmail(session.email);
        setUserRole(session.role);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        verifySessionRole(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        verifySessionRole(session.user);
      }
    });

    return () => {
      window.removeEventListener("sabjiwala_state_update", syncState);
      window.removeEventListener("storage", syncState);
      subscription.unsubscribe();
    };
  }, []);

  const verifySessionRole = async (user: any) => {
    const email = user.email || "";
    const role = await resolveUserRole(user);

    if (role === "VENDOR" || role === "ADMIN") {
      setUserEmail(email);
      setUserRole(role);
    } else {
      await supabase.auth.signOut();
      setAuthError("Access Denied: Only approved vendor accounts are authorized to access the Vendor Portal.");
      setUserEmail(null);
      setUserRole(null);
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const staff = await loginStaffPortal(loginEmail, loginPassword, "vendor");
      setUserEmail(staff.email);
      setUserRole(staff.role);
    } catch (staffErr: any) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword
        });
        if (error) throw error;
        if (data.user) await verifySessionRole(data.user);
      } catch (err: any) {
        setAuthError(staffErr.message || err.message || "Invalid login credentials.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await logoutStaffPortal();
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      setUserEmail(null);
      setUserRole(null);
      setAuthLoading(false);
    }
  };

  const getCurrentVendorRecord = () => {
    if (!userEmail) return null;
    return vendorsList.find(v => v.email.toLowerCase() === userEmail.toLowerCase())
      || (userRole === "ADMIN" ? vendorsList.find(v => v.status === "Active") || vendorsList[0] : null);
  };

  const getFilteredVendorOrders = () => {
    const currentVendor = getCurrentVendorRecord();
    if (!currentVendor) return [];
    return ordersList.filter(o => o.vendorId === currentVendor.vendor_id);
  };

  // Vendor actions
  const updateOrderStatus = (orderId: string, newStatus: string) => {
    const updated = ordersList.map(o => o.id === orderId ? { ...o, orderStatus: newStatus } : o);
    setOrdersList(updated);
    setStoredState(STATE_KEYS.ORDERS, updated);

    // Sync selected details view if open
    if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
      setSelectedOrderDetails(prev => prev ? { ...prev, orderStatus: newStatus } : null);
    }
  };

  // Product management actions
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = getCurrentVendorRecord();
    if (!vendor) return;

    if (editingProduct) {
      // Edit existing product
      const updated = productsList.map(p => p.id === editingProduct.id ? {
        ...p,
        name: productForm.name,
        hindiName: productForm.hindiName,
        price: productForm.price,
        unit: productForm.unit,
        image: productForm.image,
        category: productForm.category,
        stock: productForm.stock
      } : p);
      setProductsList(updated);
      setStoredState(STATE_KEYS.PRODUCTS, updated);
    } else {
      // Add new product
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
        vendorId: vendor.vendor_id,
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

  const handleDeleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to remove this product from your shop catalog?")) {
      const updated = productsList.filter(p => p.id !== productId);
      setProductsList(updated);
      setStoredState(STATE_KEYS.PRODUCTS, updated);
    }
  };

  const handleEditClick = (prod: any) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      hindiName: prod.hindiName,
      price: prod.price,
      unit: prod.unit,
      image: prod.image,
      category: prod.category,
      stock: prod.stock
    });
    setProductFormOpen(true);
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      hindiName: "",
      price: 0,
      unit: "1 kg",
      image: "🥬",
      category: "Vegetables",
      stock: 100
    });
    setProductFormOpen(true);
  };

  if (!mounted) {
    return <AppLoadingShell label="Opening merchant hub…" />;
  }

  const currentVendor = getCurrentVendorRecord();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "var(--font-sans), sans-serif" }}>
      {/* 1. VENDOR PORTAL AUTHENTICATION GATE */}
      {!userEmail ? (
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div className="card" style={{ maxWidth: "450px", width: "100%", padding: "2.5rem", borderRadius: "16px", backgroundColor: "white", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center", marginBlockEnd: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
                <BrandLogo height={72} />
              </div>
              <span style={{ fontSize: "2rem" }}>🏪</span>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBlockStart: "0.5rem" }}>Merchant / Vendor Partner Terminal</p>
            </div>

            {authError && (
              <div style={{ backgroundColor: "hsla(0, 84%, 60%, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "8px", marginBlockEnd: "1.5rem", fontSize: "0.85rem", display: "flex", gap: "0.5rem" }}>
                <Info size={16} style={{ flexShrink: 0, marginBlockStart: "2px" }} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailPasswordLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>Merchant Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. raman@gmail.com"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>Account Password</label>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert("Merchant Password Reset link sent to your registered shop email."); }} style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: "600" }}>Forgot Password?</a>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.35rem 0 0" }}>
                  Use <strong>raman@gmail.com</strong> and PIN <strong>Sabjiwala5!</strong>
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", fontWeight: "700", marginBlockStart: "0.5rem" }}
              >
                {authLoading ? "Logging in..." : "Merchant Sign In"}
              </button>
            </form>

            <div style={{ marginBlockStart: "1.5rem", textAlign: "center" }}>
              <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600", textDecoration: "none" }}>
                <ArrowLeft size={16} /> Back to Grocery Marketplace
              </a>
              <StaffLoginLinks />
            </div>
          </div>
        </div>
      ) : (
        // 2. VENDOR PORTAL DASHBOARD MAIN INTERFACE
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          {/* Dashboard Header */}
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 2rem", borderBottom: "1px solid var(--border)", backgroundColor: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "2rem" }}>🏪</span>
              <div>
                <h1 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0, color: "var(--accent)" }}>
                  {currentVendor?.shop_name || "Merchant Hub"}
                </h1>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>Registered Owner: {currentVendor?.vendor_name}</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <PortalNav role={userRole === "ADMIN" || userRole === "VENDOR" ? (userRole as "ADMIN" | "VENDOR") : null} current="vendor" compact />
              <span className="badge badge-success" style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>Approved Vendor</span>
              <button onClick={handleSignOut} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px" }}>Sign Out</button>
            </div>
          </header>

          {/* Sub Navigation */}
          <nav style={{ backgroundColor: "white", borderBottom: "1px solid var(--border)", padding: "0 2rem", display: "flex", gap: "1.5rem" }}>
            {[
              { id: "orders", label: "Orders Queue", icon: <ShoppingBag size={16} /> },
              { id: "products", label: "Product Catalog", icon: <Package size={16} /> },
              { id: "inventory", label: "Inventory Stock", icon: <Store size={16} /> },
              { id: "earnings", label: "Earnings Ledger", icon: <DollarSign size={16} /> },
              { id: "profile", label: "Shop Profile", icon: <Info size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "1rem 0.5rem",
                  border: "none",
                  background: "none",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  color: activeSubTab === tab.id ? "var(--accent)" : "var(--text-secondary)",
                  borderBottom: activeSubTab === tab.id ? "3px solid var(--accent)" : "3px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Dashboard Body */}
          <main style={{ flex: 1, padding: "2rem", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
            
            {/* A. ORDERS QUEUE TAB */}
            {activeSubTab === "orders" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div className="layout-three-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Ringing Incoming Orders</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900", color: "var(--accent)" }}>
                      {getFilteredVendorOrders().filter(o => o.orderStatus === "Pending").length}
                    </span>
                  </div>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Active Packed Shipments</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900" }}>
                      {getFilteredVendorOrders().filter(o => ["Confirmed", "Packed", "Out for Delivery"].includes(o.orderStatus)).length}
                    </span>
                  </div>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Total Lifetime Orders</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900" }}>
                      {getFilteredVendorOrders().length}
                    </span>
                  </div>
                </div>

                <div className="grid-two-cols" style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: "1.5rem" }}>
                  {/* Orders Queue list */}
                  <div className="card" style={{ borderRadius: "16px" }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Orders Dispatch Registry</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBlockStart: "1rem" }}>
                      {getFilteredVendorOrders().length === 0 ? (
                        <p style={{ color: "var(--text-secondary)" }}>No orders assigned to your shop yet.</p>
                      ) : (
                        getFilteredVendorOrders().map(order => (
                          <div key={order.id} style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: order.orderStatus === "Pending" ? "hsla(142, 70%, 45%, 0.02)" : "white" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <strong style={{ color: "var(--accent)" }}>{order.id}</strong>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{order.date}</span>
                              </div>
                              <p style={{ fontSize: "0.85rem", marginBlock: "0.25rem" }}>Deliver to: <strong>{order.deliveryAddress}</strong></p>
                              <div>
                                {order.items.map((item: any, idx: number) => (
                                  <span key={idx} style={{ fontSize: "0.75rem", background: "#f3f4f6", border: "1px solid var(--border)", padding: "0.15rem 0.4rem", borderRadius: "4px", marginInlineEnd: "0.4rem" }}>
                                    {item.name} (x{item.qty})
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <button onClick={() => setSelectedOrderDetails(order)} className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", borderRadius: "6px" }}><Eye size={14} /></button>
                              
                              {order.orderStatus === "Pending" && (
                                <>
                                  <button onClick={() => updateOrderStatus(order.id, "Cancelled")} className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", borderColor: "var(--danger)", color: "var(--danger)", borderRadius: "6px" }}>Reject</button>
                                  <button onClick={() => updateOrderStatus(order.id, "Confirmed")} className="btn btn-primary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", borderRadius: "6px" }}>Accept</button>
                                </>
                              )}

                              {order.orderStatus === "Confirmed" && (
                                <button onClick={() => updateOrderStatus(order.id, "Packed")} className="btn btn-primary" style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px" }}>Mark Packed</button>
                              )}

                              {order.orderStatus === "Packed" && (
                                <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>Ready for Delivery</span>
                              )}

                              {order.orderStatus === "Out for Delivery" && (
                                <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>On Trip</span>
                              )}

                              {order.orderStatus === "Delivered" && (
                                <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>Delivered</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Order detail side card */}
                  <div>
                    {selectedOrderDetails ? (
                      <div className="card" style={{ borderRadius: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBlockEnd: "0.5rem" }}>
                          <h4 style={{ fontWeight: "800" }}>Receipt: {selectedOrderDetails.id}</h4>
                          <span className="badge badge-secondary">{selectedOrderDetails.orderStatus}</span>
                        </div>
                        <div style={{ marginBlock: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {selectedOrderDetails.items.map((item: any, idx: number) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                              <span>{item.name} (x{item.qty})</span>
                              <span>₹{item.subtotal}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ borderTop: "1px solid var(--border)", paddingBlockStart: "0.75rem", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Subtotal</span>
                            <span>₹{selectedOrderDetails.subtotal}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Delivery fee</span>
                            <span>₹{selectedOrderDetails.deliveryCharges}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "var(--accent)" }}>
                            <span>Paid Total</span>
                            <span>₹{selectedOrderDetails.totalAmount}</span>
                          </div>
                        </div>
                        <div style={{ marginBlockStart: "1rem", fontSize: "0.8rem", color: "var(--text-secondary)", borderTop: "1px solid var(--border)", paddingBlockStart: "0.75rem" }}>
                          <p style={{ margin: 0 }}>📍 Client: <strong>{selectedOrderDetails.customerName}</strong> ({selectedOrderDetails.customerEmail})</p>
                          <p style={{ margin: "0.25rem 0 0" }}>📍 Address: {selectedOrderDetails.deliveryAddress}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)", padding: "3rem 1.5rem", borderRadius: "16px" }}>
                        <ShoppingBag size={48} style={{ margin: "0 auto 1rem", color: "#ccc" }} />
                        <p>Select an order from the list to view its complete bill receipt and customer details.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* B. PRODUCT CATALOG TAB */}
            {activeSubTab === "products" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "800" }}>Manage Shop Products Catalog</h3>
                  <button onClick={handleAddClick} className="btn btn-primary" style={{ padding: "0.5rem 1rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Plus size={16} /> Add Product
                  </button>
                </div>

                <div className="card" style={{ borderRadius: "16px", padding: 0, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <th style={{ padding: "1rem" }}>Product image & Name</th>
                        <th style={{ padding: "1rem" }}>Hindi Translation</th>
                        <th style={{ padding: "1rem" }}>Category</th>
                        <th style={{ padding: "1rem" }}>Price</th>
                        <th style={{ padding: "1rem" }}>Stock Available</th>
                        <th style={{ padding: "1rem" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsList
                        .filter(p => p.vendorId === currentVendor?.vendor_id)
                        .map(prod => (
                          <tr key={prod.id} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.9rem" }}>
                            <td style={{ padding: "1rem" }}>
                              <span style={{ fontSize: "1.8rem", marginInlineEnd: "0.5rem" }}>{prod.image}</span>
                              <strong style={{ fontSize: "0.95rem" }}>{prod.name}</strong>
                            </td>
                            <td style={{ padding: "1rem" }}>{prod.hindiName}</td>
                            <td style={{ padding: "1rem" }}><span className="badge badge-secondary" style={{ textTransform: "uppercase" }}>{prod.category}</span></td>
                            <td style={{ padding: "1rem", fontWeight: "700", color: "var(--accent)" }}>₹{prod.price} <span style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-secondary)" }}>/ {prod.unit}</span></td>
                            <td style={{ padding: "1rem" }}>{prod.stock} {prod.unit}</td>
                            <td style={{ padding: "1rem" }}>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button onClick={() => handleEditClick(prod)} className="btn btn-secondary" style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}><Edit2 size={12} /></button>
                                <button onClick={() => handleDeleteProduct(prod.id)} className="btn btn-secondary" style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem", borderColor: "var(--danger)", color: "var(--danger)" }}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* C. INVENTORY STOCK TAB */}
            {activeSubTab === "inventory" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "800" }}>Manage Shop Stock Quantities</h3>
                
                <div className="card" style={{ borderRadius: "16px", padding: 0, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <th style={{ padding: "1rem" }}>Product</th>
                        <th style={{ padding: "1rem" }}>Current Stock</th>
                        <th style={{ padding: "1rem" }}>Stock Status</th>
                        <th style={{ padding: "1rem" }}>Adjustment Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsList
                        .filter(p => p.vendorId === currentVendor?.vendor_id)
                        .map(prod => {
                          const isLow = prod.stock <= 20;
                          return (
                            <tr key={prod.id} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.9rem" }}>
                              <td style={{ padding: "1rem" }}>
                                <span style={{ fontSize: "1.5rem", marginInlineEnd: "0.5rem" }}>{prod.image}</span>
                                <strong>{prod.name}</strong>
                              </td>
                              <td style={{ padding: "1rem", fontWeight: "700" }}>{prod.stock} {prod.unit}</td>
                              <td style={{ padding: "1rem" }}>
                                <span className={`badge ${isLow ? "badge-danger" : "badge-success"}`}>
                                  {isLow ? "Low Stock Alert" : "Healthy Stock"}
                                </span>
                              </td>
                              <td style={{ padding: "1rem" }}>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    onClick={() => {
                                      const updated = productsList.map(p => p.id === prod.id ? { ...p, stock: Math.max(0, p.stock - 10) } : p);
                                      setProductsList(updated);
                                      setStoredState(STATE_KEYS.PRODUCTS, updated);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                  >
                                    -10 {prod.unit}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updated = productsList.map(p => p.id === prod.id ? { ...p, stock: p.stock + 10 } : p);
                                      setProductsList(updated);
                                      setStoredState(STATE_KEYS.PRODUCTS, updated);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                  >
                                    +10 {prod.unit}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const val = prompt(`Enter new stock quantity for ${prod.name} (in ${prod.unit}):`, prod.stock.toString());
                                      if (val !== null) {
                                        const qty = parseFloat(val);
                                        if (!isNaN(qty) && qty >= 0) {
                                          const updated = productsList.map(p => p.id === prod.id ? { ...p, stock: qty } : p);
                                          setProductsList(updated);
                                          setStoredState(STATE_KEYS.PRODUCTS, updated);
                                        }
                                      }
                                    }}
                                    className="btn btn-primary"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                  >
                                    Set Custom
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* D. EARNINGS LEDGER TAB */}
            {activeSubTab === "earnings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div className="layout-three-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Total Sales Revenue</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900", color: "var(--accent)" }}>
                      ₹{getFilteredVendorOrders().filter(o => o.orderStatus === "Delivered").reduce((sum, o) => sum + o.totalAmount, 0)}
                    </span>
                  </div>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Net Merchant Earnings (92%)</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900" }}>
                      ₹{(getFilteredVendorOrders().filter(o => o.orderStatus === "Delivered").reduce((sum, o) => sum + o.totalAmount, 0) * 0.92).toFixed(2)}
                    </span>
                  </div>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Commission Commission (8%)</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900", color: "var(--danger)" }}>
                      ₹{(getFilteredVendorOrders().filter(o => o.orderStatus === "Delivered").reduce((sum, o) => sum + o.totalAmount, 0) * 0.08).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="card" style={{ borderRadius: "16px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Completed Trips Settlement</h3>
                  <div style={{ marginBlockStart: "1rem" }}>
                    {getFilteredVendorOrders().filter(o => o.orderStatus === "Delivered").length === 0 ? (
                      <p style={{ color: "var(--text-secondary)" }}>No completed settlements recorded yet.</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            <th style={{ padding: "0.5rem" }}>Order ID</th>
                            <th style={{ padding: "0.5rem" }}>Date</th>
                            <th style={{ padding: "0.5rem" }}>Order Subtotal</th>
                            <th style={{ padding: "0.5rem" }}>Commission (8%)</th>
                            <th style={{ padding: "0.5rem", textAlign: "right" }}>Net Payout (92%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredVendorOrders()
                            .filter(o => o.orderStatus === "Delivered")
                            .map((order, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                                <td style={{ padding: "0.6rem 0.5rem", fontWeight: "bold", color: "var(--accent)" }}>{order.id}</td>
                                <td style={{ padding: "0.6rem 0.5rem" }}>{order.date}</td>
                                <td style={{ padding: "0.6rem 0.5rem" }}>₹{order.totalAmount}</td>
                                <td style={{ padding: "0.6rem 0.5rem", color: "var(--danger)" }}>-₹{(order.totalAmount * 0.08).toFixed(2)}</td>
                                <td style={{ padding: "0.6rem 0.5rem", textAlign: "right", fontWeight: "bold", color: "var(--accent)" }}>₹{(order.totalAmount * 0.92).toFixed(2)}</td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* E. SHOP PROFILE TAB */}
            {activeSubTab === "profile" && currentVendor && (
              <div className="grid-two-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem" }}>
                <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", borderRadius: "16px", padding: "2rem" }}>
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--accent)", color: "white", fontSize: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    {currentVendor.shop_name.charAt(0)}
                  </div>
                  <h3 style={{ fontWeight: "800", fontSize: "1.25rem", margin: 0 }}>{currentVendor.shop_name}</h3>
                  <span className="badge badge-success">{currentVendor.status}</span>
                </div>

                <div className="card" style={{ borderRadius: "16px", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "800", borderBottom: "1px solid var(--border)", paddingBlockEnd: "0.5rem" }}>Shop Profile Registry Details</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Merchant Name:</span>
                      <strong>{currentVendor.vendor_name}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Registered Email:</span>
                      <strong>{currentVendor.email}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Contact Number:</span>
                      <strong>+91 {currentVendor.mobile}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Hub Shop Address:</span>
                      <strong>{currentVendor.address}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-secondary)" }}>GPS Coordinates:</span>
                      <strong>Lat {currentVendor.lat}, Lng {currentVendor.lng}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Product Creator/Editor Modal */}
      {productFormOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(2px)" }}>
          <div className="card" style={{ maxWidth: "500px", width: "90%", padding: "2rem", borderRadius: "16px", backgroundColor: "white" }}>
            <h3 style={{ fontWeight: "800", fontSize: "1.2rem", borderBottom: "1px solid var(--border)", paddingBlockEnd: "0.5rem" }}>
              {editingProduct ? `Edit Catalog: ${editingProduct.name}` : "Add New Catalog Product"}
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

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Initial Inventory Stock Quantity</label>
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

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginBlockStart: "1rem" }}>
                <button type="button" onClick={() => { setProductFormOpen(false); setEditingProduct(null); }} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Save Catalog</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
