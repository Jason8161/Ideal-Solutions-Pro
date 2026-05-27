import type { SubscriptionTierId } from "@/lib/subscriptionPlans";

/** Signed-in account profile (synced with company profile where sensible). */
export type UserProfile = {
  userId: string;
  email: string;
  fullName: string;
  companyName: string;
  selectedTrialPlan: SubscriptionTierId | null;
  subscriptionTier: SubscriptionTierId;
  trialStartDate: string | null;
  aiRequestsUsed: number;
  storageUsed: number;
};

export type AuthSession = {
  token: string;
  userId: string;
  /** When false, session is not restored after app restart. */
  persistSession: boolean;
  /** ISO — server-issued expiry; optional for ephemeral sessions. */
  expiresAt: string | null;
};

export type AuthCredentials = {
  email: string;
  password: string;
};

export type RegisterInput = AuthCredentials & {
  fullName: string;
  companyName?: string;
};

export type AuthApiResult =
  | { ok: true; session: AuthSession; profile: UserProfile }
  | { ok: false; message: string };
