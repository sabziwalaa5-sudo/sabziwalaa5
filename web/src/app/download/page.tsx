import type { Metadata } from "next";
import { ANDROID_APK_PATH } from "../../lib/mobileApp";

export const metadata: Metadata = {
  title: "Sabjiwala Android app download",
  description: "Install the Sabjiwala Android app (APK) for customer, admin, vendor, and rider.",
};

export default function DownloadAppPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #14532d 0%, #15803d 36%, #f8faf8 36%)",
        padding: "calc(28px + env(safe-area-inset-top)) 20px 40px",
        fontFamily: "var(--font), Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <header style={{ color: "white", textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52 }} aria-hidden>
            🥬
          </div>
          <h1 style={{ margin: "8px 0 6px", fontSize: "1.7rem", fontWeight: 900 }}>Sabjiwala Android App</h1>
          <p style={{ margin: 0, opacity: 0.92, fontSize: 15 }}>Phone pe install karke dukaan, admin, vendor, rider kholo.</p>
        </header>

        <section
          style={{
            background: "white",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 16px 40px rgba(20,83,45,0.12)",
          }}
        >
          <a
            href={ANDROID_APK_PATH}
            download="sabjiwala.apk"
            style={{
              display: "block",
              textAlign: "center",
              background: "#15803d",
              color: "white",
              textDecoration: "none",
              fontWeight: 800,
              fontSize: 16,
              padding: "16px 18px",
              borderRadius: 16,
            }}
          >
            Android APK download karein
          </a>
          <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", margin: "12px 0 0" }}>
            File size ~4 MB · package <code>com.sabjiwala.app</code>
          </p>

          <ol style={{ margin: "20px 0 0", paddingLeft: 18, lineHeight: 1.55, color: "#334155", fontSize: 14 }}>
            <li>Upar wale button se APK save karein.</li>
            <li>Phone Settings → Security → unknown sources / Install unknown apps → Chrome ya Files ko allow karein.</li>
            <li>Downloads folder se <strong>sabjiwala.apk</strong> open karke Install dabayein.</li>
            <li>App khulegi live shop par: storefront, admin, vendor, rider.</li>
          </ol>

          <p style={{ fontSize: 13, color: "#64748b", marginTop: 16 }}>
            APK nahi chahiye to phone browser mein{" "}
            <a href="/" style={{ color: "#15803d", fontWeight: 700 }}>
              web-sabziwalaa5.vercel.app
            </a>{" "}
            kholo, ya <a href="/apps" style={{ color: "#15803d", fontWeight: 700 }}>Apps</a> se role choose karo.
          </p>
        </section>
      </div>
    </main>
  );
}
