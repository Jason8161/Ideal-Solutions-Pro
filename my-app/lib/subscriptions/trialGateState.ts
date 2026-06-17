import { useEffect, useState } from "react";

import { hasGuestTrialProgress } from "@/lib/auth/guestTrialAuth";
import type { ProTrialState } from "@/lib/subscriptions/trialPolicy";
import { loadProTrialRecord } from "@/lib/subscriptions/trialStorage";

/** Suppress gate redirects while trial start async work runs. */
export const TRIAL_JUST_STARTED_SUPPRESS_MS = 10_000;

/** Minimum time between opposing gate redirects (home ↔ tier-trial). */
export const TRIAL_GATE_REDIRECT_COOLDOWN_MS = 2_500;

let trialJustStartedAt: number | null = null;
let trialOnboardingComplete = false;
let trialHomeNavigationCommitted = false;
let lastTrialGateRedirectAt = 0;
/** Only TrialOnboardingGate may redirect for trial onboarding routing. */
let trialGateRedirectOwner: "trial-onboarding" | null = null;
/** Imperative navigation lock — gates must not render Redirect while set. */
let navigationLocked = false;
let navigationUnlockTimer: ReturnType<typeof setTimeout> | null = null;

const TRIAL_NAVIGATION_UNLOCK_MS = 3_000;

/** Shared across AuthGate + TrialOnboardingGate hook instances. */
let cachedStorageLoaded = false;
let cachedHasStorageTrial = false;
/** Session flag — cold-start tier-trial navigation is done or unnecessary. */
let initialOnboardingRouteHandled = false;

export function markInitialOnboardingRouteHandled(): void {
  initialOnboardingRouteHandled = true;
}

export function hasInitialOnboardingRouteHandled(): boolean {
  return initialOnboardingRouteHandled;
}

export function markTrialOnboardingComplete(): void {
  trialOnboardingComplete = true;
  markInitialOnboardingRouteHandled();
}

export function isTrialOnboardingComplete(): boolean {
  return trialOnboardingComplete;
}

export function markTrialHomeNavigationCommitted(): void {
  trialHomeNavigationCommitted = true;
  if (__DEV__) {
    console.warn("[TRIAL_NAV] markTrialHomeNavigationCommitted");
  }
}

export function isTrialHomeNavigationCommitted(): boolean {
  return trialHomeNavigationCommitted;
}

/** Call on CTA tap — suppress gate redirects before AsyncStorage write finishes. */
export function lockTrialNavigation(): void {
  navigationLocked = true;
  if (__DEV__) {
    console.warn("[TRIAL_NAV] lockTrialNavigation");
  }
  if (navigationUnlockTimer != null) {
    clearTimeout(navigationUnlockTimer);
    navigationUnlockTimer = null;
  }
}

export function unlockTrialNavigation(delayMs = 0): void {
  if (navigationUnlockTimer != null) {
    clearTimeout(navigationUnlockTimer);
    navigationUnlockTimer = null;
  }
  if (delayMs > 0) {
    navigationUnlockTimer = setTimeout(() => {
      navigationLocked = false;
      navigationUnlockTimer = null;
    }, delayMs);
    return;
  }
  navigationLocked = false;
}

export function isTrialNavigationLocked(): boolean {
  return navigationLocked;
}

export function markTrialStarting(now = Date.now()): void {
  trialJustStartedAt = now;
  lockTrialNavigation();
}

export function markTrialJustStarted(now = Date.now()): void {
  trialJustStartedAt = now;
  markTrialOnboardingComplete();
}

/** Reset session flags when trial start fails after markTrialStarting. */
export function resetTrialOnboardingSession(): void {
  trialJustStartedAt = null;
  trialOnboardingComplete = false;
  trialHomeNavigationCommitted = false;
  unlockTrialNavigation();
}

export function primeTrialStorageCache(hasTrial: boolean): void {
  cachedHasStorageTrial = hasTrial;
  cachedStorageLoaded = true;
}

export function isTrialJustStarted(now = Date.now()): boolean {
  if (trialJustStartedAt == null) return false;
  return now - trialJustStartedAt < TRIAL_JUST_STARTED_SUPPRESS_MS;
}

export function isTrialHomeNavigationPending(): boolean {
  return trialOnboardingComplete && !trialHomeNavigationCommitted;
}

export function shouldSuppressTrialGateRedirects(now = Date.now()): boolean {
  if (navigationLocked) return true;
  if (isTrialJustStarted(now)) return true;
  if (isTrialHomeNavigationPending()) return true;
  if (isTrialGateRedirectCoolingDown(now)) return true;
  return false;
}

