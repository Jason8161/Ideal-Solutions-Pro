import AsyncStorage from "@react-native-async-storage/async-storage";

import { syncHomeSubscriptionTier } from "@/lib/homeBoot";
import { clearSubscriptionDevOverride } from "@/lib/subscriptionDevOverride";
import { clearProTrialRecord } from "@/lib/subscriptions/trialStorage";
import { updateProfileSubscriptionTier } from "@/lib/profileStorage";

const PROFILE_STORAGE_KEY = "ideal_solutions_company_profile_v1";

/** Clears locally cached subscription tier / trial state (does not touch RevenueCat). */
export async function clearLocalSubscriptionCache(): Promise<void> {
  await Promise.all([clearProTrialRecord(), clearSubscriptionDevOverride(), updateProfileSubscriptionTier("locked")]);
  await syncHomeSubscriptionTier("locked", { persistProfile: false });
}

/**
 * Dev helper — wipe local tier cache, restore store purchases, then refresh customer info.
 * Caller should invoke SubscriptionContext.refresh() after this returns.
 */
export async function resetSubscriptionCacheAndRestore(): Promise<{
  restoreOk: boolean;
  restoreMessage?: string;
}> {
  await clearLocalSubscriptionCache();

  const { configurePurchases, restorePurchases } = await import("@/lib/revenuecat");
  await configurePurchases();
  const restore = await restorePurchases();
  return {
    restoreOk: restore.ok,
    restoreMessage: restore.ok ? undefined : restore.message,
  };
}

/** Removes only the cached profile subscription tier field (keeps other profile data). */
export async function clearProfileSubscriptionTierField(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.subscriptionTier = "locked";
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* non-fatal */
  }
}
