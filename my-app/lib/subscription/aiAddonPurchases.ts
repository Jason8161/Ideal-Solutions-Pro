import { Platform } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

import { configurePurchases, getPurchases, purchasePackage } from "@/lib/revenuecat/purchases";
import { PLAN_UNAVAILABLE_USER_MESSAGE } from "@/lib/revenuecat/errors";
import { isSubscriptionGatingDisabled, SUBSCRIPTIONS_TESTING_NOTICE } from "@/lib/subscriptionTesting";

import { addAddonCredits } from "./aiQuota";
import { AI_ADDON_TIERS, getAiAddonTier, type AiAddonTierId } from "./aiAddons";

export type AiAddonPurchaseResult = { ok: true; creditsAdded: number } | { ok: false; message: string };

function findAddonPackage(
  packages: PurchasesPackage[],
  packageId: string,
  productId: string,
): PurchasesPackage | undefined {
  return (
    packages.find((p) => p.identifier === packageId) ??
    packages.find((p) => p.product.identifier === productId)
  );
}

export async function purchaseAiAddon(tierId: AiAddonTierId): Promise<AiAddonPurchaseResult> {
  if (isSubscriptionGatingDisabled()) {
    return { ok: false, message: SUBSCRIPTIONS_TESTING_NOTICE };
  }

  const tier = getAiAddonTier(tierId);

  if (Platform.OS === "web") {
    return { ok: false, message: "AI add-ons are purchased in the iOS or Android app." };
  }

  const configured = await configurePurchases();
  if (!configured.ok) {
    return { ok: false, message: configured.message };
  }

  const Purchases = getPurchases();
  if (!Purchases) {
    return { ok: false, message: "Purchases require a native iOS or Android build." };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    const pkg = findAddonPackage(packages, tier.revenueCatPackageId, tier.revenueCatProductId);

    if (!pkg) {
      return {
        ok: false,
        message: PLAN_UNAVAILABLE_USER_MESSAGE,
      };
    }

    const result = await purchasePackage(pkg);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    await addAddonCredits(tier.credits);
    return { ok: true, creditsAdded: tier.credits };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase failed.";
    return { ok: false, message };
  }
}

export function listAiAddonProductIds(): string[] {
  return AI_ADDON_TIERS.map((t) => t.revenueCatProductId);
}
