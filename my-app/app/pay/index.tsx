import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { accentPanelStyle, getAccentTints } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { openCustomerPaymentMethod } from "@/lib/customerPayLaunch";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { paymentAppIcon } from "@/lib/paymentAppIcon";
import type { PaymentApp } from "@/lib/paymentAppsPreferences";
import { computeInvoiceTotals } from "@/lib/invoices/invoiceCalculations";
import {
  getEnabledCustomerPaymentMethods,
  loadCustomerPaymentMethods,
  type CustomerPaymentMethod,
} from "@/lib/invoices/customerPaymentMethodsStorage";
import { decodePaymentMethodsFromLink } from "@/lib/invoices/invoicePayLink";
import { loadInvoiceCustomization } from "@/lib/invoices/invoiceCustomizationStorage";
import { formatCents } from "@/lib/invoices/invoiceMoney";
import { getBossInvoiceById } from "@/lib/invoices/invoiceStorage";

const PAY_GREEN = "#22c55e";

function strParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

function parseAmountCents(amountCents: string, amountMajor: string): number {
  const cents = Number.parseInt(amountCents, 10);
  if (Number.isFinite(cents) && cents >= 0) return cents;
  const major = Number.parseFloat(amountMajor);
  if (Number.isFinite(major) && major >= 0) return Math.round(major * 100);
  return 0;
}

export default function InvoicePayScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    invoiceId?: string;
    invoice?: string;
    amount?: string;
    amount_cents?: string;
    company?: string;
    m?: string;
  }>();

  const invoiceId = strParam(params.invoiceId);
  const invoiceRef = strParam(params.invoice);
  const amountMajor = strParam(params.amount);
  const amountCentsParam = strParam(params.amount_cents);
  const company = strParam(params.company);
  const encodedMethods = strParam(params.m);

  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<CustomerPaymentMethod[]>([]);
  const [displayRef, setDisplayRef] = useState(invoiceRef);
  const [displayCompany, setDisplayCompany] = useState(company);
  const [balanceCents, setBalanceCents] = useState(() =>
    parseAmountCents(amountCentsParam, amountMajor),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fromLink = decodePaymentMethodsFromLink(encodedMethods);
      if (fromLink.length > 0) {
        if (!cancelled) setMethods(fromLink);
      } else {
        const local = await loadCustomerPaymentMethods();
        if (!cancelled) setMethods(getEnabledCustomerPaymentMethods(local));
      }

      if (invoiceId) {
        const localInvoice = await getBossInvoiceById(invoiceId);
        if (localInvoice && !cancelled) {
          const totals = computeInvoiceTotals(localInvoice);
          setDisplayRef(localInvoice.invoiceNumber.trim() || localInvoice.id);
          setBalanceCents(totals.balanceCents);
          if (!company) {
            const custom = await loadInvoiceCustomization();
            if (custom.companyName.trim()) setDisplayCompany(custom.companyName.trim());
          }
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [company, encodedMethods, invoiceId]);

  const onMethodPress = useCallback(
    (method: CustomerPaymentMethod) => {
      void openCustomerPaymentMethod(method, {
        invoiceRef: displayRef,
        amount: (balanceCents / 100).toFixed(2),
      });
    },
    [balanceCents, displayRef],
  );

  const balanceLabel = formatCents(balanceCents);

  return (
    <StickyScrollScreen
      title=""
      backHref="/"
      backLabel="← Home"
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.payNowHeader}>PAY NOW</Text>
      <Text style={styles.subtitle}>Choose how you would like to pay</Text>

      {loading ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.summary}>
            {displayCompany ? <Text style={styles.company}>{displayCompany}</Text> : null}
            <Text style={styles.summaryLabel}>Invoice</Text>
            <Text style={styles.summaryValue}>{displayRef || "—"}</Text>
            <Text style={[styles.summaryLabel, styles.summarySpaced]}>Balance due</Text>
            <Text style={styles.amount}>{balanceLabel}</Text>
          </View>

          {methods.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No payment methods available</Text>
              <Text style={styles.emptyBody}>
                Ask your contractor to turn on payment methods under Settings → Payment methods, then resend the
                invoice link.
              </Text>
            </View>
          ) : (
            <View style={styles.methodList}>
              {methods.map((method) => (
                <Pressable
                  key={method.id}
                  onPress={() => onMethodPress(method)}
                  style={({ pressed }) => [styles.methodBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Pay with ${method.name}`}
                >
                  <View style={styles.methodIcon}>
                    {paymentAppIcon(
                      { ...method, customUrl: method.payUrl } as PaymentApp,
                      colors.text,
                      28,
                    )}
                  </View>
                  <View style={styles.methodText}>
                    <Text style={styles.methodTitle}>{method.name}</Text>
                    {method.payUrl ? (
                      <Text style={styles.methodHint} numberOfLines={1}>
                        {method.payUrl}
                      </Text>
                    ) : (
                      <Text style={styles.methodHint}>Open app or website</Text>
                    )}
                  </View>
                  <Text style={styles.methodChevron}>›</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.footerHint}>
            Payments go directly to your contractor through the app or link they configured. Ideal Solutions Pro does not
            process card or bank payments.
          </Text>
        </>
      )}
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40 },
    payNowHeader: {
      fontSize: 32,
      fontWeight: "900",
      color: PAY_GREEN,
      letterSpacing: 1,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      color: tints.mutedText,
      textAlign: "center",
      marginBottom: 20,
    },
    summary: {
      ...panel,
      padding: 18,
      marginBottom: 20,
      alignItems: "center",
    },
    company: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: tints.mutedText,
    },
    summarySpaced: { marginTop: 12 },
    summaryValue: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginTop: 4,
    },
    amount: {
      fontSize: 28,
      fontWeight: "900",
      color: PAY_GREEN,
      marginTop: 4,
    },
    methodList: { gap: 10 },
    methodBtn: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    methodIcon: { width: 36, alignItems: "center" },
    methodText: { flex: 1, minWidth: 0, gap: 4 },
    methodTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    methodHint: { fontSize: 12, color: tints.mutedText },
    methodChevron: { fontSize: 22, fontWeight: "700", color: tints.mutedText },
    emptyBox: {
      ...panel,
      padding: 18,
      gap: 8,
      borderColor: hexToRgba(colors.text, 0.15),
    },
    emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    emptyBody: { fontSize: 14, lineHeight: 20, color: tints.mutedText },
    footerHint: {
      marginTop: 24,
      fontSize: 12,
      lineHeight: 18,
      color: tints.mutedText,
      textAlign: "center",
    },
    pressed: { opacity: 0.88 },
  });
}
