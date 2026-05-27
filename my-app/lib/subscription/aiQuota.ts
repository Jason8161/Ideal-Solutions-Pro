import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadAiUsage } from "@/lib/employeeAi/usageStorage";
import {
  checkDailyAiLimit,
  loadDailyUsage,
  type DailyLimitCheck,
  type DailyUsageSnapshot,
} from "@/lib/subscription/dailyUsage";
import type { SubscriptionTierId } from "@/lib/subscription/tiers";

const ADDON_CREDITS_KEY = "ideal_ai_addon_credits_v1";

type AddonCreditsRecord = {
  remaining: number;
  lifetimePurchased: number;
};

function emptyAddonCredits(): AddonCreditsRecord {
  return { remaining: 0, lifetimePurchased: 0 };
}

async function readAddonCredits(): Promise<AddonCreditsRecord> {
  try {
    const raw = await AsyncStorage.getItem(ADDON_CREDITS_KEY);
    if (!raw) return emptyAddonCredits();
    const parsed = JSON.parse(raw) as Partial<AddonCreditsRecord>;
    return {
      remaining: Math.max(0, parsed.remaining ?? 0),
      lifetimePurchased: Math.max(0, parsed.lifetimePurchased ?? 0),
    };
  } catch {
    return emptyAddonCredits();
  }
}

async function writeAddonCredits(record: AddonCreditsRecord): Promise<void> {
  await AsyncStorage.setItem(ADDON_CREDITS_KEY, JSON.stringify(record));
}

/** Add purchased credits to the local add-on bank (after a successful store purchase). */
export async function addAddonCredits(amount: number): Promise<number> {
  const delta = Math.max(0, Math.round(amount));
  if (delta === 0) return 0;
  const record = await readAddonCredits();
  const next: AddonCreditsRecord = {
    remaining: record.remaining + delta,
    lifetimePurchased: record.lifetimePurchased + delta,
  };
  await writeAddonCredits(next);
  return next.remaining;
}

/** Consume one add-on credit when plan daily limit is exhausted. */
export async function consumeAddonCreditIfAvailable(): Promise<boolean> {
  const record = await readAddonCredits();
  if (record.remaining <= 0) return false;
  await writeAddonCredits({ ...record, remaining: record.remaining - 1 });
  return true;
}

export async function getAddonCreditsRemaining(): Promise<number> {
  const record = await readAddonCredits();
  return record.remaining;
}

export type AiQuotaSnapshot = {
  dailyUsage: DailyUsageSnapshot;
  dailyCheck: DailyLimitCheck;
  ownerMonthlyQuestions: number;
  addonCreditsRemaining: number;
  addonCreditsLifetimePurchased: number;
};

/** Usage summary for Settings → AI add-ons and future quota UI. */
export async function loadAiQuotaSnapshot(tier: SubscriptionTierId): Promise<AiQuotaSnapshot> {
  const [dailyUsage, ownerUsage, addonCredits] = await Promise.all([
    loadDailyUsage(),
    loadAiUsage("owner"),
    readAddonCredits(),
  ]);

  return {
    dailyUsage,
    dailyCheck: checkDailyAiLimit(tier, dailyUsage),
    ownerMonthlyQuestions: ownerUsage.monthlyQuestions,
    addonCreditsRemaining: addonCredits.remaining,
    addonCreditsLifetimePurchased: addonCredits.lifetimePurchased,
  };
}
