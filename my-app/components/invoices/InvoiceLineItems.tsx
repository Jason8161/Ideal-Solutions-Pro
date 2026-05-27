import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { useAppTheme } from "@/context/ThemeContext";
import { formatCents, lineTotalCents } from "@/lib/invoices/invoiceMoney";
import { newInvoiceLineId } from "@/lib/invoices/invoiceStorage";
import type { InvoiceLineItem, InvoiceLineKind } from "@/lib/invoices/types";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

const LINE_KINDS: { kind: InvoiceLineKind; label: string }[] = [
  { kind: "labor", label: "Labor" },
  { kind: "material", label: "Material" },
  { kind: "other", label: "Other" },
];

type Props = {
  lineItems: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
};

export function InvoiceLineItems({ lineItems, onChange }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const updateLine = (id: string, patch: Partial<InvoiceLineItem>) => {
    onChange(lineItems.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeLine = (id: string) => {
    onChange(lineItems.filter((row) => row.id !== id));
  };

  const addLine = (kind: InvoiceLineKind = "other") => {
    onChange([
      ...lineItems,
      {
        id: newInvoiceLineId(),
        kind,
        description: "",
        quantity: "1",
        unitPrice: "",
      },
    ]);
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Line items</Text>
      {lineItems.length === 0 ? (
        <Text style={styles.hint}>Add labor, materials, or custom lines. Totals update automatically.</Text>
      ) : null}
      {lineItems.map((row) => {
        const lineCents = lineTotalCents(row.quantity, row.unitPrice);
        return (
          <View key={row.id} style={[styles.card, { borderColor: hexToRgba(colors.text, 0.25) }]}>
            <View style={styles.kindRow}>
              {LINE_KINDS.map(({ kind, label }) => (
                <Pressable
                  key={kind}
                  onPress={() => updateLine(row.id, { kind })}
                  style={[styles.kindChip, row.kind === kind && styles.kindChipOn]}
                >
                  <Text style={[styles.kindChipText, row.kind === kind && styles.kindChipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <VoiceTextInput
              value={row.description}
              onChangeText={(v) => updateLine(row.id, { description: v })}
              style={styles.input}
              placeholder="Description"
              placeholderTextColor={placeholderTextColor(colors)}
            />
            <View style={styles.qtyRow}>
              <View style={styles.qtyCol}>
                <Text style={styles.miniLabel}>Qty</Text>
                <VoiceTextInput
                  value={row.quantity}
                  onChangeText={(v) => updateLine(row.id, { quantity: v })}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor={placeholderTextColor(colors)}
                />
              </View>
              <View style={styles.qtyCol}>
                <Text style={styles.miniLabel}>Unit price</Text>
                <VoiceTextInput
                  value={row.unitPrice}
                  onChangeText={(v) => updateLine(row.id, { unitPrice: v })}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={placeholderTextColor(colors)}
                />
              </View>
              <Text style={styles.lineTotal}>{formatCents(lineCents)}</Text>
            </View>
            <Pressable onPress={() => removeLine(row.id)} style={styles.removeBtn}>
              <Text style={styles.removeText}>Remove line</Text>
            </Pressable>
          </View>
        );
      })}
      <View style={styles.addRow}>
        <Pressable style={styles.addBtn} onPress={() => addLine("labor")}>
          <Text style={styles.addBtnText}>+ Labor line</Text>
        </Pressable>
        <Pressable style={styles.addBtn} onPress={() => addLine("material")}>
          <Text style={styles.addBtnText}>+ Material line</Text>
        </Pressable>
        <Pressable style={styles.addBtn} onPress={() => addLine("other")}>
          <Text style={styles.addBtnText}>+ Other line</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    sectionLabel: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 8, marginTop: 8 },
    hint: { fontSize: 14, color: colors.text, opacity: 0.75, marginBottom: 10 },
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      backgroundColor: "transparent",
    },
    kindRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
    kindChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.text,
    },
    kindChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    kindChipText: { fontSize: 12, fontWeight: "700", color: colors.text },
    kindChipTextOn: { color: colors.background },
    input: { ...inputStyle(colors), marginBottom: 8 },
    qtyRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    qtyCol: { flex: 1 },
    miniLabel: { fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 4 },
    lineTotal: { fontSize: 15, fontWeight: "800", color: colors.accent, minWidth: 72, textAlign: "right" },
    removeBtn: { alignSelf: "flex-end", marginTop: 4 },
    removeText: { color: colors.text, fontWeight: "600", fontSize: 14 },
    addRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    addBtn: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    addBtnText: { color: colors.accent, fontWeight: "700", fontSize: 14 },
  });
}
