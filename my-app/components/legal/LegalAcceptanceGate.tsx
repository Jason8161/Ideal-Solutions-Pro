import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppConstructionBackdrop } from "@/components/AppConstructionBackdrop";
import { LegalAgreementFlow } from "@/components/legal/LegalAgreementFlow";
import { LegalDarkOverlay } from "@/components/legal/LegalDarkOverlay";
import { LegalIntroScreen } from "@/components/legal/LegalIntroScreen";
import { useAppTheme } from "@/context/ThemeContext";
import { ONBOARDING_TIER_TRIAL_HREF } from "@/lib/auth/authPaths";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { skipHomeColdSplash, useHomeBoot } from "@/lib/homeBoot";
import { acceptAllLegalStuffDocuments } from "@/lib/legal/legalAcceptanceStorage";
import { loadLegalGateState, type LegalGateStep } from "@/lib/legal/legalGate";
import { finalizeLegalGateSession } from "@/lib/legal/legalGateSession";
import { useResponsiveTypography } from "@/lib/layout/responsiveTypography";
import { shouldSkipLegalGate } from "@/lib/legal/legalGatePolicy";
import { loadLegalIntroSeen, markLegalIntroSeen } from "@/lib/legal/legalIntroStorage";
import { syncLegalAcceptanceToSupabase } from "@/lib/legal/syncLegalAcceptance";
import { markInitialOnboardingRouteHandled } from "@/lib/subscriptions/trialGateState";
import { loadProTrialRecord } from "@/lib/subscriptions/trialStorage";

const LEGAL_GATE_HYDRATE_TIMEOUT_MS = 10_000;

let legalGateRoutedToTierTrial = false;

type GateState = {
  hydrated: boolean;
  introSeen: boolean;
  step: LegalGateStep;
  busy: boolean;
  storageFailed: boolean;
};

export function LegalAcceptanceGate({ children }: PropsWithChildren) {
  const skipGate = shouldSkipLegalGate();
  const router = useRouter();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const typo = useResponsiveTypography();
  const { coldSplashDone } = useHomeBoot();
  const [state, setState] = useState<GateState>({
    hydrated: false,
    introSeen: false,
    step: null,
    busy: false,
    storageFailed: false,
  });

  const overlayStyles = useMemo(
    () =>
      StyleSheet.create({
        modalRoot: {
          flex: 1,
          minHeight: windowHeight,
          backgroundColor: "transparent",
        },
        modalContent: {
          flex: 1,
          minHeight: 0,
          zIndex: 2,
          elevation: 2,
        },
        bannerOverlay: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 1000,
          elevation: 1000,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
        banner: {
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: hexToRgba(colors.accent, 0.22),
        },
        bannerText: {
          color: colors.text,
          fontSize: typo.scaleFont(15),
          lineHeight: typo.bodyLineHeight,
        },
      }),
    [colors, insets.bottom, insets.top, typo.isTablet, windowHeight],
  );

  const refresh = useCallback(async () => {
    const introSeen = await loadLegalIntroSeen();
    const gate = await loadLegalGateState(introSeen);
    setState({
      hydrated: true,
      introSeen,
      step: gate.step,
      busy: false,
      storageFailed: false,
    });
    return gate;
  }, []);

  /** After legal is satisfied, send fresh installs to the tier picker (subscription choice). */
  const routeToTierTrialIfNeeded = useCallback(async () => {
    if (legalGateRoutedToTierTrial) return;
    const record = await loadProTrialRecord();
    if (record?.trialStartDate) return;
    legalGateRoutedToTierTrial = true;
    skipHomeColdSplash();
    router.replace(ONBOARDING_TIER_TRIAL_HREF);
    markInitialOnboardingRouteHandled();
  }, [router]);

  useEffect(() => {
    if (skipGate) {
      void finalizeLegalGateSession().then(() => routeToTierTrialIfNeeded());
      return;
    }

    let cancelled = false;
    const hydrateTimeout = setTimeout(() => {
      if (cancelled) return;
      setState((current) =>
        current.hydrated
          ? current
          : {
              hydrated: true,
              introSeen: false,
              step: "intro",
              busy: false,
              storageFailed: false,
            },
      );
    }, LEGAL_GATE_HYDRATE_TIMEOUT_MS);

    void refresh().finally(() => {
      if (!cancelled) clearTimeout(hydrateTimeout);
    });

    return () => {
      cancelled = true;
      clearTimeout(hydrateTimeout);
    };
  }, [refresh, routeToTierTrialIfNeeded, skipGate]);

  useEffect(() => {
    if (skipGate || !state.hydrated) return;
    if (state.step === null) {
      void finalizeLegalGateSession().then(() => routeToTierTrialIfNeeded());
    }
  }, [skipGate, state.hydrated, state.step, routeToTierTrialIfNeeded]);

  const showGate = coldSplashDone && state.hydrated && state.step !== null;

  useEffect(() => {
    if (!showGate) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [showGate]);

  const onDecline = useCallback(() => {
    Alert.alert(
      "Acceptance required",
      "App Review and all users must accept the legal documents to use Ideal Solutions Pro. Tap Review to return to the documents — nothing else is required before the free guest trial.",
      Platform.OS === "web"
        ? [{ text: "OK" }]
        : [
            { text: "Review documents", style: "cancel" },
            {
              text: "Exit app",
              style: "destructive",
              onPress: () => {
                if (Platform.OS === "android") {
                  BackHandler.exitApp();
                  return;
                }
                Alert.alert("Close the app", "Close Ideal Solutions Pro from the app switcher to exit.");
              },
            },
          ],
    );
  }, []);

  const onExitApp = useCallback(() => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
      return;
    }
    Alert.alert("Close the app", "Close Ideal Solutions Pro from the app switcher to exit.");
  }, []);

  const onContinueIntro = useCallback(async () => {
    await markLegalIntroSeen();
    setState((s) => ({ ...s, introSeen: true, step: "agreement" }));
  }, []);

  const onAcceptAll = useCallback(async () => {
    setState((s) => ({ ...s, busy: true }));
    const { saved } = await acceptAllLegalStuffDocuments();
    if (!saved) {
      setState((s) => ({ ...s, busy: false, storageFailed: true, step: null }));
      return;
    }
    await syncLegalAcceptanceToSupabase();
    const gate = await refresh();
    await finalizeLegalGateSession();
    if (gate.step === null) {
      await routeToTierTrialIfNeeded();
    }
  }, [refresh, routeToTierTrialIfNeeded]);

  if (skipGate || !coldSplashDone || !state.hydrated) {
    return <>{children}</>;
  }

  if (state.storageFailed) {
    return (
      <>
        {children}
        <View style={overlayStyles.bannerOverlay} pointerEvents="box-none">
          <View style={overlayStyles.banner}>
            <Text style={overlayStyles.bannerText}>
              Could not save legal acceptance on this device. You may continue, but you may be prompted again.
            </Text>
          </View>
        </View>
      </>
    );
  }

  if (!showGate) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <Modal
        visible
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={onDecline}
      >
        <View style={overlayStyles.modalRoot}>
          <AppConstructionBackdrop />
          <LegalDarkOverlay />
          <SafeAreaView style={overlayStyles.modalContent} edges={["top", "bottom", "left", "right"]}>
            {state.step === "intro" ? (
              <LegalIntroScreen onContinue={() => void onContinueIntro()} onExit={onExitApp} />
            ) : (
              <LegalAgreementFlow busy={state.busy} onAcceptAll={onAcceptAll} onDecline={onDecline} />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
