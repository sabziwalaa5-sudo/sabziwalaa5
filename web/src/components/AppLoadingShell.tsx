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
        <div style={{ fontSize: 48 }} aria-hidden>
          🥬
        </div>
        <h1 style={{ margin: "8px 0 4px", fontSize: "1.4rem", fontWeight: 900 }}>SABJIWALAA ५</h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>{label}</p>
      </div>
    </div>
  );
}
