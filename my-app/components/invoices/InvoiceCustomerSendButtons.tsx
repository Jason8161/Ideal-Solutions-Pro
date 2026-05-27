import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { useScStyles } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { shareBossInvoicePdf } from "@/lib/invoices/bossInvoicePdf";
import {
  INVOICE_PAYMENT_SETTINGS_HREF,
  sendInvoiceToCustomer,
} from "@/lib/invoices/invoiceCustomerShare";
import { invoicePayLinkPreviewLabel } from "@/lib/invoices/invoicePayLink";
import { loadInvoiceSendPaymentOptions } from "@/lib/invoices/invoiceSendPaymentPicker";
import {
  isInvoicePaymentLinkConfigured,
  loadInvoicePaymentSettings,
  type InvoicePaymentSettings,
} from "@/lib/invoices/invoicePaymentSettingsStorage";
import type { BossInvoice } from "@/lib/invoices/types";

type Props = {
  invoice: BossInvoice;
  /** Persist draft before send; should return the saved invoice. */
  ensureSaved?: () => Promise<BossInvoice>;
  onInvoiceUpdated?: (invoice: BossInvoice) => void;
  sectionTitle?: string;
};

export function InvoiceCustomerSendButtons({
  invoice,
  ensureSaved,
  onInvoiceUpdated,
  sectionTitle = "Send to customer",
}: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { styles } = useBossManChrome();
  const scStyles = useScStyles();
  const [busy, setBusy] = useState<"sms" | "email" | "pdf" | null>(null);
  const [pdfSharedThisSession, setPdfSharedThisSession] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<InvoicePaymentSettings | null>(null);
  const [sendProviderCount, setSendProviderCount] = useState(0);

  const reloadPaymentSettings = useCallback(() => {
    void Promise.all([loadInvoicePaymentSettings(), loadInvoiceSendPaymentOptions()]).then(
      ([loaded, options]) => {
        setPaymentSettings(loaded);
        setSendProviderCount(options.length);
      },
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadPaymentSettings();
    }, [reloadPaymentSettings]),
  );

  const paymentPreviewLabel = useMemo(() => {
    if (!paymentSettings) return "Loading payment settings…";
    return invoicePayLinkPreviewLabel(paymentSettings);
  }, [paymentSettings]);

  const resolveInvoice = useCallback(async () => {
    if (ensureSaved) return ensureSaved();
    return invoice;
  }, [ensureSaved, invoice]);

  const runSend = useCallback(
    async (channel: "sms" | "email") => {
      setBusy(channel);
      try {
        const saved = await resolveInvoice();
        onInvoiceUpdated?.(saved);
        const updated = await sendInvoiceToCustomer(saved, channel, { pdfSharedThisSession });
        if (updated) onInvoiceUpdated?.(updated);
      } catch (e) {
        if (e instanceof Error && /cancel|dismiss/i.test(e.message)) return;
        Alert.alert("Could not send", e instanceof Error ? e.message : "Try again.");
      } finally {
        setBusy(null);
      }
    },
    [onInvoiceUpdated, pdfSharedThisSession, resolveInvoice],
  );

  const sharePdfOnly = useCallback(async () => {
    setBusy("pdf");
    try {
      const saved = await resolveInvoice();
      onInvoiceUpdated?.(saved);
      await shareBossInvoicePdf(saved);
      setPdfSharedThisSession(true);
    } catch (e) {
      if (e instanceof Error && /cancel|dismiss/i.test(e.message)) return;
      Alert.alert("PDF", e instanceof Error ? e.message : "Could not share PDF.");
    } finally {
      setBusy(null);
    }
  }, [onInvoiceUpdated, resolveInvoice]);

  const disabled = busy !== null;
  const showSetupHint =
    paymentSettings?.enabled === true && !isInvoicePaymentLinkConfigured(paymentSettings);

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={[scStyles.sectionLabel, { marginBottom: 8 }]}>{sectionTitle}</Text>

      <View style={[styles.actionBtn, { opacity: 1, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 }]}>
        <Text style={[scStyles.menuButtonText, { fontWeight: "800", marginBottom: 4 }]}>Pay link preview</Text>
        <Text style={{ fontSize: 13, opacity: 0.75 }}>
          {paymentPreviewLabel}
          {sendProviderCount > 1
            ? ` · Tap Send by text or email to choose from ${sendProviderCount} providers`
            : sendProviderCount === 1
              ? " · One payment provider enabled"
              : ""}
        </Text>
        {showSetupHint ? (
          <Pressable
            onPress={() => router.push(INVOICE_PAYMENT_SETTINGS_HREF as Href)}
            style={({ pressed }) => [{ marginTop: 8 }, pressed && { opacity: 0.85 }]}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.accent }}>
              Set up invoice payments in Settings
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => void runSend("sms")}
        disabled={disabled}
        style={({ pressed }) => [
          styles.actionBtn,
          pressed && { opacity: 0.9 },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Text style={scStyles.menuButtonText}>
          {busy === "sms" ? "Opening…" : "Send by text"}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => void runSend("email")}
        disabled={disabled}
        style={({ pressed }) => [
          styles.actionBtn,
          pressed && { opacity: 0.9 },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Text style={scStyles.menuButtonText}>
          {busy === "email" ? "Opening…" : "Send by email"}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => void sharePdfOnly()}
        disabled={disabled}
        style={({ pressed }) => [
          styles.actionBtn,
          pressed && { opacity: 0.9 },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Text style={scStyles.menuButtonText}>
          {busy === "pdf" ? "Sharing…" : "Share invoice PDF"}
        </Text>
      </Pressable>
    </View>
  );
}
