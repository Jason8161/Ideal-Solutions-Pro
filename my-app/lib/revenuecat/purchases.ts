import Constants from "expo-constants";
import { Platform } from "react-native";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import { withPromiseTimeout } from "@/lib/async/withPromiseTimeout";
import {
  getSubscriptionPlan,
  getTierConfig,
  highestTierFromKeys,
  IDEAL_SOLUTIONS_PRO_ENTITLEMENT,
  LEGACY_TIER_PACKAGE_IDS,
  LEGACY_TIER_PRODUCT_IDS,
  PAID_TIER_IDS,
  resolveTierFromProductId,
  type PaidSubscriptionTierId,
  type SubscriptionTierId,
} from "@/lib/subscription/tiers";
import { isSubscriptionGatingDisabled } from "@/lib/subscriptionTesting";
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

function activeEntitlementKeys(active: Record<string, unknown>): string[] {
  return Object.keys(active).filter((key) => Boolean(active[key]));
}

function activeProductIds(customerInfo: CustomerInfo): string[] {
  const ids = new Set<string>();
  for (const entitlement of Object.values(customerInfo.entitlements.active)) {
    if (entitlement.productIdentifier) {
      ids.add(entitlement.productIdentifier);
    }
  }
  for (const productId of customerInfo.activeSubscriptions ?? []) {
    ids.add(productId);
  }
  for (const productId of customerInfo.allPurchasedProductIdentifiers ?? []) {
    ids.add(productId);
  }
  return [...ids];
}

/** Resolves the highest paid tier from RevenueCat customer info (product IDs beat entitlements). */
export function resolveTierFromCustomerInfo(
  customerInfo: CustomerInfo | null | undefined,
): SubscriptionTierId | null {
  if (!customerInfo) return null;
  const entitlementKeys = activeEntitlementKeys(customerInfo.entitlements.active);
  const productIds = activeProductIds(customerInfo);
  const fromProducts = highestTierFromKeys({ productIds });
  if (fromProducts) return fromProducts;
  return highestTierFromKeys({ entitlementKeys });
}

/** @deprecated Use {@link resolveTierFromCustomerInfo} — kept for existing call sites. */
export function highestTierFromEntitlements(active: Record<string, unknown>): SubscriptionTierId | null {
  return highestTierFromKeys({ entitlementKeys: activeEntitlementKeys(active) });
}

function tierPackageIdentifiers(
  tierId: PaidSubscriptionTierId,
  plan: ReturnType<typeof getSubscriptionPlan>,
): string[] {
  const identifiers: string[] = [];
  if (plan.revenueCatPackageId) identifiers.push(plan.revenueCatPackageId);
  if (plan.revenueCatProductId) identifiers.push(plan.revenueCatProductId);
  identifiers.push(...(LEGACY_TIER_PACKAGE_IDS[tierId] ?? []));
  return identifiers;
}

function packageProductMatches(candidate: string, productIdentifier: string): boolean {
  const a = candidate.trim();
  const b = productIdentifier.trim();
  if (!a || !b) return false;
  return a === b || a.toLowerCase() === b.toLowerCase();
}

export function findPackage(
  packages: PurchasesPackage[],
  identifiers: string[],
  productId: string,
  legacyProductIds: readonly string[] = [],
  expectedTierId?: SubscriptionTierId,
): PurchasesPackage | undefined {
  const productCandidates = [productId, ...legacyProductIds].filter(Boolean);
  const uniqueProductCandidates = [...new Set(productCandidates)];
  for (const id of uniqueProductCandidates) {
    const byProduct = packages.find((p) => packageProductMatches(id, p.product.identifier));
    if (byProduct) return byProduct;
  }
  for (const id of identifiers) {
    const byPackage = packages.find((p) => p.identifier === id);
    if (!byPackage) continue;
    if (expectedTierId) {
      const mappedTier = resolveTierFromProductId(byPackage.product.identifier);
      if (mappedTier && mappedTier !== expectedTierId) continue;
    }
    return byPackage;
  }
  return undefined;
}

