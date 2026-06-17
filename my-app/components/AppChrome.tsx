import { usePathname } from "expo-router";
import { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { HomeBrandHeader } from "@/components/HomeBrandHeader";
import { ServiceRequestSyncWatcher } from "@/components/serviceCalls/ServiceRequestSyncWatcher";
import { OwnerTimeClockAlertsBanner } from "@/components/timeClock/OwnerTimeClockAlertsBanner";
import { HomeColdSplashOverlay } from "@/components/HomeColdSplashOverlay";
import { HomeFooterBar } from "@/components/HomeFooterBar";
import { ImmersiveChromeSync } from "@/components/ImmersiveChromeSync";
import { ImmersiveChromeProvider } from "@/context/ImmersiveChromeContext";
import {
  BrandHeaderProvider,
  useBrandHeaderVisibility,
  useSuppressBrandHeader,
} from "@/context/BrandHeaderContext";
import { useAppTheme } from "@/context/ThemeContext";
import { isAuthRoute } from "@/lib/auth/authPaths";
import { useHomeBoot } from "@/lib/homeBoot";
import { useLegalGateSessionComplete } from "@/lib/legal/useLegalGateSessionComplete";

function AppChromeBody({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { colors } = useAppTheme();
  const { hidden } = useBrandHeaderVisibility();
  const { coldSplashDone } = useHomeBoot();
  const legalGateComplete = useLegalGateSessionComplete();
  const onAuthScreen = isAuthRoute(pathname);
  const onOnboardingRoute = pathname.startsWith("/onboarding");
  const onHome = pathname === "/" || pathname === "";

  const showHomeFooter = !onAuthScreen && !onOnboardingRoute && !showColdSplash;
  const showColdSplash = !onAuthScreen && onHome && !coldSplashDone && !legalGateComplete;
  const skipKeyboardAvoiding = onAuthScreen || onOnboardingRoute;

  useSuppressBrandHeader(onAuthScreen || onOnboardingRoute || showColdSplash || !onHome);

  const body = (
    <>
      <ImmersiveChromeSync />
      {children}
    </>
  );

  return (
    <View style={styles.wrap}>
      <ServiceRequestSyncWatcher />
      {!hidden ? (
        <View style={styles.headerSlot}>
          <HomeBrandHeader colors={colors} />
          <OwnerTimeClockAlertsBanner />
        </View>
      ) : null}
      {skipKeyboardAvoiding ? (
        <View style={styles.content}>{body}</View>
      ) : (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {body}
        </KeyboardAvoidingView>
      )}
      {showHomeFooter ? <HomeFooterBar /> : null}
      {showColdSplash ? <HomeColdSplashOverlay /> : null}
    </View>
  );
}

/** Pins Home and Settings to the bottom footer; brand header + screen content above. */
export function AppChrome({ children }: PropsWithChildren) {
  return (
    <ImmersiveChromeProvider>
      <BrandHeaderProvider>
        <AppChromeBody>{children}</AppChromeBody>
      </BrandHeaderProvider>
    </ImmersiveChromeProvider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  headerSlot: {
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});
