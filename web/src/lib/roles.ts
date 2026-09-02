export type AppRole = "ADMIN" | "VENDOR" | "DELIVERY_PARTNER" | "CUSTOMER";
export type StaffPortal = "admin" | "vendor" | "rider";

export const ADMIN_EMAIL = "sabziwalaa5@gmail.com";

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
  if (value === ADMIN_EMAIL) return "ADMIN";
  if (value === "raman@gmail.com") return "VENDOR";
  if (value === "rider@gmail.com" || value === "delivery@gmail.com") return "DELIVERY_PARTNER";
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
