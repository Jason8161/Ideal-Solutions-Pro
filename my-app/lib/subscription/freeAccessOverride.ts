/**
 * Admin-granted complimentary subscription tier (Supabase).
 * SQL: supabase/migrations/002_free_access_overrides.sql
 */

import {
  isPaidSubscriptionTier,
  normalizeSubscriptionTierId,
  type SubscriptionTierId,
} from "@/lib/subscriptions/tiers";
import { isSupabaseConfigured, supabaseRpc } from "@/lib/supabase/client";

/** Tier values stored in `free_access_overrides.free_access_tier`. */
export type FreeAccessTierId =
  | "side_hustle"
  | "boss_man"
  | "super_boss"
  | "super_boss_man"
  | "enterprise_boss"
  | "enterprise_boss_man";

export type FreeAccessDurationPreset = "30d" | "90d" | "1y" | "lifetime" | "custom";

export type FreeAccessOverrideRow = {
  user_id: string;
  email: string | null;
  username: string | null;
  free_access_enabled: boolean;
  free_access_tier: FreeAccessTierId;
  free_access_start_date: string;
  free_access_expiration_date: string | null;
  free_access_reason: string | null;
  granted_by_admin_user_id: string;
  is_active?: boolean;
};

export type ResolvedFreeAccessOverride = {
  userId: string;
  email: string | null;
  username: string | null;
  enabled: boolean;
  tier: SubscriptionTierId;
  startDate: Date;
  expirationDate: Date | null;
  reason: string | null;
  grantedByAdminUserId: string;
  isActive: boolean;
  accessTypeLabel: "Free Admin Access";
};

const TIER_ALIASES: Record<string, SubscriptionTierId> = {
  side_hustle: "side_hustle",
  boss_man: "boss_man",
  super_boss: "super_boss_man",
  super_boss_man: "super_boss_man",
  enterprise_boss: "enterprise_boss_man",
  enterprise_boss_man: "enterprise_boss_man",
};

export const FREE_ACCESS_TIER_OPTIONS: { id: FreeAccessTierId; label: string }[] = [
  { id: "side_hustle", label: "Side Hustle / DIY" },
  { id: "boss_man", label: "Boss Man" },
  { id: "super_boss", label: "Super Boss Man" },
  { id: "enterprise_boss", label: "Enterprise Boss Man" },
];

export const FREE_ACCESS_DURATION_OPTIONS: { id: FreeAccessDurationPreset; label: string }[] = [
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "1y", label: "1 year" },
  { id: "lifetime", label: "Lifetime" },
  { id: "custom", label: "Custom end date" },
];

export function normalizeFreeAccessTierId(raw: string | null | undefined): SubscriptionTierId | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase();
  const mapped = TIER_ALIASES[key];
  if (mapped) return mapped;
  return normalizeSubscriptionTierId(raw);
}

export function expirationDateForPreset(
  preset: FreeAccessDurationPreset,
  customDate?: Date | null,
  start = new Date(),
): Date | null {
  if (preset === "lifetime") return null;
  if (preset === "custom") {
    return customDate ?? null;
  }
  const end = new Date(start);
  if (preset === "30d") end.setDate(end.getDate() + 30);
  else if (preset === "90d") end.setDate(end.getDate() + 90);
  else if (preset === "1y") end.setFullYear(end.getFullYear() + 1);
  return end;
}

export function isFreeAccessOverrideActive(
  row: Pick<FreeAccessOverrideRow, "free_access_enabled" | "free_access_expiration_date"> & {
    is_active?: boolean;
  },
  now = new Date(),
): boolean {
  if (row.is_active === false) return false;
  if (!row.free_access_enabled) return false;
  if (!row.free_access_expiration_date) return true;
  const exp = new Date(row.free_access_expiration_date);
  return exp.getTime() > now.getTime();
}

export function mapFreeAccessRow(row: FreeAccessOverrideRow): ResolvedFreeAccessOverride {
  const tier = normalizeFreeAccessTierId(row.free_access_tier) ?? "locked";
  const active = isFreeAccessOverrideActive(row);
  return {
    userId: row.user_id,
    email: row.email,
    username: row.username,
    enabled: row.free_access_enabled,
    tier: active && isPaidSubscriptionTier(tier) ? tier : "locked",
    startDate: new Date(row.free_access_start_date),
    expirationDate: row.free_access_expiration_date ? new Date(row.free_access_expiration_date) : null,
    reason: row.free_access_reason,
    grantedByAdminUserId: row.granted_by_admin_user_id,
    isActive: active && isPaidSubscriptionTier(tier),
    accessTypeLabel: "Free Admin Access",
  };
}

export function formatFreeAccessExpiration(expiration: Date | null): string {
  if (!expiration) return "Lifetime";
  return expiration.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Fetch the signed-in user's override row (active or expired). */
export async function fetchFreeAccessOverrideForUser(
  userId: string,
): Promise<ResolvedFreeAccessOverride | null> {
  if (!userId.trim() || !isSupabaseConfigured()) return null;
  try {
    const rows = await supabaseRpc<FreeAccessOverrideRow[]>("get_active_free_access_override", {
      p_user_id: userId.trim(),
    });
    const row = Array.isArray(rows) ? rows[0] : (rows as unknown as FreeAccessOverrideRow);
    if (!row?.user_id) return null;
    return mapFreeAccessRow(row);
  } catch {
    return null;
  }
}

export async function searchFreeAccessOverrides(
  adminUserId: string,
  query: string,
  limit = 25,
): Promise<FreeAccessOverrideRow[]> {
  const rows = await supabaseRpc<FreeAccessOverrideRow[]>("search_free_access_overrides", {
    p_admin_user_id: adminUserId,
    p_query: query,
    p_limit: limit,
  });
  return Array.isArray(rows) ? rows : [];
}

export type UpsertFreeAccessInput = {
  adminUserId: string;
  userId: string;
  email?: string;
  username?: string;
  enabled: boolean;
  tier: FreeAccessTierId;
  startDate?: Date;
  expirationDate?: Date | null;
  reason?: string;
};

export async function upsertFreeAccessOverride(input: UpsertFreeAccessInput): Promise<FreeAccessOverrideRow> {
  const row = await supabaseRpc<FreeAccessOverrideRow>("upsert_free_access_override", {
    p_admin_user_id: input.adminUserId,
    p_user_id: input.userId.trim(),
    p_email: input.email ?? "",
    p_username: input.username ?? "",
    p_free_access_enabled: input.enabled,
    p_free_access_tier: input.tier,
    p_free_access_start_date: (input.startDate ?? new Date()).toISOString(),
    p_free_access_expiration_date: input.expirationDate ? input.expirationDate.toISOString() : null,
    p_free_access_reason: input.reason ?? "",
  });
  return row;
}

/**
 * Effective tier from admin override when RevenueCat has no active paid entitlement.
 */
export function tierFromActiveFreeAccessOverride(
  override: ResolvedFreeAccessOverride | null,
): SubscriptionTierId | null {
  if (!override?.isActive) return null;
  return override.tier;
}
