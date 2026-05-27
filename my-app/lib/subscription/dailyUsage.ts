import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  dailyAiLimitForTier,
  dailyImageUploadLimitForTier,
  type SubscriptionTierId,
} from "@/lib/subscription/tiers";

const STORAGE_KEY = "ideal_subscription_daily_usage_v1";

export type DailyUsageKind = "ai_questions" | "image_uploads";

export type DailyUsageSnapshot = {
  dayKey: string;
  aiQuestions: number;
  imageUploads: number;
};

type StoredUsage = DailyUsageSnapshot;

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function emptyRecord(): StoredUsage {
  const day = todayKey();
  return { dayKey: day, aiQuestions: 0, imageUploads: 0 };
}

function normalizeRecord(raw: Partial<StoredUsage> | null): StoredUsage {
  const base = emptyRecord();
  if (!raw) return base;
  const day = todayKey();
  return {
    dayKey: day,
    aiQuestions: raw.dayKey === day ? (raw.aiQuestions ?? 0) : 0,
    imageUploads: raw.dayKey === day ? (raw.imageUploads ?? 0) : 0,
  };
}

async function readRecord(): Promise<StoredUsage> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyRecord();
    return normalizeRecord(JSON.parse(raw) as Partial<StoredUsage>);
  } catch {
    return emptyRecord();
  }
}

async function writeRecord(record: StoredUsage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export async function loadDailyUsage(): Promise<DailyUsageSnapshot> {
  return readRecord();
}

export async function recordDailyAiQuestion(): Promise<DailyUsageSnapshot> {
  const record = await readRecord();
  const next = { ...record, aiQuestions: record.aiQuestions + 1 };
  await writeRecord(next);
  return next;
}

export async function recordDailyImageUpload(count = 1): Promise<DailyUsageSnapshot> {
  const record = await readRecord();
  const next = { ...record, imageUploads: record.imageUploads + count };
  await writeRecord(next);
  return next;
}

export async function resetDailyUsage(): Promise<void> {
  await writeRecord(emptyRecord());
}

export type DailyLimitCheck = {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
};

export function checkDailyAiLimit(
  tier: SubscriptionTierId,
  usage: DailyUsageSnapshot,
): DailyLimitCheck {
  const limit = dailyAiLimitForTier(tier);
  const used = usage.aiQuestions;
  if (limit === null) {
    return { allowed: true, used, limit: null, remaining: null };
  }
  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export function checkDailyImageUploadLimit(
  tier: SubscriptionTierId,
  usage: DailyUsageSnapshot,
): DailyLimitCheck {
  const limit = dailyImageUploadLimitForTier(tier);
  const used = usage.imageUploads;
  if (limit === null) {
    return { allowed: true, used, limit: null, remaining: null };
  }
  if (limit === 0) {
    return { allowed: false, used, limit: 0, remaining: 0 };
  }
  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}
