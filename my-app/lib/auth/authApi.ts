import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";

import { localForgotPassword, localLogin, localRegister } from "./localAuthStore";
import type { AuthApiResult, RegisterInput, UserProfile } from "./types";

type ApiError = { ok: false; error: string };

async function authFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const base = getPricingApiBaseUrl();
  if (!base) {
    throw new Error("AUTH_API_UNCONFIGURED");
  }
  const url = `${base.replace(/\/+$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T | ApiError;
  if (!res.ok || (json as ApiError).ok === false) {
    const err = (json as ApiError).error ?? `Request failed (${res.status})`;
    throw new Error(err);
  }
  return json as T;
}

function useLocalAuth(): boolean {
  return !getPricingApiBaseUrl();
}

export function hasAuthApi(): boolean {
  return Boolean(getPricingApiBaseUrl());
}

export async function registerAccount(
  input: RegisterInput,
  persistSession: boolean,
): Promise<AuthApiResult> {
  if (useLocalAuth()) {
    return localRegister(input, persistSession);
  }
  try {
    const data = await authFetch<{
      ok: true;
      token: string;
      userId: string;
      expiresAt: string;
      profile: UserProfile;
    }>("/api/auth/register", {
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      companyName: input.companyName ?? "",
      persistSession,
    });
    return {
      ok: true,
      session: {
        token: data.token,
        userId: data.userId,
        persistSession,
        expiresAt: data.expiresAt,
      },
      profile: data.profile,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sign up failed.";
    if (msg === "AUTH_API_UNCONFIGURED") {
      return localRegister(input, persistSession);
    }
    return { ok: false, message: msg };
  }
}

export async function loginAccount(
  email: string,
  password: string,
  persistSession: boolean,
): Promise<AuthApiResult> {
  if (useLocalAuth()) {
    return localLogin(email, password, persistSession);
  }
  try {
    const data = await authFetch<{
      ok: true;
      token: string;
      userId: string;
      expiresAt: string;
      profile: UserProfile;
    }>("/api/auth/login", {
      email,
      password,
      persistSession,
    });
    return {
      ok: true,
      session: {
        token: data.token,
        userId: data.userId,
        persistSession,
        expiresAt: data.expiresAt,
      },
      profile: data.profile,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login failed.";
    if (msg === "AUTH_API_UNCONFIGURED") {
      return localLogin(email, password, persistSession);
    }
    return { ok: false, message: msg };
  }
}

export async function requestPasswordReset(email: string): Promise<{ ok: true; message: string }> {
  if (useLocalAuth()) {
    return localForgotPassword(email);
  }
  try {
    const data = await authFetch<{ ok: true; message: string }>("/api/auth/forgot-password", { email });
    return { ok: true, message: data.message };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not send reset instructions.";
    if (msg === "AUTH_API_UNCONFIGURED") {
      return localForgotPassword(email);
    }
    return { ok: true, message: msg };
  }
}
