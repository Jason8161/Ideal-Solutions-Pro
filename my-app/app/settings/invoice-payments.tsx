import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { accentPanelStyle, getAccentTints, inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  DEFAULT_INVOICE_PAYMENT_SETTINGS,
  INVOICE_PAYMENT_PROVIDER_HINTS,
  INVOICE_PAYMENT_PROVIDER_LABELS,
  INVOICE_PAYMENT_PROVIDERS_ORDER,
  INVOICE_PAYMENT_SUGGESTED_PROVIDERS,
  isRemoteInvoicePaymentProvider,
  loadInvoicePaymentSettings,
  saveInvoicePaymentSettings,
  type InvoicePaymentSettings,
} from "@/lib/invoices/invoicePaymentSettingsStorage";
import {
  applyInvoicePaymentSettingsToCustomerMethods,
  loadCustomerPaymentMethods,
  saveCustomerPaymentMethods,
} from "@/lib/invoices/customerPaymentMethodsStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";

const SUGGESTED_PROVIDER_LABELS: Record<(typeof INVOICE_PAYMENT_SUGGESTED_PROVIDERS)[number], string> = {
  stripe: "Stripe",
  square: "Square",
  tap_to_pay: "Tap to Pay",
};

export default function InvoicePaymentsSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [settings, setSettings] = useState<InvoicePaymentSettings>(DEFAULT_INVOICE_PAYMENT_SETTINGS);
  const [savedHint, setSavedHint] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(() => {
    void loadInvoicePaymentSettings().then((loaded) => {
      setSettings(loaded);
      setHydrated(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const patch = useCallback((partial: Partial<InvoicePaymentSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const save = useCallback(async () => {
    await saveInvoicePaymentSettings(settings);
    const methods = await loadCustomerPaymentMethods();
    await saveCustomerPaymentMethods(applyInvoicePaymentSettingsToCustomerMethods(methods, settings));
    setSavedHint("Saved.");
    setTimeout(() => setSavedHint(""), 2000);
  }, [settings]);

  const remoteProvider = isRemoteInvoicePaymentProvider(settings.provider);

  if (!hydrated) {
    return (
      <StickyScrollScreen
        title="Invoice payments"
        backHref={settingsBackHref("invoice-payments")}
        backLabel={settingsBackLabel("invoice-payments")}
      >
        <Text style={styles.body}>Loading…</Text>
      </StickyScrollScreen>
    );
  }

  return (
    <StickyScrollScreen
      title="Invoice payments"
      subtitle="Add a pay-online link when you text or email invoices. Ideal Solutions Pro does not process payments — customers pay through your provider."
      backHref={settingsBackHref("invoice-payments")}
      backLabel={settingsBackLabel("invoice-payments")}
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.body}>
        Turn on payment links and configure Settings → Payment methods with URLs for Stripe, Square, PayPal, Venmo, Cash App, and others.
        When you send an invoice, the message includes PAY NOW: followed by a link where the customer picks a payment method.
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Include pay link on invoices</Text>
          <Text style={styles.rowHint}>Adds PAY NOW: … to SMS and email invoice messages.</Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(value) => patch({ enabled: value })}
          thumbColor={colors.accent}
          trackColor={{
            false: hexToRgba(colors.text, 0.22),
            true: hexToRgba(colors.accent, 0.55),
          }}
          accessibilityLabel="Include pay link on invoices"
        />
      </View>

      <Text style={[styles.section, styles.sectionSpaced]}>Payment provider</Text>
      <View style={styles.suggestedCallout}>
        <Text style={styles.suggestedText}>Recommended for contractors: Stripe, Square, Tap to Pay</Text>
        <View style={styles.suggestedRow}>
          {INVOICE_PAYMENT_SUGGESTED_PROVIDERS.map((provider) => {
            const selected = settings.provider === provider;
            return (
              <Pressable
                key={provider}
                onPress={() => patch({ provider })}
                style={({ pressed }) => [
                  styles.suggestedChip,
                  selected && styles.suggestedChipSelected,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Select ${SUGGESTED_PROVIDER_LABELS[provider]}`}
              >
                <Text style={[styles.suggestedChipText, selected && styles.suggestedChipTextSelected]}>
                  {SUGGESTED_PROVIDER_LABELS[provider]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.providerList}>
        {INVOICE_PAYMENT_PROVIDERS_ORDER.map((provider) => {
          const selected = settings.provider === provider;
          return (
            <Pressable
              key={provider}
              onPress={() => patch({ provider })}
              style={({ pressed }) => [
                styles.providerChip,
                selected && styles.providerChipSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.providerChipText, selected && styles.providerChipTextSelected]}>
                {INVOICE_PAYMENT_PROVIDER_LABELS[provider]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>{INVOICE_PAYMENT_PROVIDER_HINTS[settings.provider]}</Text>

      {remoteProvider ? (
        <>
          <Text style={[styles.section, styles.sectionSpaced]}>Payment link URL</Text>
          <VoiceTextInput
            style={styles.input}
            placeholder="https://buy.stripe.com/… or https://paypal.me/…"
            placeholderTextColor={placeholderTextColor(colors)}
            value={settings.paymentLinkBaseUrl}
            onChangeText={(value) => patch({ paymentLinkBaseUrl: value })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Ideal Solutions Pro appends query params when sending: invoice, invoice_id, amount (dollars), and amount_cents. Some
            providers ignore extra params — create invoice-specific links in their dashboard if needed.
          </Text>
        </>
      ) : (
        <Text style={[styles.hint, styles.sectionSpaced]}>
          Tap to Pay is for accepting cards on-site with your phone. Choose Stripe or Square above if you also want a remote
          pay link included when you text or email invoices.
        </Text>
      )}

      <Text style={[styles.section, styles.sectionSpaced]}>Phase 2 (coming later)</Text>
      <Text style={styles.hint}>
        Direct Stripe API integration to create a unique Payment Link per invoice automatically — no paste required.
      </Text>

      <Pressable
        onPress={() => void save()}
        style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Save invoice payment settings"
      >
        <Text style={styles.saveBtnText}>Save</Text>
      </Pressable>
      {savedHint ? <Text style={styles.savedHint}>{savedHint}</Text> : null}
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
      marginBottom: 4,
    },
    row: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginTop: 4,
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
    suggestedCallout: {
      ...panel,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 10,
      marginTop: 4,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent, 0.35),
      backgroundColor: tints.accentTintActive,
    },
    suggestedText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.92,
    },
    suggestedRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    suggestedChip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: hexToRgba(colors.text, 0.18),
      borderRadius: 8,
      backgroundColor: hexToRgba(colors.text, 0.06),
    },
    suggestedChipSelected: {
      borderColor: colors.accent,
      backgroundColor: hexToRgba(colors.accent, 0.22),
    },
    suggestedChipText: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.88,
    },
    suggestedChipTextSelected: {
      opacity: 1,
    },
    providerList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
      marginBottom: 4,
    },
    providerChip: {
      ...panel,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: hexToRgba(colors.text, 0.12),
    },
    providerChipSelected: {
      borderColor: colors.accent,
      backgroundColor: tints.accentTintActive,
    },
    providerChipText: {
      fontSize: 13,
      fontWeight: "700",
      color: tints.mutedText,
    },
    providerChipTextSelected: {
      color: colors.text,
    },
    input: {
      ...inputStyle(colors, tints),
    },
    saveBtn: {
      ...panel,
      marginTop: 16,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: tints.accentTintActive,
    },
    saveBtnText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    savedHint: {
      textAlign: "center",
      fontSize: 14,
      color: colors.accent,
      fontWeight: "700",
      marginTop: 8,
    },
    pressed: { opacity: 0.88 },
  });
}
