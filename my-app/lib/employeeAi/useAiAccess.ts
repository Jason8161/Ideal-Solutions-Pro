import { useCallback, useEffect, useState } from "react";

import { useSubscription } from "@/context/SubscriptionContext";

import { resolveAiAccess, type ResolvedAiAccess } from "./access";
import { readEmployeeTierFromStore } from "./employeePurchases";
import type { EmployeeAiTierId } from "./types";

const DEV_TIER_KEY = "ideal_employee_ai_dev_tier_v1";

async function loadDevEmployeeTier(): Promise<EmployeeAiTierId | null> {
  if (!__DEV__) return null;
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(DEV_TIER_KEY);
    if (raw === "pro_employee" || raw === "field_supervisor" || raw === "free") return raw;
    return null;
  } catch {
    return null;
  }
}

export async function saveDevEmployeeTier(tier: EmployeeAiTierId | null): Promise<void> {
  if (!__DEV__) return;
  const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
  if (tier === null) {
    await AsyncStorage.removeItem(DEV_TIER_KEY);
  } else {
    await AsyncStorage.setItem(DEV_TIER_KEY, tier);
  }
}

export function useAiAccess() {
  const { activeTier, isTestingUnlocked } = useSubscription();
  const [access, setAccess] = useState<ResolvedAiAccess | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [purchased, devOverride] = await Promise.all([
      readEmployeeTierFromStore(),
      loadDevEmployeeTier(),
    ]);
    const resolved = await resolveAiAccess({
      ownerSubscriptionTier: activeTier,
      purchasedEmployeeTier: purchased,
      devEmployeeTierOverride: devOverride,
    });
    if (isTestingUnlocked) {
      resolved.check.allowed = true;
      resolved.check.atLimit = false;
      resolved.check.nearingLimit = false;
      resolved.check.blockReason = null;
    }
    setAccess(resolved);
    setLoading(false);
    return resolved;
  }, [activeTier, isTestingUnlocked]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { access, loading, refresh };
}
