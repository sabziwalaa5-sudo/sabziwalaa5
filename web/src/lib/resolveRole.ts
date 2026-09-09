import { supabase } from "./supabase";
import { normalizeRole, roleFromEmail, type AppRole } from "./roles";

export async function resolveUserRole(user: { id?: string; email?: string | null }): Promise<AppRole> {
  const fromEmail = roleFromEmail(user?.email);
  if (fromEmail) return fromEmail;
  if (!user?.id) return "CUSTOMER";

  try {
    const { data: profileMvp } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileMvp?.role) return normalizeRole(profileMvp.role);

    const { data: profileProd } = await supabase.from("users").select("role").eq("uid", user.id).maybeSingle();
    if (profileProd?.role) return normalizeRole(profileProd.role);
  } catch {
    // Local / placeholder Supabase — fall back to customer.
  }

  return "CUSTOMER";
}
