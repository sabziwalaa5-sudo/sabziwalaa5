import { createClient } from "@supabase/supabase-js";
import { isNativeRuntime } from "./platform";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_UNAVAILABLE_MESSAGE =
  "Sign-in is unavailable because the auth server hostname does not exist. You can still browse the catalog.";

export function getSupabaseUrl(): string {
  return supabaseUrl.replace(/\/$/, "");
}

export function isSupabaseConfigured(url: string = getSupabaseUrl()): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (!host.endsWith(".supabase.co")) return false;
    if (host.startsWith("placeholder-") || host.includes("your-supabase-project")) return false;
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

/** Google OAuth without replacing the app WebView when DNS fails. */
export async function startGoogleOAuth(redirectTo: string): Promise<{ error?: string }> {
  if (!(await isSupabaseReachable())) {
    return { error: SUPABASE_UNAVAILABLE_MESSAGE };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) return { error: error.message };
  if (!data.url) return { error: "Google Sign-In failed. Use email login instead." };

  if (isNativeRuntime()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url });
      return {};
    } catch {
      // Fall through to same-window navigation on web.
    }
  }

  window.location.assign(data.url);
  return {};
}
