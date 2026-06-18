/**
 * Employee AI credit IAP add-ons — consumable products for field workers.
 * Counts against company plan pool; scaffold until RevenueCat employee SKU is live.
 */

export type EmployeeAiAddonTierId = "crew_ai_50" | "crew_ai_200";

export type EmployeeAiAddonTier = {
  id: EmployeeAiAddonTierId;
  credits: number;
  priceLabel: string;
  revenueCatProductId: string;
  revenueCatPackageId: string;
  headline: string;
  hint: string;
};

export const EMPLOYEE_AI_ADDON_TIERS: readonly EmployeeAiAddonTier[] = [
  {
    id: "crew_ai_50",
    credits: 50,
    priceLabel: "$2.99",
    revenueCatProductId: "ideal_crew_ai_addon_50",
    revenueCatPackageId: "ideal_crew_ai_addon_50",
    headline: "+50 crew AI questions",
    hint: "Personal add-on credits for field AI.",
  },
  {
    id: "crew_ai_200",
    credits: 200,
    priceLabel: "$9.99",
    revenueCatProductId: "ideal_crew_ai_addon_200",
    revenueCatPackageId: "ideal_crew_ai_addon_200",
    headline: "+200 crew AI questions",
    hint: "Extra field AI when company plan is tight.",
  },
];

export function getEmployeeAiAddonTier(id: EmployeeAiAddonTierId): EmployeeAiAddonTier {
  const tier = EMPLOYEE_AI_ADDON_TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown employee AI addon: ${id}`);
  return tier;
}

/** Scaffold — purchase flow mirrors lib/subscription/aiAddonPurchases.ts when SKUs ship. */
export async function purchaseEmployeeAiAddon(
  tierId: EmployeeAiAddonTierId,
): Promise<{ ok: boolean; message?: string; creditsAdded?: number }> {
  const tier = getEmployeeAiAddonTier(tierId);
  return {
    ok: false,
    message: `${tier.headline} IAP scaffold — add ${tier.revenueCatProductId} in RevenueCat to enable.`,
  };
}
