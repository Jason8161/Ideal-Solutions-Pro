import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  accentPanelStyle,
  getAccentTints,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import type { WebsiteFallbackPayload } from "@/lib/supplierIntegration/launchService";
import { useMemo } from "react";

type Props = {
  visible: boolean;
  payload: WebsiteFallbackPayload | null;
  onDownload: () => void;
  onWebsite: () => void;
  onCancel: () => void;
};

export function WebsiteFallbackModal({ visible, payload, onDownload, onWebsite, onCancel }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!payload) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss">
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{payload.displayName} app not installed</Text>
          <Text style={styles.body}>
            Install their app for the best signed-in experience, or continue on the website with your search term.
          </Text>
          <View style={styles.actions}>
            {payload.storeUrl ? (
              <Pressable
                onPress={onDownload}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Download app"
              >
                <Text style={styles.primaryBtnText}>Download app</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onWebsite}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Continue to website"
            >
              <Text style={styles.secondaryBtnText}>Continue to website</Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondary = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: hexToRgba("#000000", 0.62),
      justifyContent: "center",
      padding: 24,
    },
    card: {
      ...panel,
      padding: 20,
      borderWidth: 2,
      borderColor: hexToRgba(colors.accent, 0.55),
      shadowColor: colors.accent,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      gap: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      color: tints.mutedText,
    },
    actions: { gap: 10, marginTop: 4 },
    primaryBtn: {
      ...secondary,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: tints.accentTintActive,
      borderColor: hexToRgba(colors.accent, 0.55),
    },
    primaryBtnText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    secondaryBtn: {
      ...secondary,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: tints.accentTintActive,
    },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    cancelBtn: {
      paddingVertical: 12,
      alignItems: "center",
    },
    cancelBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: tints.mutedText,
    },
    pressed: { opacity: 0.88 },
  });
}
