import { Linking } from "react-native";

/** Serialize native Linking calls to avoid concurrent TurboModule races during navigation. */
let linkingQueue = Promise.resolve();

function enqueueLinking<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  const run = () => safeLinkingCall(operation, fallback);
  const next = linkingQueue.then(run, run);
  linkingQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function safeLinkingCall<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch {
    return fallback;
  }
}

/** Extract lowercase URL scheme from a deep link or custom scheme URL. */
export function schemeFromUrl(url: string): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  return match ? match[1].toLowerCase() : null;
}

const BLOCKED_SCHEMES = new Set(["javascript", "file", "data", "blob"]);

/** True when the string is a non-empty custom-scheme or https URL safe to pass to Linking APIs. */
export function isValidLinkUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const scheme = schemeFromUrl(trimmed);
  if (!scheme) return false;
  if (BLOCKED_SCHEMES.has(scheme)) return false;
  return true;
}

/**
 * canOpenURL guarded against null/invalid URLs — never throws to callers.
 * On iOS, only schemes declared in LSApplicationQueriesSchemes return meaningful results.
 */
export async function safeCanOpenURL(url: unknown): Promise<boolean> {
  if (!isValidLinkUrl(url)) return false;
  const trimmed = url.trim();
  return enqueueLinking(async () => {
    try {
      return await Linking.canOpenURL(trimmed);
    } catch {
      return false;
    }
  }, false);
}

/** openURL with validation — returns false instead of throwing on bad URLs. */
export async function safeOpenURL(url: unknown): Promise<boolean> {
  if (!isValidLinkUrl(url)) return false;
  const trimmed = url.trim();
  return enqueueLinking(async () => {
    try {
      await Linking.openURL(trimmed);
      return true;
    } catch {
      return false;
    }
  }, false);
}

/** First URL in the list that canOpenURL reports as available. */
export async function safeCanOpenAny(urls: readonly unknown[]): Promise<boolean> {
  if (!Array.isArray(urls)) return false;
  for (const url of urls) {
    if (await safeCanOpenURL(url)) return true;
  }
  return false;
}

/** Opens the first openable URL in order; returns true when one succeeded. */
export async function safeOpenFirstAvailable(
  urls: readonly unknown[],
  options?: { allowAggressiveCustomScheme?: boolean },
): Promise<boolean> {
  if (!Array.isArray(urls)) return false;
  for (const raw of urls) {
    if (!isValidLinkUrl(raw)) continue;
    const url = raw.trim();
    if (await safeCanOpenURL(url)) {
      return safeOpenURL(url);
    }
    if (options?.allowAggressiveCustomScheme) {
      const scheme = schemeFromUrl(url);
      if (scheme && scheme !== "http" && scheme !== "https" && (await safeOpenURL(url))) {
        return true;
      }
    }
  }
  return false;
}
