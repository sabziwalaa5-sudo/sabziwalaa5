import type { Request, Response, NextFunction } from "express";

const DEFAULT_ORIGINS = [
  "https://web-sabziwalaa5.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];

export function getAllowedOrigins(): string[] {
  const fromEnv = process.env.WEB_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean) || [];
  const extra = process.env.CORS_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) || [];
  const merged = [...fromEnv, ...extra, ...DEFAULT_ORIGINS];
  return Array.from(new Set(merged));
}

export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.removeHeader("X-Powered-By");
  next();
}

export function productionErrorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd && err instanceof Error) {
    res.status(500).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
}
