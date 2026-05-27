import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { computeInvoiceTotals, formatInvoiceTotals } from "@/lib/invoices/invoiceCalculations";
import type { BossInvoice } from "@/lib/invoices/types";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

type Props = {
  draft: Pick<
    BossInvoice,
    | "lineItems"
    | "laborAmount"
    | "materialAmount"
    | "includeTax"
    | "taxPercent"
    | "discountAmount"
    | "discountPercent"
    | "depositPaid"
    | "payments"
  >;
  laborAmount: string;
  materialAmount: string;
  includeTax: boolean;
  taxPercent: string;
  discountAmount: string;
  discountPercent: string;
  depositPaid: string;
  onLaborChange: (v: string) => void;
  onMaterialChange: (v: string) => void;
  onIncludeTaxChange: (v: boolean) => void;
  onTaxPercentChange: (v: string) => void;
  onDiscountAmountChange: (v: string) => void;
  onDiscountPercentChange: (v: string) => void;
  onDepositPaidChange: (v: string) => void;
};

export function InvoiceTotals({
  draft,
  laborAmount,
  materialAmount,
  includeTax,
  taxPercent,
  discountAmount,
  discountPercent,
  depositPaid,
  onLaborChange,
  onMaterialChange,
  onIncludeTaxChange,
  onTaxPercentChange,
  onDiscountAmountChange,
  onDiscountPercentChange,
  onDepositPaidChange,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const totals = useMemo(() => computeInvoiceTotals(draft), [draft]);
  const formatted = formatInvoiceTotals(totals);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Labor &amp; materials (lump sum)</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Labor ($)</Text>
          <VoiceTextInput
            value={laborAmount}
            onChangeText={onLaborChange}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={placeholderTextColor(colors)}
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Materials ($)</Text>
          <VoiceTextInput
            value={materialAmount}
            onChangeText={onMaterialChange}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={placeholderTextColor(colors)}
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Discount</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Amount ($)</Text>
          <VoiceTextInput
            value={discountAmount}
            onChangeText={onDiscountAmountChange}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={placeholderTextColor(colors)}
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Percent (%)</Text>
          <VoiceTextInput
            value={discountPercent}
            onChangeText={onDiscountPercentChange}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={placeholderTextColor(colors)}
          />
        </View>
      </View>

      <View style={styles.taxRow}>
        <Text style={styles.label}>Charge tax</Text>
        <Switch value={includeTax} onValueChange={onIncludeTaxChange} trackColor={{ true: colors.accent }} />
      </View>
      {includeTax ? (
        <VoiceTextInput
          value={taxPercent}
          onChangeText={onTaxPercentChange}
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Tax %"
          placeholderTextColor={placeholderTextColor(colors)}
        />
      ) : null}

      <Text style={styles.sectionLabel}>Deposit paid</Text>
      <VoiceTextInput
        value={depositPaid}
        onChangeText={onDepositPaidChange}
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="Amount already received"
        placeholderTextColor={placeholderTextColor(colors)}
      />

      <View style={styles.summary}>
        <SummaryRow label="Subtotal" value={formatted.subtotal} />
        {totals.discountCents > 0 ? <SummaryRow label="Discount" value={`-${formatted.discount}`} /> : null}
        {totals.taxCents > 0 ? <SummaryRow label="Tax" value={formatted.tax} /> : null}
        <SummaryRow label="Invoice total" value={formatted.total} bold />
        <SummaryRow label="Paid" value={formatted.paid} />
        <SummaryRow label="Balance due" value={formatted.balance} accent />
      </View>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 4 }}>
      <Text style={{ color: colors.text, fontWeight: bold || accent ? "800" : "600" }}>{label}</Text>
      <Text
        style={{
          color: accent ? colors.accent : colors.text,
          fontWeight: bold || accent ? "800" : "600",
          fontSize: accent ? 18 : 15,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: { marginTop: 8 },
    sectionLabel: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 8, marginTop: 12 },
    row: { flexDirection: "row", gap: 10 },
    col: { flex: 1 },
    label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 },
    input: { ...inputStyle(colors), marginBottom: 8 },
    taxRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 10 },
    summary: {
      marginTop: 16,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
    },
  });
}