/** Dev-only: log when a removed reactive Redirect would have fired. */
export function noteWouldHaveRedirectedToTierTrial(reason: string): void {
  if (__DEV__) {
    console.warn(`[TRIAL_NAV] suppressed Redirect to /onboarding/tier-trial (${reason})`);
  }
}

export { TRIAL_NAVIGATION_UNLOCK_MS };

export function markTrialGateRedirect(
  owner: "trial-onboarding" = "trial-onboarding",
  now = Date.now(),
): void {
  lastTrialGateRedirectAt = now;
  trialGateRedirectOwner = owner;
}

export function isTrialGateRedirectCoolingDown(now = Date.now()): boolean {
  return now - lastTrialGateRedirectAt < TRIAL_GATE_REDIRECT_COOLDOWN_MS;
}

export function canTrialOnboardingGateRedirect(now = Date.now()): boolean {
  if (isTrialHomeNavigationPending()) return false;
  if (isTrialGateRedirectCoolingDown(now) && trialGateRedirectOwner !== "trial-onboarding") {
    return false;
  }
  return true;
}

export type ResolvedTrialGateState = {
  /** True when any source confirms a guest trial exists or was consumed. */
  trialStarted: boolean;
  /** Safe to send fresh installs to tier picker — all sources agree no trial. */
  trialNeverStarted: boolean;
  /** Async storage read still pending. */
  storageLoaded: boolean;
  /** Block gate redirects (trial start grace or redirect cooldown). */
  suppressRedirects: boolean;
};

function resolveTrialStarted(
  proTrial: ProTrialState,
  hasStorageTrial: boolean,
  justStarted: boolean,
  onboardingComplete: boolean,
  homeNavigationCommitted: boolean,
): boolean {
  return (
    homeNavigationCommitted ||
    onboardingComplete ||
    hasGuestTrialProgress(proTrial) ||
    hasStorageTrial ||
    justStarted
  );
}

function resolveTrialNeverStarted(
  proTrial: ProTrialState,
  hasStorageTrial: boolean,
  justStarted: boolean,
  onboardingComplete: boolean,
  homeNavigationCommitted: boolean,
  storageLoaded: boolean,
): boolean {
  if (
    !storageLoaded ||
    justStarted ||
    onboardingComplete ||
    homeNavigationCommitted ||
    isTrialHomeNavigationPending()
  ) {
    return false;
  }
  return (
    !hasStorageTrial &&
    !hasGuestTrialProgress(proTrial) &&
    !proTrial.isActive &&
    !proTrial.isExpired
  );
}

/**
 * Single source of truth for AuthGate + TrialOnboardingGate trial routing.
 * Combines SubscriptionContext, AsyncStorage, and in-session trial flags.
 */
export function useTrialGateState(proTrial: ProTrialState): ResolvedTrialGateState {
  const [storageLoaded, setStorageLoaded] = useState(cachedStorageLoaded);
  const [hasStorageTrial, setHasStorageTrial] = useState(cachedHasStorageTrial);

  const justStarted = isTrialJustStarted();
  const onboardingComplete = isTrialOnboardingComplete();
  const homeNavigationCommitted = isTrialHomeNavigationCommitted();

  useEffect(() => {
    let cancelled = false;
    void loadProTrialRecord()
      .then((record) => {
        if (cancelled) return;
        const hasTrial = Boolean(record?.trialStartDate);
        cachedHasStorageTrial = hasTrial;
        cachedStorageLoaded = true;
        setHasStorageTrial(hasTrial);
        setStorageLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        cachedHasStorageTrial = false;
        cachedStorageLoaded = true;
        setHasStorageTrial(false);
        setStorageLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [proTrial.isActive, proTrial.trialStartDate]);

  const trialStarted = resolveTrialStarted(
    proTrial,
    hasStorageTrial,
    justStarted,
    onboardingComplete,
    homeNavigationCommitted,
  );
  const trialNeverStarted = resolveTrialNeverStarted(
    proTrial,
    hasStorageTrial,
    justStarted,
    onboardingComplete,
    homeNavigationCommitted,
    storageLoaded,
  );
  const suppressRedirects =
    shouldSuppressTrialGateRedirects() ||
    (onboardingComplete && !storageLoaded) ||
    (!storageLoaded && hasGuestTrialProgress(proTrial));

  return {
    trialStarted,
    trialNeverStarted,
    storageLoaded,
    suppressRedirects,
  };
}

export function noteTrialGateRedirect(): void {
  markTrialGateRedirect("trial-onboarding");
}
