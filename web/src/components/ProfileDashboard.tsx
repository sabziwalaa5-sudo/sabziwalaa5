"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Package,
  MapPin,
  CreditCard,
  Award,
  Share2,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MessageSquare,
  Check,
  ExternalLink,
  Shield,
  Copy,
  X,
  Camera,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface ProfileDashboardProps {
  userEmail: string;
  ordersList: any[];
  wallets: { [email: string]: any };
  addresses: any[];
  setAddresses: React.Dispatch<React.SetStateAction<any[]>>;
  handleAddAddress: (tag: string, text: string) => void;
  handleDeleteAddress: (id: string) => void;
  handleSetDefaultAddress: (id: string) => void;
  handleSignOut: () => Promise<void>;
  productsList: any[];
  setCart: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
}

export default function ProfileDashboard({
  userEmail,
  ordersList,
  wallets,
  addresses,
  setAddresses,
  handleAddAddress,
  handleDeleteAddress,
  handleSetDefaultAddress,
  handleSignOut,
  productsList,
  setCart
}: ProfileDashboardProps) {
  // Navigation & Sub-section Tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "addresses" | "payments" | "rewards" | "settings" | "support" | "legal"
  >("overview");

  // UI & Loading States
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  // Form inputs
  const [profileName, setProfileName] = useState(userEmail.split("@")[0]);
  const [profilePhone, setProfilePhone] = useState("+91 98765 43210");
  const [profilePhoto, setProfilePhoto] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces");
  const [newAddrTag, setNewAddrTag] = useState("Home");
  const [newAddrText, setNewAddrText] = useState("");
  
  // Payment methods states
  const [savedPayments, setSavedPayments] = useState([
    { id: "p1", type: "upi", value: "sabziwalaa5@okhdfcbank", label: "UPI (Google Pay / PhonePe)" },
    { id: "p2", type: "card", value: "•••• •••• •••• 4242", label: "HDFC Visa Credit Card" }
  ]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<"upi" | "card">("upi");
  const [newPaymentVal, setNewPaymentVal] = useState("");

  // Filter orders for current user
  const customerOrders = ordersList.filter(
    (o) => o.customerEmail?.toLowerCase() === userEmail.toLowerCase()
  );

  // Simulate skeleton screen load
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleCopyText = (text: string, setCopied: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReorder = (orderItems: any[]) => {
    const newCart: { [key: string]: number } = {};
    orderItems.forEach((item) => {
      newCart[item.productId] = item.quantity;
    });
    setCart(newCart);
    alert("Reordered! Items have been added to your cart.");
  };

  const handleAddNewPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentVal.trim()) return;
    const newPayment = {
      id: `pay_${Date.now()}`,
      type: newPaymentType,
      value: newPaymentType === "card" ? `•••• •••• •••• ${newPaymentVal.slice(-4)}` : newPaymentVal,
      label: newPaymentType === "card" ? "Credit / Debit Card" : "UPI Address"
    };
    setSavedPayments((prev) => [...prev, newPayment]);
    setNewPaymentVal("");
    setShowAddPayment(false);
  };

  const handleDeletePayment = (id: string) => {
    setSavedPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRedeemPoints = (points: number) => {
    if (points <= 0) return;
    const value = points * 0.1; // ₹0.1 per point
    setRedeemSuccess(`Successfully redeemed ${points} Points! ₹${value.toFixed(2)} cashback added to your wallet.`);
    setTimeout(() => setRedeemSuccess(null), 3000);
  };

  // Nav item component
  const NavItem = ({ tab, icon: Icon, label }: { tab: typeof activeTab; icon: any; label: string }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          width: "100%",
          padding: "12px 16px",
          border: "none",
          background: active ? "var(--accent-light)" : "transparent",
          color: active ? "var(--accent)" : "var(--text-2)",
          borderRadius: "var(--r-md)",
          fontSize: "0.95rem",
          fontWeight: active ? "700" : "500",
          textAlign: "left",
          cursor: "pointer",
          transition: "all var(--t-fast) var(--ease)"
        }}
        className="nav-btn-hover"
      >
        <Icon size={18} color={active ? "var(--accent)" : "var(--text-3)"} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
      {/* 1. SIDEBAR & CONTENT CONTAINER */}
      <div style={{ display: "flex", flexDirection: "row", gap: "28px", flexWrap: "wrap" }}>
        
        {/* LEFT COLUMN: Sidebar Navigation */}
        <aside style={{ flex: "1 1 250px", maxWidth: "300px", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Quick Info card */}
          <div className="card-premium" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <img
                src={profilePhoto}
                alt={profileName}
                style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }}
              />
              <button
                onClick={() => setShowEditPhotoModal(true)}
                style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: "var(--accent)", color: "white", border: "none", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}
              >
                <Camera size={12} />
              </button>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <h4 style={{ margin: 0, fontWeight: "800", fontSize: "1.05rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {profileName}
                </h4>
                <Award size={15} color="var(--accent)" />
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-3)" }}>Elite Member</p>
            </div>
          </div>

          {/* Navigation Items (Horizontal scrolling on mobile, vertical list on desktop) */}
          <div className="card-premium nav-container-desktop" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <NavItem tab="overview" icon={User} label="My Overview" />
            <NavItem tab="orders" icon={Package} label="My Orders" />
            <NavItem tab="addresses" icon={MapPin} label="Saved Addresses" />
            <NavItem tab="payments" icon={CreditCard} label="Saved Payments" />
            <NavItem tab="rewards" icon={Award} label="Rewards & Wallet" />
            <NavItem tab="settings" icon={Settings} label="Account Settings" />
            <NavItem tab="support" icon={HelpCircle} label="Help & Support" />
            <NavItem tab="legal" icon={FileText} label="Policies & Legal" />
            
            <hr style={{ border: 0, borderTop: "1px solid var(--divider)", margin: "8px 0" }} />
            
            <button
              onClick={() => setShowLogoutModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                padding: "12px 16px",
                border: "none",
                background: "transparent",
                color: "var(--danger)",
                borderRadius: "var(--r-md)",
                fontSize: "0.95rem",
                fontWeight: "600",
                textAlign: "left",
                cursor: "pointer",
                transition: "all var(--t-fast) var(--ease)"
              }}
            >
              <LogOut size={18} color="var(--danger)" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: Content Panel */}
        <main style={{ flex: "999 1 600px", minWidth: 0, display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {loading ? (
            /* SHIMMER/SKELETON LOADER */
            <div className="card-premium" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#e5e7eb", animation: "shimmer 1.5s infinite" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  <div style={{ width: "35%", height: "20px", background: "#e5e7eb", animation: "shimmer 1.5s infinite", borderRadius: "4px" }} />
                  <div style={{ width: "20%", height: "14px", background: "#e5e7eb", animation: "shimmer 1.5s infinite", borderRadius: "4px" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ height: "100px", background: "#e5e7eb", borderRadius: "var(--r-lg)", animation: "shimmer 1.5s infinite" }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* tab 1: MY OVERVIEW */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  
                  {/* Account Premium Header Card */}
                  <div className="card-premium" style={{ padding: "32px", display: "flex", gap: "28px", alignItems: "center", flexWrap: "wrap", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(34,197,94,0.05)" }} />
                    <img
                      src={profilePhoto}
                      alt={profileName}
                      style={{ width: "96px", height: "96px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent)", boxShadow: "var(--shadow-md)" }}
                    />
                    <div style={{ flex: 1, minWidth: "250px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h2 style={{ fontSize: "1.75rem", fontWeight: "900", margin: 0 }}>{profileName}</h2>
                        <span className="badge" style={{ backgroundColor: "var(--accent)", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: "bold" }}>SABJIWALAA ELITE</span>
                      </div>
                      <p style={{ margin: "4px 0", color: "var(--text-3)", fontSize: "0.9rem" }}>{userEmail}</p>
                      
                      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-3)" }}>
                          <Phone size={14} />
                          <span>{profilePhone}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-3)" }}>
                          <Calendar size={14} />
                          <span>Member since Jan 2026</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => setShowEditProfileModal(true)} className="btn btn-ghost" style={{ border: "1px solid var(--border)", padding: "8px 16px" }}>
                        <Edit2 size={15} /> Edit Profile
                      </button>
                    </div>
                  </div>

                  {/* Overview Stats Cards Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    <div className="card-premium stat-card" style={{ padding: "24px", transition: "all 0.2s" }}>
                      <Package size={24} color="var(--accent)" />
                      <div style={{ fontSize: "2rem", fontWeight: "900", marginTop: "8px" }}>{customerOrders.length}</div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-3)", fontWeight: 500 }}>Total Orders</p>
                    </div>
                    <div className="card-premium stat-card" style={{ padding: "24px" }}>
                      <TrendingUp size={24} color="var(--warning)" />
                      <div style={{ fontSize: "2rem", fontWeight: "900", marginTop: "8px" }}>
                        {customerOrders.filter(o => ["PLACED", "ACCEPTED", "PACKED", "OUT_FOR_DELIVERY"].includes(o.status)).length}
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-3)", fontWeight: 500 }}>Pending Deliveries</p>
                    </div>
                    <div className="card-premium stat-card" style={{ padding: "24px" }}>
                      <Award size={24} color="var(--success)" />
                      <div style={{ fontSize: "2rem", fontWeight: "900", marginTop: "8px" }}>{wallets[userEmail]?.pointsBalance || 0}</div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-3)", fontWeight: 500 }}>Reward Points</p>
                    </div>
                    <div className="card-premium stat-card" style={{ padding: "24px" }}>
                      <MapPin size={24} color="var(--info)" />
                      <div style={{ fontSize: "2rem", fontWeight: "900", marginTop: "8px" }}>{addresses.length}</div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-3)", fontWeight: 500 }}>Saved Addresses</p>
                    </div>
                  </div>

                  {/* Quick Refer & Earn Card */}
                  <div className="card-premium" style={{ padding: "24px", background: "linear-gradient(135deg, var(--green-50), var(--card))", border: "1px solid rgba(22,163,74,0.15)", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ backgroundColor: "var(--green-100)", width: "52px", height: "52px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Share2 size={24} color="var(--accent)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800" }}>Refer friends & get 500 cashback points!</h4>
                      <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-3)" }}>Share your referral code and earn wallet cash on their first completed order.</p>
                    </div>
                    <button onClick={() => setActiveTab("rewards")} className="btn btn-primary" style={{ padding: "8px 16px" }}>Refer Now</button>
                  </div>
                </div>
              )}

              {/* tab 2: MY ORDERS */}
              {activeTab === "orders" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ fontWeight: "800", fontSize: "1.35rem" }}>My Order History</h3>
                  
                  {customerOrders.length === 0 ? (
                    <div className="card-premium" style={{ padding: "48px", textAlign: "center" }}>
                      <Package size={48} color="var(--text-4)" style={{ margin: "0 auto 16px" }} />
                      <p style={{ fontWeight: 600, color: "var(--text)" }}>You haven't placed any orders yet!</p>
                      <button onClick={() => window.location.href = "/"} className="btn btn-primary" style={{ marginTop: "16px", padding: "8px 20px" }}>Start Shopping</button>
                    </div>
                  ) : (
                    customerOrders.map((order) => (
                      <div key={order.id} className="card-premium" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                          <div>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Order ID:</span>
                            <strong style={{ display: "block", fontSize: "0.95rem" }}>{order.id}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Date:</span>
                            <span style={{ display: "block", fontSize: "0.95rem", fontWeight: 500 }}>{order.date}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Status:</span>
                            <span
                              className={`badge ${
                                order.status === "DELIVERED"
                                  ? "badge-success"
                                  : order.status === "REJECTED"
                                  ? "badge-danger"
                                  : "badge-warning"
                              }`}
                              style={{ display: "block", fontSize: "0.75rem", textAlign: "center", padding: "2px 8px", marginTop: "2px" }}
                            >
                              {order.status}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Total Amount:</span>
                            <strong style={{ display: "block", fontSize: "1rem", color: "var(--accent)" }}>₹{order.totalAmount}</strong>
                          </div>
                        </div>

                        <hr style={{ border: 0, borderTop: "1px solid var(--divider)" }} />

                        {/* Items list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {order.items?.map((item: any, idx: number) => {
                            const prod = productsList.find((p) => p.id === item.productId);
                            return (
                              <div key={idx} style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", fontSize: "0.9rem" }}>
                                <span style={{ color: "var(--text-2)", fontWeight: 500 }}>
                                  {prod ? `${prod.name_en} (${prod.unit})` : "Item"} <span style={{ color: "var(--text-3)" }}>× {item.quantity}</span>
                                </span>
                                <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                          <button
                            onClick={() => handleReorder(order.items)}
                            className="btn btn-ghost"
                            style={{ border: "1px solid var(--border)", color: "var(--accent)" }}
                          >
                            Reorder Items
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* tab 3: SAVED ADDRESSES */}
              {activeTab === "addresses" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <h3 style={{ fontWeight: "800", fontSize: "1.35rem" }}>My Address Book</h3>
                  
                  {/* Address List */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="card-premium"
                        style={{
                          padding: "20px",
                          border: addr.isDefault ? "2px solid var(--accent)" : "1px solid var(--border)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "12px",
                          position: "relative"
                        }}
                      >
                        {addr.isDefault && (
                          <span style={{ position: "absolute", top: "12px", right: "12px", backgroundColor: "var(--accent)", color: "white", fontSize: "0.65rem", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>DEFAULT</span>
                        )}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <MapPin size={18} color="var(--accent)" />
                            <strong style={{ fontSize: "1.05rem" }}>{addr.tag}</strong>
                          </div>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-2)", marginTop: "8px", lineHeight: "1.4" }}>{addr.address}</p>
                        </div>
                        
                        <div style={{ display: "flex", gap: "10px", borderTop: "1px solid var(--divider)", paddingTop: "12px", marginTop: "4px" }}>
                          {!addr.isDefault && (
                            <button
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              style={{ background: "none", border: "none", fontSize: "0.75rem", color: "var(--accent)", cursor: "pointer", fontWeight: "700", padding: 0 }}
                            >
                              Make Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            style={{ background: "none", border: "none", fontSize: "0.75rem", color: "var(--danger)", cursor: "pointer", fontWeight: "600", padding: 0, marginLeft: "auto" }}
                          >
                            Delete Address
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Quick Add Address Form */}
                    <div className="card-premium" style={{ padding: "20px", borderStyle: "dashed", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <strong style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Plus size={18} /> Add New Address
                      </strong>
                      
                      <div style={{ display: "flex", gap: "8px" }}>
                        {["Home", "Office", "Other"].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setNewAddrTag(tag)}
                            style={{
                              flex: 1,
                              padding: "6px",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              fontSize: "0.8rem",
                              fontWeight: "600",
                              background: newAddrTag === tag ? "var(--accent)" : "white",
                              color: newAddrTag === tag ? "white" : "var(--text-2)",
                              cursor: "pointer",
                              transition: "all 0.15s"
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Type complete address details..."
                        value={newAddrText}
                        onChange={(e) => setNewAddrText(e.target.value)}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem", width: "100%" }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          if (newAddrText.trim()) {
                            handleAddAddress(newAddrTag, newAddrText);
                            setNewAddrText("");
                          }
                        }}
                        className="btn btn-primary"
                        style={{ padding: "8px", fontSize: "0.85rem" }}
                      >
                        Save Address
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* tab 4: SAVED PAYMENTS */}
              {activeTab === "payments" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <h3 style={{ fontWeight: "800", fontSize: "1.35rem" }}>Payment Methods</h3>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                    {savedPayments.map((method) => (
                      <div key={method.id} className="card-premium" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {method.type === "upi" ? (
                            <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <TrendingUp size={20} color="var(--info)" />
                            </div>
                          ) : (
                            <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <CreditCard size={20} color="var(--danger)" />
                            </div>
                          )}
                          <div>
                            <strong style={{ display: "block", fontSize: "0.95rem" }}>{method.value}</strong>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>{method.label}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(method.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    {/* Option to Add Payment Method */}
                    {!showAddPayment ? (
                      <button
                        onClick={() => setShowAddPayment(true)}
                        className="card-premium"
                        style={{ padding: "20px", borderStyle: "dashed", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", height: "82px", width: "100%", background: "none", color: "var(--accent)" }}
                      >
                        <Plus size={18} /> Add Payment Method
                      </button>
                    ) : (
                      <form onSubmit={handleAddNewPayment} className="card-premium" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <strong style={{ fontSize: "0.95rem" }}>New Payment Option</strong>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => setNewPaymentType("upi")}
                            style={{ flex: 1, padding: "6px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: newPaymentType === "upi" ? "var(--accent)" : "white", color: newPaymentType === "upi" ? "white" : "var(--text-2)", cursor: "pointer" }}
                          >
                            UPI ID
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewPaymentType("card")}
                            style={{ flex: 1, padding: "6px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: newPaymentType === "card" ? "var(--accent)" : "white", color: newPaymentType === "card" ? "white" : "var(--text-2)", cursor: "pointer" }}
                          >
                            Card
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder={newPaymentType === "upi" ? "e.g. mobile@upi" : "Enter 16 Digit Card Number..."}
                          value={newPaymentVal}
                          onChange={(e) => setNewPaymentVal(e.target.value)}
                          style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                        />
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: "8px" }}>Save</button>
                          <button type="button" onClick={() => setShowAddPayment(false)} className="btn btn-secondary" style={{ flex: 1, padding: "8px" }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* tab 5: REWARDS & REFERRAL */}
              {activeTab === "rewards" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <h3 style={{ fontWeight: "800", fontSize: "1.35rem" }}>Rewards & Cashbacks</h3>

                  {redeemSuccess && (
                    <div style={{ backgroundColor: "var(--green-50)", border: "1px solid var(--success)", padding: "12px", borderRadius: "8px", color: "var(--accent)", fontSize: "0.85rem", display: "flex", gap: "8px" }}>
                      <Check size={16} /> <span>{redeemSuccess}</span>
                    </div>
                  )}

                  {/* Points Dashboard card */}
                  <div className="card-premium" style={{ padding: "32px", background: "linear-gradient(135deg, var(--green-900), var(--green-700))", color: "white", position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                      <div>
                        <span style={{ fontSize: "0.85rem", opacity: 0.85 }}>CURRENT POINTS</span>
                        <div style={{ fontSize: "3rem", fontWeight: "900", lineHeight: "1.1" }}>{wallets[userEmail]?.pointsBalance || 0}</div>
                        <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>10 Points = ₹1.00 Cashback</span>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <button
                          disabled={(wallets[userEmail]?.pointsBalance || 0) < 100}
                          onClick={() => handleRedeemPoints(wallets[userEmail]?.pointsBalance || 0)}
                          className="btn"
                          style={{ backgroundColor: "white", color: "var(--accent)", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}
                        >
                          Redeem Points (Min 100)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Refer & Earn block */}
                  <div className="card-premium" style={{ padding: "28px" }}>
                    <h4 style={{ fontWeight: "800", fontSize: "1.15rem", margin: 0 }}>Refer your friends and earn</h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-3)", margin: "4px 0 20px" }}>Get 500 reward points (worth ₹50) when your friends install and complete their first purchase.</p>

                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: "220px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: "600" }}>YOUR REFERRAL CODE</span>
                        <div style={{ display: "flex" }}>
                          <input
                            type="text"
                            readOnly
                            value="SABJI5NEW"
                            style={{ flex: 1, padding: "10px", border: "1px solid var(--border)", borderRight: "none", borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px", fontSize: "0.9rem", fontWeight: "700", textAlign: "center" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyText("SABJI5NEW", setCopiedCode)}
                            style={{ padding: "10px 16px", border: "1px solid var(--border)", backgroundColor: "var(--bg-alt)", borderTopRightRadius: "8px", borderBottomRightRadius: "8px", cursor: "pointer", color: "var(--accent)" }}
                          >
                            {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: "220px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: "600" }}>SHARE REFERRAL LINK</span>
                        <div style={{ display: "flex" }}>
                          <input
                            type="text"
                            readOnly
                            value={`https://web-sabziwalaa5.vercel.app?ref=SABJI5NEW`}
                            style={{ flex: 1, padding: "10px", border: "1px solid var(--border)", borderRight: "none", borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px", fontSize: "0.8rem", textOverflow: "ellipsis" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyText(`https://web-sabziwalaa5.vercel.app?ref=SABJI5NEW`, setCopiedLink)}
                            style={{ padding: "10px 16px", border: "1px solid var(--border)", backgroundColor: "var(--bg-alt)", borderTopRightRadius: "8px", borderBottomRightRadius: "8px", cursor: "pointer", color: "var(--accent)" }}
                          >
                            {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* tab 6: ACCOUNT SETTINGS */}
              {activeTab === "settings" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <h3 style={{ fontWeight: "800", fontSize: "1.35rem" }}>Settings & Preferences</h3>

                  {/* General Notification Setting block */}
                  <div className="card-premium" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h4 style={{ fontWeight: "800", fontSize: "1.05rem", margin: 0 }}>Notification Preferences</h4>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {[
                        { label: "WhatsApp Order Updates", desc: "Receive order tracking and receipts on WhatsApp" },
                        { label: "Email Promotions", desc: "Weekly newsletter with seasonal organic item discounts" },
                        { label: "SMS Alerts", desc: "Crucial delivery status dispatch updates" }
                      ].map((item, idx) => (
                        <label key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                          <input type="checkbox" defaultChecked style={{ marginTop: "4px", accentColor: "var(--accent)" }} />
                          <div>
                            <span style={{ fontSize: "0.9rem", fontWeight: "600", display: "block" }}>{item.label}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>{item.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Language Settings block */}
                  <div className="card-premium" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <h4 style={{ fontWeight: "800", fontSize: "1.05rem", margin: 0 }}>Preferred Language</h4>
                    <select style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.9rem", width: "100%", maxWidth: "300px" }}>
                      <option value="en">English (default)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>

                  {/* Security Settings block */}
                  <div className="card-premium" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h4 style={{ fontWeight: "800", fontSize: "1.05rem", margin: 0 }}>Security Settings</h4>
                    <button type="button" className="btn btn-ghost" style={{ border: "1px solid var(--border)", padding: "10px", fontSize: "0.85rem", width: "fit-content" }} onClick={() => alert("Password reset link sent to your email!")}>
                      Change Account Password
                    </button>
                  </div>

                  {/* Delete Account block */}
                  <div className="card-premium" style={{ padding: "24px", border: "1px solid rgba(220,38,38,0.15)", backgroundColor: "rgba(220,38,38,0.02)" }}>
                    <h4 style={{ fontWeight: "800", fontSize: "1.05rem", margin: 0, color: "var(--danger)" }}>Danger Zone</h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-3)", margin: "4px 0 16px" }}>Once you delete your account, your wallets balance, points history, and saved address credentials will be permanently erased.</p>
                    <button type="button" className="btn btn-secondary" style={{ color: "var(--danger)", borderColor: "var(--danger)", padding: "8px 16px" }} onClick={() => alert("Please contact support at support@sabjiwala.com to request account deletion.")}>
                      Delete Account
                    </button>
                  </div>
                </div>
              )}

              {/* tab 7: HELP & SUPPORT */}
              {activeTab === "support" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <h3 style={{ fontWeight: "800", fontSize: "1.35rem" }}>Help & Customer Support</h3>

                  {/* Support Channels Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    <a href="https://wa.me/919999988888" target="_blank" rel="noopener noreferrer" className="card-premium" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", color: "inherit" }}>
                      <div style={{ backgroundColor: "#dcfce7", width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MessageSquare size={20} color="var(--success)" />
                      </div>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.95rem" }}>WhatsApp Support</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Instant reply within 5 mins</span>
                      </div>
                    </a>

                    <a href="mailto:support@sabjiwalaa5.com" className="card-premium" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", color: "inherit" }}>
                      <div style={{ backgroundColor: "#eff6ff", width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Mail size={20} color="var(--info)" />
                      </div>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.95rem" }}>Email Support</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Get resolution in 4 hours</span>
                      </div>
                    </a>

                    <div className="card-premium" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ backgroundColor: "#fef2f2", width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Phone size={20} color="var(--danger)" />
                      </div>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.95rem" }}>Call Support</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Available 6 AM - 10 PM</span>
                      </div>
                    </div>
                  </div>

                  {/* FAQs accordion */}
                  <div className="card-premium" style={{ padding: "24px" }}>
                    <h4 style={{ fontWeight: "800", fontSize: "1.05rem", margin: "0 0 16px" }}>Frequently Asked Questions</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {[
                        { q: "What are the delivery charges?", a: "Delivery is completely free on orders above ₹200. For orders below ₹200, a small packaging and delivery fee of ₹30 is applicable." },
                        { q: "How can I track my order live?", a: "Once the delivery partner accepts your order, you can view the real-time position of the rider on the Leaflet Radar Map in the Orders section." },
                        { q: "What is the refund policy?", a: "If any vegetable or fruit does not meet your quality standards, we offer a no-questions-asked refund directly to your reward wallet within 24 hours of delivery." }
                      ].map((faq, idx) => (
                        <details key={idx} style={{ padding: "12px", border: "1px solid var(--border)", borderRadius: "8px" }}>
                          <summary style={{ fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between" }}>
                            <span>{faq.q}</span>
                            <ChevronRight size={16} />
                          </summary>
                          <p style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--text-3)", lineHeight: "1.4" }}>{faq.a}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* tab 8: POLICIES & LEGAL */}
              {activeTab === "legal" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <h3 style={{ fontWeight: "800", fontSize: "1.35rem" }}>Platform Policies & Legal</h3>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                    {[
                      { title: "Privacy Policy", desc: "Learn how we protect and manage your personal coordinates and profile data secure.", file: "privacy_policy" },
                      { title: "Terms & Conditions", desc: "Detailed terms governing purchase contracts, order cancellations, and loyalty calculations.", file: "terms_and_conditions" },
                      { title: "Refund & Returns Policy", desc: "Everything you need to know about our quality guarantee and instant credit refunds.", file: "refund_policy" },
                      { title: "Cancellation Guidelines", desc: "Rules regarding cancellation windows before store packaging dispatches order packages.", file: "cancellation_policy" }
                    ].map((policy, idx) => (
                      <div key={idx} className="card-premium" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
                        <div>
                          <strong style={{ display: "block", fontSize: "1rem" }}>{policy.title}</strong>
                          <p style={{ fontSize: "0.8rem", color: "var(--text-3)", marginTop: "4px", lineHeight: "1.4" }}>{policy.desc}</p>
                        </div>
                        <a href={`/docs/${policy.file}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--accent)", fontWeight: "600", textDecoration: "none", marginTop: "4px" }}>
                          <span>Read Full Document</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Account Footer block */}
          <footer style={{ borderTop: "1px solid var(--divider)", marginTop: "24px", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-4)" }}>Sabjiwalaa App Version v5.2.0 (Stable Production Build)</span>
            <button type="button" onClick={() => setShowLogoutModal(true)} className="btn btn-ghost" style={{ color: "var(--danger)", padding: "6px 12px", fontSize: "0.8rem" }}>
              <LogOut size={14} /> Log Out
            </button>
          </footer>
        </main>
      </div>

      {/* 2. LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div className="card-premium" style={{ width: "100%", maxWidth: "400px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
            <button type="button" onClick={() => setShowLogoutModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
              <X size={20} />
            </button>
            <div style={{ backgroundColor: "#fee2e2", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogOut size={22} color="var(--danger)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: "800", fontSize: "1.2rem" }}>Confirm Logout</h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-3)" }}>Are you sure you want to log out of your Sabjiwalaa profile?</p>
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutModal(false);
                  await handleSignOut();
                }}
                className="btn"
                style={{ flex: 1, padding: "10px", backgroundColor: "var(--danger)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
              >
                Yes, Log Out
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: "10px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT PROFILE MODAL */}
      {showEditProfileModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div className="card-premium" style={{ width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
            <button type="button" onClick={() => setShowEditProfileModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: 0, fontWeight: "800", fontSize: "1.2rem" }}>Edit Profile Information</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Phone Number</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEditProfileModal(false)}
              className="btn btn-primary"
              style={{ width: "100%", padding: "10px", marginTop: "8px" }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* 4. EDIT PHOTO MODAL */}
      {showEditPhotoModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div className="card-premium" style={{ width: "100%", maxWidth: "450px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
            <button type="button" onClick={() => setShowEditPhotoModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: 0, fontWeight: "800", fontSize: "1.2rem" }}>Select Profile Photo</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {[
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces",
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces",
                "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&h=150&fit=crop&crop=faces"
              ].map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Option ${idx}`}
                  onClick={() => {
                    setProfilePhoto(url);
                    setShowEditPhotoModal(false);
                  }}
                  style={{
                    width: "100%",
                    height: "100px",
                    borderRadius: "12px",
                    objectFit: "cover",
                    cursor: "pointer",
                    border: profilePhoto === url ? "3px solid var(--accent)" : "2px solid transparent",
                    transition: "all 0.15s"
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (readerEvent: any) => {
                        setProfilePhoto(readerEvent.target.result);
                        setShowEditPhotoModal(false);
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                className="btn btn-secondary"
                style={{ flex: 1, padding: "10px" }}
              >
                Upload from Computer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
