import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AI_ADDON_PACKS,
  TRIAL_AI_REQUESTS_TOTAL,
  monthlyAiLimitForTier,
  type AiAddonPackId,
  type SubscriptionTierId,
} from "./tiers";
import type { ProTrialState } from "./trialPolicy";

const MONTHLY_USAGE_KEY = "ideal_subscription_monthly_ai_v1";
const ADDON_USAGE_KEY = "ideal_subscription_ai_addons_v1";

export const AI_WARN_UTILIZATION = 0.75;

export type MonthlyAiUsageSnapshot = {
  monthKey: string;
  requestsUsed: number;
  /** Billing-period reset (1st of month until RevenueCat period sync TODO) */
  resetDate: string;
};

export type AiAddonUsageSnapshot = {
  packId: AiAddonPackId;
  used: number;
  remaining: number;
  limit: number;
};

export type AiQuotaCheck = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  utilization: number;
  nearingLimit: boolean;
  atLimit: boolean;
  resetDate: string;
  source: "trial" | "subscription" | "addon" | "none";
};

function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

function monthResetDate(d = new Date()): string {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return next.toISOString().slice(0, 10);
}

function emptyMonthly(): MonthlyAiUsageSnapshot {
  const now = new Date();
  return {
    monthKey: monthKey(now),
    requestsUsed: 0,
    resetDate: monthResetDate(now),
  };
}

function normalizeMonthly(raw: Partial<MonthlyAiUsageSnapshot> | null): MonthlyAiUsageSnapshot {
  const base = emptyMonthly();
  if (!raw) return base;
  const current = monthKey();
  if (raw.monthKey !== current) {
    return { ...base, resetDate: monthResetDate() };
  }
  return {
    monthKey: current,
    requestsUsed: raw.requestsUsed ?? 0,
    resetDate: raw.resetDate ?? base.resetDate,
  };
}

export async function loadMonthlyAiUsage(): Promise<MonthlyAiUsageSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(MONTHLY_USAGE_KEY);
    if (!raw) return emptyMonthly();
    return normalizeMonthly(JSON.parse(raw) as Partial<MonthlyAiUsageSnapshot>);
  } catch {
    return emptyMonthly();
  }
}

export async function recordMonthlyAiRequest(): Promise<MonthlyAiUsageSnapshot> {
  const record = await loadMonthlyAiUsage();
  const next = { ...record, requestsUsed: record.requestsUsed + 1 };
  await AsyncStorage.setItem(MONTHLY_USAGE_KEY, JSON.stringify(next));
  return next;
}

export async function resetMonthlyAiUsage(): Promise<void> {
  await AsyncStorage.setItem(MONTHLY_USAGE_KEY, JSON.stringify(emptyMonthly()));
}

type AddonBalances = Partial<Record<AiAddonPackId, number>>;

async function loadAddonBalances(): Promise<AddonBalances> {
  try {
    const raw = await AsyncStorage.getItem(ADDON_USAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AddonBalances;
  } catch {
    return {};
  }
}

async function saveAddonBalances(balances: AddonBalances): Promise<void> {
  await AsyncStorage.setItem(ADDON_USAGE_KEY, JSON.stringify(balances));
}

/** Credits remaining from purchased add-on packs this month (sum of entitlements minus used). */
export async function getActiveAddonCredits(
  activePackIds: AiAddonPackId[],
): Promise<number> {
  const balances = await loadAddonBalances();
  let total = 0;
  for (const id of activePackIds) {
    const pack = AI_ADDON_PACKS.find((p) => p.id === id);
    if (!pack) continue;
    const used = balances[id] ?? 0;
    total += Math.max(0, pack.monthlyCredits - used);
  }
  return total;
}

export function buildQuotaCheck(
  used: number,
  limit: number,
  resetDate: string,
  source: AiQuotaCheck["source"],
): AiQuotaCheck {
  const remaining = Math.max(0, limit - used);
  const utilization = limit > 0 ? Math.min(1, used / limit) : 1;
  const atLimit = limit <= 0 || used >= limit;
  const nearingLimit = !atLimit && utilization >= AI_WARN_UTILIZATION;
  return {
    allowed: !atLimit,
    used,
    limit,
    remaining,
    utilization,
    nearingLimit,
    atLimit,
    resetDate,
    source,
  };
}

export function checkAiQuota(input: {
  tier: SubscriptionTierId;
  trial: ProTrialState;
  monthlyUsage: MonthlyAiUsageSnapshot;
  addonCreditsRemaining?: number;
  hasPaidSubscription: boolean;
}): AiQuotaCheck {
  const { tier, trial, monthlyUsage, hasPaidSubscription } = input;
  const addonCredits = input.addonCreditsRemaining ?? 0;

  if (!hasPaidSubscription && trial.isActive) {
    return buildQuotaCheck(
      trial.aiRequestsUsed,
      TRIAL_AI_REQUESTS_TOTAL,
      trial.trialStartDate?.toISOString().slice(0, 10) ?? "",
      "trial",
    );
  }

  if (!hasPaidSubscription && trial.isLocked) {
    return buildQuotaCheck(monthlyUsage.requestsUsed, 0, monthlyUsage.resetDate, "none");
  }

  const baseLimit = monthlyAiLimitForTier(tier);
  const totalLimit = baseLimit + addonCredits;

  if (addonCredits > 0 && monthlyUsage.requestsUsed >= baseLimit) {
    return buildQuotaCheck(
      monthlyUsage.requestsUsed - baseLimit,
      addonCredits,
      monthlyUsage.resetDate,
      "addon",
    );
  }

  return buildQuotaCheck(
    monthlyUsage.requestsUsed,
    totalLimit,
    monthlyUsage.resetDate,
    "subscription",
  );
}

/** Decrement one add-on credit when base monthly cap is exceeded. */
export async function consumeAddonCreditIfAvailable(
  activePackIds: AiAddonPackId[] = AI_ADDON_PACKS.map((p) => p.id),
): Promise<boolean> {
  const balances = await loadAddonBalances();
  for (const id of activePackIds) {
    const pack = AI_ADDON_PACKS.find((p) => p.id === id);
    if (!pack) continue;
    const used = balances[id] ?? 0;
    if (used < pack.monthlyCredits) {
      balances[id] = used + 1;
      await saveAddonBalances(balances);
      return true;
    }
  }
  return false;
}

export async function recordAiRequestForQuota(input: {
  tier: SubscriptionTierId;
  trial: ProTrialState;
  hasPaidSubscription: boolean;
}): Promise<{ monthly: MonthlyAiUsageSnapshot; trialAiUsed?: number }> {
  if (!input.hasPaidSubscription && input.trial.isActive) {
    return { monthly: await loadMonthlyAiUsage() };
  }
  const monthly = await recordMonthlyAiRequest();
  return { monthly };
}
