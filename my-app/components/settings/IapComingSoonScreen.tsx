import { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { mutedTextColor, navCardStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import {
  iapCategoryBackHref,
  iapCategoryBackLabel,
  type IapCategory,
} from "@/lib/iapSettingsCategories";

type Props = {
  category: IapCategory;
  /** Optional extra bullets shown below the coming-soon card. */
  bullets?: readonly string[];
};

export function IapComingSoonScreen({ category, bullets }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <StickyScrollScreen
      title={category.title}
      subtitle={category.hint}
      backHref={iapCategoryBackHref()}
      backLabel={iapCategoryBackLabel()}
      contentContainerStyle={styles.content}
    >
      <View style={styles.card} accessibilityRole="text">
        <Text style={styles.cardTitle}>Coming soon</Text>
        <Text style={styles.body}>
          {category.title} purchases are not available in the store yet. We&apos;re setting up{" "}
          {Platform.OS === "ios"
            ? "App Store products for this category"
            : Platform.OS === "android"
              ? "Google Play products for this category"
              : "App Store and Google Play products for this category"}
          {" ΓÇö check back after the next release."}
        </Text>
      </View>

      {bullets && bullets.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Planned</Text>
          {bullets.map((line) => (
            <Text key={line} style={styles.bullet}>
              ΓÇó {line}
            </Text>
          ))}
        </View>
      ) : null}
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const cardBase = navCardStyle(colors);

  return StyleSheet.create({
    content: {
      padding: 16,
      paddingBottom: 32,
      gap: 14,
    },
    card: {
      ...cardBase,
      padding: 14,
      gap: 8,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: mutedTextColor(colors), textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text},
    bullet: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.text},
  });
}
