/**
 * Re-exports canonical tier definitions from `lib/subscriptions/tiers.ts`.
 */

export {
  AI_ADDON_PACKS,
  BOSSMAN_SUPPLY_HOUSE_PRESET_IDS,
  LOCKED_PLAN,
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
} from "@/lib/subscriptions/tiers";

/** @deprecated Use TRIAL_DAYS */
export { TRIAL_DAYS as HELPER_TRIAL_DAYS } from "@/lib/subscriptions/tiers";
