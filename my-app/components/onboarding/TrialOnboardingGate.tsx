import { Redirect, usePathname, type Href } from "expo-router";
import { useEffect, useState, type PropsWithChildren } from "react";

import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  AUTH_LOGIN_HREF,
  isAuthRoute,
  isEmployeeRoute,
  isTrialOnboardingExemptRoute,
} from "@/lib/auth/authPaths";
import { loadEmployeeSession } from "@/lib/employeeSession";
import { useLaunchGateBypass } from "@/lib/launchGate";
import { useLegalGateSessionComplete } from "@/lib/legal/useLegalGateSessionComplete";
import {
  isTrialHomeNavigationPending,
  isTrialNavigationLocked,
  useTrialGateState,
} from "@/lib/subscriptions/trialGateState";

const UPGRADE_HREF = "/upgrade" as Href;

/** Blocks /upgrade when subscription locked after trial expiry. Tier picker uses imperative routing. */
export function TrialOnboardingGate({ children }: PropsWithChildren) {
  const pathname = usePathname() ?? "";
  const legalGateComplete = useLegalGateSessionComplete();
  const launchGateBypass = useLaunchGateBypass();
  const { isAuthenticated } = useAuth();
  const {
    isTestingUnlocked,
    isBetaFullAccess,
    requiresAccountLinking,
    subscriptionLocked,
    proTrial,
  } = useSubscription();
  const { trialNeverStarted, suppressRedirects } = useTrialGateState(proTrial);
  const [employeeActive, setEmployeeActive] = useState(false);
  const [employeeChecked, setEmployeeChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadEmployeeSession()
      .then((session) => {
        if (cancelled) return;
        setEmployeeActive(session.active);
        setEmployeeChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setEmployeeActive(false);
        setEmployeeChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onOnboarding = pathname.startsWith("/onboarding");
  const onUpgrade = pathname === "/upgrade";
  const trialExempt = isTrialOnboardingExemptRoute(pathname);
  const onAuth = isAuthRoute(pathname);
  const onEmployeeRoute = isEmployeeRoute(pathname);
  const employeeSubscriptionExempt = employeeActive && onEmployeeRoute;

  if (onOnboarding) {
    return children;
  }

  const deferNavigation = !launchGateBypass && !legalGateComplete;
  const navigationLocked = isTrialNavigationLocked();

  if (deferNavigation || suppressRedirects || isTrialHomeNavigationPending() || navigationLocked) {
    return children;
  }

  if (isTestingUnlocked || isBetaFullAccess || trialExempt || onAuth) {
    return children;
  }

  if (!isAuthenticated && requiresAccountLinking && !onAuth) {
    return <Redirect href={AUTH_LOGIN_HREF} />;
  }

  if (
    subscriptionLocked &&
    !proTrial.isActive &&
    !trialNeverStarted &&
    !onUpgrade &&
    !onOnboarding &&
    !employeeSubscriptionExempt
  ) {
    return <Redirect href={UPGRADE_HREF} />;
  }

  return children;
}
