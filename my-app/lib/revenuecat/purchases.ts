import Constants from "expo-constants";
import { Platform } from "react-native";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import { withPromiseTimeout } from "@/lib/async/withPromiseTimeout";
import {
  getSubscriptionPlan,
  normalizeSubscriptionTierId,
  SUBSCRIPTION_PLANS,
  tierRank,
  type SubscriptionTierId,
} from "@/lib/subscription/tiers";
import { isSubscriptionGatingDisabled } from "@/lib/subscriptionTesting";

import {
  IDEAL_SOLUTIONS_PRO_ENTITLEMENT,
  LEGACY_BOSS_MAN_MONTHLY_PACKAGE_IDS,
  LEGACY_BOSS_MAN_MONTHLY_PRODUCT_IDS,
  LEGACY_ENTITLEMENT_IDS,
} from "./constants";
import {
  isInvalidRevenueCatCredentialsMessage,
  isPurchaseCancelledError,
  purchasesErrorMessage,
  revenueCatInvalidCredentialsMessage,
} from "./errors";
import { shouldSkipRevenueCatOnLaunch } from "./launchPolicy";

export type PurchasesModule = typeof import("react-native-purchases").default;
export type PurchasesUiModule = typeof import("react-native-purchases-ui").default;

export type RevenueCatResult = { ok: true } | { ok: false; message: string; cancelled?: boolean };

let purchasesConfigured = false;
let purchasesUiAvailableCache: boolean | null = null;

export const CUSTOMER_INFO_TIMEOUT_MS = 8_000;
export const OFFERINGS_TIMEOUT_MS = 10_000;
export const PURCHASE_ACTION_TIMEOUT_MS = 10_000;

function rcLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.warn(message, detail);
  } else {
    console.warn(message);
  }
}

export function isRevenueCatSandboxApiKey(apiKey: string): boolean {
  return apiKey.trim().startsWith("test_");
}

function isValidRevenueCatApiKey(apiKey: string): boolean {
  const trimmed = apiKey.trim();
  if (!trimmed) return false;
  if (Platform.OS === "ios") return trimmed.startsWith("appl_") || trimmed.startsWith("test_");
  if (Platform.OS === "android") return trimmed.startsWith("goog_") || trimmed.startsWith("test_");
  return trimmed.length > 0;
}

function readExtra(): {
  revenueCatApiKey?: string;
  revenueCatAppleApiKey?: string;
  revenueCatGoogleApiKey?: string;
  entitlementId?: string;
} {
  return (Constants.expoConfig?.extra ?? {}) as {
    revenueCatApiKey?: string;
    revenueCatAppleApiKey?: string;
    revenueCatGoogleApiKey?: string;
    entitlementId?: string;
  };
}

export function getRevenueCatApiKey(): string {
  const extra = readExtra();
  if (Platform.OS === "ios") {
    return extra.revenueCatAppleApiKey?.trim() || extra.revenueCatApiKey?.trim() || "";
  }
  if (Platform.OS === "android") {
    return extra.revenueCatGoogleApiKey?.trim() || extra.revenueCatApiKey?.trim() || "";
  }
  return "";
}

export function getPrimaryEntitlementId(): string {
  return readExtra().entitlementId?.trim() || IDEAL_SOLUTIONS_PRO_ENTITLEMENT;
}

export function getPurchases(): PurchasesModule | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-purchases").default as PurchasesModule;
  } catch {
    return null;
  }
}

export function getPurchasesUi(): PurchasesUiModule | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-purchases-ui").default as PurchasesUiModule;
  } catch {
    return null;
  }
}

/** Lazy — never call during first React render (native module load can crash cold start). */
export function isPurchasesUiAvailable(): boolean {
  if (purchasesUiAvailableCache !== null) return purchasesUiAvailableCache;
  return false;
}

/** Call only after {@link configurePurchases} succeeds — loading UI before configure can crash iOS cold start. */
export function probePurchasesUiAvailable(): boolean {
  if (purchasesUiAvailableCache !== null) return purchasesUiAvailableCache;
  if (!purchasesConfigured) return false;
  purchasesUiAvailableCache = getPurchasesUi() !== null;
  return purchasesUiAvailableCache;
}

