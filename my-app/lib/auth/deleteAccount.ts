import AsyncStorage from "@react-native-async-storage/async-storage";

import { hasAuthApi } from "@/lib/auth/authApi";
import { localDeleteAccount } from "@/lib/auth/localAuthStore";
import type { AuthSession, UserProfile } from "@/lib/auth/types";
import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";
import { isSupabaseConfigured, supabaseRpc } from "@/lib/supabase/client";

const PENDING_DELETION_KEY = "ideal_account_deletion_pending_v1";

export type DeleteAccountResult =
  | { ok: true; serverConfirmed: boolean; message?: string }
  | { ok: false; message: string };

type PendingDeletionRecord = {
  userId: string;
  email?: string;
  requestedAt: string;
};

async function markAccountDeletionPending(userId: string, email?: string): Promise<void> {
  const record: PendingDeletionRecord = {
    userId,
    email: email?.trim() || undefined,
    requestedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PENDING_DELETION_KEY, JSON.stringify(record));
}

async function requestBackendAccountDeletion(session: AuthSession): Promise<boolean> {
  const base = getPricingApiBaseUrl();
  if (!base) return false;

  const res = await fetch(`${base.replace(/\/+$/, "")}/api/auth/delete-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ userId: session.userId }),
  });

  if (res.status === 404 || res.status === 501) {
    return false;
  }

  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!res.ok || json?.ok === false) {
    const message = json?.error ?? `Account deletion failed (${res.status}).`;
    throw new Error(message);
  }
  return true;
}

async function requestSupabaseAccountDeletion(session: AuthSession): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    // TODO: Wire a Supabase Edge Function / admin RPC that deletes auth.users and related rows.
    await supabaseRpc<{ ok?: boolean }>(
      "request_account_deletion",
      { p_user_id: session.userId },
      { accessToken: session.token },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Requests account deletion on the server when available, removes local-only accounts,
 * or marks the account for server-side deletion. Caller should sign out afterward.
 */
export async function deleteAccount(
  session: AuthSession,
  profile: UserProfile | null,
): Promise<DeleteAccountResult> {
  const email = profile?.email;

  if (hasAuthApi()) {
    try {
      const confirmed = await requestBackendAccountDeletion(session);
      if (confirmed) {
        return { ok: true, serverConfirmed: true };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete account.";
      return { ok: false, message };
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const confirmed = await requestSupabaseAccountDeletion(session);
      if (confirmed) {
        return {
          ok: true,
          serverConfirmed: true,
          message: "Deletion request submitted. Cloud data will be removed per policy.",
        };
      }
    } catch {
      /* fall through to local handling */
    }
  }

  if (session.userId.startsWith("local_")) {
    await localDeleteAccount(session.userId);
    return {
      ok: true,
      serverConfirmed: true,
      message: "Local account removed from this device.",
    };
  }

  await markAccountDeletionPending(session.userId, email);
  return {
    ok: true,
    serverConfirmed: false,
    message:
      "Deletion request recorded on this device. Server-side account removal is not wired yet ΓÇö contact support@idealsolutionspro.com if you need immediate help.",
  };
}
