const LIVE_SUPABASE_URL = "https://qbcchkhjbrijrqubzvtk.supabase.co";
const LIVE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zsvJF9EmiuER-zpMuHd7gg_c9MEY-ql";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || LIVE_SUPABASE_URL;

export const SUPABASE_UNAVAILABLE_MESSAGE =
  "Sign-in is unavailable because the auth server hostname does not exist. You can still browse the catalog.";

export function getSupabaseUrl(): string {
  return supabaseUrl.replace(/\/$/, "");
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    LIVE_SUPABASE_PUBLISHABLE_KEY
  );
}

export function isSupabaseConfigured(url: string = getSupabaseUrl()): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (!host.endsWith(".supabase.co")) return false;
    if (host.startsWith("placeholder-") || host.includes("your-supabase-project")) return false;
    const key = getSupabaseAnonKey();
    if (!key || key === "placeholder-anon-key") return false;
    return true;
  } catch {
    return false;
  }
}

export async function isSupabaseReachable(timeoutMs = 4000): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getSupabaseUrl()}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: getSupabaseAnonKey() },
      signal: controller.signal,
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function requireSupabaseAuth(): Promise<void> {
  if (!(await isSupabaseReachable())) {
    throw new Error(SUPABASE_UNAVAILABLE_MESSAGE);
  }
}
