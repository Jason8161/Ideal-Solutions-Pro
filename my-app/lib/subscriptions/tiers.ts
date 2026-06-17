/**
 * Ideal Solutions Pro — subscription tiers (v2).
 * RevenueCat product IDs: docs/REVENUECAT_PRODUCTS.md
 */

export type SubscriptionTierId =
  | "locked"
  | "side_hustle"
  | "boss_man"
  | "super_boss_man"
  | "enterprise_boss_man";

/** @deprecated Legacy persisted tier IDs — migrate on read. */
export type LegacySubscriptionTierId =
  | "free_trial"
  | "starter"
  | "pro"
  | "boss"
  | "helper"
  | "side_job"
  | "bossman"
  | "super_bossman"
  | "ideal_starter"
  | "ideal_pro"
  | "ideal_boss";

const LEGACY_TIER_MAP: Record<LegacySubscriptionTierId, SubscriptionTierId> = {
  free_trial: "side_hustle",
  starter: "side_hustle",
  ideal_starter: "side_hustle",
  helper: "locked",
  side_job: "side_hustle",
  pro: "boss_man",
  ideal_pro: "boss_man",
  bossman: "boss_man",
  boss: "super_boss_man",
  ideal_boss: "super_boss_man",
  super_bossman: "super_boss_man",
};

export const SUBSCRIPTION_TIER_ORDER: SubscriptionTierId[] = [
  "locked",
  "side_hustle",
  "boss_man",
  "super_boss_man",
  "enterprise_boss_man",
];

export const TRIAL_DAYS = 7;
export const TRIAL_AI_REQUESTS_TOTAL = 5;

export type AiAddonPackId = "ai_100" | "ai_500" | "ai_2000" | "ai_5000";

export type AiAddonPack = {
  id: AiAddonPackId;
  label: string;
  monthlyCredits: number;
  priceLabel: string;
  revenueCatProductId: string;
  revenueCatEntitlementId: string;
};

export const AI_ADDON_PACKS: AiAddonPack[] = [
  {
    id: "ai_100",
    label: "+100 AI / month",
    monthlyCredits: 100,
    priceLabel: "$4.99/mo",
    revenueCatProductId: "ai_addon_100_monthly",
    revenueCatEntitlementId: "ai_addon_100",
  },
  {
    id: "ai_500",
    label: "+500 AI / month",
    monthlyCredits: 500,
    priceLabel: "$14.99/mo",
    revenueCatProductId: "ai_addon_500_monthly",
    revenueCatEntitlementId: "ai_addon_500",
  },
  {
    id: "ai_2000",
    label: "+2,000 AI / month",
    monthlyCredits: 2000,
    priceLabel: "$39.99/mo",
    revenueCatProductId: "ai_addon_2000_monthly",
    revenueCatEntitlementId: "ai_addon_2000",
  },
  {
    id: "ai_5000",
    label: "+5,000 AI / month",
    monthlyCredits: 5000,
    priceLabel: "$79.99/mo",
    revenueCatProductId: "ai_addon_5000_monthly",
    revenueCatEntitlementId: "ai_addon_5000",
  },
];

export type SubscriptionPlan = {
  id: SubscriptionTierId;
  name: string;
  priceLabel: string;
  monthlyPrice: number;
  tagline: string;
  features: string[];
  mostPopular?: boolean;
  recommended?: boolean;
  isPaid: boolean;
  /** Max employees (0 = solo only). */
  maxEmployees: number;
  /** Monthly AI requests included (resets each billing period). */
  monthlyAiLimit: number;
  revenueCatProductId?: string;
  revenueCatPackageId?: string;
  revenueCatEntitlementId?: string;
};

export const PLAN_PICKER_HEADLINE =
  "Pick the plan that fits how you run jobs. Start with a 7-day trial on your chosen tier — 5 AI requests total, all files stay on your device.";

export const PLAN_PICKER_FAIR_USE_NOTE =
  "Photos, videos, and PDFs are stored on this device only. Use iCloud, OneDrive, Google Drive, or Dropbox for backup — we never host your job media in the cloud.";

