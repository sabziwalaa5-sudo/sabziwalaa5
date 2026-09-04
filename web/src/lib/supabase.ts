import { createClient } from "@supabase/supabase-js";
import { isNativeRuntime } from "./platform";
import {
  SUPABASE_UNAVAILABLE_MESSAGE,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseReachable,
} from "./supabaseConfig";

export {
  SUPABASE_UNAVAILABLE_MESSAGE,
  getSupabaseUrl,
  isSupabaseConfigured,
  isSupabaseReachable,
  requireSupabaseAuth,
} from "./supabaseConfig";

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

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
