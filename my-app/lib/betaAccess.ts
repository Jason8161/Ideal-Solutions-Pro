import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Application from "expo-application";
import { Platform } from "react-native";

/**
 * Logical TestFlight release type (expo-application has no TESTFLIGHT enum; TestFlight
 * builds report as APP_STORE with a sandbox App Store receipt).
 */
export const APPLICATION_RELEASE_TYPE_TESTFLIGHT = 6;

let runtimeTestFlightDetected: boolean | null = null;

/** Set after async detection in SubscriptionProvider (also used by gating helpers). */
export function setRuntimeTestFlightDetected(value: boolean): void {
  runtimeTestFlightDetected = value;
}

export function getRuntimeTestFlightDetected(): boolean {
  return runtimeTestFlightDetected === true;
}

/** True when running inside the Expo Go app (store client). */
export function isRunningInExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** __DEV__ + Expo Go + no baked beta flag — show local .env setup hint on Subscribe. */
export function shouldShowExpoGoBetaDevHint(): boolean {
  if (!__DEV__) return false;
  if (!isRunningInExpoGo()) return false;
  return !isBetaFullAccessFromBuild();
}

export const EXPO_GO_BETA_DEV_HINT =
  "Add EXPO_PUBLIC_BETA_FULL_ACCESS=true to .env and restart Metro (npx expo start -c), then reload the app.";

function readBetaFullAccessFromExtra(): boolean {
  const extra = Constants.expoConfig?.extra as { betaFullAccess?: boolean } | undefined;
  return extra?.betaFullAccess === true;
}

/**
 * Baked at Metro start: app.config extra.betaFullAccess (dotenv + .env) first, then inlined
 * EXPO_PUBLIC_BETA_FULL_ACCESS. In Expo Go, process.env is often undefined — rely on extra.
 */
export function isBetaFullAccessFromBuild(): boolean {
  if (readBetaFullAccessFromExtra()) return true;
  if (process.env.EXPO_PUBLIC_BETA_FULL_ACCESS === "true") return true;
  if (__DEV__ && Constants.expoConfig == null) {
    logBetaAccessDev(
      "Constants.expoConfig is undefined — run npx expo start -c from my-app so app.config.js loads .env",
    );
  }
  return false;
}

export type BetaAccessDebugInfo = {
  betaEnv: boolean;
  betaExtra: boolean;
  testFlightDetected: boolean;
  buildFlag: boolean;
};

export function getBetaAccessDebugInfo(): BetaAccessDebugInfo {
  const betaExtra = readBetaFullAccessFromExtra();
  const betaEnv = process.env.EXPO_PUBLIC_BETA_FULL_ACCESS === "true";
  return {
    betaEnv,
    betaExtra,
    testFlightDetected: getRuntimeTestFlightDetected(),
    buildFlag: isBetaFullAccessFromBuild(),
  };
}

/**
 * Build-time beta bypass (EXPO_PUBLIC_BETA_FULL_ACCESS / eas.json preview env).
 * Runtime TestFlight detection does not unlock tiers — use RevenueCat or admin free access.
 */
export function isBetaFullAccessEnabled(): boolean {
  return resolveIsBetaFullAccess();
}

/** True only when EXPO_PUBLIC_BETA_FULL_ACCESS is baked at Metro/EAS build time. */
export function resolveIsBetaFullAccess(_runtimeTestFlight?: boolean): boolean {
  return isBetaFullAccessFromBuild();
}

function logBetaAccessDev(message: string, detail?: Record<string, unknown>): void {
  if (!__DEV__) return;
  if (detail) {
    console.log(`[betaAccess] ${message}`, detail);
  } else {
    console.log(`[betaAccess] ${message}`);
  }
}

/** __DEV__ diagnostics only — expo-testflight is not used (crash risk at import). */
export function readIosTestFlightModuleValue(): boolean | "unavailable" {
  return "unavailable";
}

/** iOS TestFlight / Android internal detection for diagnostics and UI only (no tier bypass). */
export async function detectRuntimeTestFlight(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (isRunningInExpoGo()) return false;

  if (Platform.OS === "ios") {
    try {
      const releaseType = await Application.getIosApplicationReleaseTypeAsync();
      if (releaseType === APPLICATION_RELEASE_TYPE_TESTFLIGHT) {
        logBetaAccessDev("iOS logical TestFlight release type");
        return true;
      }
      logBetaAccessDev("iOS release type (no runtime beta unlock)", { releaseType });
      return false;
    } catch (error) {
      logBetaAccessDev("getIosApplicationReleaseTypeAsync failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  return detectAndroidBetaInstall();
}

/** Android Play internal / sideload preview — env flag only; no store receipt equivalent. */
async function detectAndroidBetaInstall(): Promise<boolean> {
  const fromBuild = isBetaFullAccessFromBuild();
  logBetaAccessDev("Android beta access", { fromBuild });
  return fromBuild;
}
