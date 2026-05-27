import { Alert } from "react-native";

import {
  assignMaterialSupplierAppShortcut,
  canMaterialSupplierBeAppShortcut,
  loadMaterialSupplierAppShortcutIds,
} from "@/lib/materialSupplierAppShortcuts";
import {
  materialSupplierById,
  type MaterialSupplierDefinition,
  type MaterialSupplierId,
} from "@/lib/materialSuppliers";
import { launchMaterialSupplier, type LaunchUiHandlers } from "@/lib/supplierIntegration/launchService";
import { loadMaterialsSearchTileKeys } from "@/lib/materialsSearchSuppliers";
import { isMaterialVendorNativeAvailable } from "@/lib/openMaterialVendorApp";
import { buildSupplyHouseSearchUrl } from "@/lib/supplierPresets";

export async function isMaterialSupplierAppInstalled(def: MaterialSupplierDefinition): Promise<boolean> {
  return isMaterialVendorNativeAvailable(def.id);
}

async function openVendorAppFirst(
  vendorKey: string,
  query?: string,
  ui?: LaunchUiHandlers,
): Promise<void> {
  await launchMaterialSupplier(vendorKey, { query, ui });
}

/**
 * Opens a saved app shortcut directly (native app when installed, otherwise website).
 */
export async function openMaterialSupplierAppShortcut(
  supplierId: MaterialSupplierId,
  options?: { query?: string; ui?: LaunchUiHandlers },
): Promise<void> {
  const def = materialSupplierById(supplierId);
  if (!def) {
    Alert.alert("Not found", "This supplier is no longer in the catalog.");
    return;
  }
  const allowed = await loadMaterialsSearchTileKeys();
  if (!allowed.includes(supplierId)) {
    Alert.alert(
      "Not on your list",
      `Add ${def.name} under Settings → My supply houses or Material search suppliers.`,
    );
    return;
  }

  if (canMaterialSupplierBeAppShortcut(supplierId)) {
    const shortcuts = await loadMaterialSupplierAppShortcutIds();
    if (!shortcuts.includes(supplierId)) {
      await assignMaterialSupplierAppShortcut(supplierId);
    }
  }

  await openVendorAppFirst(supplierId, options?.query, options?.ui);
}

/**
 * Opens a tile from Materials search — native app first, website if not installed.
 */
export async function openMaterialsSearchEntry(
  key: string,
  options?: { query?: string; ui?: LaunchUiHandlers },
): Promise<void> {
  const appDef = materialSupplierById(key);

  if (appDef || buildSupplyHouseSearchUrl(key, "") != null) {
    await openVendorAppFirst(key, options?.query, options?.ui);
    return;
  }

  Alert.alert("Not found", "This supplier is no longer available.");
}

/**
 * Opens a material supplier: native app when installed, otherwise website.
 */
export async function openMaterialSupplier(
  supplierId: MaterialSupplierId,
  options?: { query?: string; ui?: LaunchUiHandlers },
): Promise<void> {
  await openMaterialsSearchEntry(supplierId, options);
}

export type { LaunchUiHandlers };
