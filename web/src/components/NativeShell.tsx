"use client";

import { useEffect, useState } from "react";
import { isNativeRuntime, shouldRegisterServiceWorker } from "../lib/platform";

export default function NativeShell() {
  const [offline, setOffline] = useState(false);
  const [native, setNative] = useState(false);
  const [path, setPath] = useState("");

  useEffect(() => {
    let cancelled = false;

    const applyNetwork = () => {
      if (typeof navigator !== "undefined") {
        setOffline(!navigator.onLine);
      }
    };

    applyNetwork();
    setNative(isNativeRuntime());
    setPath(window.location.pathname);
    window.addEventListener("online", applyNetwork);
    window.addEventListener("offline", applyNetwork);

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
          import("@capacitor/app"),
        ]);

        await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
        await StatusBar.setBackgroundColor({ color: "#15803d" }).catch(() => undefined);
        await SplashScreen.hide().catch(() => undefined);

        const backListener = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else if (window.location.pathname !== "/app") {
            window.location.assign("/app");
          } else {
            App.exitApp();
          }
        });

        const urlListener = await App.addListener("appUrlOpen", ({ url }) => {
          try {
            const parsed = new URL(url);
            const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : parsed.host ? `/${parsed.host}` : "/app";
            window.location.assign(path + parsed.search);
          } catch {
            // Ignore malformed deep links.
          }
        });

        if (cancelled) {
          backListener.remove();
          urlListener.remove();
        }
      } catch {
        // Web runtime without Capacitor plugins.
      }
    })();

    if (shouldRegisterServiceWorker()) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        Promise.all(registrations.map((reg) => reg.unregister())).then(() => {
          navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => undefined);
        });
      });
    } else if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", applyNetwork);
      window.removeEventListener("offline", applyNetwork);
    };
  }, []);

  const showApps = native && path !== "/app";
  if (!offline && !showApps) return null;

  return (
    <>
      {offline && (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 4000,
        background: "#7f1d1d",
        color: "white",
        textAlign: "center",
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      You are offline. Cart and checkout need a network connection for payments.
    </div>
      )}
      {showApps && (
        <a
          href="/app"
          style={{
            position: "fixed",
            top: "calc(10px + env(safe-area-inset-top))",
            right: 12,
            zIndex: 4001,
            background: "#14532d",
            color: "white",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 800,
            padding: "8px 12px",
            borderRadius: 999,
            boxShadow: "0 8px 20px rgba(20,83,45,0.35)",
          }}
        >
          Apps
        </a>
      )}
    </>
  );
}
