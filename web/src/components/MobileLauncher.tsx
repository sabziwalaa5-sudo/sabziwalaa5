"use client";

import { useEffect, useState } from "react";
import { isNativeRuntime } from "../lib/platform";
import {
  MOBILE_ROLE_STORAGE_KEY,
  MOBILE_ROLES,
  isMobileRoleId,
  roleById,
  type MobileRoleId,
} from "../lib/mobileApp";

export default function MobileLauncher() {
  const [lastRole, setLastRole] = useState<MobileRoleId | null>(null);
  const [opening, setOpening] = useState<MobileRoleId | null>(null);
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeRuntime());
    const stored = window.localStorage.getItem(MOBILE_ROLE_STORAGE_KEY);
    if (isMobileRoleId(stored)) setLastRole(stored);
  }, []);

  const openRole = (id: MobileRoleId) => {
    const role = roleById(id);
    if (!role) return;
    window.localStorage.setItem(MOBILE_ROLE_STORAGE_KEY, id);
    setLastRole(id);
    setOpening(id);
    window.location.assign(role.href);
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #14532d 0%, #15803d 42%, #f8faf8 42%)",
        padding: "calc(28px + env(safe-area-inset-top)) 20px calc(28px + env(safe-area-inset-bottom))",
        fontFamily: "var(--font), Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <header style={{ color: "white", textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52 }} aria-hidden>
            🥬
          </div>
          <h1 style={{ margin: "8px 0 4px", fontSize: "1.7rem", fontWeight: 900, letterSpacing: "-0.03em" }}>SABJIWALAA ५</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>Mobile app · linked storefront, admin, vendor, and rider</p>
          {native ? (
            <p style={{ margin: "8px 0 0", fontSize: 12, opacity: 0.8 }}>Running in the Sabjiwala Android / iOS app</p>
          ) : (
            <p style={{ margin: "8px 0 0", fontSize: 12, opacity: 0.8 }}>Add to Home Screen, or open in the native app</p>
          )}
        </header>

        {lastRole && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openRole(lastRole)}
            style={{
              width: "100%",
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 16,
              fontSize: 16,
              boxShadow: "var(--shadow-green)",
            }}
          >
            Continue as {roleById(lastRole)?.title}
          </button>
        )}

        <section
          aria-label="Choose app"
          style={{
            display: "grid",
            gap: 12,
            background: "white",
            borderRadius: 24,
            padding: 16,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {MOBILE_ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => openRole(role.id)}
              disabled={opening === role.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                width: "100%",
                padding: 14,
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: opening === role.id ? "var(--accent-light)" : "var(--card)",
                cursor: "pointer",
                minHeight: 72,
              }}
            >
              <span style={{ fontSize: 28, width: 44, textAlign: "center" }} aria-hidden>
                {role.emoji}
              </span>
              <span style={{ flex: 1 }}>
                <strong style={{ display: "block", fontSize: 16 }}>{role.title}</strong>
                <span style={{ display: "block", fontSize: 13, color: "var(--text-3)" }}>{role.subtitle}</span>
              </span>
              <span style={{ color: "var(--accent)", fontWeight: 800 }} aria-hidden>
                {opening === role.id ? "…" : "Open"}
              </span>
            </button>
          ))}
        </section>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-3)", marginTop: 18 }}>
          Same live site as{" "}
          <a href="https://web-sabziwalaa5.vercel.app/" style={{ color: "var(--accent)", fontWeight: 700 }}>
            web-sabziwalaa5.vercel.app
          </a>
        </p>
        {!native && (
          <p style={{ textAlign: "center", marginTop: 10 }}>
            <a href="/download" style={{ color: "var(--accent)", fontWeight: 800, fontSize: 14 }}>
              Android APK download
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
