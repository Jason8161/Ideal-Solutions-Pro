import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import { normalizeAuthEmail } from "@/lib/auth/passwordValidation";
import { defaultUserProfile } from "@/lib/auth/userProfileStorage";
import type { AuthApiResult, AuthSession, RegisterInput } from "@/lib/auth/types";

const LOCAL_ACCOUNTS_KEY = "ideal_local_auth_accounts_v1";

type LocalAccountRecord = {
  userId: string;
  email: string;
  passwordHash: string;
  profile: ReturnType<typeof defaultUserProfile>;
};

function newUserId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function newToken(): string {
  return `tok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 18)}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

async function loadAccounts(): Promise<LocalAccountRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalAccountRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAccounts(accounts: LocalAccountRecord[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function buildSession(userId: string, persistSession: boolean): AuthSession {
  const expiresAt = persistSession
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    token: newToken(),
    userId,
    persistSession,
    expiresAt,
  };
}

/** Device-local auth for dev / offline — passwords hashed in AsyncStorage, never in SecureStore. */
export async function localRegister(input: RegisterInput, persistSession: boolean): Promise<AuthApiResult> {
  const email = normalizeAuthEmail(input.email);
  const accounts = await loadAccounts();
  if (accounts.some((a) => a.email === email)) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const salt = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${email}:${Date.now()}`,
  );
  const passwordHash = await hashPassword(input.password, salt);
  const userId = newUserId();
  const profile = defaultUserProfile({
    userId,
    email,
    fullName: input.fullName.trim(),
    companyName: input.companyName?.trim() ?? "",
    selectedTrialPlan: null,
    subscriptionTier: "locked",
    trialStartDate: new Date().toISOString(),
  });

  accounts.push({
    userId,
    email,
    passwordHash: `${salt}:${passwordHash}`,
    profile,
  });
  await saveAccounts(accounts);

  return {
    ok: true,
    session: buildSession(userId, persistSession),
    profile,
  };
}

export async function localLogin(
  emailInput: string,
  password: string,
  persistSession: boolean,
): Promise<AuthApiResult> {
  const email = normalizeAuthEmail(emailInput);
  const accounts = await loadAccounts();
  const account = accounts.find((a) => a.email === email);
  if (!account) {
    return { ok: false, message: "No account found for that email." };
  }

  const [salt, expectedHash] = account.passwordHash.split(":");
  if (!salt || !expectedHash) {
    return { ok: false, message: "Account data is invalid. Try signing up again." };
  }
  const actualHash = await hashPassword(password, salt);
  if (actualHash !== expectedHash) {
    return { ok: false, message: "Incorrect password." };
  }

  return {
    ok: true,
    session: buildSession(account.userId, persistSession),
    profile: account.profile,
  };
}

export async function localForgotPassword(emailInput: string): Promise<{ ok: true; message: string }> {
  const email = normalizeAuthEmail(emailInput);
  const accounts = await loadAccounts();
  const exists = accounts.some((a) => a.email === email);
  return {
    ok: true,
    message: exists
      ? "Password reset email is not wired yet. Contact support or sign up again on this device."
      : "If an account exists for that email, reset instructions would be sent. No account found on this device.",
  };
}

export async function localFetchProfile(userId: string): Promise<ReturnType<typeof defaultUserProfile> | null> {
  const accounts = await loadAccounts();
  return accounts.find((a) => a.userId === userId)?.profile ?? null;
}