export async function configurePurchases(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (purchasesConfigured) {
    return { ok: true };
  }
  if (shouldSkipRevenueCatOnLaunch()) {
    return {
      ok: false,
      message: "RevenueCat skipped on launch (EXPO_PUBLIC_SKIP_RC_ON_LAUNCH). Rebuild without the flag to test purchases.",
    };
  }
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: "Subscriptions are disabled for testing." };
  }
  if (Platform.OS === "web") {
    return { ok: false, message: "In-app purchases run on iOS/Android builds (use a dev client with native modules)." };
  }

  const apiKey = getRevenueCatApiKey();
  if (!isValidRevenueCatApiKey(apiKey)) {
    return {
      ok: false,
      message:
        "Add EXPO_PUBLIC_REVENUECAT_API_KEY (or EXPO_PUBLIC_RC_APPLE_KEY / EXPO_PUBLIC_RC_GOOGLE_KEY), then rebuild a dev client.",
    };
  }

  const Purchases = getPurchases();
  if (!Purchases) {
    return { ok: false, message: "RevenueCat native module is not available in this build." };
  }

  try {
    try {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
    } catch {
      /* non-fatal */
    }
    Purchases.configure({ apiKey });
    purchasesConfigured = true;
    probePurchasesUiAvailable();
    rcLog("[RevenueCat] configured", { platform: Platform.OS, sandbox: isRevenueCatSandboxApiKey(apiKey) });
    return { ok: true };
  } catch (error) {
    const raw = purchasesErrorMessage(error, "RevenueCat failed to configure. Use a dev build with native modules.");
    const message = isInvalidRevenueCatCredentialsMessage(raw)
      ? revenueCatInvalidCredentialsMessage()
      : raw;
    return { ok: false, message };
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  const Purchases = getPurchases();
  if (!Purchases || !purchasesConfigured) return null;
  try {
    return await withPromiseTimeout(Purchases.getCustomerInfo(), CUSTOMER_INFO_TIMEOUT_MS);
  } catch {
    return null;
  }
}

/** Links RevenueCat anonymous customer to app user id after sign-in / subscribe. */
export async function loginRevenueCatUser(appUserId: string): Promise<RevenueCatResult> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: "Subscriptions are disabled for testing." };
  }
  const Purchases = getPurchases();
  if (!Purchases) {
    return { ok: false, message: "RevenueCat requires a native iOS or Android build." };
  }
  try {
    await Purchases.logIn(appUserId);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: purchasesErrorMessage(error, "Could not link store account.") };
  }
}

/** Returns to anonymous RevenueCat user after sign-out (keeps device entitlements until next logIn). */
export async function logoutRevenueCatUser(): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases) return;
  try {
    await Purchases.logOut();
  } catch {
    /* already anonymous */
  }
}

export function checkEntitlement(
  customerInfo: CustomerInfo | null | undefined,
  entitlementId = getPrimaryEntitlementId(),
): boolean {
  if (!customerInfo) return false;
  return Boolean(customerInfo.entitlements.active[entitlementId]);
}

export function hasIdealSolutionsPro(customerInfo: CustomerInfo | null | undefined): boolean {
  return checkEntitlement(customerInfo, IDEAL_SOLUTIONS_PRO_ENTITLEMENT);
}

export function highestTierFromEntitlements(active: Record<string, unknown>): SubscriptionTierId | null {
  let best: SubscriptionTierId | null = null;
  let bestRank = -1;

  if (active[IDEAL_SOLUTIONS_PRO_ENTITLEMENT]) {
    const proRank = tierRank("boss_man");
    if (proRank > bestRank) {
      bestRank = proRank;
      best = "boss_man";
    }
  }

  for (const plan of SUBSCRIPTION_PLANS) {
    if (!plan.revenueCatEntitlementId) continue;
    if (active[plan.revenueCatEntitlementId]) {
      const rank = tierRank(plan.id);
      if (rank > bestRank) {
        bestRank = rank;
        best = plan.id;
      }
    }
  }

  const legacy = getPrimaryEntitlementId();
  if (active[legacy] && legacy !== IDEAL_SOLUTIONS_PRO_ENTITLEMENT) {
    const bossmanRank = tierRank("boss_man");
    if (bossmanRank > bestRank) {
      return "boss_man";
    }
  }

  for (const legacyId of LEGACY_ENTITLEMENT_IDS) {
    if (active[legacyId]) {
      const mapped =
        legacyId === "ideal_starter"
          ? "side_hustle"
          : legacyId === "ideal_pro" || legacyId === "pro"
            ? "boss_man"
            : legacyId === "ideal_boss"
              ? "super_boss_man"
              : null;
      if (mapped) {
        const rank = tierRank(mapped);
        if (rank > bestRank) {
          bestRank = rank;
          best = mapped;
        }
      }
    }
  }

  return best ? normalizeSubscriptionTierId(best) : null;
}

