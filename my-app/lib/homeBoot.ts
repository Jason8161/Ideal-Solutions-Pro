import * as SplashScreen from "expo-splash-screen";
import { useSyncExternalStore } from "react";

import type { SubscriptionTierId } from "@/lib/subscriptionPlans";
import {
  companyProfileFromPartial,
  loadCompanyProfile,
  savePlanPickerChoice,
  updateProfileSubscriptionTier,
} from "@/lib/profileStorage";

/** Phase 1: centered app logo on home cold splash. */
export const COLD_SPLASH_LOGO_MS = 3000;
/** Phase 2: hands / sparking wire hero on home cold splash. */
export const COLD_SPLASH_WIRE_MS = 3000;
/** Minimum cold-open splash duration before dismiss (home route). */
export const COLD_SPLASH_MS = COLD_SPLASH_LOGO_MS + COLD_SPLASH_WIRE_MS;

/** Matches `app.json` splash / expo-splash-screen plugin background (metal theme, no navy plate). */
export const SPLASH_BACKGROUND_COLOR = "#141210";

export type HomeBootSnapshot = {
  /** True after the one-time cold-open splash (logo 3s + wire 3s). Never resets during the session. */
  coldSplashDone: boolean;
  profileHydrated: boolean;
  profileCompleted: boolean;
  planPickerCompleted: boolean;
  subscriptionTier: SubscriptionTierId;
  splashLogoUri: string | null;
};

let coldSplashTimerStarted = false;
let bootPromise: Promise<void> | null = null;
let snapshot: HomeBootSnapshot = {
  coldSplashDone: false,
  profileHydrated: false,
  profileCompleted: false,
  planPickerCompleted: false,
  subscriptionTier: "locked",
  splashLogoUri: null,
};

const listeners = new Set<() => void>();

function publish(next: Partial<HomeBootSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): HomeBootSnapshot {
  return snapshot;
}

/** Dismisses the native expo splash (safe to call repeatedly). */
export function hideNativeSplash(): void {
  void SplashScreen.hideAsync().catch(() => {});
}

function startColdSplashTimer() {
  if (coldSplashTimerStarted) return;
  coldSplashTimerStarted = true;
  setTimeout(() => {
    publish({ coldSplashDone: true });
    hideNativeSplash();
  }, COLD_SPLASH_MS);
}

/** Loads profile once per app session; safe to call from root layout and home. */
export function ensureHomeBoot(): Promise<void> {
  startColdSplashTimer();

  if (snapshot.profileHydrated) {
    return Promise.resolve();
  }
  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = (async () => {
    let stored = await loadCompanyProfile();
    let full = companyProfileFromPartial(stored);
    // Profile-complete users should never be blocked on home by the plan picker.
    if (full.profileCompleted && !full.planPickerCompleted) {
      full = await savePlanPickerChoice(full.subscriptionTier ?? "locked");
    }
    publish({
      splashLogoUri: full.logoUri,
      profileCompleted: full.profileCompleted,
      planPickerCompleted: full.planPickerCompleted,
      subscriptionTier: full.subscriptionTier,
      profileHydrated: true,
    });
  })().finally(() => {
    bootPromise = null;
  });

  return bootPromise;
}

/** Pushes a resolved subscription tier into the home snapshot (and profile when it differs). */
export async function syncHomeSubscriptionTier(tier: SubscriptionTierId): Promise<HomeBootSnapshot> {
  await updateProfileSubscriptionTier(tier);
  publish({ subscriptionTier: tier, profileHydrated: true });
  return snapshot;
}

/** Refreshes profile after settings edits; does not reset cold splash or hydration flags. */
export async function refreshHomeProfile(): Promise<HomeBootSnapshot> {
  let stored = await loadCompanyProfile();
  let full = companyProfileFromPartial(stored);
  if (full.profileCompleted && !full.planPickerCompleted) {
    full = await savePlanPickerChoice(full.subscriptionTier ?? "locked");
  }
  publish({
    splashLogoUri: full.logoUri ?? snapshot.splashLogoUri,
    profileCompleted: full.profileCompleted,
    planPickerCompleted: full.planPickerCompleted,
    subscriptionTier: full.subscriptionTier,
    profileHydrated: true,
  });
  return snapshot;
}

export function useHomeBoot(): HomeBootSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
