/** Unified supplier id — retailer catalog, supply-house preset, or integration-only. */
export type SupplierId = string;

export type SupplierCategory = "electrical" | "general" | "hvac" | "plumbing" | "other";

export type SupplierIconKind = "store" | "hammer" | "warehouse" | "cart" | "bolt";

export type SupplierRecord = {
  id: SupplierId;
  name: string;
  category: SupplierCategory;
  icon: SupplierIconKind;
  /** Primary iOS LSApplicationQueriesSchemes entry when known. */
  appScheme?: string;
  /** Play Store package ids for Android launcher matching. */
  packageNames?: readonly string[];
  /** Deep-link bases tried in order (without query). */
  nativeUrls?: readonly string[];
  universalLink?: string;
  website: string;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
  /** True when backed by MATERIAL_SUPPLIER_CATALOG entry. */
  isRetailerApp?: boolean;
};

export type SupplierIntegrationPrefs = {
  enableSupplierApps: boolean;
  autoOpenInstalled: boolean;
  askBeforeLaunch: boolean;
  websiteFallback: boolean;
  branchDetection: boolean;
  syncFavoritesWithTiles: boolean;
};

export type SupplierFavoritesState = {
  favoriteIds: string[];
  hiddenIds: string[];
  orderIds: string[];
  defaultSupplierId: string | null;
  lastUsedAt: Record<string, number>;
};

export type SupplierAccountInfo = {
  accountNumber?: string;
  branchCode?: string;
  taxExemptId?: string;
  preferredBranchName?: string;
  notes?: string;
};

export type QuickLaunchSupplier = SupplierRecord & {
  favorite: boolean;
  installed: boolean;
  lastUsedAt?: number;
  branchDistanceMi?: number;
  preferredBranch?: string;
};

export const DEFAULT_SUPPLIER_INTEGRATION_PREFS: SupplierIntegrationPrefs = {
  enableSupplierApps: true,
  autoOpenInstalled: true,
  askBeforeLaunch: false,
  websiteFallback: true,
  branchDetection: true,
  syncFavoritesWithTiles: true,
};

export const DEFAULT_SUPPLIER_FAVORITES: SupplierFavoritesState = {
  favoriteIds: [],
  hiddenIds: [],
  orderIds: [],
  defaultSupplierId: null,
  lastUsedAt: {},
};
