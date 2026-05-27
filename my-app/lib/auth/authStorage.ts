import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthSession } from "@/lib/auth/types";

const SESSION_KEY = "ideal_auth_session_v1";

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.token?.trim() || !parsed.userId?.trim()) return null;
    return {
      token: parsed.token.trim(),
      userId: parsed.userId.trim(),
      persistSession: parsed.persistSession === true,
      expiresAt: typeof parsed.expiresAt === "string" ? parsed.expiresAt : null,
    };
  } catch {
    return null;
  }
}

function isSessionExpired(session: AuthSession): boolean {
  if (!session.expiresAt) return false;
  const exp = Date.parse(session.expiresAt);
  if (Number.isNaN(exp)) return false;
  return Date.now() >= exp;
}

/** Loads a persisted session (stay logged in). Ephemeral sessions are not stored. */
export async function loadPersistedAuthSession(): Promise<AuthSession | null> {
  const session = parseSession(await secureGet(SESSION_KEY));
  if (!session) return null;
  if (!session.persistSession) {
    await secureDelete(SESSION_KEY);
    return null;
  }
  if (isSessionExpired(session)) {
    await secureDelete(SESSION_KEY);
    return null;
  }
  return session;
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  if (!session.persistSession) {
    await secureDelete(SESSION_KEY);
    return;
  }
  await secureSet(SESSION_KEY, JSON.stringify(session));
}

export async function clearAuthSession(): Promise<void> {
  await secureDelete(SESSION_KEY);
}
