import { usePathname } from "expo-router";
import { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { HomeBrandHeader } from "@/components/HomeBrandHeader";
import { ServiceRequestSyncWatcher } from "@/components/serviceCalls/ServiceRequestSyncWatcher";
import { OwnerTimeClockAlertsBanner } from "@/components/timeClock/OwnerTimeClockAlertsBanner";
import { HomeColdSplashOverlay } from "@/components/HomeColdSplashOverlay";
import { HomeFooterBar } from "@/components/HomeFooterBar";
import { ImmersiveChromeSync } from "@/components/ImmersiveChromeSync";
import { ImmersiveChromeProvider, useImmersiveChrome } from "@/context/ImmersiveChromeContext";
import {
  BrandHeaderProvider,
  useBrandHeaderVisibility,
  useSuppressBrandHeader,
} from "@/context/BrandHeaderContext";
import { useAppTheme } from "@/context/ThemeContext";
import { isAuthRoute } from "@/lib/auth/authPaths";
import { useHomeBoot } from "@/lib/homeBoot";

function AppChromeBody({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { colors } = useAppTheme();
  const { hidden } = useBrandHeaderVisibility();
  const { immersiveActive } = useImmersiveChrome();
  const { coldSplashDone } = useHomeBoot();
  const onAuthScreen = isAuthRoute(pathname);
  const onHome = pathname === "/" || pathname === "";
  const showHomeFooter = !onAuthScreen && (onHome || !immersiveActive);
  const showColdSplash = !onAuthScreen && onHome && !coldSplashDone;

  // Brand header only on home; nested stacks already use headerShown: false.
  useSuppressBrandHeader(onAuthScreen || showColdSplash || !onHome);

  return (
    <View style={styles.wrap}>
      <ServiceRequestSyncWatcher />
      {!hidden ? (
        <View style={styles.headerSlot}>
          <HomeBrandHeader colors={colors} />
          <OwnerTimeClockAlertsBanner />
        </View>
      ) : null}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ImmersiveChromeSync />
        {children}
      </KeyboardAvoidingView>
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
