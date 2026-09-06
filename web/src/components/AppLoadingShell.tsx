import { BrandLogo } from "./BrandLogo";

export default function AppLoadingShell({ label }: { label: string }) {
  return (
    <div
      data-testid="app-loading"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8faf8",
        fontFamily: "var(--font-sans), Inter, sans-serif",
        color: "#14532d",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <BrandLogo height={80} priority />
        </div>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>{label}</p>
      </div>
    </div>
  );
}
