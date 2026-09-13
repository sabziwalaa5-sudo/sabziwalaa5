import { NextRequest, NextResponse } from "next/server";
import { authorizeStaffLogin, signStaffSession, STAFF_COOKIE, type StaffSession } from "../../../../lib/staffAuth";
import type { StaffPortal } from "../../../../lib/roles";
import { checkServerRateLimit, clientIp } from "../../../../lib/serverRateLimit";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const limit = checkServerRateLimit(`staff-login:${ip}`, 10, 5 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    portal?: StaffPortal;
  };
  const portal = body.portal === "vendor" || body.portal === "rider" || body.portal === "admin" ? body.portal : "admin";
  const result = authorizeStaffLogin({
    email: body.email || "",
    password: body.password || "",
    portal,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const response = NextResponse.json({
    email: result.session.email,
    role: result.session.role,
  });
  response.cookies.set(STAFF_COOKIE, signStaffSession(result.session as StaffSession), cookieOptions());
  return response;
}
