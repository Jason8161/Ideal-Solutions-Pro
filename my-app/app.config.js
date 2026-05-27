// Dynamic config: merges app.json with RevenueCat keys from env at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: path.join(__dirname, ".env") });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { expo } = require("./app.json");

const baseExtra = typeof expo.extra === "object" && expo.extra !== null ? expo.extra : {};
const baseEas = typeof baseExtra.eas === "object" && baseExtra.eas !== null ? baseExtra.eas : {};

/** Linked EAS project (ideal-solutions). Fallback when .env is missing — EAS cannot auto-write dynamic app.config.js. */
const EAS_PROJECT_ID_FALLBACK = "a6795a79-b97a-4580-855c-0d69dfb95b5b";

/**
 * Flip to true only for local/EAS paywall-off testing — see SUBSCRIPTIONS_BEFORE_LAUNCH.md.
 * When false, RevenueCat runs in native builds; Metro picks up .env via `npx expo start -c`.
 * Native dev client / TestFlight / store: rebuild with EAS (`eas build`) after changing this or RC keys.
 */
const SUBSCRIPTIONS_DISABLED_FOR_TESTING = false;
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
  baseEas.projectId ||
  EAS_PROJECT_ID_FALLBACK;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildIosQuerySchemes } = require("./lib/materialVendorLinkingQueries");

const baseIosInfoPlist =
  typeof expo.ios === "object" && expo.ios !== null && typeof expo.ios.infoPlist === "object" && expo.ios.infoPlist !== null
    ? expo.ios.infoPlist
    : {};

const googleServicesJsonPath = path.join(__dirname, "google-services.json");
const hasGoogleServicesJson = fs.existsSync(googleServicesJsonPath);

/** @type {import('@expo/config').ExpoConfig} */
module.exports = () => ({
  ...expo,
  ios: {
    ...(typeof expo.ios === "object" && expo.ios !== null ? expo.ios : {}),
    infoPlist: {
      ...baseIosInfoPlist,
      // iOS 15+ allows max 50 entries — homedepot/lowes first (see materialVendorLinkingQueries.js).
      LSApplicationQueriesSchemes: buildIosQuerySchemes(),
    },
  },
  android: {
    ...(typeof expo.android === "object" && expo.android !== null ? expo.android : {}),
    ...(hasGoogleServicesJson ? { googleServicesFile: "./google-services.json" } : {}),
  },
  plugins: [
    ...(Array.isArray(expo.plugins) ? expo.plugins : []),
    "expo-asset",
    "expo-dev-client",
    // Android-only: known package launch checks (no iOS native module).
    "installed-launcher-apps",
    "./plugins/withMaterialVendorLinkingQueries.js",
    "./plugins/withAiAssistantLinkingQueries.js",
  ],
  extra: {
    ...baseExtra,
    eas: {
      ...baseEas,
      /** Required for EAS linking and getExpoPushTokenAsync. Override via EXPO_PUBLIC_EAS_PROJECT_ID in .env. */
      projectId: easProjectId,
    },
    revenueCatAppleApiKey: process.env.EXPO_PUBLIC_RC_APPLE_KEY ?? "",
    revenueCatGoogleApiKey: process.env.EXPO_PUBLIC_RC_GOOGLE_KEY ?? "",
    entitlementId: process.env.EXPO_PUBLIC_RC_ENTITLEMENT ?? "pro",
    /** Loaded from my-app/.env by Expo CLI as EXPO_PUBLIC_PRICING_API_URL (restart after changes). */
    pricingApiUrl: (process.env.EXPO_PUBLIC_PRICING_API_URL ?? "").replace(/\/+$/, ""),
    /** Customer Request Service browser form + inbox API (defaults to pricingApiUrl when unset). */
    serviceRequestBaseUrl: (
      process.env.EXPO_PUBLIC_SERVICE_REQUEST_BASE_URL ??
      process.env.EXPO_PUBLIC_SERVICE_REQUEST_API_URL ??
      process.env.EXPO_PUBLIC_PRICING_API_URL ??
      ""
    ).replace(/\/+$/, ""),
    /** Hosted invoice PAY NOW page (defaults to pricingApiUrl when unset). */
    payPageBaseUrl: (
      process.env.EXPO_PUBLIC_PAY_PAGE_BASE_URL ??
      process.env.EXPO_PUBLIC_PRICING_API_URL ??
      ""
    ).replace(/\/+$/, ""),
    /** Preview profile sets EXPO_PUBLIC_BETA_FULL_ACCESS; TestFlight also unlocks at runtime. */
    betaFullAccess: process.env.EXPO_PUBLIC_BETA_FULL_ACCESS === "true",
    /**
     * TESTING: unlock Boss Man tier, bypass paywalls, skip RevenueCat configure/purchase.
     * Set to false before App Store / Play production (see SUBSCRIPTIONS_BEFORE_LAUNCH.md).
     * Local override: EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED=true in .env + Metro restart.
     */
    subscriptionsDisabled:
      SUBSCRIPTIONS_DISABLED_FOR_TESTING ||
      process.env.EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED === "true",
    /** Comma-separated emails allowed to open Settings → Admin free access (also seed app_subscription_admins). */
    appAdminEmails: process.env.EXPO_PUBLIC_APP_ADMIN_EMAILS ?? "",
  },
});
