import { Redirect, usePathname, type Href } from "expo-router";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { isAuthRoute, isPublicAppRoute } from "@/lib/auth/authPaths";
import { loadProTrialRecord } from "@/lib/subscriptions/trialStorage";

const ONBOARDING_HREF = "/onboarding/tier-trial" as Href;
const UPGRADE_HREF = "/upgrade" as Href;

/**
 * Routes subscription onboarding (tier trial picker) and upgrade lock screen.
 * Does not block public routes, auth screens, or employee/invoice-pay paths.
 */
export function TrialOnboardingGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const {
    loading: subLoading,
    isTestingUnlocked,
    subscriptionLocked,
    proTrial,
  } = useSubscription();
  const [trialRecordLoaded, setTrialRecordLoaded] = useState(false);
  const [hasTrialRecord, setHasTrialRecord] = useState(false);
  const initialGatePassedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadProTrialRecord().then((record) => {
      if (cancelled) return;
      setHasTrialRecord(Boolean(record?.trialStartDate));
      setTrialRecordLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [proTrial.isActive]);

  const gateLoading = authLoading || subLoading || !trialRecordLoaded;
  if (!gateLoading) {
    initialGatePassedRef.current = true;
  }

  const onOnboarding = pathname.startsWith("/onboarding");
  const onUpgrade = pathname === "/upgrade";
  const isPublic = isPublicAppRoute(pathname);
  const onAuth = isAuthRoute(pathname);

  if (gateLoading && !initialGatePassedRef.current) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isTestingUnlocked || isPublic || onAuth) {
    return children;
  }

  if (subscriptionLocked && !onUpgrade) {
    return <Redirect href={UPGRADE_HREF} />;
  }

  if (!subscriptionLocked && !hasTrialRecord && !proTrial.isActive && isAuthenticated && !onOnboarding) {
    return <Redirect href={ONBOARDING_HREF} />;
  }

  if ((proTrial.isActive || hasTrialRecord) && onOnboarding) {
    return <Redirect href={"/" as Href} />;
  }

  return children;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
