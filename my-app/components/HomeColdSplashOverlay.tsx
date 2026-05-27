import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { COLD_SPLASH_LOGO_MS, useHomeBoot } from "@/lib/homeBoot";
import { COLD_SPLASH_APP_LOGO, COLD_SPLASH_HERO_IMAGE } from "@/lib/splashBackgroundImage";

type SplashPhase = "logo" | "wire";

/** Full-screen splash shown only on the home route during cold start (see AppChrome). */
export function HomeColdSplashOverlay() {
  const [phase, setPhase] = useState<SplashPhase>("logo");
  const { splashLogoUri } = useHomeBoot();

  const logoSource = useMemo(
    () => (splashLogoUri ? { uri: splashLogoUri } : COLD_SPLASH_APP_LOGO),
    [splashLogoUri],
  );

  useEffect(() => {
    const timer = setTimeout(() => setPhase("wire"), COLD_SPLASH_LOGO_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      {/* Transparent overlay — root `AppConstructionBackdrop` shows the metal wallpaper through. */}
      <Image
        source={phase === "logo" ? logoSource : COLD_SPLASH_HERO_IMAGE}
        style={phase === "logo" ? styles.logoImage : styles.heroImage}
        contentFit="contain"
        accessibilityRole="image"
        accessibilityLabel={
          phase === "logo"
            ? "Ideal Solutions Pro app logo"
            : "Electrician hands joining a sparking wire"
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    pointerEvents: "auto",
    zIndex: 30,
  },
  logoImage: {
    flex: 1,
    width: "100%",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
});
