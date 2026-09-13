const LOGO_PATH = "/images/logo.png";
const LOGO_ALT = "SABZIWALAA ५ — Freshly Delivered";
const LOGO_ASPECT = 1024 / 558;

type BrandLogoProps = {
  height?: number;
  priority?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

export function BrandLogo({ height = 44, priority = false, style, className }: BrandLogoProps) {
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <img
      src={LOGO_PATH}
      alt={LOGO_ALT}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={{
        display: "block",
        width: "auto",
        height,
        maxWidth: "100%",
        objectFit: "contain",
        ...style,
      }}
    />
  );
}

export { LOGO_PATH, LOGO_ALT };
