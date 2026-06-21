/**
 * Ideal Solutions Pro — subscription tiers (single source of truth).
 * RevenueCat product IDs: docs/REVENUECAT_PRODUCTS.md
 */

export type SubscriptionTierId =
  | "locked"
  | "side_hustle"
  | "boss_man"
  | "super_boss_man"
  | "enterprise_boss_man";

export type PaidSubscriptionTierId = Exclude<SubscriptionTierId, "locked">;

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

/** Primary entitlement for Boss Man — must match RevenueCat dashboard. */
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

/**
 * Canonical tier configuration — single source of truth for paywall, subscription screen,
 * RevenueCat mapping, feature gating, and employee eligibility.
 */
export type SubscriptionTierConfig = {
  id: PaidSubscriptionTierId;
  displayName: string;
  /** Store product IDs (current + legacy) for package resolution and restore mapping. */
  productIds: readonly string[];
  /** RevenueCat entitlement keys that grant this tier. */
  entitlementKeys: readonly string[];
  rank: number;
  showOnPaywall: boolean;
  showOnSubscriptionScreen: boolean;
  /** Employee Actions / crew tools — true only for Super Boss Man + Enterprise. */
  employeeEligible: boolean;
  priceLabel: string;
  monthlyPrice: number;
  tagline: string;
  features: string[];
  mostPopular?: boolean;
  recommended?: boolean;
  maxEmployees: number;
  monthlyAiLimit: number;
  revenueCatPackageId?: string;
};

export const SUBSCRIPTION_TIER_CONFIG: Record<PaidSubscriptionTierId, SubscriptionTierConfig> = {
  side_hustle: {
    id: "side_hustle",
    displayName: "Side Hustle / DIY",
    productIds: ["Side_Job_DIY", "side_hustle_monthly"],
    entitlementKeys: ["side_hustle"],
    rank: 1,
    showOnPaywall: true,
    showOnSubscriptionScreen: true,
    employeeEligible: false,
    priceLabel: "$9.99/mo",
    monthlyPrice: 9.99,
    tagline: "Solo contractor — estimates, invoices, scheduling, customers",
    features: [
      "50 AI requests / month",
      "Estimating, invoices, scheduling, customers",
      "Local photo & document storage on device",
      "No employees",
    ],
    maxEmployees: 0,
    monthlyAiLimit: 50,
  },
  boss_man: {
    id: "boss_man",
    displayName: "Boss Man",
    productIds: ["idealsolutionspro.BossManMode", ...LEGACY_BOSS_MAN_MONTHLY_PRODUCT_IDS, "BossManMode"],
    entitlementKeys: [IDEAL_SOLUTIONS_PRO_ENTITLEMENT, "idealsolutionspro.BossManMode", "BossManMode"],
    rank: 2,
    showOnPaywall: true,
    showOnSubscriptionScreen: true,
    employeeEligible: false,
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
    maxEmployees: 0,
    monthlyAiLimit: 100,
  },
  super_boss_man: {
    id: "super_boss_man",
    displayName: "Super Boss Man",
    productIds: ["idealsolutionspro.SuperBossManMode", "super_boss_man_monthly", "SuperBossManMode"],
    entitlementKeys: ["super_boss_man", "ideal_boss", "idealsolutionspro.SuperBossManMode", "SuperBossManMode"],
    rank: 3,
    showOnPaywall: true,
    showOnSubscriptionScreen: true,
    employeeEligible: true,
    priceLabel: "$49.99/mo",
    monthlyPrice: 49.99,
    tagline: "Small crews — up to 8 employees, team features",
    features: [
      "150 AI requests / month",
      "Up to 8 employees & crew tools",
      "Team scheduling & shared workflows",
      "Everything in Boss Man",
    ],
    maxEmployees: 8,
    monthlyAiLimit: 150,
  },
  enterprise_boss_man: {
    id: "enterprise_boss_man",
    displayName: "Enterprise Boss Man",
    productIds: ["idealsolutionspro.EnterpriseBossMan", "enterprise_boss_man_monthly", "EnterpriseBossMan"],
    entitlementKeys: ["enterprise_boss_man", "idealsolutionspro.EnterpriseBossMan", "EnterpriseBossMan"],
    rank: 4,
    showOnPaywall: true,
    showOnSubscriptionScreen: true,
    employeeEligible: true,
    priceLabel: "$99.99/mo",
    monthlyPrice: 99.99,
    tagline: "Larger teams — up to 15 employees, priority support",
    features: [
      "200 AI requests / month",
      "Up to 15 employees",
      "Priority support",
      "Everything in Super Boss Man",
    ],
    maxEmployees: 15,
    monthlyAiLimit: 200,
  },
};

