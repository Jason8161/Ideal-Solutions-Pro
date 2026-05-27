import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { loginAccount, registerAccount } from "@/lib/auth/authApi";
import { clearAuthSession, loadPersistedAuthSession, saveAuthSession } from "@/lib/auth/authStorage";
import { hydrateUserProfileFromCompany, syncUserProfileToCompanyProfile } from "@/lib/auth/syncProfile";
import type { AuthSession, RegisterInput, UserProfile } from "@/lib/auth/types";
import { clearUserProfile, loadUserProfile, saveUserProfile } from "@/lib/auth/userProfileStorage";
import { clearPersistedAppRole } from "@/lib/auth/sessionRole";
import { clearEmployeeSession } from "@/lib/employeeSession";

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: AuthSession | null;
  profile: UserProfile | null;
  signIn: (email: string, password: string, stayLoggedIn: boolean) => Promise<{ ok: boolean; message?: string }>;
  signUp: (input: RegisterInput, stayLoggedIn: boolean) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function applyAuthSuccess(session: AuthSession, profile: UserProfile): Promise<void> {
  await saveUserProfile(profile);
  await syncUserProfileToCompanyProfile(profile);
  await saveAuthSession(session);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    const stored = await loadUserProfile();
    if (stored) {
      setProfile(stored);
      await syncUserProfileToCompanyProfile(stored);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const persisted = await loadPersistedAuthSession();
      if (cancelled) return;

      if (persisted) {
        let nextProfile = await loadUserProfile();
        if (!nextProfile) {
          nextProfile = await hydrateUserProfileFromCompany(persisted.userId, "");
        }
        setSession(persisted);
        setProfile(nextProfile);
      }

      setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, stayLoggedIn: boolean) => {
    const result = await loginAccount(email, password, stayLoggedIn);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    const nextSession = { ...result.session, persistSession: stayLoggedIn };
    setSession(nextSession);
    setProfile(result.profile);
    await applyAuthSuccess(nextSession, result.profile);
    return { ok: true };
  }, []);

  const signUp = useCallback(async (input: RegisterInput, stayLoggedIn: boolean) => {
    const result = await registerAccount(input, stayLoggedIn);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    const nextSession = { ...result.session, persistSession: stayLoggedIn };
    setSession(nextSession);
    setProfile(result.profile);
    await applyAuthSuccess(nextSession, result.profile);
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    setProfile(null);
    await clearAuthSession();
    await clearUserProfile();
    await clearPersistedAppRole();
    await clearEmployeeSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(session?.token),
      session,
      profile,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [isLoading, session, profile, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
