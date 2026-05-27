import Constants from "expo-constants";

/** Shown on Subscribe / plan picker when store purchases are turned off. */
export const SUBSCRIPTIONS_TESTING_NOTICE = "Subscriptions disabled for testing";

function readSubscriptionsDisabledFromExtra(): boolean {
  const extra = Constants.expoConfig?.extra as { subscriptionsDisabled?: boolean } | undefined;
  return extra?.subscriptionsDisabled === true;
}

/**
 * True when subscription paywalls and RevenueCat purchases are off (testing / pre-launch).
 * No hardcoded bypass — only `app.config.js` SUBSCRIPTIONS_DISABLED_FOR_TESTING (EAS) and
 * `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED=true` in `.env` (Metro; restart with `npx expo start -c`).
 */
export function isSubscriptionGatingDisabled(): boolean {
  if (readSubscriptionsDisabledFromExtra()) return true;
  if (process.env.EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED === "true") return true;
  return false;
}

/** Alias — same as {@link isSubscriptionGatingDisabled} for UI / context. */
export function isTestingUnlocked(): boolean {
  return isSubscriptionGatingDisabled();
}

/** Baked at Metro / EAS build time (no async detection). */
export function isSubscriptionGatingDisabledFromBuild(): boolean {
  return isSubscriptionGatingDisabled();
}

export function getSubscriptionsTestingNotice(): string | null {
  return isSubscriptionGatingDisabled() ? SUBSCRIPTIONS_TESTING_NOTICE : null;
}
