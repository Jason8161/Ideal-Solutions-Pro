/**
 * Cloud storage IAP add-ons — local storage default; cloud backup via IAP scaffold.
 */

export type StorageAddonTierId = "storage_5gb" | "storage_25gb";

export type StorageAddonTier = {
  id: StorageAddonTierId;
  storageGb: number;
  priceLabel: string;
  revenueCatProductId: string;
  revenueCatPackageId: string;
  headline: string;
  hint: string;
};

export const STORAGE_ADDON_TIERS: readonly StorageAddonTier[] = [
  {
    id: "storage_5gb",
    storageGb: 5,
    priceLabel: "$4.99/mo",
    revenueCatProductId: "ideal_storage_5gb_monthly",
    revenueCatPackageId: "ideal_storage_5gb_monthly",
    headline: "5 GB cloud storage",
    hint: "Backup photos and job files to the cloud.",
  },
  {
    id: "storage_25gb",
    storageGb: 25,
    priceLabel: "$14.99/mo",
    revenueCatProductId: "ideal_storage_25gb_monthly",
    revenueCatPackageId: "ideal_storage_25gb_monthly",
    headline: "25 GB cloud storage",
    hint: "More room for job photos and documents.",
  },
];

export function getStorageAddonTier(id: StorageAddonTierId): StorageAddonTier {
  const tier = STORAGE_ADDON_TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown storage addon: ${id}`);
  return tier;
}

/** Scaffold — employees purchase personal cloud add-ons; boss manages company tier separately. */
export async function purchaseStorageAddon(
  tierId: StorageAddonTierId,
): Promise<{ ok: boolean; message?: string }> {
  const tier = getStorageAddonTier(tierId);
  return {
    ok: false,
    message: `${tier.headline} IAP scaffold — add ${tier.revenueCatProductId} in RevenueCat to enable.`,
  };
}
