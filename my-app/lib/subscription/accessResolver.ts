/**
 * Subscription access resolution order:
 * 1. RevenueCat active paid entitlement (storeTier)
 * 2. Valid Supabase free_access_overrides row
 * 3. Local profile paid tier (offline cache)
 * 4. Pro trial interest tier
 * 5. locked → subscription screen
 */

import type { ProTrialState } from "@/lib/subscriptions/trialPolicy";
import { trialEffectiveTier } from "@/lib/subscriptions/trialPolicy";
import {
  isPaidSubscriptionTier,
  type SubscriptionTierId,
} from "@/lib/subscriptions/tiers";

import type { ResolvedFreeAccessOverride } from "./freeAccessOverride";
import { tierFromActiveFreeAccessOverride } from "./freeAccessOverride";
import type { SubscriptionDevOverride } from "@/lib/subscriptionDevOverride";
import { isDevActiveTierOverride } from "@/lib/subscriptionDevOverride";

export type SubscriptionAccessSource =
  | "testing"
  | "beta"
  | "dev_override"
  | "revenuecat"
  | "free_admin"
  | "profile_cache"
  | "trial"
  | "locked";

export type ResolvedSubscriptionAccess = {
  activeTier: SubscriptionTierId;
  source: SubscriptionAccessSource;
  hasPaidEntitlement: boolean;
  subscriptionLocked: boolean;
  revenueCatTier: SubscriptionTierId | null;
  freeAccessOverride: ResolvedFreeAccessOverride | null;
};

export function resolveSubscriptionAccess(input: {
  testingUnlocked: boolean;
  betaFullAccess: boolean;
  devOverride: SubscriptionDevOverride | null;
  storeTier: SubscriptionTierId | null;
  profileTier: SubscriptionTierId;
  freeAccessOverride: ResolvedFreeAccessOverride | null;
  proTrial: ProTrialState;
}): ResolvedSubscriptionAccess {
  const revenueCatTier =
    input.storeTier && isPaidSubscriptionTier(input.storeTier) ? input.storeTier : null;
  const overrideTier = tierFromActiveFreeAccessOverride(input.freeAccessOverride);
  const profilePaid = isPaidSubscriptionTier(input.profileTier) ? input.profileTier : null;

  if (input.testingUnlocked || input.betaFullAccess) {
    return {
      activeTier: "enterprise_boss_man",
      source: input.testingUnlocked ? "testing" : "beta",
      hasPaidEntitlement: true,
      subscriptionLocked: false,
      revenueCatTier,
      freeAccessOverride: input.freeAccessOverride,
    };
  }

  if (isDevActiveTierOverride(input.devOverride) && input.devOverride?.activeTierOverride) {
    return {
      activeTier: input.devOverride.activeTierOverride,
      source: "dev_override",
      hasPaidEntitlement: isPaidSubscriptionTier(input.devOverride.activeTierOverride),
      subscriptionLocked: false,
      revenueCatTier,
      freeAccessOverride: input.freeAccessOverride,
    };
  }

  if (revenueCatTier) {
    return {
      activeTier: revenueCatTier,
      source: "revenuecat",
      hasPaidEntitlement: true,
      subscriptionLocked: false,
      revenueCatTier,
      freeAccessOverride: input.freeAccessOverride,
    };
  }

  if (overrideTier) {
    return {
      activeTier: overrideTier,
      source: "free_admin",
      hasPaidEntitlement: true,
      subscriptionLocked: false,
      revenueCatTier: null,
      freeAccessOverride: input.freeAccessOverride,
    };
  }

  const hasPaid = Boolean(profilePaid);
  const trialTier = trialEffectiveTier(input.proTrial, profilePaid);
  const locked = input.proTrial.isLocked && !hasPaid;

  if (profilePaid) {
    return {
      activeTier: profilePaid,
      source: "profile_cache",
      hasPaidEntitlement: true,
      subscriptionLocked: false,
      revenueCatTier: null,
      freeAccessOverride: input.freeAccessOverride,
    };
  }

  return {
    activeTier: trialTier,
    source: locked ? "locked" : "trial",
    hasPaidEntitlement: false,
    subscriptionLocked: locked,
    revenueCatTier: null,
    freeAccessOverride: input.freeAccessOverride,
  };
}
