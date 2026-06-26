import {
  getSubscriptionPlan,
  normalizeSubscriptionTierId,
  type SubscriptionTierId,
} from "@/lib/subscriptions/tiers";

/** Total company users allowed per tier (includes owner). */
const TIER_MAX_USERS: Record<SubscriptionTierId, number> = {
  locked: 1,
  side_hustle: 1,
  boss_man: 1,
  super_boss_man: 8,
  enterprise_boss_man: 15,
};

export function maxCompanyUsersForTier(tier: SubscriptionTierId): number {
  return TIER_MAX_USERS[tier] ?? 1;
}

export function canAddCompanyUser(activeCount: number, tier: SubscriptionTierId): boolean {
  return activeCount < maxCompanyUsersForTier(tier);
}

export function companyUserLimitLabel(tier: SubscriptionTierId): string {
  const max = maxCompanyUsersForTier(tier);
  const plan = getSubscriptionPlan(tier);
  return `${max} user${max === 1 ? "" : "s"} (${plan.name})`;
}

export function normalizeTierForUserLimits(raw: string | null | undefined): SubscriptionTierId {
  return normalizeSubscriptionTierId(raw);
}
