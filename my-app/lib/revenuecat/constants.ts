/**
 * RevenueCat identifiers — re-exported from canonical tier config.
 * See docs/REVENUECAT_SETUP.md for dashboard steps.
 */

export {
  IDEAL_SOLUTIONS_PRO_ENTITLEMENT,
  LEGACY_BOSS_MAN_MONTHLY_PACKAGE_IDS,
  LEGACY_BOSS_MAN_MONTHLY_PRODUCT_IDS,
  LEGACY_ENTITLEMENT_IDS,
  LEGACY_TIER_PACKAGE_IDS,
  LEGACY_TIER_PRODUCT_IDS,
} from "@/lib/subscriptions/tiers";

/** Consumable AI credit packs — see lib/subscription/aiAddons.ts */
export const AI_ADDON_STORE_PRODUCT_IDS = [
  "ideal_ai_addon_100",
  "ideal_ai_addon_500",
  "ideal_ai_addon_2000",
  "ideal_ai_addon_5000",
] as const;
