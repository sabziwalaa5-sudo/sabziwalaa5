"use client";

export type NativePlatform = "web" | "android" | "ios";

export function isNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  try {
    return Boolean(w.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function getNativePlatform(): NativePlatform {
  if (typeof window === "undefined") return "web";
  const w = window as Window & { Capacitor?: { getPlatform?: () => string } };
  const platform = w.Capacitor?.getPlatform?.();
  if (platform === "android" || platform === "ios") return platform;
  return "web";
}

export function shouldRegisterServiceWorker(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && !isNativeRuntime();
}
