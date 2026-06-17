/** Suppress gate refresh while trial start async work runs. */
export const TRIAL_JUST_STARTED_SUPPRESS_MS = 10_000;

export const TRIAL_NAVIGATION_UNLOCK_MS = 3_000;

let trialJustStartedAt: number | null = null;
/** Imperative navigation lock — AppStartupGate defers while set. */
let navigationLocked = false;
let navigationUnlockTimer: ReturnType<typeof setTimeout> | null = null;

let cachedStorageLoaded = false;
let cachedHasStorageTrial = false;

/** Call on CTA tap — suppress startup routing before AsyncStorage write finishes. */
export function lockTrialNavigation(): void {
  navigationLocked = true;
  if (__DEV__) {
    console.warn("[NAV] lockTrialNavigation");
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
      if (__DEV__) {
        console.warn("[NAV] unlockTrialNavigation");
      }
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
}

/** Reset session flags when trial start fails after markTrialStarting. */
export function resetTrialOnboardingSession(): void {
  trialJustStartedAt = null;
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

/** Block subscription refresh churn during trial-start cooldown. */
export function shouldSuppressTrialRefresh(now = Date.now()): boolean {
  return isTrialNavigationLocked() || isTrialJustStarted(now);
}

export function isTrialStorageCacheLoaded(): boolean {
  return cachedStorageLoaded;
}

export function getCachedHasStorageTrial(): boolean {
  return cachedHasStorageTrial;
}
