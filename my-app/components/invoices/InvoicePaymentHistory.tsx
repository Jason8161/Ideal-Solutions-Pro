import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { formatCents, parseMoneyToCents } from "@/lib/invoices/invoiceMoney";
import type { BossInvoice, InvoicePayment, PaymentMethod } from "@/lib/invoices/types";
import { PAYMENT_METHODS } from "@/lib/invoices/types";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

type Props = {
  invoice: BossInvoice;
  onPaymentsChange: (payments: InvoicePayment[]) => void;
  onMarkPaid?: () => void;
};

function newPaymentId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function InvoicePaymentHistory({ invoice, onPaymentsChange, onMarkPaid }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Check");
  const [note, setNote] = useState("");

  const addPayment = () => {
    const cents = parseMoneyToCents(amount);
    if (cents <= 0) {
      Alert.alert("Payment", "Enter an amount greater than zero.");
      return;
    }
    const row: InvoicePayment = {
      id: newPaymentId(),
      amountCents: cents,
      receivedAt: new Date().toISOString().slice(0, 10),
      method,
      note: note.trim() || undefined,
    };
    onPaymentsChange([...invoice.payments, row]);
    setAmount("");
    setNote("");
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Payment history</Text>
      {invoice.payments.length === 0 ? (
        <Text style={styles.hint}>No payments recorded yet.</Text>
      ) : (
        invoice.payments.map((p) => (
          <View key={p.id} style={styles.paymentCard}>
            <Text style={styles.paymentAmt}>{formatCents(p.amountCents)}</Text>
            <Text style={styles.paymentMeta}>
              {p.receivedAt} · {p.method}
              {p.note ? ` · ${p.note}` : ""}
            </Text>
            <Pressable
              onPress={() =>
                onPaymentsChange(invoice.payments.filter((row) => row.id !== p.id))
              }
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={styles.sectionLabel}>Record payment</Text>
      <VoiceTextInput
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="Amount received"
        placeholderTextColor={placeholderTextColor(colors)}
      />
      <View style={styles.methodRow}>
        {PAYMENT_METHODS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMethod(m)}
            style={[styles.methodChip, method === m && styles.methodChipOn]}
          >
            <Text style={[styles.methodText, method === m && styles.methodTextOn]}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <VoiceTextInput
        value={note}
        onChangeText={setNote}
        style={styles.input}
        placeholder="Note (optional)"
        placeholderTextColor={placeholderTextColor(colors)}
      />
      <Pressable style={styles.btn} onPress={addPayment}>
        <Text style={styles.btnText}>Add payment</Text>
      </Pressable>
      {onMarkPaid ? (
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onMarkPaid}>
          <Text style={styles.btnTextSecondary}>Mark fully paid</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: { marginTop: 12 },
    sectionLabel: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 8, marginTop: 8 },
    hint: { fontSize: 14, color: colors.text, opacity: 0.75, marginBottom: 8 },
    paymentCard: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.text,
      marginBottom: 8,
    },
    paymentAmt: { fontSize: 17, fontWeight: "800", color: colors.accent },
    paymentMeta: { fontSize: 13, color: colors.text, marginTop: 4 },
    removeText: { marginTop: 8, fontWeight: "600", color: colors.text },
    input: { ...inputStyle(colors), marginBottom: 8 },
    methodRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
    methodChip: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.text,
    },
    methodChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    methodText: { fontSize: 11, fontWeight: "700", color: colors.text },
    methodTextOn: { color: colors.background },
    btn: {
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      marginTop: 4,
    },
    btnSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.accent },
    btnText: { color: colors.background, fontWeight: "800", fontSize: 15 },
    btnTextSecondary: { color: colors.accent, fontWeight: "800", fontSize: 15 },
  });
}
