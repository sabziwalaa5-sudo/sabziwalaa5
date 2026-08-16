"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Instantly redirect login route requests back to the main homepage login card
    router.replace("/");
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans), sans-serif",
      color: "var(--text-secondary)"
    }}>
      <p style={{ margin: "auto", fontWeight: "500", fontSize: "0.9rem" }}>Redirecting to Login...</p>
    </div>
  );
}