export function resolveTierPackageFromOfferings(
  packages: PurchasesPackage[],
  tierId: SubscriptionTierId,
): PurchasesPackage | null {
  const plan = getSubscriptionPlan(tierId);
  if (!plan.isPaid || tierId === "locked") return null;
  const paidTierId = tierId as PaidSubscriptionTierId;
  const productId = plan.revenueCatProductId ?? "";
  const legacyProductIds = LEGACY_TIER_PRODUCT_IDS[paidTierId] ?? [];
  const identifiers = tierPackageIdentifiers(paidTierId, plan);
  const resolved = findPackage(packages, identifiers, productId, legacyProductIds, paidTierId) ?? null;
  if (paidTierId === "enterprise_boss_man") {
    if (resolved) {
      rcLog("[RevenueCat] enterprise_boss_man package resolved", {
        packageId: resolved.identifier,
        productId: resolved.product.identifier,
        expectedProductId: productId,
      });
    } else {
      rcLog("[RevenueCat] enterprise_boss_man package not found in offerings", {
        expectedProductId: productId,
        legacyProductIds,
        packageIdentifiers: identifiers,
        available: packages.map((p) => ({ id: p.identifier, productId: p.product.identifier })),
      });
    }
  }
  return resolved;
}

export type FilterPlansByOfferingsOptions = {
  /** Settings → Subscription: keep every configured tier even without a store package. */
  includeAllSubscriptionScreenTiers?: boolean;
};

export function filterPlansByOfferings<T extends { id: SubscriptionTierId; isPaid: boolean }>(
  plans: T[],
  packages: PurchasesPackage[],
  options?: FilterPlansByOfferingsOptions,
): T[] {
  const includeAll = options?.includeAllSubscriptionScreenTiers === true;
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  if (includeAll) {
    const filtered = plans.filter((plan) => {
      if (!plan.isPaid) return true;
      const config = getTierConfig(plan.id);
      return config?.showOnSubscriptionScreen !== false;
    });
    rcLog("[RevenueCat] filterPlansByOfferings (subscription screen)", {
      inputPlans: plans.length,
      availablePackages: packages.length,
      visiblePaidTiers: filtered.filter((plan) => plan.isPaid).length,
      tierIds: filtered.map((plan) => plan.id),
    });
    return filtered;
  }

  if (packages.length === 0) {
    rcLog("[RevenueCat] filterPlansByOfferings (paywall)", {
      inputPlans: plans.length,
      availablePackages: 0,
      visiblePaidTiers: 0,
      tierIds: [],
    });
    return [];
  }

  const visibleTierIds = new Set<PaidSubscriptionTierId>();

  for (const pkg of packages) {
    const tierFromProduct = resolveTierFromProductId(pkg.product.identifier);
    if (!tierFromProduct) continue;
    const config = getTierConfig(tierFromProduct);
    if (config?.showOnPaywall === false) continue;
    visibleTierIds.add(tierFromProduct);
  }

  for (const plan of plans) {
    if (!plan.isPaid || plan.id === "locked") continue;
    const config = getTierConfig(plan.id);
    if (config?.showOnPaywall === false) continue;
    if (resolveTierPackageFromOfferings(packages, plan.id)) {
      visibleTierIds.add(plan.id as PaidSubscriptionTierId);
    }
  }

  const filtered = PAID_TIER_IDS.filter((id) => visibleTierIds.has(id))
    .map((id) => planById.get(id))
    .filter((plan): plan is T => plan != null);

  rcLog("[RevenueCat] filterPlansByOfferings (paywall)", {
    inputPlans: plans.length,
    availablePackages: packages.length,
    visiblePaidTiers: filtered.filter((plan) => plan.isPaid).length,
    tierIds: filtered.map((plan) => plan.id),
  });
  return filtered;
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
    console.warn(
      "[RevenueCat] offerings loaded",
      packages.map((p) => ({ id: p.identifier, productId: p.product.identifier })),
    );
    console.warn("[RevenueCat] offerings package count", packages.length);
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

export async function findTierPackage(tierId: SubscriptionTierId): Promise<PurchasesPackage | null> {
  const plan = getSubscriptionPlan(tierId);
  if (!plan.isPaid) return null;

  const offerings = await getOfferingsWithTimeout();
  if (!offerings.ok) return null;

  return resolveTierPackageFromOfferings(offerings.packages, tierId);
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
    const customerInfo = await withPromiseTimeout(
      Purchases.restorePurchases(),
      PURCHASE_ACTION_TIMEOUT_MS,
      "Restore timed out",
    );
    const restoredTier = resolveTierFromCustomerInfo(customerInfo);
    rcLog("[RevenueCat] restore success", {
      resolvedTier: restoredTier,
      activeSubscriptions: customerInfo.activeSubscriptions,
      entitlements: Object.keys(customerInfo.entitlements.active).filter(
        (key) => customerInfo.entitlements.active[key],
      ),
    });
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
