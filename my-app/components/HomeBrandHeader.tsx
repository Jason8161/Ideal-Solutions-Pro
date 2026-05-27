import { BebasNeue_400Regular, useFonts } from "@expo-google-fonts/bebas-neue";
import { Image } from "expo-image";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

export const HOME_BRAND_PRIMARY = "Ideal Solutions Pro";
export const HOME_BRAND_SECONDARY = "Built for contractors — from DIY to pro crews";

/** Industrial IS monogram + lightning accents (same art as app icon). */
const HOME_BRAND_LOGO = require("@/assets/images/home-brand-logo.png");

const INDUSTRIAL_FONT = "BebasNeue_400Regular";
const FALLBACK_FONT = Platform.select({
  ios: "HelveticaNeue-Bold",
  android: "sans-serif-condensed",
  default: "sans-serif",
});

type HomeBrandHeaderProps = {
  colors: ColorScheme;
};

export function HomeBrandHeader({ colors }: HomeBrandHeaderProps) {
  const [fontsLoaded] = useFonts({ BebasNeue_400Regular });
  const fontFamily = fontsLoaded ? INDUSTRIAL_FONT : FALLBACK_FONT;
  const shadowColor = hexToRgba(colors.background, 0.9);
  const embossedShadow =
    Platform.OS === "web"
      ? { textShadow: `0px 2px 1px ${shadowColor}` }
      : {
          textShadowColor: shadowColor,
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 1,
        };

  return (
    <View style={styles.topBar}>
      <Image
        source={HOME_BRAND_LOGO}
        style={styles.brandLogo}
        contentFit="contain"
        accessibilityRole="header"
        accessibilityLabel={HOME_BRAND_PRIMARY}
      />
      <Text
        style={[
          styles.secondary,
          embossedShadow,
          { color: colors.text, fontFamily },
        ]}
        numberOfLines={2}
      >
        {HOME_BRAND_SECONDARY}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 16,
    alignItems: "center",
    gap: 6,
  },
  brandLogo: {
    width: "100%",
    maxWidth: 300,
    height: 80,
    alignSelf: "center",
  },
  secondary: {
    fontSize: 15,
    lineHeight: 19,
    textAlign: "center",
    letterSpacing: 0.8,
    opacity: 0.95,
  },
});
