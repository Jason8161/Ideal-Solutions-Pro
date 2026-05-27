/**
 * Who may grant free subscription overrides (in-app admin UI).
 */

import Constants from "expo-constants";

import { isSupabaseConfigured, supabaseRpc } from "@/lib/supabase/client";

function adminEmailsFromEnv(): string[] {
  const raw =
    process.env.EXPO_PUBLIC_APP_ADMIN_EMAILS?.trim() ||
    (Constants.expoConfig?.extra as { appAdminEmails?: string } | undefined)?.appAdminEmails?.trim() ||
    "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAppSubscriptionAdminByEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  return adminEmailsFromEnv().includes(normalized);
}

/** Client-side gate for showing admin UI; server RPC enforces `app_subscription_admins`. */
export async function isAppSubscriptionAdmin(userId: string, email: string | null | undefined): Promise<boolean> {
  if (isAppSubscriptionAdminByEmail(email)) return true;
  if (!userId.trim() || !isSupabaseConfigured()) return false;
  try {
    const result = await supabaseRpc<boolean>("is_subscription_admin", {
      p_user_id: userId.trim(),
    });
    return result === true;
  } catch {
    return false;
  }
}
