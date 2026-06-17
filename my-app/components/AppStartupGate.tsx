import { usePathname, useRouter, type Href } from "expo-router";
import { useEffect, useRef, type PropsWithChildren } from "react";
import { Platform } from "react-native";

import { isAuthRoute, ONBOARDING_TIER_TRIAL_HREF } from "@/lib/auth/authPaths";
import { useHomeBoot } from "@/lib/homeBoot";
import { loadLegalGateState } from "@/lib/legal/legalGate";
import {
  isLegalGateSessionComplete,
  subscribeLegalGateSessionComplete,
} from "@/lib/legal/legalGateSession";
import { shouldSkipLegalGate } from "@/lib/legal/legalGatePolicy";
import { loadLegalIntroSeen } from "@/lib/legal/legalIntroStorage";
import {
  configurePurchases,
  getCustomerInfo,
  highestTierFromEntitlements,
} from "@/lib/revenuecat";
import { isSubscriptionGatingDisabled } from "@/lib/subscriptionTesting";
import { getCachedHasStorageTrial, isTrialNavigationLocked } from "@/lib/subscriptions/trialGateState";
import { loadProTrialRecord } from "@/lib/subscriptions/trialStorage";
import { isPaidSubscriptionTier } from "@/lib/subscriptions/tiers";

const HOME_HREF = "/" as Href;

/** One-shot cold-start navigation — never re-run after settled. */
let startupRouteSettled = false;

function navLog(message: string, detail?: Record<string, unknown>): void {
  const extra = detail ? ` ${JSON.stringify(detail)}` : "";
  console.warn(`[NAV] AppStartupGate: ${message}${extra}`);
}

async function readStartupRouteState(): Promise<{ legalAccepted: boolean; trialStarted: boolean }> {
  const skipLegal = shouldSkipLegalGate();
  let legalAccepted = skipLegal || isLegalGateSessionComplete();

  if (!legalAccepted) {
    const introSeen = await loadLegalIntroSeen();
    const gate = await loadLegalGateState(introSeen);
    legalAccepted = gate.step === null;
  }

  const trialRecord = await loadProTrialRecord();
  let trialStarted = Boolean(trialRecord?.trialStartDate);

  if (!trialStarted && getCachedHasStorageTrial()) {
    trialStarted = true;
  }

  if (!trialStarted && !isSubscriptionGatingDisabled() && Platform.OS !== "web") {
    try {
      await configurePurchases();
      const info = await getCustomerInfo();
      const tier = info ? highestTierFromEntitlements(info.entitlements.active) : null;
      if (tier && isPaidSubscriptionTier(tier)) {
        trialStarted = true;
        console.warn("[RevenueCat] AppStartupGate: active entitlement — onboarding complete", tier);
      }
    } catch {
      /* local trial / profile still drive gates */
    }
  }

  return { legalAccepted, trialStarted };
}

/**
 * Single cold-start navigation authority.
 * Legal UI stays in LegalAcceptanceGate; this gate only routes after legal + trial storage are known.
 */
export function AppStartupGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { coldSplashDone } = useHomeBoot();
  const settledRef = useRef(startupRouteSettled);

  useEffect(() => {
    if (settledRef.current || startupRouteSettled) return;

    let cancelled = false;

    const runStartupRoute = async () => {
      if (cancelled || settledRef.current || startupRouteSettled) return;

      if (!coldSplashDone) {
        navLog("defer — cold splash not done");
        return;
      }

      if (isTrialNavigationLocked()) {
        navLog("defer — trial navigation locked");
        return;
      }

      const { legalAccepted, trialStarted } = await readStartupRouteState();
      if (cancelled) return;

      navLog("startup check", { legalAccepted, trialStarted, pathname });

      if (!legalAccepted) {
        navLog("hold — legal not accepted (inline gate handles UI)");
        return;
      }

      const onTierTrial = pathname === ONBOARDING_TIER_TRIAL_HREF;
      const onOnboarding = pathname.startsWith("/onboarding");

      if (!trialStarted) {
        if (onTierTrial || onOnboarding) {
          navLog("settled — on onboarding without trial");
          startupRouteSettled = true;
          settledRef.current = true;
          return;
        }
        navLog("replace → tier-trial");
        startupRouteSettled = true;
        settledRef.current = true;
        router.replace(ONBOARDING_TIER_TRIAL_HREF);
        return;
      }

      if (onTierTrial) {
        navLog("settled — trial active on tier-trial (user CTA may navigate)");
        startupRouteSettled = true;
        settledRef.current = true;
        return;
      }

      if (pathname === HOME_HREF || pathname === "") {
        navLog("settled — trial active on home");
      } else {
        navLog("settled — trial active", { pathname });
      }
      startupRouteSettled = true;
      settledRef.current = true;
    };

    void runStartupRoute();

    const unsubscribe = subscribeLegalGateSessionComplete(() => {
      navLog("legal session complete — re-check");
      void runStartupRoute();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [coldSplashDone, pathname, router]);

  return <>{children}</>;
}

/** Test helper — reset session flag between test runs. */
export function resetStartupRouteForTests(): void {
  startupRouteSettled = false;
}
