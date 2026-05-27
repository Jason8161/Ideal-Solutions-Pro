import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  accentPanelStyle,
  getAccentTints,
  onAccentTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { getCurrentAppVersion } from "@/lib/backup/appVersionStorage";

const WARNING_BODY =
  "Ideal Solutions Pro has been updated. Before you continue, strongly consider backing up your data.\n\n" +
  "Updates can change how data is stored on this device. Without a backup, you may lose:\n\n" +
  "• Jobs and job folders\n" +
  "• Estimates (Boss Man and accounting estimates)\n" +
  "• Employees and crew records\n" +
  "• Photos and custom tile images\n" +
  "• Invoices and billing settings\n" +
  "• AI assistance project history\n" +
  "• App settings and preferences\n\n" +
  "A backup saves a secure copy you can restore if anything goes wrong. We recommend backing up now and storing the file in OneDrive, iCloud, or email.";

const CONTINUE_ACK_LABEL =
  "I understand I may lose jobs, estimates, employees, photos, invoices, AI history, and settings if I continue without a backup.";

type Props = {
  busy?: boolean;
  onBackUpNow: () => void | Promise<void>;
  onContinueWithoutBackup: () => void | Promise<void>;
  onCancelUpdate: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PreUpdateBackupModal({
  busy = false,
  onBackUpNow,
  onContinueWithoutBackup,
  onCancelUpdate,
  style,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [ackChecked, setAckChecked] = useState(false);
  const [showContinuePanel, setShowContinuePanel] = useState(false);
  const version = getCurrentAppVersion();

  const canContinue = ackChecked && !busy;

  return (
    <View style={[styles.root, style]}>
      <Text style={styles.badge}>Update available</Text>
      <Text style={styles.title}>Back up before updating</Text>
      <Text style={styles.version}>Version {version}</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <Text style={styles.warningLead}>Important — read before continuing</Text>
        <Text style={styles.body}>{WARNING_BODY}</Text>
      </ScrollView>

      {showContinuePanel ? (
        <View style={styles.continuePanel}>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setAckChecked((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ackChecked }}
          >
            <View style={[styles.checkbox, ackChecked && styles.checkboxChecked]}>
              {ackChecked ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>{CONTINUE_ACK_LABEL}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.dangerButton,
              !canContinue && styles.buttonDisabled,
              pressed && canContinue && styles.pressed,
            ]}
            disabled={!canContinue}
            onPress={() => void onContinueWithoutBackup()}
            accessibilityRole="button"
          >
            <Text style={styles.dangerButtonText}>{busy ? "Working…" : "Continue without backup"}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
            onPress={() => {
              setShowContinuePanel(false);
              setAckChecked(false);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.textButtonLabel}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, busy && styles.buttonDisabled, pressed && !busy && styles.pressed]}
            disabled={busy}
            onPress={() => void onBackUpNow()}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color={onAccentTextColor(colors)} />
            ) : (
              <Text style={styles.primaryButtonText}>Back up now</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, busy && styles.buttonDisabled, pressed && !busy && styles.pressed]}
            disabled={busy}
            onPress={() => setShowContinuePanel(true)}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Continue without backup</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            onPress={onCancelUpdate}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel update</Text>
          </Pressable>
        </View>
      )}
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
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
      minHeight: 0,
    },
    badge: {
      alignSelf: "flex-start",
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "900",
      marginBottom: 4,
    },
    version: {
      color: hexToRgba(colors.text, 0.7),
      fontSize: 13,
      marginBottom: 12,
    },
    scroll: {
      flex: 1,
      minHeight: 0,
      marginBottom: 14,
      ...panel,
      borderColor: hexToRgba(colors.accent, 0.35),
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 24,
    },
    warningLead: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    body: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "600",
    },
    actions: {
      gap: 10,
    },
    continuePanel: {
      gap: 10,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
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
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    dangerButton: {
      backgroundColor: hexToRgba("#c0392b", 0.85),
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
    },
    dangerButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
    },
    cancelButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    cancelButtonText: {
      color: hexToRgba(colors.text, 0.65),
      fontSize: 15,
      fontWeight: "700",
    },
    textButton: {
      paddingVertical: 10,
      alignItems: "center",
    },
    textButtonLabel: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "700",
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: colors.accent,
    },
    checkmark: {
      color: onAccentTextColor(colors),
      fontWeight: "800",
      fontSize: 14,
    },
    checkboxLabel: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "600",
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