function findPackage(
  packages: PurchasesPackage[],
  identifiers: string[],
  productId: string,
): PurchasesPackage | undefined {
  for (const id of identifiers) {
    const byPackage = packages.find((p) => p.identifier === id);
    if (byPackage) return byPackage;
  }
  return packages.find((p) => p.product.identifier === productId);
}

export function isValidPurchasePackage(pkg: PurchasesPackage | null | undefined): pkg is PurchasesPackage {
  return Boolean(pkg?.identifier && pkg.product?.identifier);
}

export type OfferingsLoadResult =
  | { ok: true; packages: PurchasesPackage[] }
  | { ok: false; message: string };

export async function getOfferingsWithTimeout(): Promise<OfferingsLoadResult> {
  const Purchases = getPurchases();
  if (!Purchases || !purchasesConfigured) {
    return {
      ok: false,
      message: "Billing is not ready yet. Wait a moment and try again, or tap Refresh status.",
    };
  }

  try {
    rcLog("[RevenueCat] offerings loading…");
    const offerings = await withPromiseTimeout(
      Purchases.getOfferings(),
      OFFERINGS_TIMEOUT_MS,
      "RevenueCat offerings timed out",
    );
    const packages = offerings.current?.availablePackages ?? [];
    rcLog("[RevenueCat] offerings loaded", packages.map((p) => p.identifier));
    return { ok: true, packages };
  } catch (error) {
    const timedOut = error instanceof Error && error.message.includes("timed out");
    const message = timedOut
      ? "Could not load subscription plans (timed out). Check your connection and try again."
      : purchasesErrorMessage(error, "Could not load subscription plans.");
    rcLog("[RevenueCat] offerings failed", message);
    return { ok: false, message };
  }
}

function tierPackageIdentifiers(tierId: SubscriptionTierId, plan: ReturnType<typeof getSubscriptionPlan>): string[] {
  const identifiers: string[] = [];
  if (plan.revenueCatPackageId) identifiers.push(plan.revenueCatPackageId);
  if (tierId === "boss_man") {
    identifiers.push(...LEGACY_BOSS_MAN_MONTHLY_PACKAGE_IDS, ...LEGACY_BOSS_MAN_MONTHLY_PRODUCT_IDS);
  }
  return identifiers;
}

export async function findTierPackage(tierId: SubscriptionTierId): Promise<PurchasesPackage | null> {
  const plan = getSubscriptionPlan(tierId);
  if (!plan.isPaid) return null;

  const offerings = await getOfferingsWithTimeout();
  if (!offerings.ok) return null;

  const productId = plan.revenueCatProductId ?? "";
  const identifiers = tierPackageIdentifiers(tierId, plan);
  return findPackage(offerings.packages, identifiers, productId) ?? null;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<RevenueCatResult> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: "Subscriptions are disabled for testing." };
  }
  if (!isValidPurchasePackage(pkg)) {
    return { ok: false, message: "Subscription plan is not available. Try again or contact support." };
  }
  const Purchases = getPurchases();
  if (!Purchases) {
    return { ok: false, message: "Purchases require a native iOS or Android build." };
  }
  try {
    rcLog("[RevenueCat] purchase started", pkg.identifier);
    await withPromiseTimeout(
      Purchases.purchasePackage(pkg),
      PURCHASE_ACTION_TIMEOUT_MS,
      "Purchase timed out",
    );
    rcLog("[RevenueCat] purchase success", pkg.identifier);
    return { ok: true };
  } catch (error) {
    if (isPurchaseCancelledError(error)) {
      rcLog("[RevenueCat] purchase cancelled", pkg.identifier);
      return { ok: false, message: "Purchase cancelled.", cancelled: true };
    }
    const timedOut = error instanceof Error && error.message.includes("timed out");
    const message = timedOut
      ? "Purchase timed out. Check your connection and try again."
      : purchasesErrorMessage(error, "Purchase failed.");
    rcLog("[RevenueCat] purchase failed", message);
    return { ok: false, message };
  }
}

