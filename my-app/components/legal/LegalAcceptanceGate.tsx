import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Alert, BackHandler, Modal, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppConstructionBackdrop } from "@/components/AppConstructionBackdrop";
import { LegalAgreementFlow } from "@/components/legal/LegalAgreementFlow";
import { LegalIntroScreen } from "@/components/legal/LegalIntroScreen";
import { useAppTheme } from "@/context/ThemeContext";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { useHomeBoot } from "@/lib/homeBoot";
import { acceptAllLegalStuffDocuments } from "@/lib/legal/legalAcceptanceStorage";
import { loadLegalGateState, type LegalGateStep } from "@/lib/legal/legalGate";
import { loadLegalIntroSeen, markLegalIntroSeen } from "@/lib/legal/legalIntroStorage";
import { syncLegalAcceptanceToSupabase } from "@/lib/legal/syncLegalAcceptance";

type GateState = {
  hydrated: boolean;
  introSeen: boolean;
  step: LegalGateStep;
  busy: boolean;
  storageFailed: boolean;
};

export function LegalAcceptanceGate({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { coldSplashDone, profileHydrated } = useHomeBoot();
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
          backgroundColor: "transparent",
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
          fontSize: 13,
          lineHeight: 18,
        },
      }),
    [colors, insets.bottom, insets.top],
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
  }, []);

  useEffect(() => {
    if (!profileHydrated) return;
    void refresh();
  }, [profileHydrated, refresh]);

  const showGate = coldSplashDone && state.hydrated && state.step !== null;

  useEffect(() => {
    if (!showGate) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [showGate]);

  const onDecline = useCallback(() => {
    Alert.alert(
      "Acceptance required",
      "You must accept all legal documents to use Ideal Solutions Pro.",
      Platform.OS === "web"
        ? [{ text: "OK" }]
        : [
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
            { text: "Review", style: "cancel" },
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
    await refresh();
  }, [refresh]);

  if (!coldSplashDone || !state.hydrated) {
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
      <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onDecline}>
        <View style={overlayStyles.modalRoot}>
          <AppConstructionBackdrop />
          <SafeAreaView style={overlayStyles.modalRoot} edges={["top", "bottom", "left", "right"]}>
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
