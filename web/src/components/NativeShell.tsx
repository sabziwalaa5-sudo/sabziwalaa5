"use client";

import { useEffect, useState } from "react";
import { shouldRegisterServiceWorker } from "../lib/platform";

export default function NativeShell() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applyNetwork = () => {
      if (typeof navigator !== "undefined") {
        setOffline(!navigator.onLine);
      }
    };

    applyNetwork();
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
          } else {
            App.exitApp();
          }
        });

        if (cancelled) backListener.remove();
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

  if (!offline) return null;

  return (
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
  );
}
