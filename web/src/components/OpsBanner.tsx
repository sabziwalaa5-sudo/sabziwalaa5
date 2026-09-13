"use client";

export default function OpsBanner() {
  return (
    <div
      role="status"
      style={{
        background: "#14532d",
        color: "white",
        textAlign: "center",
        fontSize: 12,
        fontWeight: 600,
        padding: "6px 12px",
      }}
    >
      Live ops: storefront ·{" "}
      <a href="/admin" style={{ color: "#bbf7d0" }}>
        Admin
      </a>{" "}
      ·{" "}
      <a href="/vendor" style={{ color: "#bbf7d0" }}>
        Vendor
      </a>{" "}
      ·{" "}
      <a href="/rider" style={{ color: "#bbf7d0" }}>
        Rider
      </a>
      . Catalog is shared in this browser until Supabase is live.
    </div>
  );
}
