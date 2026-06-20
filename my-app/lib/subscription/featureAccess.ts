import { Alert } from "react-native";

import type { Href } from "expo-router";

import { isBetaFullAccessEnabled, isBetaFullAccessFromBuild } from "@/lib/betaAccess";
import { isSubscriptionGatingDisabled, isSubscriptionGatingDisabledFromBuild } from "@/lib/subscriptionTesting";

import type { MaterialsSearchTile } from "@/lib/materialsSearchSuppliers";
import type { SupplyHousePresetId } from "@/lib/supplierPresets";
import {
  BOSSMAN_SUPPLY_HOUSE_PRESET_IDS,
  getSubscriptionPlan,
  isEmployeeEligibleTier,
  RETAIL_MATERIAL_SUPPLIER_IDS,
  tierMeetsMinimum,
  type SubscriptionTierId,
} from "@/lib/subscription/tiers";

export { isEmployeeEligibleTier };

export const SUBSCRIPTION_SETTINGS_HREF = "/settings/subscribe" as const;

/** Central feature keys for subscription gates. */
export type FeatureKey =
  | "ai_assistance"
  | "social_media"
  | "basic_job_folders"
  | "calendar"
  | "basic_estimating"
  | "estimate_image_uploads"
  | "material_search"
  | "material_search_retail_only"
  | "supply_houses"
  | "employees"
  | "service_calls"
  | "blueprints"
  | "large_files"
  | "accounting_billing"
  | "banking_payment"
  | "getting_paid"
  | "payment_integrations"
  | "advanced_ai"
  | "boss_man_hub"
  | "crew_company"
  | "saved_jobs"
  | "saved_estimates"
  | "exports"
  | "contractor_ai"
  | "material_list_parsing"
  | "business_tools"
  | "priority_ai";

/** @deprecated Use FeatureKey — kept for home menu / legacy imports. */
export type GatedFeature = FeatureKey;

export type HomeMenuTileKey =
  | "ai-assistance"
  | "job-folder"
  | "todo"
  | "calendar"
  | "getting-paid"
  | "social-media"
  | "employee-actions";

export type FeatureAccessContext = {
  /** @deprecated Use subscriptionLocked */
  helperTrialExpired?: boolean;
  /** Trial ended or AI cap hit without paid subscription */
  subscriptionLocked?: boolean;
};

function isFullAccessUnlocked(): boolean {
  return isSubscriptionGatingDisabled() || isBetaFullAccessEnabled();
}

const FEATURE_MIN_TIER: Record<FeatureKey, SubscriptionTierId> = {
  ai_assistance: "side_hustle",
  social_media: "side_hustle",
  basic_job_folders: "side_hustle",
  material_search: "side_hustle",
  material_search_retail_only: "side_hustle",
  basic_estimating: "side_hustle",
  estimate_image_uploads: "side_hustle",
  calendar: "side_hustle",
  saved_jobs: "side_hustle",
  exports: "side_hustle",
  employees: "super_boss_man",
  service_calls: "boss_man",
  accounting_billing: "boss_man",
  banking_payment: "boss_man",
  getting_paid: "boss_man",
  payment_integrations: "boss_man",
  supply_houses: "boss_man",
  boss_man_hub: "boss_man",
  crew_company: "super_boss_man",
  saved_estimates: "boss_man",
  contractor_ai: "boss_man",
  material_list_parsing: "boss_man",
  business_tools: "boss_man",
  advanced_ai: "super_boss_man",
  blueprints: "super_boss_man",
  large_files: "boss_man",
  priority_ai: "enterprise_boss_man",
};

const TIER_LABELS: Record<SubscriptionTierId, string> = {
  locked: "Subscribe",
  side_hustle: "Side Hustle / DIY",
  boss_man: "Boss Man",
  super_boss_man: "Super Boss Man",
  enterprise_boss_man: "Enterprise Boss Man",
};

function isSubscriptionLocked(ctx?: FeatureAccessContext): boolean {
  return ctx?.subscriptionLocked === true || ctx?.helperTrialExpired === true;
}

type FeatureUpgradeCopy = {
  alertTitle: string;
  blockedBody: string;
};

