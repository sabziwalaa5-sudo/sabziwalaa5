import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "../supabaseConfig";
import { readStaffSession, STAFF_COOKIE } from "../staffAuth";
import type { AppRole } from "../roles";
import { roleFromEmail } from "../roles";

export type CustomerIdentity = {
  id: string;
  email: string;
};

export type StaffIdentity = {
  email: string;
  role: AppRole;
};

export async function getCustomerFromRequest(request: NextRequest): Promise<CustomerIdentity | null> {
  const testSecret = process.env.INTEGRATION_TEST_SECRET;
  if (testSecret && process.env.NODE_ENV !== "production") {
    const headerSecret = request.headers.get("x-integration-test-secret");
    if (headerSecret && headerSecret === testSecret) {
      const email = request.headers.get("x-test-customer-email");
      const id = request.headers.get("x-test-customer-id") || "integration-test-user";
      if (email) return { id, email: email.toLowerCase() };
    }
  }

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearer) return null;

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(bearer);
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}

export async function requireCustomerAsync(request: NextRequest): Promise<CustomerIdentity> {
  const customer = await getCustomerFromRequest(request);
  if (!customer) {
    throw new ApiError("Unauthorized", 401);
  }
  return customer;
}

export function getStaffFromRequest(request: NextRequest): StaffIdentity | null {
  const token = request.cookies.get(STAFF_COOKIE)?.value;
  const session = readStaffSession(token);
  if (!session) return null;
  return { email: session.email, role: session.role };
}

export function requireStaff(request: NextRequest, allowed: AppRole[] = ["ADMIN"]): StaffIdentity {
  const staff = getStaffFromRequest(request);
  if (!staff || !allowed.includes(staff.role)) {
    throw new ApiError("Unauthorized", 401);
  }
  return staff;
}

export function requireStaffPortal(request: NextRequest, portal: "admin" | "vendor" | "rider"): StaffIdentity {
  const staff = getStaffFromRequest(request);
  if (!staff) throw new ApiError("Unauthorized", 401);
  if (portal === "admin" && staff.role !== "ADMIN") throw new ApiError("Forbidden", 403);
  if (portal === "vendor" && staff.role !== "VENDOR" && staff.role !== "ADMIN") throw new ApiError("Forbidden", 403);
  if (portal === "rider" && staff.role !== "DELIVERY_PARTNER" && staff.role !== "ADMIN") {
    throw new ApiError("Forbidden", 403);
  }
  return staff;
}

export function vendorEmailForStaff(staff: StaffIdentity): string | null {
  if (staff.role === "ADMIN") return null;
  return staff.email;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error) {
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message === "Unauthorized" || error.message.includes("Login required")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message.includes("not found") || error.message.includes("Not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export const GUEST_CART_COOKIE = "sabjiwala_guest_cart";

export function getGuestToken(request: NextRequest): string | null {
  return request.cookies.get(GUEST_CART_COOKIE)?.value || null;
}

export function roleFromStaffEmail(email: string): AppRole | null {
  return roleFromEmail(email);
}