/** Legacy store product IDs per paid tier (derived from config). */
export const LEGACY_TIER_PRODUCT_IDS: Record<PaidSubscriptionTierId, readonly string[]> = {
  side_hustle: SUBSCRIPTION_TIER_CONFIG.side_hustle.productIds,
  boss_man: SUBSCRIPTION_TIER_CONFIG.boss_man.productIds,
  super_boss_man: SUBSCRIPTION_TIER_CONFIG.super_boss_man.productIds,
  enterprise_boss_man: SUBSCRIPTION_TIER_CONFIG.enterprise_boss_man.productIds,
};

/** Legacy RevenueCat package identifiers still matched when resolving offerings. */
export const LEGACY_TIER_PACKAGE_IDS: Record<PaidSubscriptionTierId, readonly string[]> = {
  side_hustle: ["side_hustle_monthly"],
  boss_man: [...LEGACY_BOSS_MAN_MONTHLY_PACKAGE_IDS, ...LEGACY_BOSS_MAN_MONTHLY_PRODUCT_IDS],
  super_boss_man: ["super_boss_man_monthly"],
  enterprise_boss_man: ["enterprise_boss_man_monthly"],
};

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
  maxEmployees: number;
  monthlyAiLimit: number;
  revenueCatProductId?: string;
  revenueCatPackageId?: string;
  revenueCatEntitlementId?: string;
  showOnPaywall?: boolean;
  showOnSubscriptionScreen?: boolean;
  employeeEligible?: boolean;
};

function tierConfigToPlan(config: SubscriptionTierConfig): SubscriptionPlan {
  return {
    id: config.id,
    name: config.displayName,
    priceLabel: config.priceLabel,
    monthlyPrice: config.monthlyPrice,
    tagline: config.tagline,
    features: config.features,
    mostPopular: config.mostPopular,
    recommended: config.recommended,
    isPaid: true,
    maxEmployees: config.maxEmployees,
    monthlyAiLimit: config.monthlyAiLimit,
    revenueCatProductId: config.productIds[0],
    revenueCatPackageId: config.revenueCatPackageId,
    revenueCatEntitlementId: config.entitlementKeys[0],
    showOnPaywall: config.showOnPaywall,
    showOnSubscriptionScreen: config.showOnSubscriptionScreen,
    employeeEligible: config.employeeEligible,
  };
}

export const PLAN_PICKER_HEADLINE =
  "Pick the plan that fits how you run jobs. Start with a 7-day trial on your chosen tier — 5 AI requests total, all files stay on your device.";

export const PLAN_PICKER_FAIR_USE_NOTE =
  "Photos, videos, and PDFs are stored on this device only. Use iCloud, OneDrive, Google Drive, or Dropbox for backup — we never host your job media in the cloud.";

/** Paid tiers in rank order (excludes locked). */
export const PAID_TIER_IDS: PaidSubscriptionTierId[] = [
  "side_hustle",
  "boss_man",
  "super_boss_man",
  "enterprise_boss_man",
];

/** All paid plans — derived from {@link SUBSCRIPTION_TIER_CONFIG}. */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = PAID_TIER_IDS.map(
  (id) => tierConfigToPlan(SUBSCRIPTION_TIER_CONFIG[id]),
);

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

export function getTierConfig(tierId: SubscriptionTierId): SubscriptionTierConfig | null {
  if (tierId === "locked") return null;
  return SUBSCRIPTION_TIER_CONFIG[tierId] ?? null;
}

