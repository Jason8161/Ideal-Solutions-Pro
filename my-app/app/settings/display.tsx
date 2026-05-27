import { Link } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { accentPanelStyle, getAccentTints } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useDisplaySettings } from "@/context/DisplaySettingsContext";
import {
  BACKGROUND_BRIGHTNESS_LEVELS,
  BACKGROUND_BRIGHTNESS_MAX,
} from "@/lib/backgroundBrightnessStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

export default function DisplaySettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { backgroundBrightness, setBackgroundBrightness } = useDisplaySettings();

  const select = useCallback(
    (value: number) => {
      void setBackgroundBrightness(value);
    },
    [setBackgroundBrightness],
  );

  return (
    <StickyScrollScreen
      title="Display"
      subtitle="Lighten the metal background wallpaper if it is hard to see."
      backHref={settingsBackHref("display")}
      backLabel={settingsBackLabel("display")}
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.body}>
        Lighten the metal background wallpaper if it is hard to see. Higher settings add a soft white wash behind all
        screens. Default keeps the original look.
      </Text>

      <Text style={styles.section}>Background brightness</Text>
      <Text style={styles.valueLabel}>{backgroundBrightness}%</Text>
      <View style={styles.row}>
        {BACKGROUND_BRIGHTNESS_LEVELS.map(({ value, label }) => (
          <Pressable
            key={value}
            onPress={() => select(value)}
            style={({ pressed }) => [
              styles.chip,
              backgroundBrightness === value && styles.chipOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, backgroundBrightness === value && styles.chipTextOn]}>
              {label}
              {value > 0 ? ` (${value}%)` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>
        Tip: try Medium ({BACKGROUND_BRIGHTNESS_LEVELS[2].value}%) or Bright (
        {BACKGROUND_BRIGHTNESS_LEVELS[3].value}%) first. Maximum is{" "}
        {BACKGROUND_BRIGHTNESS_MAX}% for the strongest lightening.
      </Text>

    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40 },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      opacity: 0.85,
      marginBottom: 20,
    },
    section: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
      opacity: 0.9,
    },
    valueLabel: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 12,
    },
    row: { gap: 10 },
    chip: {
      ...panel,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    chipOn: {
      backgroundColor: tints.accentTintActive,
    },
    chipText: { color: colors.text, fontSize: 15, fontWeight: "600", opacity: 0.85 },
    chipTextOn: { color: colors.background, fontWeight: "800", opacity: 1 },
    hint: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.75,
    },
    back: { marginTop: 24, paddingVertical: 10 },
    backText: { color: colors.text, fontSize: 16, fontWeight: "700" },
    pressed: { opacity: 0.88 },
  });
}
