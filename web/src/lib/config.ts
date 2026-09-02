export const APP_NAME = "SABJIWALAA ५";
export const ANDROID_APPLICATION_ID = "com.sabjiwala.app";
export const IOS_BUNDLE_ID = "com.sabjiwala.app";
export const APP_VERSION = "1.0.0";
export const APP_BUILD = "1";

export const PRODUCTION_WEB_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://web-sabziwalaa5.vercel.app";

export const ADMIN_WEB_PATH = "/admin";
export const MOBILE_APP_PATH = "/app";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return (process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_WEB_URL).replace(/\/$/, "");
  }

  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  const native = Boolean(w.Capacitor?.isNativePlatform?.());
  if (native) {
    return PRODUCTION_WEB_URL.replace(/\/$/, "");
  }

  return window.location.origin.replace(/\/$/, "");
}

export function getAdminWebUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${getApiBaseUrl()}${ADMIN_WEB_PATH}`;
}

/** Same-origin /admin unless NEXT_PUBLIC_ADMIN_URL points at a dedicated admin host. */
export function getAdminWebHref(): string {
  const explicit = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return ADMIN_WEB_PATH;
}
