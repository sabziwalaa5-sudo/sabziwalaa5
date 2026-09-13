import type { AppRole, StaffPortal } from "./roles";

export async function loginStaffPortal(email: string, password: string, portal: StaffPortal): Promise<{ email: string; role: AppRole }> {
  const response = await fetch("/api/staff/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, portal }),
  });
  const data = (await response.json().catch(() => ({}))) as { email?: string; role?: AppRole; error?: string };
  if (!response.ok || !data.email || !data.role) {
    throw new Error(data.error || "Staff sign-in failed");
  }
  return { email: data.email, role: data.role };
}

export async function fetchStaffSession(): Promise<{ email: string; role: AppRole } | null> {
  const response = await fetch("/api/staff/me", { credentials: "include" });
  if (!response.ok) return null;
  const data = (await response.json()) as { email?: string; role?: AppRole };
  if (!data.email || !data.role) return null;
  return { email: data.email, role: data.role };
}

export async function logoutStaffPortal(): Promise<void> {
  await fetch("/api/staff/logout", { method: "POST", credentials: "include" });
}
