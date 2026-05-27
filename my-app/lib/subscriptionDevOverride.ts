import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  normalizeSubscriptionTierId,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_TIER_ORDER,
  type SubscriptionPlan,
  type SubscriptionTierId,
} from "@/lib/subscriptionPlans";

/** AsyncStorage key for Expo dev subscription simulation. */
export const SUBSCRIPTION_DEV_OVERRIDE_STORAGE_KEY = "ideal_solutions_subscription_dev_override_v1";

export type SubscriptionDevOverride = {
  simulationEnabled: boolean;
  activeTierOverride: SubscriptionTierId | null;
  availableTiers: SubscriptionTierId[];
};

const DEFAULT_AVAILABLE: SubscriptionTierId[] = [...SUBSCRIPTION_TIER_ORDER];

export const DEFAULT_SUBSCRIPTION_DEV_OVERRIDE: SubscriptionDevOverride = {
  simulationEnabled: false,
  activeTierOverride: null,
  availableTiers: DEFAULT_AVAILABLE,
};

export { SUBSCRIPTION_TIER_ORDER };

export const DEV_SIMULATED_TIER_OPTIONS: { id: SubscriptionTierId | null; label: string }[] = [
  { id: null, label: "None (use RevenueCat)" },
  { id: "locked", label: "Locked (trial ended)" },
  { id: "side_hustle", label: "Side Hustle / DIY" },
  { id: "boss_man", label: "Boss Man" },
  { id: "super_boss_man", label: "Super Boss Man" },
  { id: "enterprise_boss_man", label: "Enterprise Boss Man" },
];

function normalizeAvailableTiers(raw: unknown): SubscriptionTierId[] {
  if (!Array.isArray(raw)) return DEFAULT_AVAILABLE;
  const allowed = new Set<SubscriptionTierId>(SUBSCRIPTION_TIER_ORDER);
  const out: SubscriptionTierId[] = [];
  for (const item of raw) {
    if (typeof item === "string" && allowed.has(item as SubscriptionTierId)) {
      out.push(item as SubscriptionTierId);
    }
  }
  return out.length > 0 ? out : DEFAULT_AVAILABLE;
}

function normalizeOverride(parsed: Partial<SubscriptionDevOverride>): SubscriptionDevOverride {
  const allowed = new Set<SubscriptionTierId>(SUBSCRIPTION_TIER_ORDER);
  let activeTierOverride: SubscriptionTierId | null = null;
  if (parsed.activeTierOverride != null) {
    const normalized = normalizeSubscriptionTierId(parsed.activeTierOverride);
    if (allowed.has(normalized)) {
      activeTierOverride = normalized;
    }
  }
  return {
    simulationEnabled: parsed.simulationEnabled === true,
    activeTierOverride,
    availableTiers: normalizeAvailableTiers(parsed.availableTiers),
  };
}

export async function loadSubscriptionDevOverride(): Promise<SubscriptionDevOverride> {
  if (!__DEV__) return { ...DEFAULT_SUBSCRIPTION_DEV_OVERRIDE };
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTION_DEV_OVERRIDE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SUBSCRIPTION_DEV_OVERRIDE };
    return normalizeOverride(JSON.parse(raw) as Partial<SubscriptionDevOverride>);
  } catch {
    return { ...DEFAULT_SUBSCRIPTION_DEV_OVERRIDE };
  }
}

export async function saveSubscriptionDevOverride(override: SubscriptionDevOverride): Promise<void> {
  if (!__DEV__) return;
  const normalized = normalizeOverride(override);
  await AsyncStorage.setItem(SUBSCRIPTION_DEV_OVERRIDE_STORAGE_KEY, JSON.stringify(normalized));
}

export async function clearSubscriptionDevOverride(): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.removeItem(SUBSCRIPTION_DEV_OVERRIDE_STORAGE_KEY);
}

export function isDevActiveTierOverride(override: SubscriptionDevOverride | null): boolean {
  return __DEV__ === true && override?.simulationEnabled === true && override.activeTierOverride != null;
}

export function subscriptionPlansForPicker(
  override: SubscriptionDevOverride | null,
  allPlans: SubscriptionPlan[] = SUBSCRIPTION_PLANS,
): SubscriptionPlan[] {
  if (!__DEV__ || !override?.simulationEnabled) return allPlans;
  const allowed = new Set(override.availableTiers);
  const filtered = allPlans.filter((p) => allowed.has(p.id));
  return filtered.length > 0 ? filtered : allPlans;
}

export function tierAvailabilityLabel(id: SubscriptionTierId): string {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === id);
  return plan?.name ?? id;
}
