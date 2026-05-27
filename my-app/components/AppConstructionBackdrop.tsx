import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useDisplaySettings } from "@/context/DisplaySettingsContext";
import { APP_BACKGROUND_IMAGE, APP_BACKGROUND_SCRIM_ALPHA } from "@/lib/appBackgroundImage";
import { backgroundBrightnessToWhiteScrimAlpha } from "@/lib/backgroundBrightnessStorage";

type Props = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Edge-to-edge industrial metal wallpaper with an optional neutral scrim.
 * Mounted once from `app/_layout.tsx` behind all routes (`resizeMode="cover"`).
 */
export function AppConstructionBackdrop({ style }: Props) {
  const { backgroundBrightness } = useDisplaySettings();
  const darkScrimColor =
    APP_BACKGROUND_SCRIM_ALPHA > 0 ? `rgba(0, 0, 0, ${APP_BACKGROUND_SCRIM_ALPHA})` : undefined;
  const whiteScrimAlpha = backgroundBrightnessToWhiteScrimAlpha(backgroundBrightness);
  const lightScrimColor =
    whiteScrimAlpha > 0 ? `rgba(255, 255, 255, ${whiteScrimAlpha})` : undefined;

  return (
    <ImageBackground
      source={APP_BACKGROUND_IMAGE}
      resizeMode="cover"
      style={[styles.root, styles.nonInteractive, style]}
      imageStyle={styles.image}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {darkScrimColor ? (
        <View style={[styles.scrim, styles.nonInteractive, { backgroundColor: darkScrimColor }]} />
      ) : null}
      {lightScrimColor ? (
        <View style={[styles.scrim, styles.nonInteractive, { backgroundColor: lightScrimColor }]} />
      ) : null}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  nonInteractive: {
    pointerEvents: "none",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
});
