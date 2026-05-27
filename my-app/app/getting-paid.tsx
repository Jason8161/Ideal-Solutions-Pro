import { Link, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { accentPanelStyle, getAccentTints } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { paymentAppIcon, paymentAppTileBackground } from "@/lib/paymentAppIcon";
import { openPaymentApp } from "@/lib/openPaymentApp";
import {
  getEnabledPaymentApps,
  labelForPaymentApp,
  loadPaymentAppsPreferences,
  type PaymentApp,
} from "@/lib/paymentAppsPreferences";
import { FeatureGate } from "@/components/subscription/FeatureGate";

function GettingPaidScreenContent() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [enabled, setEnabled] = useState<PaymentApp[]>([]);

  const reload = useCallback(() => {
    void loadPaymentAppsPreferences().then((apps) => {
      setEnabled(getEnabledPaymentApps(apps));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onTilePress = useCallback((app: PaymentApp) => {
    void openPaymentApp(app.id).catch((e) => {
      Alert.alert(`Could not open ${labelForPaymentApp(app)}`, e instanceof Error ? e.message : "Try again.");
    });
  }, []);

  return (
    <StickyScrollScreen
      title="Getting Paid"
      subtitle="Open the payment apps you accept — app first, then website."
      backHref="/"
      backLabel="← Home"
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {enabled.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No payment methods yet</Text>
          <Text style={styles.emptyBody}>
            Turn on Stripe, Square, Venmo, Cash App, PayPal, or others under Settings → Payment methods. Stripe and Square
            are recommended for credit cards and Tap to Pay on your phone. They will show up here as tappable tiles.
          </Text>
          <Link href={"/settings/payment-apps" as Href} asChild>
            <Pressable style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}>
              <Text style={styles.settingsBtnText}>Payment methods settings</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {enabled.map((app) => (
              <Pressable
                key={app.id}
                onPress={() => onTilePress(app)}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: paymentAppTileBackground(app.preset, colors.accent) },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${labelForPaymentApp(app)}`}
              >
                <View style={styles.tileIcon}>{paymentAppIcon(app, colors.text, 40)}</View>
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {labelForPaymentApp(app)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Link href={"/settings/payment-apps" as Href} asChild>
            <Pressable style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}>
              <Text style={styles.settingsLinkText}>Edit payment methods</Text>
            </Pressable>
          </Link>
        </>
      )}
    </StickyScrollScreen>
  );
}

export default function GettingPaidScreen() {
  return (
    <FeatureGate feature="getting_paid">
      <GettingPaidScreenContent />
    </FeatureGate>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40 },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 4,
    },
    tile: {
      ...panel,
      width: "47%",
      minWidth: 140,
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      paddingHorizontal: 12,
      gap: 10,
    },
    tileIcon: {
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    tileLabel: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    emptyBox: {
      ...panel,
      padding: 18,
      gap: 12,
      marginTop: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    emptyBody: {
      fontSize: 14,
      lineHeight: 20,
      color: tints.mutedText,
      textAlign: "center",
    },
    settingsBtn: {
      ...panel,
      marginTop: 4,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: tints.accentTintActive,
    },
    settingsBtnText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    settingsLink: {
      marginTop: 24,
      paddingVertical: 12,
      alignItems: "center",
    },
    settingsLinkText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
      opacity: 0.9,
      textDecorationLine: "underline",
    },
    pressed: { opacity: 0.88 },
  });
}
