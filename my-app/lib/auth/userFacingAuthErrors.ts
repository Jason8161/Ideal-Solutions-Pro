import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";

import { APP_REVIEW_DEMO_EMAIL } from "./appReviewDemo";

export type AuthErrorContext = "login" | "signup" | "forgot";

type AuthErrorOptions = {
  email?: string;
};

const GUEST_TRIAL_HINT =
  'Tap "Start 7-day free trial ΓÇö No account required" on the sign-in screen to use the full app without logging in.';

function isDemoEmail(email: string | undefined): boolean {
  return email?.trim().toLowerCase() === APP_REVIEW_DEMO_EMAIL.toLowerCase();
}

function isPlaceholderApiUrl(base: string): boolean {
  const lower = base.toLowerCase();
  return (
    lower.includes("your-public-api-url") ||
    lower.includes("yourdomain.com") ||
    lower.includes("your-api.example.com") ||
    lower.includes("your_public_api")
  );
}

function isNetworkError(message: string): boolean {
  return /network request failed|failed to fetch|fetch failed|timed out|timeout|internet connection|ENOTFOUND|ECONNREFUSED|ERR_NETWORK/i.test(
    message,
  );
}

function isParseError(message: string): boolean {
  return /unexpected token|json\.parse|syntaxerror|invalid response|non-json/i.test(message);
}

/** Maps raw auth API / fetch errors to reviewer-friendly copy. */
export function toUserFacingAuthError(
  raw: string,
  context: AuthErrorContext,
  options?: AuthErrorOptions,
): string {
  const email = options?.email;
  const trimmed = raw.trim();
  if (!trimmed) {
    return context === "login"
      ? `Sign-in failed. ${GUEST_TRIAL_HINT}`
      : "Something went wrong. Please try again.";
  }

  if (trimmed === "AUTH_API_UNCONFIGURED") {
    if (context === "login") {
      return `Cloud sign-in is not available in this build. ${GUEST_TRIAL_HINT} Optional demo login works offline with ${APP_REVIEW_DEMO_EMAIL}.`;
    }
    if (context === "signup") {
      return `Account creation requires a cloud connection that is not configured in this build. ${GUEST_TRIAL_HINT}`;
    }
    return "Password reset requires a cloud connection that is not configured in this build.";
  }

  if (trimmed === "AUTH_API_MISCONFIGURED") {
    return `Account server URL is not configured for this build. ${GUEST_TRIAL_HINT}`;
  }

  const base = getPricingApiBaseUrl();
  if (base && isPlaceholderApiUrl(base)) {
    return `Account server URL is not configured for this build. ${GUEST_TRIAL_HINT}`;
  }

  if (isNetworkError(trimmed)) {
    return `Could not reach the account server. Check your internet connection, or ${GUEST_TRIAL_HINT.toLowerCase()}`;
  }

  if (isParseError(trimmed)) {
    return `Account server returned an unexpected response. Try again later, or ${GUEST_TRIAL_HINT.toLowerCase()}`;
  }

  if (/^request failed \(\d{3}\)$/i.test(trimmed)) {
    return `Account server error (${trimmed.match(/\d{3}/)?.[0] ?? "unknown"}). Try again later, or ${GUEST_TRIAL_HINT.toLowerCase()}`;
  }

  if (trimmed === "No account found for that email.") {
    return `No account found on this device for that email. ${GUEST_TRIAL_HINT} Optional demo: ${APP_REVIEW_DEMO_EMAIL}`;
  }

  if (trimmed === "Incorrect email or password." || trimmed === "Incorrect password.") {
    if (isDemoEmail(email)) {
      return `Incorrect password for the App Store review account. Use password ReviewDemo1 exactly, or ${GUEST_TRIAL_HINT.toLowerCase()}`;
    }
    if (context === "login") {
      return `${trimmed} ${GUEST_TRIAL_HINT} Optional review demo: ${APP_REVIEW_DEMO_EMAIL}`;
    }
    return trimmed;
  }

  if (context === "forgot" && trimmed.length > 120) {
    return "Could not send reset instructions right now. Try again later.";
  }

  if (trimmed.length > 160) {
    return context === "login"
      ? `Sign-in failed. ${GUEST_TRIAL_HINT}`
      : "Something went wrong. Please try again.";
  }

  return trimmed;
}
