import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AgreementCheckbox } from "@/components/legal/AgreementCheckbox";
import {
  accentPanelStyle,
  getAccentTints,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

type Props = {
  title: string;
  body: string;
  effectiveVersion?: string;
  mode: "accept" | "read";
  checkboxLabel?: string;
  acceptLabel?: string;
  onAccept?: () => void | Promise<void>;
  onDecline?: () => void;
  onMarkViewed?: () => void;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function LegalDocumentScreen({
  title,
  body,
  effectiveVersion,
  mode,
  checkboxLabel = "I have read and agree",
  acceptLabel = "Accept",
  onAccept,
  onDecline,
  onMarkViewed,
  busy = false,
  style,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [checked, setChecked] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(mode === "read");

  const canAccept = mode === "read" || (checked && scrolledToEnd && !busy);
  const isAcceptMode = mode === "accept";

  return (
    <View style={[styles.root, isAcceptMode && styles.rootAccept, style]}>
      <View style={[styles.header, isAcceptMode && styles.headerAccept]}>
        <Text style={[styles.title, isAcceptMode && styles.titleAccept]}>{title}</Text>
        {effectiveVersion ? (
          <Text style={[styles.version, isAcceptMode && styles.versionAccept]}>
            Effective {effectiveVersion}
          </Text>
        ) : null}
      </View>

      <View style={[styles.scrollWrap, isAcceptMode && styles.scrollWrapAccept]}>
        <ScrollView
          style={[styles.scroll, isAcceptMode && styles.scrollAccept]}
          contentContainerStyle={[styles.scrollContent, isAcceptMode && styles.scrollContentAccept]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const nearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 48;
            if (nearEnd && !scrolledToEnd) {
              setScrolledToEnd(true);
              onMarkViewed?.();
            }
          }}
          scrollEventThrottle={32}
        >
          <Text style={styles.body}>{body}</Text>
        </ScrollView>
      </View>

      {isAcceptMode ? (
        <View style={styles.footer}>
          {!scrolledToEnd ? <Text style={styles.hint}>Scroll to the end to continue.</Text> : null}
          <View style={styles.checkboxWrap}>
            <AgreementCheckbox
              checked={checked}
              onToggle={() => setChecked((v) => !v)}
              label={checkboxLabel}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.acceptButton,
              !canAccept && styles.acceptButtonDisabled,
              pressed && canAccept && styles.pressed,
            ]}
            disabled={!canAccept}
            onPress={() => void onAccept?.()}
            accessibilityRole="button"
            accessibilityLabel={acceptLabel}
          >
            <Text style={styles.acceptButtonText}>{busy ? "Saving…" : acceptLabel}</Text>
          </Pressable>

          {onDecline ? (
            <Pressable
              style={({ pressed }) => [styles.declineButton, pressed && styles.pressed]}
              onPress={onDecline}
              accessibilityRole="button"
              accessibilityLabel="Decline"
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondary = secondaryButtonStyle(colors, tints);
  const panel = accentPanelStyle(colors, tints);

  return StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
      minHeight: 0,
    },
    rootAccept: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 0,
    },
    header: {
      marginBottom: 12,
    },
    headerAccept: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 8,
      marginBottom: 0,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "800",
      marginBottom: 4,
    },
    titleAccept: {
      fontSize: 20,
      marginBottom: 2,
    },
    version: {
      color: hexToRgba(colors.text, 0.7),
      fontSize: 13,
      marginBottom: 12,
    },
    versionAccept: {
      marginBottom: 0,
      fontSize: 12,
    },
    scrollWrap: {
      flex: 1,
      minHeight: 0,
    },
    scrollWrapAccept: {
      flex: 1,
    },
    scroll: {
      flex: 1,
      minHeight: 0,
      marginBottom: 12,
      ...panel,
    },
    scrollAccept: {
      marginBottom: 0,
      borderRadius: 0,
      backgroundColor: "transparent",
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 48,
    },
    scrollContentAccept: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 56,
    },
    body: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: hexToRgba(colors.accent, 0.22),
      backgroundColor: hexToRgba(colors.background, 0.98),
    },
    hint: {
      color: hexToRgba(colors.text, 0.75),
      fontSize: 13,
      marginBottom: 10,
    },
    checkboxWrap: {
      marginBottom: 14,
    },
    acceptButton: {
      ...secondary,
      paddingVertical: 14,
    },
    acceptButtonDisabled: {
      opacity: 0.45,
    },
    declineButton: {
      marginTop: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    acceptButtonText: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },
    declineButtonText: {
      color: hexToRgba(colors.text, 0.65),
      fontSize: 15,
      fontWeight: "600",
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
