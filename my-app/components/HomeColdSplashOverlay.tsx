import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useBrandingImageStageDimensions } from "@/lib/brandingImageLayout";
import { COLD_SPLASH_LOGO_MS, SPLASH_BACKGROUND_COLOR, useHomeBoot } from "@/lib/homeBoot";
import { COLD_SPLASH_APP_LOGO, COLD_SPLASH_HERO_IMAGE } from "@/lib/splashBackgroundImage";

type SplashPhase = "logo" | "wire";

/** Full-screen splash shown only on the home route during cold start (see AppChrome). */
export function HomeColdSplashOverlay() {
  const [phase, setPhase] = useState<SplashPhase>("logo");
  const { splashLogoUri } = useHomeBoot();
  const stage = useBrandingImageStageDimensions();

  const logoSource = useMemo(
    () => (splashLogoUri ? { uri: splashLogoUri } : COLD_SPLASH_APP_LOGO),
    [splashLogoUri],
  );

  useEffect(() => {
    const timer = setTimeout(() => setPhase("wire"), COLD_SPLASH_LOGO_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="auto" accessibilityViewIsModal>
      <View style={[styles.imageStage, { width: stage.width, height: stage.height }]}>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BACKGROUND_COLOR,
    zIndex: 30,
    elevation: 30,
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