export async function restorePurchases(): Promise<RevenueCatResult> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: "Subscriptions are disabled for testing." };
  }
  if (Platform.OS === "web") {
    return { ok: false, message: "Restore is not available on web." };
  }
  const Purchases = getPurchases();
  if (!Purchases) {
    return { ok: false, message: "Restore requires a native iOS or Android build." };
  }
  try {
    rcLog("[RevenueCat] restore started");
    await withPromiseTimeout(
      Purchases.restorePurchases(),
      PURCHASE_ACTION_TIMEOUT_MS,
      "Restore timed out",
    );
    rcLog("[RevenueCat] restore success");
    return { ok: true };
  } catch (error) {
    if (isPurchaseCancelledError(error)) {
      rcLog("[RevenueCat] restore cancelled");
      return { ok: false, message: "Restore cancelled.", cancelled: true };
    }
    const timedOut = error instanceof Error && error.message.includes("timed out");
    const message = timedOut
      ? "Restore timed out. Check your connection and try again."
      : purchasesErrorMessage(error, "Restore failed.");
    rcLog("[RevenueCat] restore failed", message);
    return { ok: false, message };
  }
}

export async function presentPaywall(): Promise<RevenueCatResult> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: "Subscriptions are disabled for testing." };
  }
  if (Platform.OS === "web") {
    return { ok: false, message: "Paywall is not available on web." };
  }
  const RevenueCatUI = getPurchasesUi();
  if (!RevenueCatUI) {
    return { ok: false, message: "RevenueCat Paywalls require a native build with react-native-purchases-ui." };
  }
  try {
    const { PAYWALL_RESULT } = RevenueCatUI;
    const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      return { ok: true };
    }
    if (result === PAYWALL_RESULT.CANCELLED) {
      return { ok: false, message: "Paywall closed.", cancelled: true };
    }
    if (result === PAYWALL_RESULT.ERROR) {
      return { ok: false, message: "Paywall encountered an error." };
    }
    return { ok: false, message: "Paywall closed without a purchase." };
  } catch (error) {
    return { ok: false, message: purchasesErrorMessage(error, "Could not show paywall.") };
  }
}

export async function presentPaywallIfNeeded(): Promise<RevenueCatResult> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: "Subscriptions are disabled for testing." };
  }
  const RevenueCatUI = getPurchasesUi();
  if (!RevenueCatUI) {
    return { ok: false, message: "RevenueCat Paywalls require a native build with react-native-purchases-ui." };
  }
  try {
    const { PAYWALL_RESULT } = RevenueCatUI;
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: getPrimaryEntitlementId(),
      displayCloseButton: true,
    });
    if (result === PAYWALL_RESULT.NOT_PRESENTED) {
      return { ok: true };
    }
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      return { ok: true };
    }
    if (result === PAYWALL_RESULT.CANCELLED) {
      return { ok: false, message: "Paywall closed.", cancelled: true };
    }
    return { ok: false, message: "Paywall closed without a purchase." };
  } catch (error) {
    return { ok: false, message: purchasesErrorMessage(error, "Could not show paywall.") };
  }
}

export async function presentCustomerCenter(): Promise<RevenueCatResult> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: "Subscriptions are disabled for testing." };
  }
  if (Platform.OS === "web") {
    return { ok: false, message: "Customer Center is not available on web." };
  }
  const RevenueCatUI = getPurchasesUi();
  if (!RevenueCatUI) {
    return { ok: false, message: "Customer Center requires a native build with react-native-purchases-ui." };
  }
  try {
    await RevenueCatUI.presentCustomerCenter();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: purchasesErrorMessage(error, "Could not open Customer Center.") };
  }
}
