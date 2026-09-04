export const MOBILE_APP_PATH = "/apps";
export const ANDROID_APK_PATH = "/downloads/sabjiwala.apk";
export const MOBILE_DOWNLOAD_PATH = "/download";
export const MOBILE_ROLE_STORAGE_KEY = "sabjiwala_mobile_role";

export type MobileRoleId = "customer" | "admin" | "vendor" | "rider";

export type MobileRole = {
  id: MobileRoleId;
  title: string;
  subtitle: string;
  href: string;
  emoji: string;
};

export const MOBILE_ROLES: MobileRole[] = [
  { id: "customer", title: "Customer", subtitle: "Shop organic groceries and track orders", href: "/", emoji: "🥬" },
  { id: "admin", title: "Admin", subtitle: "Vendors, catalog, coupons, and store config", href: "/admin", emoji: "🛡️" },
  { id: "vendor", title: "Vendor", subtitle: "Merchant hub for stock and incoming orders", href: "/vendor", emoji: "🏪" },
  { id: "rider", title: "Rider", subtitle: "Delivery terminal and live trips", href: "/rider", emoji: "🛵" },
];

export function isMobileRoleId(value: string | null | undefined): value is MobileRoleId {
  return value === "customer" || value === "admin" || value === "vendor" || value === "rider";
}

export function roleById(id: string | null | undefined): MobileRole | undefined {
  if (!isMobileRoleId(id)) return undefined;
  return MOBILE_ROLES.find((role) => role.id === id);
}
