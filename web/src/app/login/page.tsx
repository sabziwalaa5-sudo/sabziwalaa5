"use client";

import { STAFF_PORTALS } from "../../lib/roles";
import { BrandLogo } from "../../components/BrandLogo";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8faf8", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <BrandLogo height={72} />
        </div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 900 }}>Staff login</h1>
        <p style={{ color: "#64748b" }}>Customer shop is on the homepage. Staff use these portals.</p>
        <p style={{ fontSize: 13, background: "#ecfdf5", padding: 12, borderRadius: 12 }}>
          PIN for all staff: <strong>Sabjiwala5!</strong>
          <br />
          Admin <code>sabziwalaa5@gmail.com</code> · Vendor <code>raman@gmail.com</code> · Rider <code>rider@gmail.com</code>
        </p>
        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          {STAFF_PORTALS.map((portal) => (
            <a
              key={portal.id}
              href={portal.href}
              style={{
                display: "block",
                padding: "16px",
                borderRadius: 16,
                background: "white",
                textDecoration: "none",
                color: "#14532d",
                fontWeight: 800,
                boxShadow: "0 8px 24px rgba(20,83,45,0.08)",
              }}
            >
              Open {portal.label} portal
            </a>
          ))}
        </div>
        <p style={{ marginTop: 20 }}>
          <a href="/" style={{ color: "#15803d", fontWeight: 700 }}>
            Back to shop
          </a>
        </p>
      </div>
    </main>
  );
}
