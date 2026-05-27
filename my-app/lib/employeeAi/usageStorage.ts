import AsyncStorage from "@react-native-async-storage/async-storage";

import { companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";
import { normalizeSubscriptionTierId } from "@/lib/subscriptionPlans";
import {
  consumeAddonCreditIfAvailable,
  recordMonthlyAiRequest,
} from "@/lib/subscription/aiQuotaBridge";
import { recordProTrialAiRequest } from "@/lib/subscription/trialStorage";

import { limitsForOwnerTier } from "./limits";

import type { AiUsageActor, AiUsageSnapshot } from "./types";

const OWNER_USAGE_KEY = "ideal_ai_usage_owner_v1";
const EMPLOYEE_USAGE_PREFIX = "ideal_ai_usage_employee_v1";

type StoredUsage = {
  dayKey: string;
  monthKey: string;
  dailyQuestions: number;
  monthlyQuestions: number;
  lifetimeQuestions: number;
  tokensIn?: number;
  tokensOut?: number;
};

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

function emptyRecord(): StoredUsage {
  const day = todayKey();
  const month = monthKey();
  return {
    dayKey: day,
    monthKey: month,
    dailyQuestions: 0,
    monthlyQuestions: 0,
    lifetimeQuestions: 0,
  };
}

function normalizeRecord(raw: Partial<StoredUsage> | null): StoredUsage {
  const base = emptyRecord();
  if (!raw) return base;
  const day = todayKey();
  const month = monthKey();
  let daily = raw.dailyQuestions ?? 0;
  let monthly = raw.monthlyQuestions ?? 0;
  if (raw.dayKey !== day) daily = 0;
  if (raw.monthKey !== month) monthly = 0;
  return {
    dayKey: day,
    monthKey: month,
    dailyQuestions: daily,
    monthlyQuestions: monthly,
    lifetimeQuestions: raw.lifetimeQuestions ?? 0,
    tokensIn: raw.tokensIn,
    tokensOut: raw.tokensOut,
  };
}

function storageKey(actor: AiUsageActor, employeeId?: string): string {
  if (actor === "owner") return OWNER_USAGE_KEY;
  const suffix = employeeId?.trim() || "default";
  return `${EMPLOYEE_USAGE_PREFIX}_${suffix}`;
}

async function readRecord(actor: AiUsageActor, employeeId?: string): Promise<StoredUsage> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(actor, employeeId));
    if (!raw) return emptyRecord();
    return normalizeRecord(JSON.parse(raw) as Partial<StoredUsage>);
  } catch {
    return emptyRecord();
  }
}

async function writeRecord(
  actor: AiUsageActor,
  record: StoredUsage,
  employeeId?: string,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(actor, employeeId), JSON.stringify(record));
}

export async function loadAiUsage(
  actor: AiUsageActor,
  employeeId?: string,
): Promise<AiUsageSnapshot> {
  const record = await readRecord(actor, employeeId);
  return {
    actor,
    dayKey: record.dayKey,
    monthKey: record.monthKey,
    dailyQuestions: record.dailyQuestions,
    monthlyQuestions: record.monthlyQuestions,
    lifetimeQuestions: record.lifetimeQuestions,
    tokensIn: record.tokensIn,
    tokensOut: record.tokensOut,
  };
}

export type RecordAiQuestionOptions = {
  actor: AiUsageActor;
  employeeId?: string;
  /** Future: increment token counters from API response */
  tokensIn?: number;
  tokensOut?: number;
};

/** Call after a successful AI question (user message sent). */
export async function recordAiQuestion(options: RecordAiQuestionOptions): Promise<AiUsageSnapshot> {
  const record = await readRecord(options.actor, options.employeeId);
  const next: StoredUsage = {
    ...record,
    dailyQuestions: record.dailyQuestions + 1,
    monthlyQuestions: record.monthlyQuestions + 1,
    lifetimeQuestions: record.lifetimeQuestions + 1,
    tokensIn: (record.tokensIn ?? 0) + (options.tokensIn ?? 0),
    tokensOut: (record.tokensOut ?? 0) + (options.tokensOut ?? 0),
  };
  await writeRecord(options.actor, next, options.employeeId);
  if (options.actor === "owner") {
    const profile = companyProfileFromPartial(await loadCompanyProfile());
    const limits = limitsForOwnerTier(normalizeSubscriptionTierId(profile.subscriptionTier));
    const atDaily =
      limits.dailyQuestions !== null && record.dailyQuestions >= limits.dailyQuestions;
    const atMonthly =
      limits.monthlyQuestions !== null && record.monthlyQuestions >= limits.monthlyQuestions;
    if (atDaily || atMonthly) {
      await consumeAddonCreditIfAvailable();
    }
    await recordMonthlyAiRequest();
    await recordProTrialAiRequest();
  }
  return loadAiUsage(options.actor, options.employeeId);
}

/** __DEV__ / QA — reset counters for the actor. */
export async function resetAiUsage(actor: AiUsageActor, employeeId?: string): Promise<void> {
  await writeRecord(actor, emptyRecord(), employeeId);
}
