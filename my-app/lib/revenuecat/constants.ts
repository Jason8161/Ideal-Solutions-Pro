/**

 * RevenueCat identifiers — must match App Store Connect, Google Play, and RevenueCat dashboard.

 * See docs/REVENUECAT_SETUP.md for dashboard steps.

 */



/** Primary entitlement: "Ideal Solutions Pro" */

export const IDEAL_SOLUTIONS_PRO_ENTITLEMENT = "ideal_solutions_pro";



/** Legacy entitlement keys still honored for existing subscribers. */

export const LEGACY_ENTITLEMENT_IDS = ["ideal_starter", "ideal_pro", "ideal_boss", "pro"] as const;



/** Legacy Boss Man monthly store SKUs still matched when resolving packages. */

export const LEGACY_BOSS_MAN_MONTHLY_PRODUCT_IDS = [

  "boss_man_monthly",

  "ideal_pro_monthly",

  "ideal_solutions_pro_monthly",

] as const;



/** Legacy Boss Man monthly package identifiers in the default offering. */

export const LEGACY_BOSS_MAN_MONTHLY_PACKAGE_IDS = ["$rc_monthly", "monthly"] as const;



/** Legacy store product IDs per paid tier (pre-dashboard rename). */

export const LEGACY_TIER_PRODUCT_IDS: Record<string, readonly string[]> = {

  side_hustle: ["side_hustle_monthly"],

  boss_man: [...LEGACY_BOSS_MAN_MONTHLY_PRODUCT_IDS],

  super_boss_man: ["super_boss_man_monthly"],

  enterprise_boss_man: ["enterprise_boss_man_monthly"],

};



/** Consumable AI credit packs — see lib/subscription/aiAddons.ts */

export const AI_ADDON_STORE_PRODUCT_IDS = [

  "ideal_ai_addon_100",

  "ideal_ai_addon_500",

  "ideal_ai_addon_2000",

  "ideal_ai_addon_5000",

] as const;


