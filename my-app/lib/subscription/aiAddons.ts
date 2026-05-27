/**
 * AI add-on credit packs — consumable RevenueCat products.
 * Store IDs must match App Store Connect, Google Play, and RevenueCat dashboard.
 */

export type AiAddonTierId = "plus_100" | "plus_500" | "plus_2000" | "plus_5000";

export type AiAddonTier = {
  id: AiAddonTierId;
  /** Extra AI questions added to your add-on bank after purchase */
  credits: number;
  priceLabel: string;
  /** App Store / Play / RevenueCat product identifier */
  revenueCatProductId: string;
  /** RevenueCat package identifier in the default offering (fallback: product id) */
  revenueCatPackageId: string;
  headline: string;
  hint: string;
};

export const AI_ADDON_TIERS: readonly AiAddonTier[] = [
  {
    id: "plus_100",
    credits: 100,
    priceLabel: "$4.99",
    revenueCatProductId: "ideal_ai_addon_100",
    revenueCatPackageId: "ideal_ai_addon_100",
    headline: "+100 AI questions",
    hint: "Good for a busy week of estimates and field questions.",
  },
  {
    id: "plus_500",
    credits: 500,
    priceLabel: "$14.99",
    revenueCatProductId: "ideal_ai_addon_500",
    revenueCatPackageId: "ideal_ai_addon_500",
    headline: "+500 AI questions",
    hint: "Best value for owners who lean on AI daily.",
  },
  {
    id: "plus_2000",
    credits: 2000,
    priceLabel: "$39.99",
    revenueCatProductId: "ideal_ai_addon_2000",
    revenueCatPackageId: "ideal_ai_addon_2000",
    headline: "+2,000 AI questions",
    hint: "Heavy estimating seasons and photo-to-estimate runs.",
  },
  {
    id: "plus_5000",
    credits: 5000,
    priceLabel: "$79.99",
    revenueCatProductId: "ideal_ai_addon_5000",
    revenueCatPackageId: "ideal_ai_addon_5000",
    headline: "+5,000 AI questions",
    hint: "Maximum pack for teams running AI all day on jobsites.",
  },
] as const;

export function getAiAddonTier(id: AiAddonTierId): AiAddonTier {
  const tier = AI_ADDON_TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown AI add-on tier: ${id}`);
  return tier;
}
