import { Platform } from "react-native";

import {
  MATERIAL_SUPPLIER_CATALOG,
  materialSupplierById,
  storeUrlForPlatform,
  type MaterialSupplierDefinition,
} from "@/lib/materialSuppliers";
import {
  buildSupplyHouseSearchUrl,
  labelForSupplyHousePreset,
  SUPPLY_HOUSE_SUGGESTIONS,
  type SupplyHousePresetId,
} from "@/lib/supplierPresets";
import { isMaterialNativeAppSupplier } from "@/lib/materialNativeAppSuppliers";
import type { SupplierCategory, SupplierIconKind, SupplierRecord } from "@/lib/supplierIntegration/types";
import { getMaterialVendorLaunchConfig } from "@/lib/materialVendorLaunchConfig";

const ELECTRICAL_IDS = new Set<string>([
  "graybar",
  "cityelectric",
  "rexel",
  "platt",
  "wesco",
  "ced",
  "gexpro",
  "standard_electric",
  "elliott_electric",
  "border_states",
]);

const GENERAL_IDS = new Set<string>([
  "homedepot",
  "lowes",
  "grainger",
  "fastenal",
  "ferguson",
  "amazon",
  "menards",
  "ace",
  "truevalue",
  "harbor_freight",
]);

/** Supply houses in suggestions but not in SUPPLY_HOUSE_SUGGESTIONS — integration extras. */
const EXTRA_SUPPLY_HOUSES: readonly {
  id: SupplyHousePresetId | string;
  label: string;
  category: SupplierCategory;
}[] = [
  { id: "fastenal", label: "Fastenal", category: "general" },
  { id: "elliott_electric", label: "Elliott Electric", category: "electrical" },
  { id: "border_states", label: "Border States", category: "electrical" },
];

function categoryFor(id: string): SupplierCategory {
  if (ELECTRICAL_IDS.has(id)) return "electrical";
  if (GENERAL_IDS.has(id)) return "general";
  if (id === "ferguson" || id === "hajoca" || id === "winsupply") return "plumbing";
  if (id === "johnstone" || id === "baker") return "hvac";
  return "other";
}

function iconFor(id: string, def?: MaterialSupplierDefinition): SupplierIconKind {
  if (def?.icon) return def.icon;
  if (ELECTRICAL_IDS.has(id)) return "bolt";
  if (id === "amazon") return "cart";
  if (id === "grainger" || id === "fastenal") return "warehouse";
  return "store";
}

function recordFromMaterialSupplier(def: MaterialSupplierDefinition): SupplierRecord {
  const launch = getMaterialVendorLaunchConfig(def.id);
  const native = isMaterialNativeAppSupplier(def.id);
  const displayName = def.id === "amazon" ? "Amazon Business" : def.name;
  return {
    id: def.id,
    name: displayName,
    category: categoryFor(def.id),
    icon: iconFor(def.id, def),
    appScheme: native ? def.scheme : undefined,
    packageNames: native ? launch?.androidPackages : undefined,
    nativeUrls: native ? def.nativeUrls : undefined,
    website: def.webUrl,
    iosStoreUrl: native ? def.iosStoreUrl : undefined,
    androidStoreUrl: native ? def.androidStoreUrl : undefined,
    isRetailerApp: true,
  };
}

function recordFromPresetId(id: string, label: string): SupplierRecord {
  const launch = getMaterialVendorLaunchConfig(id);
  const native = isMaterialNativeAppSupplier(id);
  const web =
    buildSupplyHouseSearchUrl(id, "") ??
    `https://www.google.com/search?q=${encodeURIComponent(label + " supplies")}`;
  return {
    id,
    name: label,
    category: categoryFor(id),
    icon: iconFor(id),
    appScheme: native ? launch?.nativeUrls[0]?.replace(/:\/\/.*$/, "") : undefined,
    packageNames: native ? launch?.androidPackages : undefined,
    nativeUrls: native ? launch?.nativeUrls : undefined,
    website: web.split("?")[0] ?? web,
    iosStoreUrl: undefined,
    androidStoreUrl: undefined,
  };
}

const registry = new Map<string, SupplierRecord>();

function register(record: SupplierRecord): void {
  registry.set(record.id, record);
}

for (const def of MATERIAL_SUPPLIER_CATALOG) {
  register(recordFromMaterialSupplier(def));
}

for (const row of SUPPLY_HOUSE_SUGGESTIONS) {
  if (registry.has(row.id)) continue;
  register(recordFromPresetId(row.id, row.label));
}

for (const extra of EXTRA_SUPPLY_HOUSES) {
  if (registry.has(extra.id)) continue;
  register(recordFromPresetId(extra.id, extra.label));
}

export function getSupplierById(id: string): SupplierRecord | undefined {
  const cached = registry.get(id);
  if (cached) return cached;
  const material = materialSupplierById(id);
  if (material) return recordFromMaterialSupplier(material);
  return undefined;
}

export function getAllSuppliers(): SupplierRecord[] {
  return [...registry.values()];
}

export function storeUrlForSupplier(record: SupplierRecord): string | undefined {
  if (!isMaterialNativeAppSupplier(record.id)) return undefined;
  if (Platform.OS === "ios" && record.iosStoreUrl) return record.iosStoreUrl;
  if (Platform.OS === "android" && record.androidStoreUrl) return record.androidStoreUrl;
  const def = materialSupplierById(record.id);
  if (def) return storeUrlForPlatform(def);
  return record.iosStoreUrl ?? record.androidStoreUrl;
}

export function displayNameForSupplierId(id: string): string {
  return getSupplierById(id)?.name ?? labelForSupplyHousePreset(id);
}
