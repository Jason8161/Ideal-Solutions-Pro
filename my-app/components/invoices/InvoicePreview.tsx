import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import { computeInvoiceTotals, formatInvoiceTotals } from "@/lib/invoices/invoiceCalculations";
import { loadInvoiceCustomization } from "@/lib/invoices/invoiceCustomizationStorage";
import { formatCents, lineTotalCents } from "@/lib/invoices/invoiceMoney";
import type { BossInvoice, InvoiceCustomization } from "@/lib/invoices/types";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

type Props = {
  invoice: BossInvoice;
};

export function InvoicePreview({ invoice }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [custom, setCustom] = useState<InvoiceCustomization | null>(null);
  const totals = useMemo(() => computeInvoiceTotals(invoice), [invoice]);
  const formatted = formatInvoiceTotals(totals);

  useEffect(() => {
    void loadInvoiceCustomization().then(setCustom);
  }, []);

  const accent = custom?.accentColor ?? colors.accent;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={[styles.paper, { borderColor: accent }]}>
        {custom?.showLogo && custom.logoUri ? (
          <Image source={{ uri: custom.logoUri }} style={styles.logo} resizeMode="contain" />
        ) : null}
        <Text style={[styles.title, { color: accent }]}>INVOICE</Text>
        <Text style={styles.meta}>
          {invoice.invoiceNumber} · {invoice.invoiceDate} · Due {invoice.dueDate}
        </Text>

        <View style={styles.cols}>
          <View style={styles.col}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.strong}>{custom?.companyName || "Your company"}</Text>
            {custom?.address ? <Text style={styles.body}>{custom.address}</Text> : null}
            {custom?.phone ? <Text style={styles.body}>{custom.phone}</Text> : null}
            {custom?.email ? <Text style={styles.body}>{custom.email}</Text> : null}
            {custom?.showLicense && custom.licenseNumber ? (
              <Text style={styles.body}>License: {custom.licenseNumber}</Text>
            ) : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.strong}>{invoice.customerName || "Customer"}</Text>
            {invoice.jobName ? <Text style={styles.body}>{invoice.jobName}</Text> : null}
            {invoice.jobAddress ? <Text style={styles.body}>{invoice.jobAddress}</Text> : null}
            {invoice.customerEmail ? <Text style={styles.body}>{invoice.customerEmail}</Text> : null}
            {invoice.customerPhone ? <Text style={styles.body}>{invoice.customerPhone}</Text> : null}
          </View>
        </View>

        {invoice.lineItems.map((row) => (
          <View key={row.id} style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineDesc}>{row.description || row.kind}</Text>
              <Text style={styles.lineMeta}>
                {row.kind} · Qty {row.quantity || "1"} × {row.unitPrice || "0"}
              </Text>
            </View>
            <Text style={styles.lineAmt}>{formatCents(lineTotalCents(row.quantity, row.unitPrice))}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <PreviewRow label="Subtotal" value={formatted.subtotal} />
          {totals.discountCents > 0 ? <PreviewRow label="Discount" value={`-${formatted.discount}`} /> : null}
          {custom?.showTaxLine && totals.taxCents > 0 ? (
            <PreviewRow label={`Tax (${invoice.taxPercent}%)`} value={formatted.tax} />
          ) : null}
          <PreviewRow label="Total" value={formatted.total} bold accent={accent} />
          <PreviewRow label="Balance due" value={formatted.balance} bold accent={accent} />
        </View>

        {invoice.terms.trim() ? (
          <View style={styles.block}>
            <Text style={styles.label}>Terms</Text>
            <Text style={styles.body}>{invoice.terms}</Text>
          </View>
        ) : null}
        {invoice.notes.trim() ? (
          <View style={styles.block}>
            <Text style={styles.label}>Charge details</Text>
            <Text style={styles.body}>{invoice.notes}</Text>
          </View>
        ) : null}
        {custom?.footerText ? <Text style={styles.footer}>{custom.footerText}</Text> : null}
      </View>
    </ScrollView>
  );
}

function PreviewRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 3 }}>
      <Text style={{ color: colors.text, fontWeight: bold ? "800" : "600" }}>{label}</Text>
      <Text style={{ color: accent ?? colors.text, fontWeight: bold ? "800" : "600" }}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingBottom: 24 },
    paper: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      backgroundColor: "rgba(255,255,255,0.04)",
    },
    logo: { width: 160, height: 56, marginBottom: 8 },
    title: { fontSize: 26, fontWeight: "900", letterSpacing: 1 },
    meta: { fontSize: 13, color: colors.text, opacity: 0.85, marginBottom: 16 },
    cols: { flexDirection: "row", gap: 16, marginBottom: 16 },
    col: { flex: 1 },
    label: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", color: colors.text, opacity: 0.7 },
    strong: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 4 },
    body: { fontSize: 14, color: colors.text, marginTop: 2 },
    lineRow: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.text,
      paddingVertical: 10,
      gap: 8,
    },
    lineDesc: { fontSize: 14, fontWeight: "700", color: colors.text },
    lineMeta: { fontSize: 12, color: colors.text, opacity: 0.75, marginTop: 2 },
    lineAmt: { fontSize: 14, fontWeight: "800", color: colors.accent },
    totals: { marginTop: 12, paddingTop: 8 },
    block: { marginTop: 14 },
    footer: { marginTop: 20, textAlign: "center", fontSize: 13, color: colors.text, opacity: 0.8 },
  });
}
