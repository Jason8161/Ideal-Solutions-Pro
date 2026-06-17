/**
 * Supabase trial safeguards — RPC stubs until project is wired.
 * SQL: supabase/migrations/001_subscription_trial.sql
 */

import type { ProTrialRecord } from "./trialPolicy";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export { isSupabaseConfigured } from "@/lib/supabase/client";

export type TrialEligibilityInput = {
  /** Optional until guest trial is linked at subscribe / sign-in. */
  userId?: string;
  deviceId: string;
  email?: string;
  appleId?: string;
  googleId?: string;
};

export type TrialEligibilityResult =
  | { ok: true }
  | { ok: false; reason: "account_used" | "device_used" | "network"; message: string };

/**
 * TODO: POST to Supabase RPC `check_trial_eligibility` when configured.
 * Until then, local-only trial (device record still saved for future sync).
 */
export async function checkTrialEligibilityRemote(
  _input: TrialEligibilityInput,
): Promise<TrialEligibilityResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true };
  }
  // TODO: implement fetch to `${SUPABASE_URL}/rest/v1/rpc/check_trial_eligibility`
  return { ok: true };
}

export async function markTrialStartedRemote(_record: ProTrialRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  // TODO: upsert trial_records
}

export async function recordTrialAiUsageRemote(_payload: {
  userId?: string;
  deviceId?: string;
  aiRequestsUsed: number;
  trialUsed: boolean;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  // TODO: patch trial_records.ai_requests_used
}

export async function syncUserSubscriptionStateRemote(_payload: {
  userId: string;
  tier: string;
  aiRequestsUsed: number;
  aiAddonCredits?: number;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  // TODO: upsert user_subscription_state
}
