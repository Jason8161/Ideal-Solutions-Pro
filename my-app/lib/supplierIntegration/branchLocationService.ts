import * as Location from "expo-location";

import { loadSupplierIntegrationPrefs } from "@/lib/supplierIntegration/preferencesStorage";

export type BranchProximity = {
  branchLabel: string;
  distanceMi?: number;
};

/**
 * Phase 1: no branch directory API — returns preferred branch name from account when set.
 * When branch detection is enabled and location permission granted, distance is omitted (future).
 */
export async function resolveBranchProximity(
  supplierId: string,
  preferredBranchName?: string,
): Promise<BranchProximity | null> {
  const prefs = await loadSupplierIntegrationPrefs();
  if (!prefs.branchDetection) return null;
  if (preferredBranchName?.trim()) {
    return { branchLabel: preferredBranchName.trim() };
  }

  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") return null;
    /* Branch geodata not bundled — graceful no-op */
    return null;
  } catch {
    return null;
  }
}
