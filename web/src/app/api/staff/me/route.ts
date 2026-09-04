import { NextRequest, NextResponse } from "next/server";
import { readStaffSession, STAFF_COOKIE } from "../../../../lib/staffAuth";

export async function GET(request: NextRequest) {
  const session = readStaffSession(request.cookies.get(STAFF_COOKIE)?.value);
  if (!session) return NextResponse.json({ email: null, role: null }, { status: 401 });
  return NextResponse.json({ email: session.email, role: session.role });
}