const FEATURE_UPGRADE_COPY: Record<FeatureKey, FeatureUpgradeCopy> = {
  ai_assistance: {
    alertTitle: "Ideal Solutions Pro AI",
    blockedBody:
      "You've hit your AI limit for this period. Upgrade your plan or add an AI pack under Settings.",
  },
  social_media: {
    alertTitle: "Social media",
    blockedBody: "Social shortcuts need an active plan.",
  },
  basic_job_folders: {
    alertTitle: "Job Folder",
    blockedBody: "Job folders unlock on Helper Mode and up.",
  },
  calendar: {
    alertTitle: "Calendar",
    blockedBody: "Calendar scheduling needs {plan} or higher.",
  },
  basic_estimating: {
    alertTitle: "Estimating",
    blockedBody: "Basic estimating needs {plan} or higher.",
  },
  estimate_image_uploads: {
    alertTitle: "Photo estimates",
    blockedBody: "Jobsite photo uploads for estimates need {plan} or higher.",
  },
  material_search: {
    alertTitle: "Material search",
    blockedBody: "Material search is on Helper and up — upgrade if your plan changed.",
  },
  material_search_retail_only: {
    alertTitle: "More suppliers",
    blockedBody:
      "Side Hustle / DIY is retail-only (Home Depot, Lowe's, Ace). Upgrade to Boss Man for Graybar, Rexel, City Electric, Grainger, and more.",
  },
  supply_houses: {
    alertTitle: "Supply houses",
    blockedBody: "Wholesale supply houses need {plan} or higher.",
  },
  employees: {
    alertTitle: "Employees & crew",
    blockedBody: "Crew tools and employee management need {plan}. Time to run like a boss.",
  },
  service_calls: {
    alertTitle: "Service calls",
    blockedBody: "Service call scheduling and tracking need {plan} or higher.",
  },
  blueprints: {
    alertTitle: "Blueprint uploads",
    blockedBody: "Blueprint uploads are on Super Bossman — for when the plans are as big as the job.",
  },
  large_files: {
    alertTitle: "Large files",
    blockedBody: "Large file uploads need {plan} or higher.",
  },
  accounting_billing: {
    alertTitle: "Accounting & billing",
    blockedBody: "Accounting and billing shortcuts need {plan} or higher.",
  },
  banking_payment: {
    alertTitle: "Banking & payments",
    blockedBody: "Banking and payment setup need {plan} or higher.",
  },
  getting_paid: {
    alertTitle: "Getting Paid",
    blockedBody:
      "Getting Paid (Cash App, Venmo, Square) needs {plan}. Upgrade so customers can pay you faster.",
  },
  payment_integrations: {
    alertTitle: "Payment apps",
    blockedBody: "Payment integrations need {plan} or higher.",
  },
  advanced_ai: {
    alertTitle: "Advanced AI",
    blockedBody: "Advanced jobsite AI is on Super Bossman.",
  },
  boss_man_hub: {
    alertTitle: "Bossman hub",
    blockedBody: "The full Job Folder command center needs {plan} or higher.",
  },
  crew_company: {
    alertTitle: "Crew & company",
    blockedBody: "Crew scheduling and company tools need {plan}.",
  },
  saved_jobs: {
    alertTitle: "Saved jobs",
    blockedBody: "Saving more jobs needs {plan} or higher.",
  },
  saved_estimates: {
    alertTitle: "Saved estimates",
    blockedBody: "Saved estimates need {plan} or higher.",
  },
  exports: {
    alertTitle: "Exports",
    blockedBody: "PDF and spreadsheet exports need {plan} or higher.",
  },
  contractor_ai: {
    alertTitle: "Contractor AI",
    blockedBody: "Contractor-grade AI needs {plan} or higher.",
  },
  material_list_parsing: {
    alertTitle: "Material list parsing",
    blockedBody: "AI material list parsing needs {plan} or higher.",
  },
  business_tools: {
    alertTitle: "Business tools",
    blockedBody: "Contractor business tools need {plan} or higher.",
  },
  priority_ai: {
    alertTitle: "Priority AI",
    blockedBody: "Priority AI needs {plan}.",
  },
};

export function getRequiredTier(feature: FeatureKey): SubscriptionTierId {
  return FEATURE_MIN_TIER[feature];
}

/** Next paid tier that unlocks this feature (for upgrade CTAs). */
export function getUpgradeTarget(
  current: SubscriptionTierId,
  feature: FeatureKey,
): SubscriptionTierId {
  const required = FEATURE_MIN_TIER[feature];
  if (tierMeetsMinimum(current, required)) {
    return current;
  }
  return required;
}

export function canAccessFeature(
  feature: FeatureKey,
  tier: SubscriptionTierId,
  ctx?: FeatureAccessContext,
): boolean {
  if (isFullAccessUnlocked()) return true;
  if (isSubscriptionLocked(ctx) || tier === "locked") {
    return false;
  }
  return tierMeetsMinimum(tier, FEATURE_MIN_TIER[feature]);
}

export const canUseFeature = canAccessFeature;
export const hasFeature = canAccessFeature;

function requiredPlanLabel(feature: FeatureKey): string {
  return TIER_LABELS[FEATURE_MIN_TIER[feature]];
}

export function featureGateMessage(
  feature: FeatureKey,
  tier: SubscriptionTierId,
  ctx?: FeatureAccessContext,
): string | null {
  if (isFullAccessUnlocked() || canAccessFeature(feature, tier, ctx)) return null;
  const plan = requiredPlanLabel(feature);
  const copy = FEATURE_UPGRADE_COPY[feature];
  if (isSubscriptionLocked(ctx) || tier === "locked") {
    return "Your 7-day trial ended or you've used all 5 trial AI requests. Subscribe to unlock premium features — your local data stays on this device.";
  }
  return copy.blockedBody.replace("{plan}", plan);
}

export function featureGateAlertTitle(feature: FeatureKey): string {
  return FEATURE_UPGRADE_COPY[feature].alertTitle;
}

