/**
 * Subscription tier definitions — re-exported from `lib/subscription/tiers.ts`.
 * RevenueCat mapping: docs/SUBSCRIPTION_TIERS.md
 */

export {
  AI_ADDON_PACKS,
  BOSSMAN_SUPPLY_HOUSE_PRESET_IDS,
  HELPER_TRIAL_DAYS,
  PAID_TIER_IDS,
  PLAN_PICKER_FAIR_USE_NOTE,
  PLAN_PICKER_HEADLINE,
  RETAIL_MATERIAL_SUPPLIER_IDS,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_TIER_ORDER,
  TRIAL_AI_REQUESTS_TOTAL,
  TRIAL_DAYS,
  dailyAiLimitForTier,
  dailyImageUploadLimitForTier,
  getSubscriptionPlan,
  isPaidSubscriptionTier,
  maxEmployeesForTier,
  monthlyAiLimitForTier,
  normalizeSubscriptionTierId,
  paidSubscriptionPlans,
  tierMeetsMinimum,
  tierRank,
  type AiAddonPack,
  type AiAddonPackId,
  type LegacySubscriptionTierId,
  type SubscriptionPlan,
  type SubscriptionTierId,
} from "@/lib/subscription/tiers";
