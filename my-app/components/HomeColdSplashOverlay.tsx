import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FOOTER_BAR_HEIGHT } from "@/components/FormScrollView";
import { useBrandingImageStageDimensions } from "@/lib/brandingImageLayout";
import { COLD_SPLASH_LOGO_MS, useHomeBoot } from "@/lib/homeBoot";
import { COLD_SPLASH_APP_LOGO, COLD_SPLASH_HERO_IMAGE } from "@/lib/splashBackgroundImage";

type SplashPhase = "logo" | "wire";

/** Full-screen splash shown only on the home route during cold start (see AppChrome). */
export function HomeColdSplashOverlay() {
  const [phase, setPhase] = useState<SplashPhase>("logo");
  const { splashLogoUri } = useHomeBoot();
  const insets = useSafeAreaInsets();
  const stage = useBrandingImageStageDimensions();
  const footerReserve = FOOTER_BAR_HEIGHT + Math.max(insets.bottom, 10) + 10;

  const logoSource = useMemo(
    () => (splashLogoUri ? { uri: splashLogoUri } : COLD_SPLASH_APP_LOGO),
    [splashLogoUri],
  );

  useEffect(() => {
    const timer = setTimeout(() => setPhase("wire"), COLD_SPLASH_LOGO_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={[styles.overlay, { bottom: footerReserve }]}
      pointerEvents="box-none"
      accessibilityViewIsModal
    >
      {/* Transparent overlay — root `AppConstructionBackdrop` shows the metal wallpaper through. */}
      <View style={[styles.imageStage, { width: stage.width, height: stage.height }]} pointerEvents="auto">
        <Image
          source={phase === "logo" ? logoSource : COLD_SPLASH_HERO_IMAGE}
          style={styles.stageImage}
          contentFit="contain"
          accessibilityRole="image"
          accessibilityLabel={
            phase === "logo"
              ? "Ideal Solutions Pro app logo"
              : "Electrician hands joining a sparking wire"
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    zIndex: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  imageStage: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  stageImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
});
