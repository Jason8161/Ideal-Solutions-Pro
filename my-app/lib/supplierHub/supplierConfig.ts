import { Platform } from "react-native";

import { isMaterialNativeAppSupplier } from "@/lib/materialNativeAppSuppliers";
import {
  LOWES_ANDROID_PLAY_STORE_URL,
  LOWES_IOS_APP_STORE_URL,
  LOWES_WEBSITE_URL,
} from "@/lib/retailUrls";
import { INTEGRATION_SUPPLIER_ORDER } from "@/lib/supplierIntegration/integrationSuppliers";
import type { SupplierIconKind } from "@/lib/supplierIntegration/types";

export type SupplierHubCategory = "Electrical" | "Retail" | "Industrial";

/** Curated Supplier Hub entry — homepage app launch (HD/Lowe only) and website. */
export type SupplierHubConfig = {
  id: string;
  name: string;
  /** When true, Offer Open App / Install; only Home Depot and Lowe's. */
  supportsNativeApp: boolean;
  iosScheme?: string;
  androidPackage?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  websiteUrl: string;
  category: SupplierHubCategory;
  logo: SupplierIconKind;
};

/** @deprecated Use SupplierHubConfig — kept for UI imports during transition. */
export type SupplierHubEntry = SupplierHubConfig & {
  website: string;
  iosAppUrl?: string;
  androidAppUrl?: string;
  appScheme?: string;
  packageName?: string;
};

const SUPPLIER_HUB_CATALOG_BY_ID: Readonly<Record<string, SupplierHubConfig>> = {
  homedepot: {
    id: "homedepot",
    name: "Home Depot",
    supportsNativeApp: true,
    iosScheme: "homedepot",
    androidPackage: "com.thehomedepot",
    appStoreUrl: "https://apps.apple.com/us/app/the-home-depot/id342527639",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.thehomedepot",
    websiteUrl: "https://www.homedepot.com/",
    category: "Retail",
    logo: "store",
  },
  lowes: {
    id: "lowes",
    name: "Lowe's",
    supportsNativeApp: true,
    iosScheme: "lowes",
    androidPackage: "com.lowes.android",
    appStoreUrl: LOWES_IOS_APP_STORE_URL,
    playStoreUrl: LOWES_ANDROID_PLAY_STORE_URL,
    websiteUrl: LOWES_WEBSITE_URL,
    category: "Retail",
    logo: "store",
  },
  graybar: {
    id: "graybar",
    name: "Graybar",
    supportsNativeApp: false,
    websiteUrl: "https://www.graybar.com/",
    category: "Electrical",
    logo: "bolt",
  },
  grainger: {
    id: "grainger",
    name: "Grainger",
    supportsNativeApp: false,
    websiteUrl: "https://www.grainger.com/",
    category: "Electrical",
    logo: "warehouse",
  },
  fastenal: {
    id: "fastenal",
    name: "Fastenal",
    supportsNativeApp: false,
    websiteUrl: "https://www.fastenal.com/",
    category: "Industrial",
    logo: "warehouse",
  },
  amazon: {
    id: "amazon",
    name: "Amazon Business",
    supportsNativeApp: false,
    websiteUrl: "https://www.amazon.com/",
    category: "Retail",
    logo: "cart",
  },
  rexel: {
    id: "rexel",
    name: "Rexel",
    supportsNativeApp: false,
    websiteUrl: "https://www.rexelusa.com/",
    category: "Electrical",
    logo: "bolt",
  },
  cityelectric: {
    id: "cityelectric",
    name: "CES",
    supportsNativeApp: false,
    websiteUrl: "https://www.cityelectricsupply.com/",
    category: "Electrical",
    logo: "bolt",
  },
  ferguson: {
    id: "ferguson",
    name: "Ferguson",
    supportsNativeApp: false,
    websiteUrl: "https://www.ferguson.com/",
    category: "Industrial",
    logo: "store",
  },
  platt: {
    id: "platt",
    name: "Platt",
    supportsNativeApp: false,
    websiteUrl: "https://www.platt.com/",
    category: "Electrical",
    logo: "bolt",
  },
};

const SUPPLIER_HUB_CATALOG: readonly SupplierHubConfig[] = INTEGRATION_SUPPLIER_ORDER.map(
  (id) => SUPPLIER_HUB_CATALOG_BY_ID[id],
).filter((s): s is SupplierHubConfig => s != null);

const catalogById = new Map(SUPPLIER_HUB_CATALOG.map((s) => [s.id, s]));

export const SUPPLIER_HUB_IDS: readonly string[] = SUPPLIER_HUB_CATALOG.map((s) => s.id);

/** Supplier ids probed for installed native apps (Home Depot, Lowe's only). */
export const SUPPLIER_HUB_NATIVE_PROBE_IDS: readonly string[] = SUPPLIER_HUB_CATALOG.filter(
  (s) => s.supportsNativeApp,
).map((s) => s.id);

export const SUPPLIER_HUB_CATEGORIES: readonly SupplierHubCategory[] = [
  "Electrical",
  "Retail",
  "Industrial",
  "Favorites",
];

/** Whether Supplier Hub can launch a native app for this supplier. */
export function supplierHubHasNativeApp(config: SupplierHubConfig | SupplierHubEntry): boolean {
  return config.supportsNativeApp === true && isMaterialNativeAppSupplier(config.id);
}

export function getSupplierHubCatalog(): SupplierHubEntry[] {
  return SUPPLIER_HUB_CATALOG.map(toSupplierHubEntry);
}

export function getSupplierHubConfigs(): SupplierHubConfig[] {
  return [...SUPPLIER_HUB_CATALOG];
}

export function getSupplierHubConfig(id: string): SupplierHubConfig | undefined {
  return catalogById.get(id);
}

/** Legacy shape for components expecting website / appScheme fields. */
export function toSupplierHubEntry(config: SupplierHubConfig): SupplierHubEntry {
  return {
    ...config,
    website: config.websiteUrl,
    iosAppUrl: config.appStoreUrl,
    androidAppUrl: config.playStoreUrl,
    appScheme: config.iosScheme,
    packageName: config.androidPackage,
  };
}

export function getSupplierHubEntry(id: string): SupplierHubEntry | undefined {
  const config = getSupplierHubConfig(id);
  return config ? toSupplierHubEntry(config) : undefined;
}

export function storeUrlForHubSupplier(config: SupplierHubConfig): string | undefined {
  if (!config.supportsNativeApp) return undefined;
  if (Platform.OS === "ios") return config.appStoreUrl;
  if (Platform.OS === "android") return config.playStoreUrl;
  return config.appStoreUrl ?? config.playStoreUrl;
}
