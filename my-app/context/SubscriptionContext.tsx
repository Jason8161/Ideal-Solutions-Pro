import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, InteractionManager, Platform } from "react-native";

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
import { hasGuestTrialProgress } from "@/lib/auth/guestTrialAuth";
import {
  getProTrialState,
  linkProTrialToUser,
  type ProTrialState,
} from "@/lib/subscription/trialStorage";
import {
  isTrialNavigationLocked,
  shouldSuppressTrialRefresh,
} from "@/lib/subscriptions/trialGateState";
import {
  DEFAULT_SUBSCRIPTION_DEV_OVERRIDE,
  isDevActiveTierOverride,
  loadSubscriptionDevOverride,
  saveSubscriptionDevOverride,
  subscriptionPlansForPicker,
  type SubscriptionDevOverride,
} from "@/lib/subscriptionDevOverride";
import { syncHomeSubscriptionTier, useHomeBoot } from "@/lib/homeBoot";
import {
  configurePurchases,
  getCustomerInfo,
  getOfferingsWithTimeout,
  getRevenueCatApiKey,
  hasIdealSolutionsPro,
  highestTierFromEntitlements,
  isValidPurchasePackage,
  loginRevenueCatUser,
  presentCustomerCenter,
  presentPaywall,
  probePurchasesUiAvailable,
  purchasePackage,
  purchaseProPackage,
  restorePurchases,
  REVENUECAT_INIT_DELAY_MS,
  type ProBillingPeriod,
} from "@/lib/revenuecat";
import {
  formatRevenueCatConfigureWarning,
  isRevenueCatNonBlockingConfigureMessage,
  purchasesErrorMessage,
} from "@/lib/revenuecat/errors";
import {
  getSubscriptionsTestingNotice,
  isSubscriptionGatingDisabled,
  SUBSCRIPTIONS_TESTING_NOTICE,
} from "@/lib/subscriptionTesting";
import { hasRealPaidSubscription } from "@/lib/auth/subscriptionAccountLinking";
import { useAuth } from "@/lib/auth/AuthContext";
import { companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";
import { waitForLegalGateSessionComplete } from "@/lib/legal/legalGateSession";

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
  /** RevenueCat paid tier on device without an app account — show login to link billing. */
  requiresAccountLinking: boolean;
  subscriptionsTestingNotice: string | null;
  pickerPlans: SubscriptionPlan[];
  testFlightDetectionDone: boolean;
  runtimeTestFlight: boolean;
  errorMessage: string | null;
  /** Pass `{ silent: true }` to refresh without blocking gates (e.g. home focus). */
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  /** Optimistic guest-trial update after local trial start — avoids gate races before RevenueCat refresh. */
  applyGuestTrialState: (state: ProTrialState) => void;
  purchaseDefault: () => Promise<{ ok: boolean; message?: string }>;
  purchaseTier: (tierId: SubscriptionTierId) => Promise<{ ok: boolean; message?: string; cancelled?: boolean }>;
  restore: () => Promise<{ ok: boolean; message?: string; cancelled?: boolean }>;
  purchaseProBilling: (period: ProBillingPeriod) => Promise<{ ok: boolean; message?: string; cancelled?: boolean }>;
  showPaywall: () => Promise<{ ok: boolean; message?: string; cancelled?: boolean }>;
  showCustomerCenter: () => Promise<{ ok: boolean; message?: string; cancelled?: boolean }>;
  hasIdealSolutionsProEntitlement: boolean;
  isPaywallAvailable: boolean;
  devOverride: SubscriptionDevOverride | null;
  setDevOverride: (override: SubscriptionDevOverride) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

async function subscriptionErrorForGuestTrial(
  message: string | null,
  userId?: string | null,
): Promise<string | null> {
  if (!message || userId) return message;
  const trial = await getProTrialState(false);
  if (trial.isActive) return null;
  return message;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const { coldSplashDone } = useHomeBoot();
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
    isLocked: false,
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
  const [hasIdealSolutionsProEntitlement, setHasIdealSolutionsProEntitlement] = useState(false);
  const [runtimeTestFlight, setRuntimeTestFlight] = useState(false);
  const [testFlightDetectionDone, setTestFlightDetectionDone] = useState(Platform.OS === "web");
  const [isPaywallAvailable, setIsPaywallAvailable] = useState(false);

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
  const requiresAccountLinking = useMemo(
    () =>
      !session?.userId &&
      !isTestingUnlocked &&
      !isBetaFullAccess &&
      Boolean(storeTier && isPaidSubscriptionTier(storeTier)),
    [session?.userId, isTestingUnlocked, isBetaFullAccess, storeTier],
  );
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
      let proEntitlement = false;
      if (Platform.OS !== "web") {
        try {
          const info = await getCustomerInfo();
          if (info) {
            fromStore = highestTierFromEntitlements(info.entitlements.active);
            if (fromStore) fromStore = normalizeSubscriptionTierId(fromStore);
            proEntitlement = hasIdealSolutionsPro(info);
          }
        } catch {
          storeError = true;
          fromStore = null;
        }
      }

      const uid = userId ?? accessUserId;
      const overrideRow = uid ? await fetchFreeAccessOverrideForUser(uid) : null;

      const paidForTrialState = hasRealPaidSubscription({
        storeTier: fromStore,
        profileTier: profileTierValue,
        freeAccessActive: overrideRow?.isActive ?? false,
      });

      const [trial, usage] = await Promise.all([
        getProTrialState(paidForTrialState),
        loadMonthlyAiUsage(),
      ]);

      if (__DEV__) {
        setDevOverrideState(loadedDev);
      }
      if (userId !== undefined) {
        setAccessUserId(userId);
      }
      setProfileTier(profileTierValue);
      setStoreTier(fromStore);
      setHasIdealSolutionsProEntitlement(proEntitlement);
      const uidForErrors = userId ?? accessUserId;
      if (!storeError) {
        setErrorMessage(null);
      } else {
        const msg = "Subscription services could not refresh. Restart the app or try again later.";
        setErrorMessage(await subscriptionErrorForGuestTrial(msg, uidForErrors));
      }
      setProTrial((prev) => {
        const preserveDuringTrialStart = shouldSuppressTrialRefresh() || isTrialNavigationLocked();
        if (preserveDuringTrialStart) {
          if (hasGuestTrialProgress(prev)) return prev;
          if (hasGuestTrialProgress(trial)) return trial;
        }
        if (hasGuestTrialProgress(prev) && !hasGuestTrialProgress(trial)) {
          return prev;
        }
        return trial;
      });
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

    async function loadBaseline() {
      try {
        await loadDevOverride();
        await loadProfileTier();
        const trial = await getProTrialState(false);
        if (!cancelled) {
          setProTrial((prev) => {
            const preserveDuringTrialStart = shouldSuppressTrialRefresh() || isTrialNavigationLocked();
            if (preserveDuringTrialStart) {
              if (hasGuestTrialProgress(prev)) return prev;
              if (hasGuestTrialProgress(trial)) return trial;
            }
            if (hasGuestTrialProgress(prev) && !hasGuestTrialProgress(trial)) {
              return prev;
            }
            return trial;
          });
        }

        if (isSubscriptionGatingDisabled()) {
          setIsConfigured(false);
          setErrorMessage(null);
          setStoreTier(null);
          await syncHomeSubscriptionTier("enterprise_boss_man");
        } else if (Platform.OS === "web") {
          const msg = "In-app purchases run on iOS/Android builds (use a dev client with native modules).";
          setErrorMessage(await subscriptionErrorForGuestTrial(msg, null));
        }
      } catch {
        if (!cancelled) {
          const msg = "Subscription services could not start. Restart the app or try again later.";
          setErrorMessage(await subscriptionErrorForGuestTrial(msg, null));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBaseline();

    return () => {
      cancelled = true;
    };
  }, [loadDevOverride, loadProfileTier]);

  useEffect(() => {
    if (!coldSplashDone) return;
    if (isSubscriptionGatingDisabled() || Platform.OS === "web") return;

    let cancelled = false;
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    let interactionHandle: { cancel: () => void } | null = null;
    let appStateSub: { remove: () => void } | null = null;

    async function initRevenueCat() {
      try {
        const apiKey = getRevenueCatApiKey();
        if (!apiKey.trim()) {
          if (!cancelled) {
            setIsConfigured(false);
            const msg =
              "Add EXPO_PUBLIC_REVENUECAT_API_KEY (or EXPO_PUBLIC_RC_APPLE_KEY / EXPO_PUBLIC_RC_GOOGLE_KEY), then rebuild a dev client.";
            setErrorMessage(await subscriptionErrorForGuestTrial(msg, null));
          }
          try {
            await readCustomerInfo(null);
          } catch {
            /* guest trial without RevenueCat */
          }
          return;
        }

        await waitForLegalGateSessionComplete();

        const configured = await configurePurchases();
        if (!configured.ok) {
          if (!cancelled) {
            setIsConfigured(false);
            setIsPaywallAvailable(false);
            if (isRevenueCatNonBlockingConfigureMessage(configured.message)) {
              setErrorMessage(
                await subscriptionErrorForGuestTrial(
                  formatRevenueCatConfigureWarning(configured.message),
                  null,
                ),
              );
            } else {
              setErrorMessage(await subscriptionErrorForGuestTrial(configured.message, null));
            }
          }
          try {
            await readCustomerInfo(null);
          } catch {
            /* local trial/profile still drive gates */
          }
          return;
        }

        if (!cancelled) {
          setIsConfigured(true);
          setIsPaywallAvailable(probePurchasesUiAvailable());
        }
        try {
          await readCustomerInfo(null);
        } catch (error) {
          if (!cancelled) {
            const msg = purchasesErrorMessage(error, "RevenueCat configured but could not load customer info.");
            const formatted = isRevenueCatNonBlockingConfigureMessage(msg)
              ? formatRevenueCatConfigureWarning(msg)
              : msg;
            setErrorMessage(await subscriptionErrorForGuestTrial(formatted, null));
          }
        }
      } catch {
        if (!cancelled) {
          setIsConfigured(false);
          const msg = "Subscription services could not start. Restart the app or try again later.";
          setErrorMessage(await subscriptionErrorForGuestTrial(msg, null));
        }
        try {
          await readCustomerInfo(null);
        } catch {
          /* local trial/profile still drive gates */
        }
      }
    }

    interactionHandle = InteractionManager.runAfterInteractions(() => {
      initTimer = setTimeout(() => {
        void initRevenueCat();
      }, REVENUECAT_INIT_DELAY_MS);
    });

    appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void readCustomerInfo();
    });

    return () => {
      cancelled = true;
      interactionHandle?.cancel();
      if (initTimer) clearTimeout(initTimer);
      appStateSub?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deferred RC init after cold splash only
  }, [coldSplashDone, readCustomerInfo]);

  useEffect(() => {
    if (!testFlightDetectionDone) return;
    void readCustomerInfo(session?.userId ?? null);
  }, [testFlightDetectionDone, runtimeTestFlight, readCustomerInfo, session?.userId]);

  useEffect(() => {
    const userId = session?.userId;
    if (!userId || !isConfigured || isSubscriptionGatingDisabled() || Platform.OS === "web") return;

    let cancelled = false;
    void (async () => {
      await loginRevenueCatUser(userId).catch(() => {
        /* non-blocking — guest trial and local gates do not depend on RevenueCat login */
      });
      if (cancelled) return;
      const linkResult = await linkProTrialToUser({
        userId,
        email: profile?.email,
      });
      if (cancelled) return;
      if (!linkResult.ok && linkResult.reason === "account_used") {
        setErrorMessage(await subscriptionErrorForGuestTrial(linkResult.message, userId));
      }
      await readCustomerInfo(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.userId, profile?.email, readCustomerInfo, isConfigured]);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const suppressLoading =
        options?.silent ||
        isTrialNavigationLocked() ||
        shouldSuppressTrialRefresh();
      if (!suppressLoading) {
        console.warn("[NAV] SubscriptionContext.refresh — setLoading(true)");
        setLoading(true);
      } else {
        console.warn("[NAV] SubscriptionContext.refresh — silent (trial nav window)");
      }
      try {
        await readCustomerInfo(session?.userId ?? null);
      } finally {
        if (!suppressLoading) {
          setLoading(false);
        }
      }
    },
    [readCustomerInfo, session?.userId],
  );

  const applyGuestTrialState = useCallback((state: ProTrialState) => {
    setProTrial(state);
    setErrorMessage(null);
    if (state.isActive && state.interestTier) {
      void syncHomeSubscriptionTier(normalizeSubscriptionTierId(state.interestTier));
    }
  }, []);

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
      try {
        const offerings = await getOfferingsWithTimeout();
        if (!offerings.ok) {
          return { ok: false, message: offerings.message };
        }

        const productId = plan.revenueCatProductId ?? "";
        const packageId = plan.revenueCatPackageId ?? "";
        const pkg =
          offerings.packages.find((p) => p.identifier === packageId) ??
          offerings.packages.find((p) => p.product.identifier === productId);

        if (!isValidPurchasePackage(pkg)) {
          return {
            ok: false,
            message: `No RevenueCat package for ${plan.name}. Add product ${productId} to the default offering.`,
          };
        }

        if (__DEV__) {
          console.log("[RevenueCat] package selected", pkg.identifier);
        }

        const purchaseResult = await purchasePackage(pkg);
        if (purchaseResult.ok) {
          await readCustomerInfo();
        }
        return purchaseResult;
      } catch (e: unknown) {
        return { ok: false, message: purchasesErrorMessage(e, "Purchase failed.") };
      }
    },
    [devOverride, readCustomerInfo],
  );

  const purchaseProBilling = useCallback(
    async (period: ProBillingPeriod) => {
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
      const result = await purchaseProPackage(period);
      if (result.ok) {
        await readCustomerInfo();
      }
      return result;
    },
    [devOverride, readCustomerInfo, session?.userId],
  );

  const purchaseDefault = useCallback(async () => purchaseTier("boss_man"), [purchaseTier]);

  const restore = useCallback(async () => {
    if (isSubscriptionGatingDisabled()) {
      return { ok: false, message: SUBSCRIPTIONS_TESTING_NOTICE };
    }
    const result = await restorePurchases();
    if (result.ok) {
      await readCustomerInfo();
    }
    return result;
  }, [readCustomerInfo, session?.userId]);

  const showPaywall = useCallback(async () => {
    if (isSubscriptionGatingDisabled()) {
      return { ok: false, message: SUBSCRIPTIONS_TESTING_NOTICE };
    }
    const result = await presentPaywall();
    if (result.ok) {
      await readCustomerInfo();
    }
    return result;
  }, [readCustomerInfo, session?.userId]);

  const showCustomerCenter = useCallback(async () => {
    if (isSubscriptionGatingDisabled()) {
      return { ok: false, message: SUBSCRIPTIONS_TESTING_NOTICE };
    }
    const result = await presentCustomerCenter();
    if (result.ok) {
      await readCustomerInfo();
    }
    return result;
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
      requiresAccountLinking,
      subscriptionsTestingNotice,
      pickerPlans,
      errorMessage,
      refresh,
      applyGuestTrialState,
      purchaseDefault,
      purchaseTier,
      purchaseProBilling,
      restore,
      showPaywall,
      showCustomerCenter,
      hasIdealSolutionsProEntitlement,
      isPaywallAvailable,
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
      requiresAccountLinking,
      subscriptionsTestingNotice,
      pickerPlans,
      errorMessage,
      refresh,
      applyGuestTrialState,
      purchaseDefault,
      purchaseTier,
      purchaseProBilling,
      restore,
      showPaywall,
      showCustomerCenter,
      hasIdealSolutionsProEntitlement,
      isPaywallAvailable,
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
