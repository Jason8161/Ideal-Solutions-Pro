import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  accentPanelStyle,
  getAccentTints,
  onAccentTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

type Props = {
  onContinue: () => void;
  onExit: () => void;
};

export function LegalIntroScreen({ onContinue, onExit }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <Text style={styles.title}>Quick Heads Up</Text>
        <Text style={styles.message}>
          Here is the most aggravating part… but at least we only have to do it once.{"\n\n"}
          Before using Ideal Solutions Pro, we need you to review and agree to a few legal documents and
          disclaimers so we can keep everything secure, transparent, and protected for everyone.{"\n\n"}
          Once completed, you shouldn’t have to do this again unless policies are updated in the future.
        </Text>
        <Text style={styles.small}>We promise the fun stuff starts right after this.</Text>

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.exitButton, pressed && styles.pressed]}
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel="Exit App"
        >
          <Text style={styles.exitButtonText}>Exit App</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondary = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    panel: {
      ...panel,
      padding: 24,
      gap: 16,
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "800",
      textAlign: "center",
    },
    message: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 24,
    },
    small: {
      color: hexToRgba(colors.text, 0.72),
      fontSize: 13,
      fontStyle: "italic",
      textAlign: "center",
    },
    primaryButton: {
      ...secondary,
      marginTop: 8,
      paddingVertical: 14,
      backgroundColor: colors.accent,
    },
    primaryButtonText: {
      color: onAccentTextColor(colors),
      fontSize: 17,
      fontWeight: "800",
    },
    exitButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    exitButtonText: {
      color: hexToRgba(colors.text, 0.7),
      fontSize: 15,
      fontWeight: "600",
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
