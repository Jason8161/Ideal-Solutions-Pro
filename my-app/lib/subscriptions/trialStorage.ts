import AsyncStorage from "@react-native-async-storage/async-storage";

import { getDeviceInstallId } from "./deviceId";
import {
  checkTrialEligibilityRemote,
  markTrialStartedRemote,
  recordTrialAiUsageRemote,
} from "./supabaseTrial";
import {
  computeTrialState,
  type ProTrialRecord,
  type ProTrialState,
  isValidTrialInterestTier,
} from "./trialPolicy";
import { normalizeSubscriptionTierId, type SubscriptionTierId } from "./tiers";

const STORAGE_KEY = "ideal_pro_trial_v2";

export type { ProTrialRecord, ProTrialState };

export async function loadProTrialRecord(): Promise<ProTrialRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProTrialRecord;
    if (!parsed.trialStartDate) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveProTrialRecord(record: ProTrialRecord): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export async function getProTrialState(
  hasPaidSubscription = false,
  now = new Date(),
): Promise<ProTrialState> {
  const record = await loadProTrialRecord();
  return computeTrialState(record, now, hasPaidSubscription);
}

export type StartTrialInput = {
  interestTier: SubscriptionTierId;
  userId: string;
  email?: string;
  appleId?: string;
  googleId?: string;
};

export type StartTrialResult =
  | { ok: true; state: ProTrialState }
  | { ok: false; reason: "invalid_tier" | "already_used" | "device_used" | "account_used" | "remote_error"; message: string };

export async function startProTrial(input: StartTrialInput): Promise<StartTrialResult> {
  const tier = normalizeSubscriptionTierId(input.interestTier);
  if (!isValidTrialInterestTier(tier)) {
    return { ok: false, reason: "invalid_tier", message: "Choose a paid plan for your trial." };
  }

  const existing = await loadProTrialRecord();
  if (existing?.trialUsed) {
    return { ok: false, reason: "already_used", message: "This device already used the free trial." };
  }

  const deviceId = await getDeviceInstallId();
  const eligibility = await checkTrialEligibilityRemote({
    userId: input.userId,
    deviceId,
    email: input.email,
    appleId: input.appleId,
    googleId: input.googleId,
  });

  if (!eligibility.ok) {
    if (eligibility.reason === "account_used") {
      return { ok: false, reason: "account_used", message: "This account already used the free trial." };
    }
    if (eligibility.reason === "device_used") {
      return { ok: false, reason: "device_used", message: "This device already used the free trial." };
    }
    return { ok: false, reason: "remote_error", message: eligibility.message };
  }

  const nowIso = new Date().toISOString();
  const record: ProTrialRecord = {
    interestTier: tier,
    trialStartDate: nowIso,
    trialAcceptedAt: nowIso,
    aiRequestsUsed: 0,
    trialUsed: false,
    userId: input.userId,
    deviceId,
    email: input.email,
    appleId: input.appleId,
    googleId: input.googleId,
  };

  await saveProTrialRecord(record);
  await markTrialStartedRemote(record);

  return { ok: true, state: computeTrialState(record, new Date(), false) };
}

export async function recordProTrialAiRequest(): Promise<ProTrialState> {
  const record = await loadProTrialRecord();
  if (!record) {
    return computeTrialState(null, new Date(), false);
  }
  const nextUsed = (record.aiRequestsUsed ?? 0) + 1;
  const next: ProTrialRecord = {
    ...record,
    aiRequestsUsed: nextUsed,
    trialUsed: nextUsed >= 5,
  };
  await saveProTrialRecord(next);
  void recordTrialAiUsageRemote({
    userId: record.userId,
    deviceId: record.deviceId,
    aiRequestsUsed: nextUsed,
    trialUsed: next.trialUsed,
  });
  return computeTrialState(next, new Date(), false);
}

/** __DEV__ / QA */
export async function clearProTrialRecord(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Back-compat shims for legacy helper trial imports */
export type HelperTrialState = ProTrialState;
export const HELPER_TRIAL_DAYS = 7;

export async function getHelperTrialState(hasPaid = false): Promise<HelperTrialState> {
  return getProTrialState(hasPaid);
}

export async function recordHelperTrialAccepted(): Promise<HelperTrialState> {
  return getProTrialState(false);
}

export async function recordHelperTrialStartIfNeeded(): Promise<HelperTrialState> {
  return getProTrialState(false);
}
