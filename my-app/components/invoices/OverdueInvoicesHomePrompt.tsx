import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { formatCents } from "@/lib/invoices/invoiceMoney";
import {
  loadOverdueInvoiceSummary,
  markOverdueInvoiceAlertShownToday,
  shouldShowOverdueInvoiceAlertToday,
  type OverdueInvoiceSummary,
} from "@/lib/invoices/overdueInvoices";
import { promptSendOverdueInvoiceReminders } from "@/lib/invoices/overdueInvoiceReminder";

const INVOICES_OVERDUE_HREF = "/job-folder/invoices?filter=overdue" as Href;

function summaryMessage(summary: OverdueInvoiceSummary): string {
  const lines = [
    `You have ${summary.count} overdue invoice${summary.count === 1 ? "" : "s"} totaling ${formatCents(summary.totalBalanceCents)}.`,
    "Send a polite payment reminder to your customer, or dismiss until tomorrow.",
  ];
  if (summary.topCustomerNames.length > 0) {
    lines.push(`Customers: ${summary.topCustomerNames.join(", ")}.`);
  }
  return lines.join("\n\n");
}

function dismissOverduePromptForToday(): void {
  void markOverdueInvoiceAlertShownToday();
}

function showOverdueAlert(
  summary: OverdueInvoiceSummary,
  onSendReminder: () => void,
  onDismiss: () => void,
): void {
  Alert.alert("Overdue invoices", summaryMessage(summary), [
    { text: "Dismiss", style: "cancel", onPress: onDismiss },
    { text: "Send reminder", onPress: onSendReminder },
  ]);
}

type OverdueInvoicesHomePromptProps = {
  ready: boolean;
};

export function OverdueInvoicesHomePrompt({ ready }: OverdueInvoicesHomePromptProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [summary, setSummary] = useState<OverdueInvoiceSummary | null>(null);
  const [bannerHidden, setBannerHidden] = useState(false);
  const alertPendingRef = useRef(false);

  const openInvoices = useCallback(() => {
    router.push(INVOICES_OVERDUE_HREF);
  }, [router]);

  const sendReminder = useCallback((current: OverdueInvoiceSummary) => {
    dismissOverduePromptForToday();
    promptSendOverdueInvoiceReminders(current);
  }, []);

  const refresh = useCallback(async () => {
    const next = await loadOverdueInvoiceSummary();
    setSummary(next);
    if (!next) {
      alertPendingRef.current = false;
      return;
    }

    if (alertPendingRef.current) return;
    const showAlert = await shouldShowOverdueInvoiceAlertToday();
    if (!showAlert) return;

    alertPendingRef.current = true;
    showOverdueAlert(
      next,
      () => sendReminder(next),
      () => {
        dismissOverduePromptForToday();
      },
    );
  }, [sendReminder]);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      void refresh();
    }, [ready, refresh]),
  );

  if (!summary || bannerHidden) return null;

  return (
    <OverdueInvoicesBanner
      colors={colors}
      summary={summary}
      onView={openInvoices}
      onSendReminder={() => sendReminder(summary)}
      onDismiss={() => {
        dismissOverduePromptForToday();
        setBannerHidden(true);
      }}
    />
  );
}

function OverdueInvoicesBanner({
  colors,
  summary,
  onView,
  onSendReminder,
  onDismiss,
}: {
  colors: ColorScheme;
  summary: OverdueInvoiceSummary;
  onView: () => void;
  onSendReminder: () => void;
  onDismiss: () => void;
}) {
  const customerLine =
    summary.topCustomerNames.length > 0
      ? ` · ${summary.topCustomerNames.join(", ")}`
      : "";

  return (
    <View
      style={{
        backgroundColor: colors.accent,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginBottom: 10,
        gap: 8,
      }}
    >
      <Text
        style={{
          color: colors.background,
          fontSize: 14,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {summary.count} overdue invoice{summary.count === 1 ? "" : "s"} ·{" "}
        {formatCents(summary.totalBalanceCents)}
        {customerLine}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 12 }}>
        <TouchableOpacity onPress={onSendReminder} activeOpacity={0.85} accessibilityRole="button">
          <Text
            style={{
              color: colors.background,
              fontSize: 13,
              fontWeight: "700",
              textDecorationLine: "underline",
            }}
          >
            Send reminder
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onView} activeOpacity={0.85} accessibilityRole="button">
          <Text
            style={{
              color: colors.background,
              fontSize: 13,
              fontWeight: "700",
              textDecorationLine: "underline",
            }}
          >
            View invoices
          </Text>
        </TouchableOpacity>
        <Pressable onPress={onDismiss} accessibilityRole="button">
          <Text style={{ color: colors.background, fontSize: 13, fontWeight: "600", opacity: 0.9 }}>
            Dismiss
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
