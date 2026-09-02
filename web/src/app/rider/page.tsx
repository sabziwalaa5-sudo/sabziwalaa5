"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { Eye, Shield, Clock, MapPin, Truck, Check, X, ArrowLeft, DollarSign, List, ToggleLeft, ToggleRight, Info } from "lucide-react";
import { STATE_KEYS, getStoredState, setStoredState, INITIAL_VENDORS, INITIAL_ORDERS } from "../../lib/sharedState";
import { resolveUserRole } from "../../lib/resolveRole";
import PortalNav, { StaffLoginLinks } from "../../components/PortalNav";
import AppLoadingShell from "../../components/AppLoadingShell";

export default function RiderPortal() {
  const [mounted, setMounted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"today" | "history" | "earnings">("today");
  const [isOnline, setIsOnline] = useState(true);

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
  const [ordersList, setOrdersList] = useState(() => getStoredState(STATE_KEYS.ORDERS, INITIAL_ORDERS));

  // Rider position tracking state
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const syncState = () => {
      setVendorsList(getStoredState(STATE_KEYS.VENDORS, INITIAL_VENDORS));
      setOrdersList(getStoredState(STATE_KEYS.ORDERS, INITIAL_ORDERS));
    };

    window.addEventListener("sabjiwala_state_update", syncState);
    window.addEventListener("storage", syncState);

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

  // Update map in active delivery simulator
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const activeOrder = ordersList.find(o => ["Confirmed", "Packed", "Out for Delivery"].includes(o.orderStatus));
    if (!activeOrder) {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      return;
    }

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current).setView([28.5284, 77.1028], 14);
      leafletMapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
      }).addTo(map);
    }

    const map = leafletMapRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Client coordinate (Customer destination)
    const customerCoords = { lat: 28.5284, lng: 77.1028 };
    const customerMarker = L.marker([customerCoords.lat, customerCoords.lng])
      .bindPopup(`<b>📍 Client Destination</b><br/>${activeOrder.deliveryAddress}`)
      .addTo(map);
    markersRef.current.push(customerMarker);

    // Rider Marker
    const riderLat = driverPosition?.lat || 28.5305;
    const riderLng = driverPosition?.lng || 77.1048;
    const riderIcon = L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: #3B82F6; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; white-space: nowrap; box-shadow: 0 2px 10px rgba(0,0,0,0.15); border: 1px solid white;">🛵 You (Rider)</div>`,
      iconSize: [100, 30],
      iconAnchor: [50, 15]
    });
    const riderMarker = L.marker([riderLat, riderLng], { icon: riderIcon })
      .bindPopup("<b>Your Current Location</b>")
      .addTo(map);
    markersRef.current.push(riderMarker);

    // Pan map to rider position
    map.panTo([riderLat, riderLng]);
  }, [ordersList, driverPosition, activeSubTab]);

  const verifySessionRole = async (user: any) => {
    const email = user.email || "";
    const role = await resolveUserRole(user);

    if (role === "DELIVERY_PARTNER" || role === "ADMIN") {
      setUserEmail(email);
      setUserRole(role);
    } else {
      await supabase.auth.signOut();
      setAuthError("Access Denied: Only approved delivery partner accounts are authorized to access the Rider Portal.");
      setUserEmail(null);
      setUserRole(null);
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

  // Status transition handler
  const updateOrderStatus = (orderId: string, newStatus: string) => {
    const updated = ordersList.map(o => o.id === orderId ? { ...o, orderStatus: newStatus } : o);
    setOrdersList(updated);
    setStoredState(STATE_KEYS.ORDERS, updated);
  };

  const getActiveRiderOrders = () => {
    return ordersList.filter(o => ["Confirmed", "Packed", "Out for Delivery"].includes(o.orderStatus));
  };

  const getCompletedRiderOrders = () => {
    return ordersList.filter(o => o.orderStatus === "Delivered");
  };

  if (!mounted) {
    return <AppLoadingShell label="Opening rider terminal…" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "var(--font-sans), sans-serif" }}>
      {/* 1. RIDER PORTAL AUTH GATE */}
      {!userEmail ? (
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div className="card" style={{ maxWidth: "450px", width: "100%", padding: "2.5rem", borderRadius: "16px", backgroundColor: "white", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center", marginBlockEnd: "2rem" }}>
              <span style={{ fontSize: "3rem" }}>🛵</span>
              <h2 style={{ fontWeight: "900", fontSize: "1.6rem", marginBlockStart: "0.5rem" }}>SABJIWALAA ५</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Delivery Agent / Rider Terminal</p>
            </div>

            {authError && (
              <div style={{ backgroundColor: "hsla(0, 84%, 60%, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "8px", marginBlockEnd: "1.5rem", fontSize: "0.85rem", display: "flex", gap: "0.5rem" }}>
                <Info size={16} style={{ flexShrink: 0, marginBlockStart: "2px" }} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailPasswordLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>Agent Email / Mobile Login</label>
                <input
                  type="email"
                  placeholder="e.g. rider@gmail.com"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>Agent Password</label>
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
                {authLoading ? "Verifying..." : "Agent Sign In"}
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
        // 2. RIDER PORTAL MAIN DASHBOARD
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          {/* Header */}
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 2rem", borderBottom: "1px solid var(--border)", backgroundColor: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "2rem" }}>🛵</span>
              <div>
                <h1 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>Rider Terminal</h1>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>Active Agent: {userEmail}</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <PortalNav role={userRole === "ADMIN" || userRole === "DELIVERY_PARTNER" ? (userRole as "ADMIN" | "DELIVERY_PARTNER") : null} current="rider" compact />
              {/* Online/Offline availability toggle */}
              <button
                onClick={() => setIsOnline(!isOnline)}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", border: "none", background: "none", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem", color: isOnline ? "var(--accent)" : "var(--text-secondary)" }}
              >
                {isOnline ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
              </button>

              <button onClick={handleSignOut} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px" }}>Sign Out</button>
            </div>
          </header>

          {/* Sub Navigation */}
          <nav style={{ backgroundColor: "white", borderBottom: "1px solid var(--border)", padding: "0 2rem", display: "flex", gap: "1.5rem" }}>
            {[
              { id: "today", label: "Active Shipments", icon: <Truck size={16} /> },
              { id: "history", label: "Delivery History", icon: <List size={16} /> },
              { id: "earnings", label: "Rider Payouts", icon: <DollarSign size={16} /> }
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
          <main style={{ flex: 1, padding: "2rem", maxWidth: "1000px", width: "100%", margin: "0 auto" }}>
            
            {/* A. TODAY'S ACTIVE DELIVERIES */}
            {activeSubTab === "today" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Active Assigned Trips</h3>

                {getActiveRiderOrders().length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-secondary)", borderRadius: "16px" }}>
                    <Truck size={48} style={{ margin: "0 auto 1rem", color: "#ccc" }} />
                    <p>No active delivery assignments. You are currently in the queue.</p>
                  </div>
                ) : (
                  getActiveRiderOrders().map(order => (
                    <div key={order.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
                      
                      {/* Left: Info Card */}
                      <div className="card" style={{ borderRadius: "16px", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h4 style={{ fontWeight: "800", fontSize: "1.1rem" }}>Order ID: {order.id}</h4>
                          <span className="badge badge-warning">{order.orderStatus}</span>
                        </div>

                        <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <p style={{ margin: 0 }}>📍 Client Address: <strong>{order.deliveryAddress}</strong></p>
                          <p style={{ margin: 0 }}>👤 Client Name: {order.customerName}</p>
                          <p style={{ margin: 0 }}>📞 Phone: +91 {order.customerMobile}</p>
                          <p style={{ margin: 0 }}>💳 Mode: {order.paymentMethod} ({order.paymentStatus})</p>
                          <p style={{ margin: 0 }}>💰 Amount Collectible: <strong style={{ color: "var(--accent)" }}>₹{order.totalAmount}</strong></p>
                        </div>

                        {/* Status update button controls */}
                        <div style={{ borderTop: "1px solid var(--border)", paddingBlockStart: "1rem", marginBlockStart: "0.5rem" }}>
                          {order.orderStatus === "Confirmed" && (
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBlockEnd: "0.75rem" }}>Waiting for Merchant to Pack order.</p>
                          )}

                          {order.orderStatus === "Packed" && (
                            <button
                              onClick={() => {
                                updateOrderStatus(order.id, "Out for Delivery");
                                setDriverPosition({ lat: 28.5295, lng: 77.1035 });
                              }}
                              className="btn btn-primary"
                              style={{ width: "100%", borderRadius: "8px", padding: "0.6rem" }}
                            >
                              Confirm Pickup & Start Delivery Trip
                            </button>
                          )}

                          {order.orderStatus === "Out for Delivery" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                              <div style={{ backgroundColor: "#f3f4f6", padding: "0.75rem", borderRadius: "10px", border: "1px solid var(--border)" }}>
                                <span className="pulsing" style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: "700" }}>📡 GPS Live Simulation:</span>
                                <div style={{ display: "flex", gap: "0.35rem", marginBlockStart: "0.5rem" }}>
                                  <button onClick={() => setDriverPosition({ lat: 28.5300, lng: 77.1040 })} className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}>Step 1</button>
                                  <button onClick={() => setDriverPosition({ lat: 28.5290, lng: 77.1030 })} className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}>Step 2</button>
                                  <button onClick={() => setDriverPosition({ lat: 28.5284, lng: 77.1028 })} className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}>Arrived</button>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  updateOrderStatus(order.id, "Delivered");
                                  setDriverPosition(null);
                                }}
                                className="btn btn-primary"
                                style={{ width: "100%", borderRadius: "8px", padding: "0.6rem", background: "var(--accent)" }}
                              >
                                Arrived & Mark as Delivered
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Map Picker */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div ref={mapContainerRef} style={{ width: "100%", height: "350px", borderRadius: "16px", border: "2px solid var(--border)", zIndex: 1 }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* B. DELIVERY HISTORY */}
            {activeSubTab === "history" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Trips Completed Register</h3>
                
                <div className="card" style={{ borderRadius: "16px", padding: 0, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <th style={{ padding: "1rem" }}>Order ID</th>
                        <th style={{ padding: "1rem" }}>Completion Date</th>
                        <th style={{ padding: "1rem" }}>Client Destination</th>
                        <th style={{ padding: "1rem" }}>Payment Type</th>
                        <th style={{ padding: "1rem", textAlign: "right" }}>Earning Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCompletedRiderOrders().length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No completed trips found.</td>
                        </tr>
                      ) : (
                        getCompletedRiderOrders().map((order, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                            <td style={{ padding: "1rem", fontWeight: "bold", color: "var(--accent)" }}>{order.id}</td>
                            <td style={{ padding: "1rem" }}>{order.date}</td>
                            <td style={{ padding: "1rem" }}>{order.deliveryAddress}</td>
                            <td style={{ padding: "1rem" }}>{order.paymentMethod}</td>
                            <td style={{ padding: "1rem", textAlign: "right", fontWeight: "bold", color: "var(--accent)" }}>₹40.00</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* C. RIDER PAYOUTS */}
            {activeSubTab === "earnings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div className="layout-three-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Total Completed Deliveries</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900", color: "var(--accent)" }}>
                      {getCompletedRiderOrders().length}
                    </span>
                  </div>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Today's Rider Payouts (₹40/trip)</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900" }}>
                      ₹{getCompletedRiderOrders().length * 40}
                    </span>
                  </div>
                  <div className="card" style={{ borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Agent Rating</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900", color: "var(--accent)" }}>
                      5.0 ⭐️
                    </span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
