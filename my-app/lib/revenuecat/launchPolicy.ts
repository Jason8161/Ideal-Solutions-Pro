import Constants from "expo-constants";

/** Extra delay after home cold splash before touching RevenueCat native modules. */
export const REVENUECAT_INIT_DELAY_MS = 800;

function readExtra(): { skipRcOnLaunch?: boolean } {
  return (Constants.expoConfig?.extra ?? {}) as { skipRcOnLaunch?: boolean };
}

/**
 * When true (EAS env EXPO_PUBLIC_SKIP_RC_ON_LAUNCH=true), RevenueCat is never configured.
 * Use on TestFlight to confirm startup crashes are RC-related before re-enabling.
 */
export function shouldSkipRevenueCatOnLaunch(): boolean {
  if (readExtra().skipRcOnLaunch === true) return true;
  return process.env.EXPO_PUBLIC_SKIP_RC_ON_LAUNCH === "true";
}
