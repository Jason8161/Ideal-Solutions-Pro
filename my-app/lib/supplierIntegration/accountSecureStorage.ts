import * as SecureStore from "expo-secure-store";

import type { SupplierAccountInfo } from "@/lib/supplierIntegration/types";

const KEY_PREFIX = "ideal_supplier_account_v1_";

function storageKey(supplierId: string): string {
  return `${KEY_PREFIX}${supplierId}`;
}

export async function loadSupplierAccount(supplierId: string): Promise<SupplierAccountInfo | null> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey(supplierId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    return {
      accountNumber: str(o.accountNumber),
      branchCode: str(o.branchCode),
      taxExemptId: str(o.taxExemptId),
      preferredBranchName: str(o.preferredBranchName),
      notes: str(o.notes),
    };
  } catch {
    return null;
  }
}

export async function saveSupplierAccount(
  supplierId: string,
  info: SupplierAccountInfo,
): Promise<void> {
  const payload: SupplierAccountInfo = {
    accountNumber: info.accountNumber?.trim() || undefined,
    branchCode: info.branchCode?.trim() || undefined,
    taxExemptId: info.taxExemptId?.trim() || undefined,
    preferredBranchName: info.preferredBranchName?.trim() || undefined,
    notes: info.notes?.trim() || undefined,
  };
  const hasData = Object.values(payload).some(Boolean);
  if (!hasData) {
    await SecureStore.deleteItemAsync(storageKey(supplierId));
    return;
  }
  await SecureStore.setItemAsync(storageKey(supplierId), JSON.stringify(payload));
}

export async function clearSupplierAccount(supplierId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(storageKey(supplierId));
  } catch {
    /* missing key */
  }
}
