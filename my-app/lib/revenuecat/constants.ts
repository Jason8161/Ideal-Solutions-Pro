/**
 * RevenueCat identifiers — must match App Store Connect, Google Play, and RevenueCat dashboard.
 * See docs/REVENUECAT_SETUP.md for dashboard steps.
 */

/** Primary entitlement: "Ideal Solutions Pro" */
export const IDEAL_SOLUTIONS_PRO_ENTITLEMENT = "ideal_solutions_pro";

/** Legacy entitlement keys still honored for existing subscribers. */
export const LEGACY_ENTITLEMENT_IDS = ["ideal_starter", "ideal_pro", "ideal_boss", "pro"] as const;

export type ProBillingPeriod = "monthly" | "yearly";

/** Store product IDs for Boss Man (legacy Ideal Solutions Pro). */
export const PRO_STORE_PRODUCT_IDS: Record<ProBillingPeriod, string> = {
  monthly: "boss_man_monthly",
  yearly: "boss_man_yearly",
};

/**
 * RevenueCat package identifiers in the default offering.
 * Use `$rc_monthly` / `$rc_annual` when packages are typed Monthly/Annual in the dashboard,
 * or custom identifiers if you named packages explicitly.
 */
export const PRO_PACKAGE_IDENTIFIERS: Record<ProBillingPeriod, string[]> = {
  monthly: ["$rc_monthly", "monthly", PRO_STORE_PRODUCT_IDS.monthly],
  yearly: ["$rc_annual", "annual", "yearly", PRO_STORE_PRODUCT_IDS.yearly],
};

export const PRO_PRICE_LABELS: Record<ProBillingPeriod, string> = {
  monthly: "$19.99/mo",
  yearly: "$100/yr",
};

/** Consumable AI credit packs — see lib/subscription/aiAddons.ts */
export const AI_ADDON_STORE_PRODUCT_IDS = [
  "ideal_ai_addon_100",
  "ideal_ai_addon_500",
  "ideal_ai_addon_2000",
  "ideal_ai_addon_5000",
] as const;
