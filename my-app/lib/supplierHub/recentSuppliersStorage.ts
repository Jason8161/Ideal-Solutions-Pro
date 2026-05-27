import {
  loadSupplierFavorites,
  recordSupplierLastUsed,
} from "@/lib/supplierIntegration/preferencesStorage";

import { SUPPLIER_HUB_IDS } from "@/lib/supplierHub/supplierConfig";

const hubIdSet = new Set(SUPPLIER_HUB_IDS);

/** Persist a supplier open in shared favorites storage (`lastUsedAt`). */
export async function recordRecentSupplier(supplierId: string): Promise<void> {
  if (!hubIdSet.has(supplierId)) return;
  await recordSupplierLastUsed(supplierId);
}

/** Most recently opened Supplier Hub entries (newest first). */
export async function loadRecentSupplierIds(limit = 6): Promise<string[]> {
  const state = await loadSupplierFavorites();
  return Object.entries(state.lastUsedAt)
    .filter(([id]) => hubIdSet.has(id))
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => id);
}
