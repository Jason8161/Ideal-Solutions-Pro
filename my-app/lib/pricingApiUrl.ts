import Constants from "expo-constants";
import { Platform } from "react-native";

type Extra = { pricingApiUrl?: string };

function fromExpoExtra(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.pricingApiUrl?.trim() ?? "";
}

function devHostFromExpo(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0]?.trim();
  if (!host) return null;
  return host;
}

const DEFAULT_PRICING_PORT = "3001";

/**
 * If the env points at `/api/pricing` (or deeper), strip to server origin so
 * `${base}/api/pricing/v1/search` and `${base}/search` resolve correctly.
 */
export function normalizePricingServiceRoot(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `http://${trimmed}`;
    const u = new URL(withScheme);
    const path = u.pathname.replace(/\/+$/, "") || "";
    if (path === "/api/pricing" || path.startsWith("/api/pricing/")) {
      return u.origin.replace(/\/+$/, "");
    }
  } catch {
    /* ignore */
  }
  return trimmed;
}

function devInferredPricingBase(): string {
  if (!__DEV__) return "";
  const host = devHostFromExpo();
  if (!host) return "";
  const port =
    (typeof process !== "undefined" && process.env.EXPO_PUBLIC_PRICING_API_PORT
      ? String(process.env.EXPO_PUBLIC_PRICING_API_PORT).trim()
      : "") || DEFAULT_PRICING_PORT;
  const useHttps =
    typeof process !== "undefined" && process.env.EXPO_PUBLIC_PRICING_API_USE_HTTPS === "true";
  const scheme = useHttps ? "https" : "http";
  return normalizePricingServiceRoot(`${scheme}://${host}:${port}`);
}

/**
 * When developers set EXPO_PUBLIC_PRICING_API_URL=http://localhost:3001 (works on desktop web),
 * native devices still resolve localhost to the phone. In __DEV__, swap to the Metro host from
 * `expoConfig.hostUri` (LAN IP) so Expo Go / dev builds hit the same PC as the bundler.
 */
function rewriteLocalhostForNativeDev(url: string): string {
  if (!__DEV__ || Platform.OS === "web" || !url) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const h = parsed.hostname.toLowerCase();
  if (h !== "localhost" && h !== "127.0.0.1") return normalizePricingServiceRoot(url.replace(/\/+$/, ""));

  const devHost = devHostFromExpo();
  if (devHost && devHost !== "localhost" && devHost !== "127.0.0.1") {
    parsed.hostname = devHost;
    return normalizePricingServiceRoot(parsed.toString().replace(/\/+$/, ""));
  }

  if (Platform.OS === "android") {
    parsed.hostname = "10.0.2.2";
    return normalizePricingServiceRoot(parsed.toString().replace(/\/+$/, ""));
  }

  return normalizePricingServiceRoot(url.replace(/\/+$/, ""));
}

/**
 * Base URL for the pricing API (no trailing slash).
 * Uses `EXPO_PUBLIC_PRICING_API_URL` inlined by Metro from `.env`, then falls back to `app.config` `extra.pricingApiUrl`.
 * In development, `localhost` / `127.0.0.1` on native is rewritten to the dev machine host (see rewrite above).
 * If still unset in __DEV__, infers `http://<metro-host>:<port>` (port from EXPO_PUBLIC_PRICING_API_PORT or 3001).
 */
export function getPricingApiBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.EXPO_PUBLIC_PRICING_API_URL
      ? String(process.env.EXPO_PUBLIC_PRICING_API_URL).trim()
      : "";
  let merged = fromEnv || fromExpoExtra();
  merged = merged.replace(/\/+$/, "");
  if (merged) {
    return normalizePricingServiceRoot(rewriteLocalhostForNativeDev(merged));
  }
  return normalizePricingServiceRoot(devInferredPricingBase().replace(/\/+$/, ""));
}
