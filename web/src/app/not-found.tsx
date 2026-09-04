"use client";

import React from "react";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: "2rem" }}>
      <h2>404 - Page Not Found</h2>
      <p style={{ marginBlock: "0.5rem" }}>The organic harvest you are looking for is in another garden.</p>
      <a href="/" style={{ color: "var(--accent, #10b981)", textDecoration: "underline", marginBlockStart: "1rem", fontWeight: "600" }}>
        Go Back Home
      </a>
      <p style={{ marginBlockStart: "1.25rem", fontSize: 14 }}>
        <a href="/apps" style={{ color: "inherit" }}>Open the apps</a>
        {" · "}
        <a href="/admin" style={{ color: "inherit" }}>Admin</a>
      </p>
    </div>
  );
}
