import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { ONBOARDING_TIER_TRIAL_HREF } from "@/lib/auth/authPaths";
import { hasGuestTrialProgress } from "@/lib/auth/guestTrialAuth";
import { skipHomeColdSplash } from "@/lib/homeBoot";
import { useLegalGateSessionComplete } from "@/lib/legal/useLegalGateSessionComplete";
import {
  hasInitialOnboardingRouteHandled,
  isTrialHomeNavigationCommitted,
  isTrialOnboardingComplete,
  markInitialOnboardingRouteHandled,
  primeTrialStorageCache,
} from "@/lib/subscriptions/trialGateState";
import { loadProTrialRecord } from "@/lib/subscriptions/trialStorage";

/** One async cold-start check per app session — never re-run after settled. */
let initialRouteCheckSettled = false;
let initialRouteCheckRunning = false;

/**
 * Fresh install: after legal gate, send user to tier picker once if no trial on device.
 * No reactive Redirects — single router.replace when storage confirms no trial.
 */
export function useInitialOnboardingRoute(): void {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { loading: subLoading, proTrial } = useSubscription();
  const legalGateComplete = useLegalGateSessionComplete();

  useEffect(() => {
    if (pathname.startsWith("/onboarding")) {
      initialRouteCheckSettled = true;
      markInitialOnboardingRouteHandled();
      return;
    }
    if (initialRouteCheckSettled || hasInitialOnboardingRouteHandled()) return;
    if (initialRouteCheckRunning) return;
    if (isTrialOnboardingComplete() || isTrialHomeNavigationCommitted()) {
      initialRouteCheckSettled = true;
      markInitialOnboardingRouteHandled();
      return;
    }
    if (hasGuestTrialProgress(proTrial)) {
      initialRouteCheckSettled = true;
      markInitialOnboardingRouteHandled();
      return;
    }
    if (!legalGateComplete) return;
    if (authLoading || subLoading) return;

    if (isAuthenticated) {
      initialRouteCheckSettled = true;
      markInitialOnboardingRouteHandled();
      return;
    }

    initialRouteCheckRunning = true;

    void (async () => {
      try {
        const record = await loadProTrialRecord();
        const hasTrial = Boolean(record?.trialStartDate);
        primeTrialStorageCache(hasTrial);

        if (
          hasTrial ||
          hasGuestTrialProgress(proTrial) ||
          isTrialOnboardingComplete() ||
          isTrialHomeNavigationCommitted()
        ) {
          markInitialOnboardingRouteHandled();
          return;
        }

        skipHomeColdSplash();
        router.replace(ONBOARDING_TIER_TRIAL_HREF);
        markInitialOnboardingRouteHandled();
      } finally {
        initialRouteCheckSettled = true;
        initialRouteCheckRunning = false;
      }
    })();
  }, [
    authLoading,
    isAuthenticated,
    legalGateComplete,
    pathname,
    proTrial,
    router,
    subLoading,
  ]);
}
