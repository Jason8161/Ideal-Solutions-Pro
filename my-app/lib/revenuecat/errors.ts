import type { PurchasesError } from "react-native-purchases";
import { Platform } from "react-native";

/** Shown when a tier has no matching store package — never expose RC/package IDs to users. */
export const PLAN_UNAVAILABLE_USER_MESSAGE =
  "This plan isn't available right now. Try again in a moment or choose another plan.";

/** Lazy — avoid eager `react-native-purchases` import on cold start (TestFlight crash risk). */
function purchasesErrorCodes(): Record<string, string> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-purchases") as {
      PURCHASES_ERROR_CODE?: Record<string, string>;
    };
    return mod.PURCHASES_ERROR_CODE ?? null;
  } catch {
    return null;
  }
}

export function isPurchaseCancelledError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as PurchasesError;
  if (err.userCancelled === true) return true;
  const codes = purchasesErrorCodes();
  return codes ? err.code === codes.PURCHASE_CANCELLED_ERROR : false;
}

/** RevenueCat configure failures that must not block guest trial or navigation. */
export function isRevenueCatNonBlockingConfigureMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    isInvalidRevenueCatCredentialsMessage(message) ||
    lower.includes("rejected the api key") ||
    lower.includes("subscriptions are disabled") ||
    lower.includes("skipped on launch") ||
    lower.includes("rebuild a dev client")
  );
}

export function isInvalidRevenueCatCredentialsMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("wrong api key") ||
    lower.includes("invalid api key") ||
    lower.includes("api key is not valid") ||
    lower.includes("invalid credentials")
  );
}

export function revenueCatInvalidCredentialsMessage(): string {
  return "RevenueCat rejected the API key. Use the iOS Public API key (appl_) from the RevenueCat dashboard for bundle ID com.idealsolutions.app, set EXPO_PUBLIC_RC_APPLE_KEY in EAS, then rebuild.";
}

export function formatRevenueCatConfigureWarning(message: string): string {
  if (isInvalidRevenueCatCredentialsMessage(message)) {
    return `${revenueCatInvalidCredentialsMessage()} You can still start a guest trial below.`;
  }
  return message;
}

export function purchasesErrorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  if (isPurchaseCancelledError(error)) {
    return "Purchase cancelled.";
  }
  const codes = purchasesErrorCodes();
  if (error && typeof error === "object") {
    const err = error as PurchasesError;
    if (codes?.NETWORK_ERROR && err.code === codes.NETWORK_ERROR) {
      return "Network error — check your connection and try again.";
    }
    if (
      codes?.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR &&
      err.code === codes.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR
    ) {
      return "This plan is not available in the store yet. Try again later.";
    }
    if (codes?.PURCHASE_NOT_ALLOWED_ERROR && err.code === codes.PURCHASE_NOT_ALLOWED_ERROR) {
      return "Purchases are not allowed on this device or account.";
    }
    if (codes?.STORE_PROBLEM_ERROR && err.code === codes.STORE_PROBLEM_ERROR) {
      return Platform.OS === "ios"
        ? "The App Store is having trouble. Try again shortly."
        : Platform.OS === "android"
          ? "Google Play is having trouble. Try again shortly."
          : "The App Store or Google Play is having trouble. Try again shortly.";
    }
    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
