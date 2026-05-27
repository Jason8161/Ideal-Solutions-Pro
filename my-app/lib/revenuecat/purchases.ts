import Constants from "expo-constants";
import { Platform } from "react-native";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import {
  normalizeSubscriptionTierId,
  SUBSCRIPTION_PLANS,
  tierRank,
  type SubscriptionTierId,
} from "@/lib/subscription/tiers";
import { isSubscriptionGatingDisabled } from "@/lib/subscriptionTesting";

import {
  IDEAL_SOLUTIONS_PRO_ENTITLEMENT,
  LEGACY_ENTITLEMENT_IDS,
  PRO_PACKAGE_IDENTIFIERS,
  PRO_STORE_PRODUCT_IDS,
  type ProBillingPeriod,
} from "./constants";
import { isPurchaseCancelledError, purchasesErrorMessage } from "./errors";

export type PurchasesModule = typeof import("react-native-purchases").default;
export type PurchasesUiModule = typeof import("react-native-purchases-ui").default;

export type RevenueCatResult = { ok: true } | { ok: false; message: string; cancelled?: boolean };

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

export function isPurchasesUiAvailable(): boolean {
  return getPurchasesUi() !== null;
}

export async function configurePurchases(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: "Subscriptions are disabled for testing." };
  }
  if (Platform.OS === "web") {
    return { ok: false, message: "In-app purchases run on iOS/Android builds (use a dev client with native modules)." };
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
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
    Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: purchasesErrorMessage(error, "RevenueCat failed to configure. Use a dev build with native modules."),
    };
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  const Purchases = getPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
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

export async function findProPackage(period: ProBillingPeriod): Promise<PurchasesPackage | null> {
  const Purchases = getPurchases();
  if (!Purchases) return null;
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  return (
    findPackage(packages, PRO_PACKAGE_IDENTIFIERS[period], PRO_STORE_PRODUCT_IDS[period]) ?? null
  );
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<RevenueCatResult> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: "Subscriptions are disabled for testing." };
  }
  const Purchases = getPurchases();
  if (!Purchases) {
    return { ok: false, message: "Purchases require a native iOS or Android build." };
  }
  try {
    await Purchases.purchasePackage(pkg);
    return { ok: true };
  } catch (error) {
    if (isPurchaseCancelledError(error)) {
      return { ok: false, message: "Purchase cancelled.", cancelled: true };
    }
    return { ok: false, message: purchasesErrorMessage(error, "Purchase failed.") };
  }
}

export async function purchaseProPackage(period: ProBillingPeriod): Promise<RevenueCatResult> {
  const pkg = await findProPackage(period);
  if (!pkg) {
    return {
      ok: false,
      message: `No RevenueCat package for Ideal Solutions Pro (${period}). Add ${PRO_STORE_PRODUCT_IDS[period]} to the default offering.`,
    };
  }
  return purchasePackage(pkg);
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
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (error) {
    if (isPurchaseCancelledError(error)) {
      return { ok: false, message: "Restore cancelled.", cancelled: true };
    }
    return { ok: false, message: purchasesErrorMessage(error, "Restore failed.") };
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
