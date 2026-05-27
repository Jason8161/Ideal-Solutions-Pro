import { loadPersistedAuthSession } from "@/lib/auth/authStorage";
import {
  loadLegalStuffAcceptance,
  toSupabaseLegalAcceptancePayload,
} from "@/lib/legal/legalAcceptanceStorage";
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/client";

/**
 * Persists legal acceptance timestamps to Supabase when configured.
 * Expects `public.user_legal_acceptance` (see supabase/migrations/003_user_legal_acceptance.sql).
 */
export async function syncLegalAcceptanceToSupabase(userId?: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const session = await loadPersistedAuthSession();
  const resolvedUserId = userId ?? session?.userId;
  if (!resolvedUserId) return;

  const record = await loadLegalStuffAcceptance();
  const fields = toSupabaseLegalAcceptancePayload(record);
  const payload = {
    user_id: resolvedUserId,
    accepted_privacy_policy_at: fields.acceptedPrivacyPolicyAt,
    accepted_terms_at: fields.acceptedTermsAt,
    accepted_ai_disclaimer_at: fields.acceptedAiDisclaimerAt,
    accepted_gps_consent_at: fields.acceptedGpsConsentAt,
    accepted_data_deletion_policy_at: fields.acceptedDataDeletionPolicyAt,
    accepted_eula_at: fields.acceptedEulaAt,
    policy_version: fields.policyVersion,
    app_version: fields.appVersion,
    updated_at: new Date().toISOString(),
  };

  const accessToken = session?.token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: getSupabaseAnonKey(),
    Authorization: `Bearer ${accessToken ?? getSupabaseAnonKey()}`,
    Prefer: "resolution=merge-duplicates",
  };

  try {
    await fetch(`${getSupabaseUrl()}/rest/v1/user_legal_acceptance`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-fatal; local acceptance is authoritative for gating.
  }
}