export function paidTierConfigs(): SubscriptionTierConfig[] {
  return PAID_TIER_IDS.map((id) => SUBSCRIPTION_TIER_CONFIG[id]);
}

/** Plans visible on RevenueCat paywall / onboarding plan picker. */
export function plansForPaywall(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter((p) => p.showOnPaywall !== false);
}

/** Plans visible on Settings → Subscription screen (always includes all configured tiers). */
export function plansForSubscriptionScreen(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter((p) => p.showOnSubscriptionScreen !== false);
}

export function isEmployeeEligibleTier(tier: SubscriptionTierId): boolean {
  const config = getTierConfig(tier);
  return config?.employeeEligible === true;
}

export function resolveTierFromEntitlementKey(
  entitlementKey: string,
): PaidSubscriptionTierId | null {
  const normalized = entitlementKey.trim();
  if (!normalized) return null;

  for (const id of PAID_TIER_IDS) {
    const config = SUBSCRIPTION_TIER_CONFIG[id];
    if (config.entitlementKeys.some((key) => key === normalized || key.toLowerCase() === normalized.toLowerCase())) {
      return id;
    }
  }
  for (const legacyId of LEGACY_ENTITLEMENT_IDS) {
    if (legacyId !== normalized) continue;
    const mapped =
      legacyId === "ideal_starter"
        ? "side_hustle"
        : legacyId === "ideal_pro" || legacyId === "pro"
          ? "boss_man"
          : legacyId === "ideal_boss"
            ? "super_boss_man"
            : null;
    if (mapped) return mapped;
  }
  return resolveTierFromProductId(normalized);
}

function normalizeProductId(raw: string): string {
  return raw.trim();
}

function productIdsMatch(configProductId: string, candidate: string): boolean {
  const a = normalizeProductId(configProductId);
  const b = normalizeProductId(candidate);
  if (!a || !b) return false;
  return a === b || a.toLowerCase() === b.toLowerCase();
}

export function resolveTierFromProductId(productId: string): PaidSubscriptionTierId | null {
  const normalized = normalizeProductId(productId);
  if (!normalized) return null;
  let best: PaidSubscriptionTierId | null = null;
  let bestRank = -1;
  for (const id of PAID_TIER_IDS) {
    const config = SUBSCRIPTION_TIER_CONFIG[id];
    if (config.productIds.some((pid) => productIdsMatch(pid, normalized))) {
      if (config.rank > bestRank) {
        bestRank = config.rank;
        best = id;
      }
    }
  }
  return best;
}

export function highestTierFromKeys(input: {
  entitlementKeys?: Iterable<string>;
  productIds?: Iterable<string>;
}): SubscriptionTierId | null {
  let best: SubscriptionTierId | null = null;
  let bestRank = -1;

  const consider = (tier: SubscriptionTierId | null) => {
    if (!tier || tier === "locked") return;
    const rank = tierRank(tier);
    if (rank > bestRank) {
      bestRank = rank;
      best = tier;
    }
  };

  if (input.entitlementKeys) {
    for (const key of input.entitlementKeys) {
      consider(resolveTierFromEntitlementKey(key));
    }
  }

  if (input.productIds) {
    for (const productId of input.productIds) {
      consider(resolveTierFromProductId(productId));
    }
  }

  return best ? normalizeSubscriptionTierId(best) : null;
}

export type TierDebugSnapshot = {
  productId: string | null;
  entitlementsActive: Record<string, boolean>;
  resolvedTier: SubscriptionTierId | null;
  storedTier: SubscriptionTierId;
  employeeEligible: boolean;
};

/** Dev diagnostic — prefix [TIER DEBUG]. */
export function logTierDebug(snapshot: TierDebugSnapshot): void {
  if (!__DEV__) return;
  console.log("[TIER DEBUG]", {
    productId: snapshot.productId,
    "entitlements.active": snapshot.entitlementsActive,
    resolvedTier: snapshot.resolvedTier,
    storedTier: snapshot.storedTier,
    employeeEligible: snapshot.employeeEligible,
  });
}

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
  const config = getTierConfig(id);
  if (config) return config.rank;
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
