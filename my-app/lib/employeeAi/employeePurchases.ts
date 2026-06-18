import Constants from "expo-constants";
import { Platform } from "react-native";

import { isSubscriptionGatingDisabled, SUBSCRIPTIONS_TESTING_NOTICE } from "@/lib/subscriptionTesting";
import { PLAN_UNAVAILABLE_USER_MESSAGE } from "@/lib/revenuecat/errors";

import { EMPLOYEE_AI_PLANS, getEmployeeAiPlan } from "./tiers";
import type { EmployeeAiTierId } from "./types";

/** In-app employee self-serve billing disabled — crew AI is on the company app subscription. */
export const EMPLOYEE_AI_SELF_SERVE_PURCHASES_ENABLED = false;

const CREW_AI_INCLUDED_MESSAGE =
  "Crew AI is included with your company's Pro Contractor or Boss Man app subscription. No separate employee AI purchase is needed.";

type PurchasesModule = typeof import("react-native-purchases").default;

function getPurchases(): PurchasesModule | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-purchases").default as PurchasesModule;
  } catch {
    return null;
  }
}

/** Highest active employee tier from RevenueCat entitlements. */
export function highestEmployeeTierFromEntitlements(
  active: Record<string, unknown>,
): EmployeeAiTierId | null {
  let best: EmployeeAiTierId | null = null;
  let bestRank = -1;

  for (const plan of EMPLOYEE_AI_PLANS) {
    if (!plan.revenueCatEntitlementId) continue;
    if (active[plan.revenueCatEntitlementId]) {
      const rank = plan.id === "field_supervisor" ? 2 : plan.id === "pro_employee" ? 1 : 0;
      if (rank > bestRank) {
        bestRank = rank;
        best = plan.id;
      }
    }
  }
  return best;
}

export async function readEmployeeTierFromStore(): Promise<EmployeeAiTierId | null> {
  if (isSubscriptionGatingDisabled()) return "field_supervisor";
  if (Platform.OS === "web") return null;
  const Purchases = getPurchases();
  if (!Purchases) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    return highestEmployeeTierFromEntitlements(info.entitlements.active);
  } catch {
    return null;
  }
}

export async function purchaseEmployeeTier(
  tierId: EmployeeAiTierId,
): Promise<{ ok: boolean; message?: string }> {
  if (!EMPLOYEE_AI_SELF_SERVE_PURCHASES_ENABLED) {
    return { ok: false, message: CREW_AI_INCLUDED_MESSAGE };
  }
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: SUBSCRIPTIONS_TESTING_NOTICE };
  }
  const plan = getEmployeeAiPlan(tierId);
  if (!plan.isPaid) {
    return { ok: true };
  }
  if (Platform.OS === "web") {
    return { ok: false, message: "Employee subscriptions run on iOS/Android builds." };
  }
  const Purchases = getPurchases();
  if (!Purchases) {
    return { ok: false, message: "Purchases require a native iOS or Android build." };
  }
  const extra = Constants.expoConfig?.extra as
    | { revenueCatAppleApiKey?: string; revenueCatGoogleApiKey?: string }
    | undefined;
  const apiKey =
    Platform.OS === "ios"
      ? extra?.revenueCatAppleApiKey
      : Platform.OS === "android"
        ? extra?.revenueCatGoogleApiKey
        : "";
  if (!apiKey) {
    return {
      ok: false,
      message: "RevenueCat keys missing. Add EXPO_PUBLIC_RC_APPLE_KEY / EXPO_PUBLIC_RC_GOOGLE_KEY.",
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    const productId = plan.revenueCatProductId;
    const packageId = plan.revenueCatPackageId;
    const pkg =
      packages.find((p) => p.identifier === packageId) ??
      packages.find((p) => p.product.identifier === productId);

    if (!pkg) {
      return {
        ok: false,
        message: PLAN_UNAVAILABLE_USER_MESSAGE,
      };
    }
    await Purchases.purchasePackage(pkg);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Purchase failed.";
    return { ok: false, message: msg };
  }
}

export async function restoreEmployeePurchases(): Promise<{ ok: boolean; message?: string }> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: SUBSCRIPTIONS_TESTING_NOTICE };
  }
  if (Platform.OS === "web") return { ok: false, message: "Restore is not available on web." };
  const Purchases = getPurchases();
  if (!Purchases) return { ok: false, message: "Restore requires a native build." };
  try {
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Restore failed.";
    return { ok: false, message: msg };
  }
}