export function getHomeTileGatedFeature(
  tileKey: HomeMenuTileKey,
  _tier: SubscriptionTierId,
): FeatureKey | null {
  switch (tileKey) {
    case "ai-assistance":
      return "ai_assistance";
    case "job-folder":
      return "basic_job_folders";
    case "todo":
      return "accounting_billing";
    case "calendar":
      return "calendar";
    case "getting-paid":
      return "getting_paid";
    case "social-media":
      return null;
    case "employee-actions":
      return "employees";
    default:
      return null;
  }
}

export function homeJobFolderHrefForTier(tier: SubscriptionTierId): Href {
  if (isFullAccessUnlocked()) return "/job-folder/boss-man" as Href;
  return (
    tierMeetsMinimum(tier, "boss_man")
      ? ("/job-folder/boss-man" as Href)
      : ("/job-folder/current-jobs" as Href)
  );
}

export function isBossmanTier(tier: SubscriptionTierId): boolean {
  if (isFullAccessUnlocked()) return true;
  return tierMeetsMinimum(tier, "boss_man");
}

/** @deprecated Use isBossmanTier */
export const isProTier = isBossmanTier;

export function isSuperBossmanTier(tier: SubscriptionTierId): boolean {
  if (isFullAccessUnlocked()) return true;
  return tierMeetsMinimum(tier, "super_boss_man");
}

/** @deprecated Use isSuperBossmanTier */
export const isBossTier = isSuperBossmanTier;

export function requireFeature(
  feature: FeatureKey,
  tier: SubscriptionTierId,
  ctx?: FeatureAccessContext,
): boolean {
  return canAccessFeature(feature, tier, ctx);
}

export function promptUpgradeForFeature(
  feature: FeatureKey,
  tier: SubscriptionTierId,
  onOpenSubscription: () => void,
  ctx?: FeatureAccessContext,
): boolean {
  if (isFullAccessUnlocked()) return true;
  const message = featureGateMessage(feature, tier, ctx);
  if (!message) return true;
  Alert.alert(featureGateAlertTitle(feature), message, [
    { text: "Not now", style: "cancel" },
    {
      text: "View plans",
      onPress: onOpenSubscription,
    },
  ]);
  return false;
}

export function promptUpgradeForHomeTile(
  tileKey: HomeMenuTileKey,
  tier: SubscriptionTierId,
  onOpenSubscription: () => void,
  onAllowed: () => void,
  ctx?: FeatureAccessContext,
): void {
  const feature = getHomeTileGatedFeature(tileKey, tier);
  if (feature === null) {
    onAllowed();
    return;
  }
  if (promptUpgradeForFeature(feature, tier, onOpenSubscription, ctx)) {
    onAllowed();
  }
}

export function promptUpgradeForHomeTileWhenReady(
  testFlightDetectionDone: boolean,
  tileKey: HomeMenuTileKey,
  tier: SubscriptionTierId,
  onOpenSubscription: () => void,
  onAllowed: () => void,
  ctx?: FeatureAccessContext,
): void {
  if (
    !testFlightDetectionDone &&
    !isBetaFullAccessFromBuild() &&
    !isSubscriptionGatingDisabledFromBuild()
  ) {
    onAllowed();
    return;
  }
  promptUpgradeForHomeTile(tileKey, tier, onOpenSubscription, onAllowed, ctx);
}

export const requirePro = isBossmanTier;
export const requireBoss = isSuperBossmanTier;

const RETAIL_SET = new Set<string>(RETAIL_MATERIAL_SUPPLIER_IDS);
const BOSSMAN_SUPPLY_SET = new Set<string>(BOSSMAN_SUPPLY_HOUSE_PRESET_IDS);

function tileSupplierId(tile: MaterialsSearchTile): string {
  return tile.kind === "app" ? tile.key : tile.presetId;
}

/** Filter materials-search tiles by subscription tier. */
export function filterMaterialsSearchTilesForTier(
  tiles: MaterialsSearchTile[],
  tier: SubscriptionTierId,
): MaterialsSearchTile[] {
  if (isFullAccessUnlocked()) return tiles;
  if (tierMeetsMinimum(tier, "boss_man")) {
    return tiles.filter((t) => {
      const id = tileSupplierId(t);
      if (t.kind === "app" && RETAIL_SET.has(id)) return true;
      if (t.kind === "app") return true;
      if (BOSSMAN_SUPPLY_SET.has(id)) return true;
      if (RETAIL_SET.has(id)) return true;
      return false;
    });
  }
  return tiles.filter((t) => RETAIL_SET.has(tileSupplierId(t)));
}

export function isSupplyHouseAllowedForTier(
  presetId: SupplyHousePresetId,
  tier: SubscriptionTierId,
): boolean {
  if (isFullAccessUnlocked()) return true;
  if (RETAIL_SET.has(presetId)) return true;
  if (!tierMeetsMinimum(tier, "boss_man")) return false;
  return BOSSMAN_SUPPLY_SET.has(presetId);
}
