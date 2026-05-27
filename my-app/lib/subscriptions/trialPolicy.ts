import type { SubscriptionTierId } from "./tiers";
import { PAID_TIER_IDS, TRIAL_AI_REQUESTS_TOTAL, TRIAL_DAYS, normalizeSubscriptionTierId } from "./tiers";

export type ProTrialRecord = {
  interestTier: SubscriptionTierId;
  trialStartDate: string;
  trialAcceptedAt?: string;
  aiRequestsUsed: number;
  /** Set when trial consumed on server or locally marked complete */
  trialUsed: boolean;
  userId?: string;
  deviceId?: string;
  email?: string;
  appleId?: string;
  googleId?: string;
};

export type ProTrialState = {
  interestTier: SubscriptionTierId | null;
  trialStartDate: Date | null;
  daysRemaining: number;
  isActive: boolean;
  isExpired: boolean;
  aiRequestsUsed: number;
  aiLimit: number;
  aiExhausted: boolean;
  trialUsed: boolean;
  /** Premium locked — trial ended or AI cap hit without subscription */
  isLocked: boolean;
};

export function isValidTrialInterestTier(tier: string | null | undefined): tier is SubscriptionTierId {
  if (!tier) return false;
  const normalized = normalizeSubscriptionTierId(tier);
  return PAID_TIER_IDS.includes(normalized);
}

function msPerDay(): number {
  return 24 * 60 * 60 * 1000;
}

export function computeTrialState(
  record: ProTrialRecord | null,
  now = new Date(),
  hasPaidSubscription = false,
): ProTrialState {
  const aiLimit = TRIAL_AI_REQUESTS_TOTAL;
  const empty: ProTrialState = {
    interestTier: null,
    trialStartDate: null,
    daysRemaining: TRIAL_DAYS,
    isActive: false,
    isExpired: false,
    aiRequestsUsed: 0,
    aiLimit,
    aiExhausted: false,
    trialUsed: false,
    isLocked: !hasPaidSubscription,
  };

  if (hasPaidSubscription) {
    return { ...empty, isLocked: false };
  }

  if (!record || !record.trialStartDate || !isValidTrialInterestTier(record.interestTier)) {
    return empty;
  }

  const started = new Date(record.trialStartDate);
  const elapsedDays = Math.floor((now.getTime() - started.getTime()) / msPerDay());
  const daysRemaining = Math.max(0, TRIAL_DAYS - elapsedDays);
  const timeExpired = elapsedDays >= TRIAL_DAYS;
  const aiUsed = record.aiRequestsUsed ?? 0;
  const aiExhausted = aiUsed >= aiLimit;
  const trialUsed = record.trialUsed === true;
  const isExpired = timeExpired || aiExhausted || trialUsed;
  const isActive = !isExpired;

  return {
    interestTier: record.interestTier,
    trialStartDate: started,
    daysRemaining,
    isActive,
    isExpired,
    aiRequestsUsed: aiUsed,
    aiLimit,
    aiExhausted,
    trialUsed,
    isLocked: isExpired,
  };
}

export function trialEffectiveTier(
  trial: ProTrialState,
  paidTier: SubscriptionTierId | null,
): SubscriptionTierId {
  if (paidTier && paidTier !== "locked") return paidTier;
  if (trial.isActive && trial.interestTier) return trial.interestTier;
  return "locked";
}

export type VerifiedAuthMethod = "apple" | "google" | "email";

export function authSatisfiesTrialRequirement(input: {
  emailVerified?: boolean;
  appleId?: string | null;
  googleId?: string | null;
  hasPasswordAccount?: boolean;
}): { ok: boolean; method: VerifiedAuthMethod | null } {
  if (input.appleId?.trim()) return { ok: true, method: "apple" };
  if (input.googleId?.trim()) return { ok: true, method: "google" };
  if (input.emailVerified && input.hasPasswordAccount) return { ok: true, method: "email" };
  return { ok: false, method: null };
}
