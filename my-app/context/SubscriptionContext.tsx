import Constants from "expo-constants";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";

import {
  detectRuntimeTestFlight,
  getBetaAccessDebugInfo,
  resolveIsBetaFullAccess,
  setRuntimeTestFlightDetected,
} from "@/lib/betaAccess";
import {
  isPaidSubscriptionTier,
  normalizeSubscriptionTierId,
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan,
  tierRank,
  type SubscriptionPlan,
  type SubscriptionTierId,
} from "@/lib/subscriptionPlans";
import type { FeatureAccessContext } from "@/lib/subscription/featureAccess";
import {
  resolveSubscriptionAccess,
  type SubscriptionAccessSource,
} from "@/lib/subscription/accessResolver";
import {
  fetchFreeAccessOverrideForUser,
  type ResolvedFreeAccessOverride,
} from "@/lib/subscription/freeAccessOverride";
import { checkAiQuota, loadMonthlyAiUsage, type AiQuotaCheck, type MonthlyAiUsageSnapshot } from "@/lib/subscription/aiQuotaBridge";
import {
  getProTrialState,
  type ProTrialState,
} from "@/lib/subscription/trialStorage";
import {
  DEFAULT_SUBSCRIPTION_DEV_OVERRIDE,
  isDevActiveTierOverride,
  loadSubscriptionDevOverride,
  saveSubscriptionDevOverride,
  subscriptionPlansForPicker,
  type SubscriptionDevOverride,
} from "@/lib/subscriptionDevOverride";
import { syncHomeSubscriptionTier } from "@/lib/homeBoot";
import {
  getSubscriptionsTestingNotice,
  isSubscriptionGatingDisabled,
  SUBSCRIPTIONS_TESTING_NOTICE,
} from "@/lib/subscriptionTesting";
import { useAuth } from "@/lib/auth/AuthContext";
import { companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";

type SubscriptionContextValue = {
  loading: boolean;
  isConfigured: boolean;
  /** Paid tier from RevenueCat, or profile when offline */
  storeTier: SubscriptionTierId | null;
  profileTier: SubscriptionTierId;
  /** Admin-granted complimentary access from Supabase (null when none / not configured). */
  freeAccessOverride: ResolvedFreeAccessOverride | null;
  /** How {@link activeTier} was chosen (RevenueCat beats override). */
  accessSource: SubscriptionAccessSource;
  /** Tier used for feature gates (trial interest tier, paid tier, or locked) */
  activeTier: SubscriptionTierId;
  effectiveTier: SubscriptionTierId;
  isPro: boolean;
  /** 7-day trial with tier interest + 5 AI total */
  proTrial: ProTrialState;
  /** @deprecated Use proTrial */
  helperTrial: ProTrialState;
  subscriptionLocked: boolean;
  /** @deprecated Use subscriptionLocked */
  helperTrialExpired: boolean;
  featureAccessContext: FeatureAccessContext;
  monthlyAiUsage: MonthlyAiUsageSnapshot;
  aiQuotaCheck: AiQuotaCheck;
  /** @deprecated Use aiQuotaCheck */
  dailyAiCheck: AiQuotaCheck;
  dailyUsage: { aiQuestions: number };
  dailyImageCheck: { allowed: boolean; used: number; limit: number | null; remaining: number | null };
  isDevSimulating: boolean;
  isBetaFullAccess: boolean;
  isTestingUnlocked: boolean;
  subscriptionsTestingNotice: string | null;
  pickerPlans: SubscriptionPlan[];
  testFlightDetectionDone: boolean;
  runtimeTestFlight: boolean;
  errorMessage: string | null;
  /** Pass `{ silent: true }` to refresh without blocking gates (e.g. home focus). */
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  purchaseDefault: () => Promise<{ ok: boolean; message?: string }>;
  purchaseTier: (tierId: SubscriptionTierId) => Promise<{ ok: boolean; message?: string }>;
  restore: () => Promise<{ ok: boolean; message?: string }>;
  devOverride: SubscriptionDevOverride | null;
  setDevOverride: (override: SubscriptionDevOverride) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

function getLegacyEntitlementId(): string {
  return (Constants.expoConfig?.extra as { entitlementId?: string } | undefined)?.entitlementId ?? "pro";
}

function highestTierFromEntitlements(active: Record<string, unknown>): SubscriptionTierId | null {
  let best: SubscriptionTierId | null = null;
  let bestRank = -1;

  for (const plan of SUBSCRIPTION_PLANS) {
    if (!plan.revenueCatEntitlementId) continue;
    if (active[plan.revenueCatEntitlementId]) {
      const rank = tierRank(plan.id);
      if (rank > bestRank) {
        bestRank = rank;
        best = plan.id;
      }
    }
  }

  const legacy = getLegacyEntitlementId();
  if (active[legacy]) {
    const bossRank = tierRank("boss_man");
    if (bossRank > bestRank) {
      return "boss_man";
    }
  }

  const legacyIds = ["ideal_solutions_pro", "ideal_starter", "ideal_boss", "ideal_pro"];
  for (const id of legacyIds) {
    if (active[id]) {
      const mapped =
        id === "ideal_starter"
          ? "side_hustle"
          : id === "ideal_boss"
            ? "super_boss_man"
            : "boss_man";
      const rank = tierRank(mapped);
      if (rank > bestRank) {
        bestRank = rank;
        best = mapped;
      }
    }
  }

  return best;
}

type PurchasesModule = typeof import("react-native-purchases").default;

function getPurchases(): PurchasesModule | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-purchases").default as PurchasesModule;
  } catch {
    return null;
  }
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [storeTier, setStoreTier] = useState<SubscriptionTierId | null>(null);
  const [profileTier, setProfileTier] = useState<SubscriptionTierId>("locked");
  const [proTrial, setProTrial] = useState<ProTrialState>({
    interestTier: null,
    trialStartDate: null,
    daysRemaining: 7,
    isActive: false,
    isExpired: false,
    aiRequestsUsed: 0,
    aiLimit: 5,
    aiExhausted: false,
    trialUsed: false,
    isLocked: true,
  });
  const [monthlyAiUsage, setMonthlyAiUsage] = useState<MonthlyAiUsageSnapshot>({
    monthKey: "",
    requestsUsed: 0,
    resetDate: "",
  });
  const [freeAccessOverride, setFreeAccessOverride] = useState<ResolvedFreeAccessOverride | null>(null);
  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [devOverride, setDevOverrideState] = useState<SubscriptionDevOverride | null>(
    __DEV__ ? DEFAULT_SUBSCRIPTION_DEV_OVERRIDE : null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runtimeTestFlight, setRuntimeTestFlight] = useState(false);
  const [testFlightDetectionDone, setTestFlightDetectionDone] = useState(Platform.OS === "web");

  const loadDevOverride = useCallback(async () => {
    if (!__DEV__) {
      setDevOverrideState(null);
      return;
    }
    const loaded = await loadSubscriptionDevOverride();
    setDevOverrideState(loaded);
  }, []);

  const isDevSimulating = isDevActiveTierOverride(devOverride);
  const subscriptionsDisabled = isSubscriptionGatingDisabled();
  const isTestingUnlocked = subscriptionsDisabled;
  const subscriptionsTestingNotice = getSubscriptionsTestingNotice();
  const isBetaFullAccess = useMemo(
    () => resolveIsBetaFullAccess(runtimeTestFlight) || subscriptionsDisabled,
    [runtimeTestFlight, subscriptionsDisabled],
  );

  const resolvedAccess = useMemo(
    () =>
      resolveSubscriptionAccess({
        testingUnlocked: isTestingUnlocked,
        betaFullAccess: isBetaFullAccess,
        devOverride,
        storeTier,
        profileTier,
        freeAccessOverride,
        proTrial,
      }),
    [
      isTestingUnlocked,
      isBetaFullAccess,
      devOverride,
      storeTier,
      profileTier,
      freeAccessOverride,
      proTrial,
    ],
  );

  const hasPaidEntitlement = resolvedAccess.hasPaidEntitlement;
  const subscriptionLocked = resolvedAccess.subscriptionLocked;
  const activeTier = resolvedAccess.activeTier;
  const accessSource = resolvedAccess.source;

  const effectiveTier = activeTier;

  const pickerPlans = useMemo(
    () => subscriptionPlansForPicker(devOverride, SUBSCRIPTION_PLANS),
    [devOverride],
  );

  const isPro = tierRank(activeTier) >= tierRank("boss_man");

  const featureAccessContext = useMemo<FeatureAccessContext>(
    () => ({ subscriptionLocked, helperTrialExpired: subscriptionLocked }),
    [subscriptionLocked],
  );

  const aiQuotaCheck = useMemo(
    () =>
      checkAiQuota({
        tier: activeTier,
        trial: proTrial,
        monthlyUsage: monthlyAiUsage,
        hasPaidSubscription: hasPaidEntitlement,
      }),
    [activeTier, proTrial, monthlyAiUsage, hasPaidEntitlement],
  );

  const dailyAiCheck = aiQuotaCheck;
  const dailyUsage = useMemo(
    () => ({ aiQuestions: monthlyAiUsage.requestsUsed }),
    [monthlyAiUsage.requestsUsed],
  );
  const dailyImageCheck = useMemo(
    () => ({ allowed: true, used: 0, limit: null, remaining: null }),
    [],
  );

  const loadProfileTier = useCallback(async () => {
    const stored = await loadCompanyProfile();
    const full = companyProfileFromPartial(stored);
    setProfileTier(normalizeSubscriptionTierId(full.subscriptionTier));
  }, []);

  const readCustomerInfo = useCallback(
    async (userId?: string | null) => {
      const loadedDev = await loadSubscriptionDevOverride();

      const stored = await loadCompanyProfile();
      const profile = companyProfileFromPartial(stored);
      const profileTierValue = normalizeSubscriptionTierId(profile.subscriptionTier);

      let fromStore: SubscriptionTierId | null = null;
      let storeError = false;
      if (Platform.OS !== "web") {
        const Purchases = getPurchases();
        if (Purchases) {
          try {
            const info = await Purchases.getCustomerInfo();
            fromStore = highestTierFromEntitlements(info.entitlements.active);
            if (fromStore) fromStore = normalizeSubscriptionTierId(fromStore);
          } catch {
            storeError = true;
            fromStore = null;
          }
        }
      }

      const uid = userId ?? accessUserId;
      const overrideRow = uid ? await fetchFreeAccessOverrideForUser(uid) : null;

      const paid =
        isSubscriptionGatingDisabled() ||
        resolveIsBetaFullAccess(runtimeTestFlight) ||
        (fromStore !== null && isPaidSubscriptionTier(fromStore)) ||
        isPaidSubscriptionTier(profileTierValue) ||
        (overrideRow?.isActive ?? false);

      const [trial, usage] = await Promise.all([getProTrialState(paid), loadMonthlyAiUsage()]);

      if (__DEV__) {
        setDevOverrideState(loadedDev);
      }
      if (userId !== undefined) {
        setAccessUserId(userId);
      }
      setProfileTier(profileTierValue);
      setStoreTier(fromStore);
      if (!storeError) {
        setErrorMessage(null);
      }
      setProTrial(trial);
      setMonthlyAiUsage(usage);
      setFreeAccessOverride(overrideRow);

      const unlocked = resolveIsBetaFullAccess(runtimeTestFlight) || isSubscriptionGatingDisabled();
      if (unlocked) {
        await syncHomeSubscriptionTier("enterprise_boss_man");
      } else if (testFlightDetectionDone) {
        const access = resolveSubscriptionAccess({
          testingUnlocked: isSubscriptionGatingDisabled(),
          betaFullAccess: resolveIsBetaFullAccess(runtimeTestFlight),
          devOverride: loadedDev,
          storeTier: fromStore,
          profileTier: profileTierValue,
          freeAccessOverride: overrideRow,
          proTrial: trial,
        });
        await syncHomeSubscriptionTier(normalizeSubscriptionTierId(access.activeTier));
      }
    },
    [runtimeTestFlight, testFlightDetectionDone, accessUserId],
  );

  const setDevOverride = useCallback(
    async (override: SubscriptionDevOverride) => {
      if (!__DEV__) return;
      await saveSubscriptionDevOverride(override);
      setDevOverrideState(override);
      await readCustomerInfo();
    },
    [readCustomerInfo],
  );

  useEffect(() => {
    if (__DEV__) {
      console.log("[Subscription] beta access", getBetaAccessDebugInfo());
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function detectTestFlight() {
      const detected = await detectRuntimeTestFlight();
      if (cancelled) return;
      setRuntimeTestFlight(detected);
      setRuntimeTestFlightDetected(detected);
      setTestFlightDetectionDone(true);
    }

    void detectTestFlight();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await loadDevOverride();
      await loadProfileTier();

      if (isSubscriptionGatingDisabled()) {
        setIsConfigured(false);
        setErrorMessage(null);
        setStoreTier(null);
        await syncHomeSubscriptionTier("enterprise_boss_man");
        if (!cancelled) setLoading(false);
        return;
      }

      if (Platform.OS === "web") {
        setLoading(false);
        setErrorMessage("In-app purchases run on iOS/Android builds (use a dev client with native modules).");
        return;
      }

      const extra = Constants.expoConfig?.extra as
        | { revenueCatAppleApiKey?: string; revenueCatGoogleApiKey?: string }
        | undefined;
      const apiKey =
        Platform.OS === "ios"
          ? extra?.revenueCatAppleApiKey
          : Platform.OS === "android"
            ? extra?.revenueCatGoogleApiKey
            : "";

      if (!apiKey) {
        setIsConfigured(false);
        setErrorMessage(
          "Add EXPO_PUBLIC_RC_APPLE_KEY and EXPO_PUBLIC_RC_GOOGLE_KEY for RevenueCat, then rebuild a dev client.",
        );
        setLoading(false);
        return;
      }

      const Purchases = getPurchases();
      if (!Purchases) {
        setIsConfigured(false);
        setErrorMessage("RevenueCat native module is not available in this build.");
        setLoading(false);
        return;
      }

      try {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
        Purchases.configure({ apiKey });
        if (!cancelled) setIsConfigured(true);
        await readCustomerInfo(session?.userId ?? null);
      } catch {
        if (!cancelled) {
          setIsConfigured(false);
          setErrorMessage("RevenueCat failed to configure. Use a dev build with native modules.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void readCustomerInfo();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [loadDevOverride, loadProfileTier, readCustomerInfo, session?.userId]);

  useEffect(() => {
    if (!testFlightDetectionDone) return;
    void readCustomerInfo(session?.userId ?? null);
  }, [testFlightDetectionDone, runtimeTestFlight, readCustomerInfo, session?.userId]);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      await readCustomerInfo(session?.userId ?? null);
      if (!options?.silent) {
        setLoading(false);
      }
    },
    [readCustomerInfo, session?.userId],
  );

  const purchaseTier = useCallback(
    async (tierId: SubscriptionTierId) => {
      if (isSubscriptionGatingDisabled()) {
        return { ok: false, message: SUBSCRIPTIONS_TESTING_NOTICE };
      }
      if (__DEV__ && isDevActiveTierOverride(devOverride)) {
        return {
          ok: false,
          message:
            "Dev simulation is overriding the active plan. Set “None (use RevenueCat)” or turn off simulation to test real purchases.",
        };
      }
      const plan = getSubscriptionPlan(tierId);
      if (!plan.isPaid) {
        return { ok: true };
      }
      if (Platform.OS === "web") {
        return { ok: false, message: "Purchases are not available on web." };
      }
      const Purchases = getPurchases();
      if (!Purchases) {
        return { ok: false, message: "Purchases require a native iOS or Android build." };
      }
      try {
        const offerings = await Purchases.getOfferings();
        const packages = offerings.current?.availablePackages ?? [];
        const productId = plan.revenueCatProductId;
        const packageId = plan.revenueCatPackageId;
        const pkg =
          packages.find((p) => p.identifier === packageId) ??
          packages.find((p) => p.product.identifier === productId);

        if (!pkg) {
          return {
            ok: false,
            message: `No RevenueCat package for ${plan.name}. Add product ${productId ?? ""} to the default offering.`,
          };
        }
        await Purchases.purchasePackage(pkg);
        await readCustomerInfo();
        return { ok: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Purchase failed.";
        return { ok: false, message: msg };
      }
    },
    [devOverride, readCustomerInfo],
  );

  const purchaseDefault = useCallback(async () => purchaseTier("boss_man"), [purchaseTier]);

  const restore = useCallback(async () => {
    if (isSubscriptionGatingDisabled()) {
      return { ok: false, message: SUBSCRIPTIONS_TESTING_NOTICE };
    }
    if (Platform.OS === "web") return { ok: false, message: "Restore is not available on web." };
    const Purchases = getPurchases();
    if (!Purchases) {
      return { ok: false, message: "Restore requires a native iOS or Android build." };
    }
    try {
      await Purchases.restorePurchases();
      await readCustomerInfo();
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Restore failed.";
      return { ok: false, message: msg };
    }
  }, [readCustomerInfo]);

  const value = useMemo(
    () => ({
      loading,
      isConfigured,
      storeTier,
      freeAccessOverride,
      accessSource,
      activeTier,
      effectiveTier,
      profileTier,
      testFlightDetectionDone,
      runtimeTestFlight,
      isPro,
      proTrial,
      helperTrial: proTrial,
      subscriptionLocked,
      helperTrialExpired: subscriptionLocked,
      featureAccessContext,
      monthlyAiUsage,
      aiQuotaCheck,
      dailyAiCheck,
      dailyUsage,
      dailyImageCheck,
      isDevSimulating,
      isBetaFullAccess,
      isTestingUnlocked,
      subscriptionsTestingNotice,
      pickerPlans,
      errorMessage,
      refresh,
      purchaseDefault,
      purchaseTier,
      restore,
      devOverride: __DEV__ ? devOverride : null,
      setDevOverride,
    }),
    [
      loading,
      isConfigured,
      storeTier,
      freeAccessOverride,
      accessSource,
      activeTier,
      effectiveTier,
      profileTier,
      testFlightDetectionDone,
      runtimeTestFlight,
      isPro,
      proTrial,
      subscriptionLocked,
      featureAccessContext,
      monthlyAiUsage,
      aiQuotaCheck,
      dailyAiCheck,
      dailyUsage,
      dailyImageCheck,
      isDevSimulating,
      isBetaFullAccess,
      isTestingUnlocked,
      subscriptionsTestingNotice,
      pickerPlans,
      errorMessage,
      refresh,
      purchaseDefault,
      purchaseTier,
      restore,
      devOverride,
      setDevOverride,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
