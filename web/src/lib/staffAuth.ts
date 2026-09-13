import { createHmac, timingSafeEqual } from "crypto";
import { canAccessPortal, roleFromEmail, type AppRole, type StaffPortal } from "./roles";
import { isProduction } from "./runtime";

export const STAFF_COOKIE = "sabjiwala_staff";

/** Development-only fallback. Never used in production. */
export const DEFAULT_STAFF_BOOTSTRAP_PASSWORD = "Sabjiwala5!";

export type StaffSession = {
  email: string;
  role: AppRole;
  exp: number;
};

export function expectedStaffPassword(): string {
  const configured = process.env.STAFF_BOOTSTRAP_PASSWORD?.trim();
  if (configured) return configured;
  if (isProduction()) {
    throw new Error("STAFF_BOOTSTRAP_PASSWORD is required in production.");
  }
  return DEFAULT_STAFF_BOOTSTRAP_PASSWORD;
}

export function staffCookieSecret(): string {
  const configured =
    process.env.STAFF_SESSION_SECRET?.trim() || process.env.PAYMENT_HMAC_SECRET?.trim();
  if (configured) return configured;
  if (isProduction()) {
    throw new Error("STAFF_SESSION_SECRET or PAYMENT_HMAC_SECRET is required in production.");
  }
  return "sabjiwala-staff-cookie-dev-only";
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(String(provided));
  const right = Buffer.from(String(expected));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function authorizeStaffLogin(input: {
  email: string;
  password: string;
  portal: StaffPortal;
}): { session: StaffSession } | { error: string; status: number } {
  try {
    const email = String(input.email || "").trim().toLowerCase();
    const role = roleFromEmail(email);
    if (!role || role === "CUSTOMER") {
      return { error: "This email is not a staff account.", status: 403 };
    }
    if (!canAccessPortal(role, input.portal)) {
      return { error: `This account cannot open the ${input.portal} portal.`, status: 403 };
    }
    if (!passwordsMatch(input.password, expectedStaffPassword())) {
      return { error: "Invalid staff password.", status: 401 };
    }
    return {
      session: {
        email,
        role,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Staff login is unavailable.";
    return { error: message, status: 503 };
  }
}

export function signStaffSession(session: StaffSession): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = createHmac("sha256", staffCookieSecret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function readStaffSession(token: string | undefined | null): StaffSession | null {
  if (!token) return null;
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = createHmac("sha256", staffCookieSecret()).update(body).digest("hex");
    const left = Buffer.from(sig, "hex");
    const right = Buffer.from(expected, "hex");
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
    const session = JSON.parse(Buffer.from(body, "base64url").toString()) as StaffSession;
    if (!session.email || !session.role || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
