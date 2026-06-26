import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * Base URL sent to pricing-backend as `appBaseUrl` when creating invites.
 * Backend appends paths such as `/invite/accept?code=ΓÇª` or `/employee/join?code=ΓÇª`.
 *
 * Prefer EXPO_PUBLIC_APP_DEEP_LINK_BASE (HTTPS web app or hosted landing).
 * Falls back to the current web origin or Metro dev host in __DEV__.
 */
export function resolveInviteAppBaseUrl(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_APP_DEEP_LINK_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const [host, port = "8081"] = hostUri.split(":");
      const h = host?.trim();
      if (h) return `http://${h}:${port.trim()}`.replace(/\/+$/, "");
    }
  }

  return undefined;
}

/** Company user invite ΓÇö `/invite/accept?code=ΓÇª` (server-built or client fallback). */
export function buildCompanyInviteAcceptUrl(code: string, serverLink?: string | null): string {
  const trimmed = serverLink?.trim();
  if (trimmed) return trimmed;

  const base = resolveInviteAppBaseUrl();
  if (base) {
    return `${base.replace(/\/+$/, "")}/invite/accept?code=${encodeURIComponent(code)}`;
  }

  return Linking.createURL("/invite/accept", {
    scheme: "ideal-solutions",
    queryParams: { code },
  });
}

/** Crew employee invite ΓÇö `/employee/join?code=ΓÇª` (server-built or client fallback). */
export function buildEmployeeJoinUrl(code: string, serverLink?: string | null): string {
  const trimmed = serverLink?.trim();
  if (trimmed) return trimmed;

  const base = resolveInviteAppBaseUrl();
  if (base) {
    return `${base.replace(/\/+$/, "")}/employee/join?code=${encodeURIComponent(code)}`;
  }

  return Linking.createURL("/employee/join", {
    scheme: "ideal-solutions",
    queryParams: { code },
  });
}
