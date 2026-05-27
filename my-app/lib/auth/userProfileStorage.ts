import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeSubscriptionTierId, type SubscriptionTierId } from "@/lib/subscriptionPlans";

import type { UserProfile } from "./types";

const PROFILE_KEY = "ideal_user_profile_v1";

export function defaultUserProfile(partial?: Partial<UserProfile>): UserProfile {
  return {
    userId: partial?.userId ?? "",
    email: partial?.email ?? "",
    fullName: partial?.fullName ?? "",
    companyName: partial?.companyName ?? "",
    selectedTrialPlan: partial?.selectedTrialPlan ?? null,
    subscriptionTier: normalizeSubscriptionTierId(partial?.subscriptionTier),
    trialStartDate: partial?.trialStartDate ?? null,
    aiRequestsUsed: partial?.aiRequestsUsed ?? 0,
    storageUsed: partial?.storageUsed ?? 0,
  };
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return defaultUserProfile(parsed);
  } catch {
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearUserProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
}

export function mergeProfileTier(
  profile: UserProfile,
  tier: SubscriptionTierId,
  selectedTrial?: SubscriptionTierId | null,
): UserProfile {
  return {
    ...profile,
    subscriptionTier: tier,
    selectedTrialPlan: selectedTrial ?? profile.selectedTrialPlan,
  };
}
