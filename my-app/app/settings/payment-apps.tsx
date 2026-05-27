import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { accentPanelStyle, getAccentTints, inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import { paymentAppIcon } from "@/lib/paymentAppIcon";
import {
  PAYMENT_APP_PRESET_DEFINITIONS,
  PAYMENT_APP_SUGGESTED_PRESETS,
  defaultPaymentAppsPreferences,
  labelForPaymentApp,
  loadPaymentAppsPreferences,
  newCustomPaymentAppId,
  savePaymentAppsPreferences,
  type PaymentApp,
} from "@/lib/paymentAppsPreferences";
import {
  customerMethodsToPaymentApps,
  loadCustomerPaymentMethods,
  paymentAppsToCustomerMethods,
  saveCustomerPaymentMethods,
} from "@/lib/invoices/customerPaymentMethodsStorage";

export default function PaymentAppsSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [apps, setApps] = useState<PaymentApp[]>(defaultPaymentAppsPreferences);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const reload = useCallback(() => {
    void Promise.all([loadPaymentAppsPreferences(), loadCustomerPaymentMethods()]).then(
      ([apps, methods]) => {
        setApps(customerMethodsToPaymentApps(methods, apps));
      },
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const persist = useCallback((next: PaymentApp[]) => {
    setApps(next);
    void savePaymentAppsPreferences(next);
    void saveCustomerPaymentMethods(paymentAppsToCustomerMethods(next));
  }, []);

  const patchPayUrl = useCallback(
    (id: string, payUrl: string) => {
      persist(
        apps.map((a) =>
          a.id === id ? { ...a, customUrl: payUrl.trim() || undefined } : a,
        ),
      );
    },
    [apps, persist],
  );

  const toggleEnabled = useCallback(
    (id: string, enabled: boolean) => {
      persist(apps.map((a) => (a.id === id ? { ...a, enabled } : a)));
    },
    [apps, persist],
  );

  const removeCustom = useCallback(
    (app: PaymentApp) => {
      Alert.alert("Remove payment method?", app.name, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => persist(apps.filter((a) => a.id !== app.id)),
        },
      ]);
    },
    [apps, persist],
  );

  const addCustom = useCallback(() => {
    const name = customName.trim();
    const url = customUrl.trim();
    if (!name) {
      Alert.alert("Name required", "Enter a label for this payment method.");
      return;
    }
    if (!url) {
      Alert.alert("URL required", "Enter a link or app URL customers can use to pay you.");
      return;
    }
    const row: PaymentApp = {
      id: newCustomPaymentAppId(),
      name,
      enabled: true,
      preset: "custom",
      customUrl: url,
    };
    persist([...apps, row]);
    setCustomName("");
    setCustomUrl("");
  }, [apps, customName, customUrl, persist]);

  const presetRows = PAYMENT_APP_PRESET_DEFINITIONS.map((def) => {
    const app = apps.find((a) => a.preset === def.preset) ?? {
      id: def.preset,
      name: def.name,
      enabled: false,
      preset: def.preset,
    };
    return { def, app };
  });

  const enableSuggested = useCallback(
    (preset: (typeof PAYMENT_APP_SUGGESTED_PRESETS)[number]) => {
      persist(apps.map((a) => (a.preset === preset ? { ...a, enabled: true } : a)));
    },
    [apps, persist],
  );

  const customRows = apps.filter((a) => a.preset === "custom");

  return (
    <StickyScrollScreen
      title="Payment methods"
      subtitle="Choose which apps customers can pay with on invoice PAY NOW links and on Getting Paid."
      backHref={settingsBackHref("payment-apps")}
      backLabel={settingsBackLabel("payment-apps")}
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.body}>
        Toggle payment apps you accept and add a payment link or handle URL for each one. Enabled methods appear on
        invoice PAY NOW pages and as tiles on Getting Paid.
      </Text>

      <View style={styles.suggestedCallout}>
        <Text style={styles.suggestedText}>Recommended for contractors: Stripe, Square</Text>
        <Text style={styles.suggestedHint}>Accept credit and debit cards on invoices and in the field.</Text>
        <View style={styles.suggestedRow}>
          {PAYMENT_APP_SUGGESTED_PRESETS.map((preset) => {
            const def = PAYMENT_APP_PRESET_DEFINITIONS.find((d) => d.preset === preset);
            const app = apps.find((a) => a.preset === preset);
            const enabled = app?.enabled ?? false;
            return (
              <Pressable
                key={preset}
                onPress={() => enableSuggested(preset)}
                style={({ pressed }) => [
                  styles.suggestedChip,
                  enabled && styles.suggestedChipEnabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: enabled }}
                accessibilityLabel={`Turn on ${def?.name ?? preset}`}
              >
                <Text style={[styles.suggestedChipText, enabled && styles.suggestedChipTextEnabled]}>
                  {def?.name ?? preset}
                  {enabled ? " ✓" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.section}>Built-in apps</Text>
      <View style={styles.list}>
        {presetRows.map(({ def, app }) => (
          <View key={def.preset} style={styles.rowBlock}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>{paymentAppIcon(app, colors.text, 26)}</View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>
                  {def.name}
                  {def.suggested ? <Text style={styles.suggestedBadge}> · Suggested</Text> : null}
                </Text>
                <Text style={styles.rowHint}>{def.description}</Text>
              </View>
              <Switch
                value={app.enabled}
                onValueChange={(value) => toggleEnabled(app.id, value)}
                thumbColor={colors.accent}
                trackColor={{
                  false: hexToRgba(colors.text, 0.22),
                  true: hexToRgba(colors.accent, 0.55),
                }}
                accessibilityLabel={`${def.name} accepted`}
              />
            </View>
            {app.enabled ? (
              <VoiceTextInput
                style={styles.urlInput}
                placeholder={`${def.name} payment link (https://…)`}
                placeholderTextColor={placeholderTextColor(colors)}
                value={app.customUrl ?? ""}
                onChangeText={(value) => patchPayUrl(app.id, value)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            ) : null}
          </View>
        ))}
      </View>

      <Text style={[styles.section, styles.sectionSpaced]}>Custom link</Text>
      <Text style={styles.hint}>Add another processor, invoice page, or payment link with any name and URL.</Text>
      <View style={styles.form}>
        <VoiceTextInput
          style={styles.input}
          placeholder="Name (e.g. My invoice page)"
          placeholderTextColor={placeholderTextColor(colors)}
          value={customName}
          onChangeText={setCustomName}
          autoCapitalize="words"
        />
        <VoiceTextInput
          style={styles.input}
          placeholder="URL (https://… or app://…)"
          placeholderTextColor={placeholderTextColor(colors)}
          value={customUrl}
          onChangeText={setCustomUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable
          onPress={addCustom}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add custom payment method"
        >
          <Text style={styles.addBtnText}>Add custom method</Text>
        </Pressable>
      </View>

      {customRows.length > 0 ? (
        <>
          <Text style={[styles.section, styles.sectionSpaced]}>Your custom methods</Text>
          <View style={styles.list}>
            {customRows.map((app) => (
              <View key={app.id} style={styles.rowLegacy}>
                <View style={styles.rowIcon}>{paymentAppIcon(app, colors.text, 26)}</View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{labelForPaymentApp(app)}</Text>
                  <Text style={styles.rowHint} numberOfLines={2}>
                    {app.customUrl ?? "No URL"}
                  </Text>
                </View>
                <Switch
                  value={app.enabled}
                  onValueChange={(value) => toggleEnabled(app.id, value)}
                  thumbColor={colors.accent}
                  trackColor={{
                    false: hexToRgba(colors.text, 0.22),
                    true: hexToRgba(colors.accent, 0.55),
                  }}
                  accessibilityLabel={`${app.name} accepted`}
                />
                <Pressable
                  onPress={() => removeCustom(app)}
                  style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                  accessibilityLabel={`Remove ${app.name}`}
                >
                  <Text style={styles.removeBtnText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40, gap: 8 },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: tints.mutedText,
      marginBottom: 8,
    },
    suggestedCallout: {
      ...panel,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 8,
      marginTop: 4,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent, 0.35),
      backgroundColor: tints.accentTintActive,
    },
    suggestedText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.92,
      fontWeight: "700",
    },
    suggestedHint: {
      fontSize: 12,
      lineHeight: 16,
      color: tints.mutedText,
    },
    suggestedRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 2,
    },
    suggestedChip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: hexToRgba(colors.text, 0.18),
      borderRadius: 8,
      backgroundColor: hexToRgba(colors.text, 0.06),
    },
    suggestedChipEnabled: {
      borderColor: colors.accent,
      backgroundColor: hexToRgba(colors.accent, 0.22),
    },
    suggestedChipText: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.88,
    },
    suggestedChipTextEnabled: {
      opacity: 1,
    },
    suggestedBadge: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.accent,
    },
    section: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    sectionSpaced: { marginTop: 20 },
    hint: {
      fontSize: 13,
      lineHeight: 18,
      color: tints.mutedText,
      marginBottom: 8,
    },
    list: { gap: 10 },
    rowBlock: {
      ...panel,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    urlInput: {
      ...inputStyle(colors, tints),
    },
    rowLegacy: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    rowIcon: {
      width: 32,
      alignItems: "center",
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    rowHint: {
      fontSize: 12,
      lineHeight: 16,
      color: tints.mutedText,
    },
    form: {
      gap: 10,
      marginTop: 4,
    },
    input: {
      ...inputStyle(colors, tints),
    },
    addBtn: {
      ...panel,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: tints.accentTintActive,
    },
    addBtnText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    removeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: hexToRgba("#ef4444", 0.22),
    },
    removeBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
    },
    pressed: { opacity: 0.88 },
  });
}
