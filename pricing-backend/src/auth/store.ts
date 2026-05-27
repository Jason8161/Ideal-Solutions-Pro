import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

import type { AppAccountRecord, AppAuthJsonSnapshot, AppAuthTokenRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "app-auth.json");

const EMPTY: AppAuthJsonSnapshot = {
  accounts: [],
  tokens: [],
  resetRequests: [],
};

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY, null, 2), "utf8");
  }
}

export async function readAuthJson(): Promise<AppAuthJsonSnapshot> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<AppAuthJsonSnapshot>;
  return {
    accounts: parsed.accounts ?? [],
    tokens: parsed.tokens ?? [],
    resetRequests: parsed.resetRequests ?? [],
  };
}

export async function writeAuthJson(snapshot: AppAuthJsonSnapshot): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf8");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function newUserId(): string {
  return randomBytes(16).toString("hex");
}

export function newAuthToken(): string {
  return randomBytes(32).toString("hex");
}

export function defaultProfileFromAccount(account: AppAccountRecord) {
  return {
    userId: account.userId,
    email: account.email,
    fullName: account.fullName,
    companyName: account.companyName,
    selectedTrialPlan: account.selectedTrialPlan,
    subscriptionTier: account.subscriptionTier,
    trialStartDate: account.trialStartDate,
    aiRequestsUsed: account.aiRequestsUsed,
    storageUsed: account.storageUsed,
  };
}

export function sessionExpiry(persistSession: boolean): string {
  const days = persistSession ? 30 : 1;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function createSession(userId: string, persistSession: boolean): Promise<AppAuthTokenRecord> {
  const snapshot = await readAuthJson();
  const token: AppAuthTokenRecord = {
    token: newAuthToken(),
    userId,
    expiresAt: sessionExpiry(persistSession),
    persistSession,
    createdAt: new Date().toISOString(),
  };
  snapshot.tokens.push(token);
  await writeAuthJson(snapshot);
  return token;
}

export async function findAccountByEmail(email: string): Promise<AppAccountRecord | undefined> {
  const normalized = normalizeEmail(email);
  const snapshot = await readAuthJson();
  return snapshot.accounts.find((a) => a.email === normalized);
}

export async function findAccountById(userId: string): Promise<AppAccountRecord | undefined> {
  const snapshot = await readAuthJson();
  return snapshot.accounts.find((a) => a.userId === userId);
}

export async function saveAccount(account: AppAccountRecord): Promise<void> {
  const snapshot = await readAuthJson();
  const idx = snapshot.accounts.findIndex((a) => a.userId === account.userId);
  if (idx >= 0) {
    snapshot.accounts[idx] = account;
  } else {
    snapshot.accounts.push(account);
  }
  await writeAuthJson(snapshot);
}

export async function recordResetRequest(email: string): Promise<void> {
  const snapshot = await readAuthJson();
  snapshot.resetRequests.push({ email: normalizeEmail(email), requestedAt: new Date().toISOString() });
  await writeAuthJson(snapshot);
}
