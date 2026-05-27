import { maxEmployeesForTier, tierMeetsMinimum, type SubscriptionTierId } from "@/lib/subscriptionPlans";

/** Super Boss Man+ includes crew AI (fair use). */
export function ownerSubscriptionIncludesCrewAi(tier: SubscriptionTierId): boolean {
  return tierMeetsMinimum(tier, "super_boss_man");
}

/** Paid plans include owner AI; trial uses separate 5-request cap. */
export function ownerSubscriptionIncludesOwnerAi(tier: SubscriptionTierId): boolean {
  return tier !== "locked";
}

export function maxEmployeesForSubscriptionTier(tier: SubscriptionTierId): number {
  return maxEmployeesForTier(tier);
}
