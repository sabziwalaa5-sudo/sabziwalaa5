import { isProduction } from "./runtime";

export type AppRole = "ADMIN" | "VENDOR" | "DELIVERY_PARTNER" | "CUSTOMER";
export type StaffPortal = "admin" | "vendor" | "rider";

const DEFAULT_ADMIN_EMAILS = ["sabziwalaa5@gmail.com"];
const DEFAULT_VENDOR_EMAILS = ["raman@gmail.com"];
const DEFAULT_RIDER_EMAILS = ["rider@gmail.com", "delivery@gmail.com"];

function parseEmailList(value: string | undefined, fallback: string[]): string[] {
  const raw = value?.trim();
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function staffEmailLists() {
  const useDefaults = !isProduction();
  return {
    admin: parseEmailList(process.env.STAFF_ADMIN_EMAILS, useDefaults ? DEFAULT_ADMIN_EMAILS : []),
    vendor: parseEmailList(process.env.STAFF_VENDOR_EMAILS, useDefaults ? DEFAULT_VENDOR_EMAILS : []),
    rider: parseEmailList(process.env.STAFF_RIDER_EMAILS, useDefaults ? DEFAULT_RIDER_EMAILS : []),
  };
}

export const ADMIN_EMAIL = staffEmailLists().admin[0] || DEFAULT_ADMIN_EMAILS[0];

export const STAFF_PORTALS: { id: StaffPortal; href: string; label: string }[] = [
  { id: "admin", href: "/admin", label: "Admin" },
  { id: "vendor", href: "/vendor", label: "Vendor" },
  { id: "rider", href: "/rider", label: "Rider" },
];

export function normalizeRole(raw?: string | null): AppRole {
  const role = String(raw || "CUSTOMER").trim().toUpperCase();
  if (role === "ADMIN") return "ADMIN";
  if (role === "VENDOR" || role === "MERCHANT") return "VENDOR";
  if (role === "DELIVERY_PARTNER" || role === "RIDER" || role === "DELIVERY") return "DELIVERY_PARTNER";
  return "CUSTOMER";
}

export function roleFromEmail(email?: string | null): AppRole | null {
  const value = String(email || "").trim().toLowerCase();
  if (!value) return null;

  const lists = staffEmailLists();
  if (lists.admin.includes(value)) return "ADMIN";
  if (lists.vendor.includes(value)) return "VENDOR";
  if (lists.rider.includes(value)) return "DELIVERY_PARTNER";
  return null;
}

export function portalPathForRole(role: AppRole): string {
  if (role === "ADMIN") return "/admin";
  if (role === "VENDOR") return "/vendor";
  if (role === "DELIVERY_PARTNER") return "/rider";
  return "/";
}

export function canAccessPortal(role: AppRole, portal: StaffPortal): boolean {
  if (role === "ADMIN") return true;
  if (portal === "vendor") return role === "VENDOR";
  if (portal === "rider") return role === "DELIVERY_PARTNER";
  return false;
}

export function staffLoginHint(): string {
  const lists = staffEmailLists();
  const parts: string[] = [];
  if (lists.admin[0]) parts.push(`Admin ${lists.admin[0]}`);
  if (lists.vendor[0]) parts.push(`Vendor ${lists.vendor[0]}`);
  if (lists.rider[0]) parts.push(`Rider ${lists.rider[0]}`);
  return parts.join(" · ");
}
