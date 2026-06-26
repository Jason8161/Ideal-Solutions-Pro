import type { ProTrialState } from "@/lib/subscriptions/trialPolicy";

/** Shown on auth screens when sign-in fails during an active guest trial (not an error). */
export const GUEST_TRIAL_AUTH_OPTIONAL_NOTICE =
  "Your 7-day free trial is active. Sign-in is optional ΓÇö continue below without an account.";

export function isGuestTrialAccessActive(trial: ProTrialState): boolean {
  return trial.isActive;
}

/** True when a guest trial was started or consumed ΓÇö avoids tier-picker redirect loops while state syncs. */
export function hasGuestTrialProgress(trial: ProTrialState): boolean {
  return (
    trial.isActive ||
    trial.trialUsed ||
    trial.isExpired ||
    trial.trialStartDate != null
  );
}

/** During guest trial, auth API failures should not surface as login errors. */
export function authFailureCopyDuringGuestTrial(
  trial: ProTrialState,
  fallbackMessage: string,
): string | null {
  if (isGuestTrialAccessActive(trial)) {
    return GUEST_TRIAL_AUTH_OPTIONAL_NOTICE;
  }
  return fallbackMessage;
}
