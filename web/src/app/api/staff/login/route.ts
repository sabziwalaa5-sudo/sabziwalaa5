import { NextRequest, NextResponse } from "next/server";
import { authorizeStaffLogin, signStaffSession, STAFF_COOKIE, type StaffSession } from "../../../../lib/staffAuth";
import type { StaffPortal } from "../../../../lib/roles";

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
