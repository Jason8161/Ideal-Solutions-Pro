import { Platform } from "react-native";

import { isMaterialNativeAppSupplier } from "@/lib/materialNativeAppSuppliers";
import {
  graingerSearchUrl,
  homeDepotSearchUrl,
  LOWES_ANDROID_PLAY_STORE_URL,
  LOWES_IOS_APP_STORE_URL,
  LOWES_WEBSITE_URL,
  lowesSearchUrl,
} from "@/lib/retailUrls";

/** Curated retailer / supplier apps — not an exhaustive OS app list (iOS cannot enumerate installed apps). */
export type MaterialSupplierId =
  | "homedepot"
  | "lowes"
  | "menards"
  | "ace"
  | "truevalue"
  | "grainger"
  | "harbor_freight"
  | "amazon";

export type MaterialSupplierDefinition = {
  id: MaterialSupplierId;
  name: string;
  /** Ionicons / MaterialCommunityIcons key — see materialSupplierIcon.tsx */
  icon: "store" | "hammer" | "warehouse" | "cart";
  /** Primary URL scheme registered for LSApplicationQueriesSchemes (iOS). */
  scheme: string;
  /** Deep links tried in order when opening the native app. */
  nativeUrls: readonly string[];
  /** Android Play Store package ids (launcher + intent launch). */
  androidPackages?: readonly string[];
  /** Lowercase substrings matched against launcher app labels (Android). */
  launcherNameHints?: readonly string[];
  iosStoreUrl: string;
  androidStoreUrl: string;
  /** Opens in browser when the native app is not installed. */
  webUrl: string;
};

export const MATERIAL_SUPPLIER_CATALOG: readonly MaterialSupplierDefinition[] = [
  {
    id: "homedepot",
    name: "Home Depot",
    icon: "store",
    scheme: "homedepot",
    nativeUrls: ["homedepot://", "com.thehomedepot.homedepot://"],
    androidPackages: ["com.thehomedepot"],
    launcherNameHints: ["home depot", "the home depot"],
    iosStoreUrl: "https://apps.apple.com/us/app/the-home-depot/id342527639",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.thehomedepot",
    webUrl: "https://www.homedepot.com/",
  },
  {
    id: "lowes",
    name: "Lowe's",
    icon: "store",
    scheme: "lowes",
    nativeUrls: ["lowes://"],
    androidPackages: ["com.lowes.android"],
    launcherNameHints: ["lowe's", "lowes"],
    iosStoreUrl: LOWES_IOS_APP_STORE_URL,
    androidStoreUrl: LOWES_ANDROID_PLAY_STORE_URL,
    webUrl: LOWES_WEBSITE_URL,
  },
  {
    id: "menards",
    name: "Menards",
    icon: "store",
    scheme: "menards",
    nativeUrls: ["menards://"],
    iosStoreUrl: "https://apps.apple.com/us/app/menards/id433835136",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.menards.mobile",
    webUrl: "https://www.menards.com/",
  },
  {
    id: "ace",
    name: "Ace Hardware",
    icon: "hammer",
    scheme: "acehardware",
    nativeUrls: ["acehardware://"],
    iosStoreUrl: "https://apps.apple.com/us/app/ace-hardware/id382628003",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.acehardware.rewards",
    webUrl: "https://www.acehardware.com/",
  },
  {
    id: "truevalue",
    name: "True Value",
    icon: "store",
    scheme: "truevalue",
    nativeUrls: ["truevalue://"],
    iosStoreUrl: "https://apps.apple.com/us/app/true-value/id1081685611",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.truevalue.truevalue",
    webUrl: "https://www.truevalue.com/",
  },
  {
    id: "grainger",
    name: "Grainger",
    icon: "warehouse",
    scheme: "grainger",
    nativeUrls: ["grainger://"],
    iosStoreUrl: "https://apps.apple.com/us/app/grainger/id467270064",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.grainger.mobile.android",
    webUrl: "https://www.grainger.com/",
  },
  {
    id: "harbor_freight",
    name: "Harbor Freight",
    icon: "store",
    scheme: "harborfreight",
    nativeUrls: ["harborfreight://"],
    androidPackages: ["com.harborfreight.app"],
    launcherNameHints: ["harbor freight"],
    iosStoreUrl: "https://apps.apple.com/us/app/harbor-freight-tools/id1054257730",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.harborfreight.app",
    webUrl: "https://www.harborfreight.com/",
  },
  {
    id: "amazon",
    name: "Amazon",
    icon: "cart",
    scheme: "amazon",
    nativeUrls: ["amazon://", "com.amazon.mobile.shopping://"],
    iosStoreUrl: "https://apps.apple.com/us/app/amazon-shopping/id297606951",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.amazon.mShop.android.shopping",
    webUrl: "https://www.amazon.com/",
  },
] as const;

const catalogById = new Map(MATERIAL_SUPPLIER_CATALOG.map((s) => [s.id, s]));

export function materialSupplierById(id: string): MaterialSupplierDefinition | undefined {
  return catalogById.get(id as MaterialSupplierId);
}

export function labelForMaterialSupplier(id: MaterialSupplierId): string {
  return materialSupplierById(id)?.name ?? id;
}

export function storeUrlForPlatform(def: MaterialSupplierDefinition): string {
  return Platform.OS === "ios" ? def.iosStoreUrl : def.androidStoreUrl;
}

/** Web search URL when user has a query (falls back to retailer home). */
export function webSearchUrlForSupplier(id: MaterialSupplierId, query?: string): string {
  const q = query?.trim() ?? "";
  if (!q) {
    return materialSupplierById(id)?.webUrl ?? "https://www.google.com/";
  }
  switch (id) {
    case "homedepot":
      return homeDepotSearchUrl(q);
    case "lowes":
      return lowesSearchUrl(q);
    case "grainger":
      return graingerSearchUrl(q);
    case "amazon":
      return `https://www.amazon.com/s?k=${encodeURIComponent(q)}`;
    default: {
      const base = materialSupplierById(id)?.webUrl ?? "https://www.google.com/";
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}search=${encodeURIComponent(q)}`;
    }
  }
}

/** URL schemes for LSApplicationQueriesSchemes — Home Depot and Lowe's only. */
export function materialSupplierQuerySchemes(): string[] {
  const schemes = new Set<string>();
  for (const s of MATERIAL_SUPPLIER_CATALOG) {
    if (!isMaterialNativeAppSupplier(s.id)) continue;
    schemes.add(s.scheme);
    for (const url of s.nativeUrls) {
      const m = /^([a-z][a-z0-9+.-]*):/i.exec(url);
      if (m) schemes.add(m[1].toLowerCase());
    }
  }
  return [...schemes];
}
