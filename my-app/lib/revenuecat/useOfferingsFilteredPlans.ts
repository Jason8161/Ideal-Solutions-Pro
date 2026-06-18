import { useEffect, useMemo, useState } from "react";
import type { PurchasesPackage } from "react-native-purchases";

import type { SubscriptionPlan } from "@/lib/subscription/tiers";

import {
  configurePurchases,
  filterPlansByOfferings,
  getOfferingsWithTimeout,
} from "./purchases";

export type OfferingsFilteredPlansState = {
  offeringsLoading: boolean;
  offeringsLoaded: boolean;
  packages: PurchasesPackage[];
  availablePlans: SubscriptionPlan[];
  offeringsError: string | null;
};

/**
 * Intersects subscription plans with RevenueCat current-offering packages.
 * When `enabled` is false (testing/beta/web), returns all plans without fetching offerings.
 */
export function useOfferingsFilteredPlans(
  plans: SubscriptionPlan[],
  options: { enabled: boolean; isConfigured?: boolean },
): OfferingsFilteredPlansState {
  const { enabled, isConfigured = false } = options;
  const [offeringsLoading, setOfferingsLoading] = useState(enabled);
  const [offeringsLoaded, setOfferingsLoaded] = useState(!enabled);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setOfferingsLoading(false);
      setOfferingsLoaded(true);
      setPackages([]);
      setOfferingsError(null);
      return;
    }

    let cancelled = false;
    setOfferingsLoading(true);
    setOfferingsLoaded(false);

    void (async () => {
      if (!isConfigured) {
        const configured = await configurePurchases();
        if (!configured.ok) {
          if (!cancelled) {
            setOfferingsError(configured.message);
            setPackages([]);
            setOfferingsLoading(false);
            setOfferingsLoaded(true);
          }
          return;
        }
      }

      const result = await getOfferingsWithTimeout();
      if (cancelled) return;

      if (result.ok) {
        setPackages(result.packages);
        setOfferingsError(null);
      } else {
        setPackages([]);
        setOfferingsError(result.message);
      }
      setOfferingsLoading(false);
      setOfferingsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isConfigured]);

  const availablePlans = useMemo(
    () => (enabled ? filterPlansByOfferings(plans, packages) : plans),
    [enabled, plans, packages],
  );

  return { offeringsLoading, offeringsLoaded, packages, availablePlans, offeringsError };
}
