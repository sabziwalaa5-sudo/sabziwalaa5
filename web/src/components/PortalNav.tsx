"use client";

import { Shield } from "lucide-react";
import { AppRole, STAFF_PORTALS, canAccessPortal, portalPathForRole } from "../lib/roles";

export default function PortalNav({
  role,
  current,
  compact = false,
}: {
  role: AppRole | null;
  current: "storefront" | "admin" | "vendor" | "rider";
  compact?: boolean;
}) {
  if (!role || role === "CUSTOMER") {
    if (current === "storefront") return null;
    return (
      <a href="/" style={{ fontSize: compact ? "0.8rem" : "0.85rem", color: "var(--text-secondary, var(--text-3))", fontWeight: 600, textDecoration: "none" }}>
        Back to marketplace
      </a>
    );
  }

  const homeHref = current === "storefront" ? portalPathForRole(role) : "/";
  const homeLabel = current === "storefront" ? `Open ${role === "ADMIN" ? "Admin" : role === "VENDOR" ? "Vendor" : "Rider"} dashboard` : "Customer storefront";

  return (
    <nav
      aria-label="Staff portals"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: compact ? "8px" : "10px",
        fontSize: compact ? "12px" : "13px",
        fontWeight: 700,
      }}
    >
      <a
        href={homeHref}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--accent)",
          textDecoration: "none",
          padding: compact ? "6px 10px" : "8px 12px",
          borderRadius: 10,
          background: "var(--accent-light, rgba(21,128,61,0.08))",
        }}
      >
        <Shield size={14} />
        {homeLabel}
      </a>
      {STAFF_PORTALS.filter((portal) => canAccessPortal(role, portal.id) && portal.id !== current).map((portal) => (
        <a
          key={portal.id}
          href={portal.href}
          style={{ color: "var(--text-2, #374151)", textDecoration: "none" }}
        >
          {portal.label}
        </a>
      ))}
    </nav>
  );
}

export function StaffLoginLinks() {
  return (
    <p style={{ marginBlockStart: "1.25rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-secondary, var(--text-3))" }}>
      Staff portals:{" "}
      {STAFF_PORTALS.map((portal, index) => (
        <span key={portal.id}>
          {index > 0 ? " · " : null}
          <a href={portal.href} style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
            {portal.label}
          </a>
        </span>
      ))}
    </p>
  );
}
