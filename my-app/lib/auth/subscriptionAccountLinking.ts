import { isPaidSubscriptionTier, type SubscriptionTierId } from "@/lib/subscriptions/tiers";

/**
 * True when the device has a real store-paid tier (RevenueCat) but no Ideal Solutions account.
 * Beta/testing builds are excluded ΓÇö they get full access without account linking.
 */
export function requiresPostSubscribeLogin(input: {
  isAuthenticated: boolean;
  isTestingUnlocked: boolean;
  isBetaFullAccess: boolean;
  storeTier: SubscriptionTierId | null;
}): boolean {
  if (input.isAuthenticated || input.isTestingUnlocked || input.isBetaFullAccess) {
    return false;
  }
  return Boolean(input.storeTier && isPaidSubscriptionTier(input.storeTier));
}

/** Paid tier from RevenueCat store or admin override ΓÇö used to clear guest trial state. */
export function hasRealPaidSubscription(input: {
  storeTier: SubscriptionTierId | null;
  profileTier: SubscriptionTierId;
  freeAccessActive: boolean;
}): boolean {
  if (input.storeTier && isPaidSubscriptionTier(input.storeTier)) return true;
  if (input.freeAccessActive) return true;
  // Profile cache alone must not clear an active guest trial (offline / stale tier).
  return false;
}

/** Paid tier from any persisted source (store, profile cache, or admin override). */
export function hasPersistedPaidSubscription(input: {
  storeTier: SubscriptionTierId | null;
  profileTier: SubscriptionTierId;
  freeAccessActive: boolean;
}): boolean {
  if (hasRealPaidSubscription(input)) return true;
  return isPaidSubscriptionTier(input.profileTier);
}
