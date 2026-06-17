import { Redirect, usePathname, type Href } from "expo-router";
import { useEffect, useRef, type PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  consumeAuthScreenNavigationAllowed,
  peekAuthScreenNavigationAllowed,
} from "@/lib/auth/authNavigationIntent";
import { AUTH_LOGIN_HREF, isAuthRoute } from "@/lib/auth/authPaths";
import { hasGuestTrialProgress, isGuestTrialAccessActive } from "@/lib/auth/guestTrialAuth";
import { useLaunchGateBypass } from "@/lib/launchGate";
import { useLegalGateSessionComplete } from "@/lib/legal/useLegalGateSessionComplete";

/** Auth session only — cold-start routing lives in AppStartupGate. */
export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname() ?? "";
  const { isLoading, isAuthenticated } = useAuth();
  const { proTrial, loading: subLoading, requiresAccountLinking } = useSubscription();
  const legalGateComplete = useLegalGateSessionComplete();
  const launchGateBypass = useLaunchGateBypass();
  const initialGatePassedRef = useRef(false);
  const authScreenAllowedRef = useRef(false);

  const onOnboarding = pathname.startsWith("/onboarding");
  const onAuthScreen = isAuthRoute(pathname);
  const guestTrialActive = isGuestTrialAccessActive(proTrial);
  const trialStarted = hasGuestTrialProgress(proTrial);
  const gateReady = !isLoading && !subLoading;
  const deferNavigation = !launchGateBypass && !legalGateComplete;

  useEffect(() => {
    if (!onAuthScreen) {
      authScreenAllowedRef.current = false;
    }
  }, [onAuthScreen]);

  if (onOnboarding) {
    return children;
  }

  if (gateReady || launchGateBypass) {
    initialGatePassedRef.current = true;
  }

  const showLaunchLoader =
    !gateReady && !launchGateBypass && !initialGatePassedRef.current;

  if (showLaunchLoader) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (deferNavigation) {
    return <>{children}</>;
  }

  if (!isAuthenticated && onAuthScreen) {
    const authSegment = pathname.replace(/^\//, "").split("/")[0] ?? "";
    const isLoginOrSignup = authSegment === "login" || authSegment === "signup";

    if (isLoginOrSignup && !guestTrialActive && !trialStarted) {
      if (!authScreenAllowedRef.current) {
        if (peekAuthScreenNavigationAllowed()) {
          authScreenAllowedRef.current = true;
          consumeAuthScreenNavigationAllowed();
        } else if (requiresAccountLinking) {
          authScreenAllowedRef.current = true;
        }
      }
    }
  }

  if (!isAuthenticated && requiresAccountLinking && !onAuthScreen) {
    return <Redirect href={AUTH_LOGIN_HREF as Href} />;
  }

  if (isAuthenticated && onAuthScreen) {
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
