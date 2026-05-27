import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { accentPanelStyle, getAccentTints, onAccentTextColor, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

type Props = {
  busy?: boolean;
  onRestore: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
};

export function RestorePromptModal({ busy = false, onRestore, onSkip, style }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.root, style]}>
      <Text style={styles.title}>Restore previous backup?</Text>
      <View style={styles.panel}>
        <Text style={styles.body}>
          If you used Ideal Solutions Pro on another phone or reinstalled the app, you can restore a backup file now.
          {"\n\n"}
          Choose a backup from OneDrive, email, or Files. Your current data on this device will be replaced after you
          confirm.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, busy && styles.buttonDisabled, pressed && !busy && styles.pressed]}
        disabled={busy}
        onPress={() => void onRestore()}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>{busy ? "Working…" : "Restore"}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.secondaryButton, busy && styles.buttonDisabled, pressed && !busy && styles.pressed]}
        disabled={busy}
        onPress={() => void onSkip()}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryButtonText}>Skip</Text>
      </Pressable>
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
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 24,
      justifyContent: "center",
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "900",
      marginBottom: 16,
      textAlign: "center",
    },
    panel: {
      ...panel,
      padding: 18,
      marginBottom: 22,
    },
    body: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "600",
      textAlign: "center",
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 12,
    },
    primaryButtonText: {
      color: onAccentTextColor(colors),
      fontSize: 17,
      fontWeight: "900",
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    secondaryButton: {
      ...secondary,
      paddingVertical: 14,
      borderRadius: 16,
    },
    secondaryButtonText: {
      color: hexToRgba(colors.text, 0.85),
      fontSize: 16,
      fontWeight: "800",
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
