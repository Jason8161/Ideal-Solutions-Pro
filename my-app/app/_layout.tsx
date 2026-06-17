import { installStartupErrorHandler } from "@/lib/installStartupErrorHandler";

installStartupErrorHandler();

import { Slot, usePathname } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { ensureHomeBoot, hideNativeSplash, useHomeBoot } from "@/lib/homeBoot";

import { AppConstructionBackdrop } from "@/components/AppConstructionBackdrop";
import { AppChrome } from "@/components/AppChrome";
import { BackupRestoreGate } from "@/components/backup/BackupRestoreGate";
import { LegalAcceptanceGate } from "@/components/legal/LegalAcceptanceGate";
import { EmployeeRouteGuard } from "@/lib/employeeRouteGuard";
import { DisplaySettingsProvider } from "@/context/DisplaySettingsContext";
import { AuthGate } from "@/components/auth/AuthGate";
import { AppStartupGate } from "@/components/AppStartupGate";
import { TrialOnboardingGate } from "@/components/onboarding/TrialOnboardingGate";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ScaleProvider } from "@/context/ScaleContext";
import { ThemeProvider } from "@/context/ThemeContext";

/**
 * Dismisses the native expo splash from the root layout.
 * Home cold start uses `HomeColdSplashOverlay` only; leaving the native layer up
 * makes the splash icon bleed through transparent chrome (footer / edge-to-edge).
 */
function RootNativeSplashDismissal() {
  const pathname = usePathname();
  const { coldSplashDone } = useHomeBoot();
  const onHome = pathname === "/" || pathname === "";

  useEffect(() => {
    hideNativeSplash();
  }, []);

  useEffect(() => {
    if (!onHome || coldSplashDone) {
      hideNativeSplash();
    }
  }, [coldSplashDone, onHome]);

  return null;
}

function RootShell() {
  return (
    <View style={styles.root}>
      <AppConstructionBackdrop />
      <RootNativeSplashDismissal />
      {/* Top/horizontal insets here; bottom inset is applied in HomeFooterBar. */}
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <AppChrome>
          <BackupRestoreGate>
            <EmployeeRouteGuard>
              <Slot />
            </EmployeeRouteGuard>
          </BackupRestoreGate>
        </AppChrome>
      </SafeAreaView>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void ensureHomeBoot();
  }, []);

  return (
    <RootErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <DisplaySettingsProvider>
            <ScaleProvider>
              <AuthProvider>
                <LegalAcceptanceGate>
                  <SubscriptionProvider>
                    <AppStartupGate>
                      <AuthGate>
                        <TrialOnboardingGate>
                          <RootShell />
                        </TrialOnboardingGate>
                      </AuthGate>
                    </AppStartupGate>
                  </SubscriptionProvider>
                </LegalAcceptanceGate>
              </AuthProvider>
            </ScaleProvider>
          </DisplaySettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
