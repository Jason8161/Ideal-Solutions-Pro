import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadCompanyProfile, type CompanyProfile } from "@/lib/profileStorage";

const DEV_UNLOCK_KEY = "ideal_solutions_developer_unlocked_v1";
const DEV_MENU_REVEALED_KEY = "ideal_solutions_dev_menu_revealed_v1";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmailFormat(value: string): boolean {
  const normalized = normalizeEmail(value);
  return normalized.length > 0 && EMAIL_PATTERN.test(normalized);
}

export function getConfiguredDeveloperEmail(): string {
  return normalizeEmail(process.env.EXPO_PUBLIC_DEVELOPER_EMAIL ?? "");
}

export function getConfiguredDeveloperUnlock(): string {
  return (process.env.EXPO_PUBLIC_DEVELOPER_UNLOCK ?? "").trim();
}

/** True when .env has a well-formed EXPO_PUBLIC_DEVELOPER_EMAIL. */
export function isDeveloperEmailConfigured(): boolean {
  return isValidEmailFormat(getConfiguredDeveloperEmail());
}

export function isDeveloperUnlockConfigured(): boolean {
  return getConfiguredDeveloperUnlock().length > 0;
}

/** Emails from the company profile that may match EXPO_PUBLIC_DEVELOPER_EMAIL. */
export function profileEmailCandidates(profile: Partial<CompanyProfile> | null): string[] {
  if (!profile) return [];
  const raw = profile as Record<string, unknown>;
  const values: unknown[] = [
    profile.supportEmail,
    raw.email,
    raw.ownerEmail,
    raw.companyEmail,
    raw.techSupportEmail,
  ];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = normalizeEmail(value);
    if (normalized) seen.add(normalized);
  }
  return [...seen];
}

async function isUnlockStored(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(DEV_UNLOCK_KEY)) === "1";
  } catch {
    return false;
  }
}

async function isEmailMatch(): Promise<boolean> {
  const configured = getConfiguredDeveloperEmail();
  if (!isValidEmailFormat(configured)) return false;
  const profile = await loadCompanyProfile();
  return profileEmailCandidates(profile).some((email) => email === configured);
}

/** True when this device/user may open developer-only screens (e.g. Button images). */
export async function isDeveloper(): Promise<boolean> {
  if (await isUnlockStored()) return true;
  return isEmailMatch();
}

export async function isDeveloperMenuRevealed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(DEV_MENU_REVEALED_KEY)) === "1";
  } catch {
    return false;
  }
}

/** True when Settings should show developer affordances (env hints, unlock) — legacy; Settings index no longer uses this. */
export async function isDeveloperMenuVisible(): Promise<boolean> {
  if (await isDeveloper()) return true;
  if (isDeveloperEmailConfigured() || isDeveloperUnlockConfigured()) return true;
  return isDeveloperMenuRevealed();
}

export async function revealDeveloperMenu(): Promise<void> {
  await AsyncStorage.setItem(DEV_MENU_REVEALED_KEY, "1");
}

export type UnlockDeveloperResult = "unlocked" | "unlock_not_configured" | "invalid_code";

/** Unlock with EXPO_PUBLIC_DEVELOPER_UNLOCK — does not require profile email. */
export async function tryUnlockDeveloper(code: string): Promise<UnlockDeveloperResult> {
  const secret = getConfiguredDeveloperUnlock();
  if (!secret) return "unlock_not_configured";
  if (code.trim() !== secret) return "invalid_code";
  await AsyncStorage.setItem(DEV_UNLOCK_KEY, "1");
  return "unlocked";
}