/** Paid tiers shown in onboarding / subscribe pickers (excludes locked). */
export const PAID_TIER_IDS: SubscriptionTierId[] = [
  "side_hustle",
  "boss_man",
  "super_boss_man",
  "enterprise_boss_man",
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "side_hustle",
    name: "Side Hustle / DIY",
    priceLabel: "$9.99/mo",
    monthlyPrice: 9.99,
    tagline: "Solo contractor — estimates, invoices, scheduling, customers",
    features: [
      "50 AI requests / month",
      "Estimating, invoices, scheduling, customers",
      "Local photo & document storage on device",
      "No employees",
    ],
    isPaid: true,
    maxEmployees: 0,
    monthlyAiLimit: 50,
    revenueCatProductId: "side_hustle_monthly",
    revenueCatPackageId: "side_hustle_monthly",
    revenueCatEntitlementId: "side_hustle",
  },
  {
    id: "boss_man",
    name: "Boss Man",
    priceLabel: "$19.99/mo",
    monthlyPrice: 19.99,
    tagline: "Advanced estimating and workflows for solo operators",
    features: [
      "100 AI requests / month",
      "Advanced estimating & workflows",
      "Everything in Side Hustle / DIY",
      "No employees",
    ],
    mostPopular: true,
    recommended: true,
    isPaid: true,
    maxEmployees: 0,
    monthlyAiLimit: 100,
    revenueCatProductId: "boss_man_monthly",
    revenueCatPackageId: "boss_man_monthly",
    revenueCatEntitlementId: "ideal_solutions_pro",
  },
  {
    id: "super_boss_man",
    name: "Super Boss Man",
    priceLabel: "$49.99/mo",
    monthlyPrice: 49.99,
    tagline: "Small crews — up to 8 employees, team features",
    features: [
      "150 AI requests / month",
      "Up to 8 employees & crew tools",
      "Team scheduling & shared workflows",
      "Everything in Boss Man",
    ],
    isPaid: true,
    maxEmployees: 8,
    monthlyAiLimit: 150,
    revenueCatProductId: "super_boss_man_monthly",
    revenueCatPackageId: "super_boss_man_monthly",
    revenueCatEntitlementId: "super_boss_man",
  },
  {
    id: "enterprise_boss_man",
    name: "Enterprise Boss Man",
    priceLabel: "$99.99/mo",
    monthlyPrice: 99.99,
    tagline: "Larger teams — up to 15 employees, priority support",
    features: [
      "200 AI requests / month",
      "Up to 15 employees",
      "Priority support",
      "Everything in Super Boss Man",
    ],
    isPaid: true,
    maxEmployees: 15,
    monthlyAiLimit: 200,
    revenueCatProductId: "enterprise_boss_man_monthly",
    revenueCatPackageId: "enterprise_boss_man_monthly",
    revenueCatEntitlementId: "enterprise_boss_man",
  },
];

export const LOCKED_PLAN: SubscriptionPlan = {
  id: "locked",
  name: "Trial ended",
  priceLabel: "Subscribe to unlock",
  monthlyPrice: 0,
  tagline: "Your local data is safe — upgrade to continue premium features",
  features: ["View saved local jobs & files", "Subscribe to restore full access"],
  isPaid: false,
  maxEmployees: 0,
  monthlyAiLimit: 0,
};

export const RETAIL_MATERIAL_SUPPLIER_IDS = ["homedepot", "lowes", "ace"] as const;

export const BOSSMAN_SUPPLY_HOUSE_PRESET_IDS = [
  "graybar",
  "rexel",
  "cityelectric",
  "grainger",
] as const;

export function normalizeSubscriptionTierId(
  raw: string | null | undefined,
): SubscriptionTierId {
  if (!raw) return "locked";
  if (SUBSCRIPTION_TIER_ORDER.includes(raw as SubscriptionTierId)) {
    return raw as SubscriptionTierId;
  }
  if (raw in LEGACY_TIER_MAP) {
    return LEGACY_TIER_MAP[raw as LegacySubscriptionTierId];
  }
  return "locked";
}

export function getSubscriptionPlan(id: SubscriptionTierId): SubscriptionPlan {
  if (id === "locked") return LOCKED_PLAN;
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === id);
  return plan ?? LOCKED_PLAN;
}

export function tierRank(id: SubscriptionTierId): number {
  const idx = SUBSCRIPTION_TIER_ORDER.indexOf(id);
  return idx >= 0 ? idx : 0;
}

export function tierMeetsMinimum(
  current: SubscriptionTierId,
  required: SubscriptionTierId,
): boolean {
  return tierRank(current) >= tierRank(required);
}

export function paidSubscriptionPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter((p) => p.isPaid);
}

export function isPaidSubscriptionTier(tier: SubscriptionTierId): boolean {
  return tier !== "locked" && getSubscriptionPlan(tier).isPaid;
}

export function monthlyAiLimitForTier(tier: SubscriptionTierId): number {
  return getSubscriptionPlan(tier).monthlyAiLimit;
}

export function maxEmployeesForTier(tier: SubscriptionTierId): number {
  return getSubscriptionPlan(tier).maxEmployees;
}

/** @deprecated Use monthlyAiLimitForTier */
export function dailyAiLimitForTier(_tier: SubscriptionTierId): number | null {
  return null;
}

/** Local-only policy: no app cloud uploads for media. */
export function dailyImageUploadLimitForTier(_tier: SubscriptionTierId): number | null {
  return null;
}
