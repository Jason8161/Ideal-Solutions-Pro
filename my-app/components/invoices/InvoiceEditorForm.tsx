import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { CustomerContactPicker } from "@/components/CustomerContactPicker";

import { InvoiceCustomerSendButtons } from "@/components/invoices/InvoiceCustomerSendButtons";
import { InvoiceLineItems } from "@/components/invoices/InvoiceLineItems";
import { InvoicePaymentHistory } from "@/components/invoices/InvoicePaymentHistory";
import { InvoiceTotals } from "@/components/invoices/InvoiceTotals";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  buildBossInvoiceShareText,
  shareBossInvoicePdf,
} from "@/lib/invoices/bossInvoicePdf";
import {
  savedInvoiceSendAlert,
  sendInvoiceToCustomer,
} from "@/lib/invoices/invoiceCustomerShare";
import { setInvoiceDraft } from "@/lib/invoices/invoiceDraftCache";
import { saveBossInvoice } from "@/lib/invoices/invoiceStorage";
import type { BossInvoice, InvoiceStatus } from "@/lib/invoices/types";
import { INVOICE_STATUSES } from "@/lib/invoices/types";
import { mapExistingContactToFields } from "@/lib/mapPhoneContactToCustomer";
import { composeFullAddress } from "@/lib/profileStorage";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

type Props = {
  initial: BossInvoice;
  onSaved?: (invoice: BossInvoice) => void;
};

export function InvoiceEditorForm({ initial, onSaved }: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [invoice, setInvoice] = useState<BossInvoice>(initial);
  const [busy, setBusy] = useState(false);

  const patch = (p: Partial<BossInvoice>) => setInvoice((prev) => ({ ...prev, ...p }));

  const persist = async (opts?: { markSent?: boolean; manualStatus?: InvoiceStatus }) => {
    setBusy(true);
    try {
      const saved = await saveBossInvoice(invoice, opts);
      setInvoice(saved);
      onSaved?.(saved);
      return saved;
    } finally {
      setBusy(false);
    }
  };

  const preview = () => {
    setInvoiceDraft(invoice);
    router.push("/job-folder/invoices/invoice-preview?draft=1" as Href);
  };

  const shareText = async () => {
    try {
      await Share.share({ message: buildBossInvoiceShareText(invoice) });
    } catch {
      /* user dismissed */
    }
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const saved = await persist();
      await shareBossInvoicePdf(saved);
    } catch (e) {
      Alert.alert("PDF", e instanceof Error ? e.message : "Could not create PDF.");
    } finally {
      setBusy(false);
    }
  };

  const sendInvoice = async () => {
    const saved = await persist({ markSent: true, manualStatus: "Sent" });
    Alert.alert(
      "Invoice sent",
      `Invoice ${saved.invoiceNumber} marked as sent. Use Send by text or Send by email below to deliver.`,
    );
  };

  return (
    <FormScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
    >
      <Text style={styles.sectionLabel}>Invoice #</Text>
      <Text style={styles.invoiceNum}>{invoice.invoiceNumber || "Auto on save"}</Text>

      <Text style={styles.sectionLabel}>Status</Text>
      <View style={styles.statusRow}>
        {INVOICE_STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => patch({ status: s })}
            style={[styles.statusChip, invoice.status === s && styles.statusChipOn]}
          >
            <Text style={[styles.statusText, invoice.status === s && styles.statusTextOn]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Customer</Text>
      <CustomerContactPicker
        value={{
          name: invoice.customerName,
          phone: invoice.customerPhone,
          email: invoice.customerEmail,
        }}
        onChange={(next) => {
          patch({
            ...(next.name ? { customerName: next.name } : {}),
            ...(next.phone ? { customerPhone: next.phone } : {}),
            ...(next.email ? { customerEmail: next.email } : {}),
          });
        }}
        onContactPicked={(picked) => {
          const mapped = mapExistingContactToFields(picked);
          const phone =
            mapped.phoneMobile.trim() || mapped.phoneHome.trim() || mapped.phoneWork.trim();
          const email = mapped.email.trim() || mapped.emailAlt.trim();
          const jobAddress = composeFullAddress(mapped.street, mapped.city, mapped.state, mapped.zip);
          patch({
            ...(mapped.customerName ? { customerName: mapped.customerName } : {}),
            ...(phone ? { customerPhone: phone } : {}),
            ...(email ? { customerEmail: email } : {}),
            ...(jobAddress ? { jobAddress } : {}),
          });
        }}
      />
      <Field label="Customer name" colors={colors}>
        <VoiceTextInput
          value={invoice.customerName}
          onChangeText={(v) => patch({ customerName: v })}
          style={styles.input}
          placeholder="Customer or company"
          placeholderTextColor={placeholderTextColor(colors)}
        />
      </Field>
      <Field label="Phone" colors={colors}>
        <VoiceTextInput
          value={invoice.customerPhone}
          onChangeText={(v) => patch({ customerPhone: v })}
          style={styles.input}
          keyboardType="phone-pad"
          placeholderTextColor={placeholderTextColor(colors)}
        />
      </Field>
      <Field label="Email" colors={colors}>
        <VoiceTextInput
          value={invoice.customerEmail}
          onChangeText={(v) => patch({ customerEmail: v })}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={placeholderTextColor(colors)}
        />
      </Field>
      <Field label="Job name" colors={colors}>
        <VoiceTextInput
          value={invoice.jobName}
          onChangeText={(v) => patch({ jobName: v })}
          style={styles.input}
          placeholderTextColor={placeholderTextColor(colors)}
        />
      </Field>
      <Field label="Job address" colors={colors}>
        <VoiceTextInput
          value={invoice.jobAddress}
          onChangeText={(v) => patch({ jobAddress: v })}
          style={[styles.input, styles.textArea]}
          multiline
          placeholderTextColor={placeholderTextColor(colors)}
        />
      </Field>
      <View style={styles.dateRow}>
        <View style={styles.dateCol}>
          <Field label="Invoice date" colors={colors}>
            <VoiceTextInput
              value={invoice.invoiceDate}
              onChangeText={(v) => patch({ invoiceDate: v })}
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={placeholderTextColor(colors)}
            />
          </Field>
        </View>
        <View style={styles.dateCol}>
          <Field label="Due date" colors={colors}>
            <VoiceTextInput
              value={invoice.dueDate}
              onChangeText={(v) => patch({ dueDate: v })}
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={placeholderTextColor(colors)}
            />
          </Field>
        </View>
      </View>

      <InvoiceLineItems lineItems={invoice.lineItems} onChange={(lineItems) => patch({ lineItems })} />

      <Field label="Charge details" colors={colors}>
        <VoiceTextInput
          value={invoice.notes}
          onChangeText={(v) => patch({ notes: v })}
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="What this charge is for (scope, materials, milestones, etc.)"
          placeholderTextColor={placeholderTextColor(colors)}
        />
      </Field>

      <InvoiceTotals
        draft={invoice}
        laborAmount={invoice.laborAmount}
        materialAmount={invoice.materialAmount}
        includeTax={invoice.includeTax}
        taxPercent={invoice.taxPercent}
        discountAmount={invoice.discountAmount}
        discountPercent={invoice.discountPercent}
        depositPaid={invoice.depositPaid}
        onLaborChange={(laborAmount) => patch({ laborAmount })}
        onMaterialChange={(materialAmount) => patch({ materialAmount })}
        onIncludeTaxChange={(includeTax) => patch({ includeTax })}
        onTaxPercentChange={(taxPercent) => patch({ taxPercent })}
        onDiscountAmountChange={(discountAmount) => patch({ discountAmount })}
        onDiscountPercentChange={(discountPercent) => patch({ discountPercent })}
        onDepositPaidChange={(depositPaid) => patch({ depositPaid })}
      />

      <InvoicePaymentHistory
        invoice={invoice}
        onPaymentsChange={(payments) => patch({ payments })}
        onMarkPaid={() => {
          void persist({ manualStatus: "Paid" }).then(() =>
            Alert.alert("Paid", "Invoice marked as paid."),
          );
        }}
      />

      <Field label="Terms" colors={colors}>
        <VoiceTextInput
          value={invoice.terms}
          onChangeText={(v) => patch({ terms: v })}
          style={[styles.input, styles.textArea]}
          multiline
          placeholderTextColor={placeholderTextColor(colors)}
        />
      </Field>

      <Pressable
        style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
        disabled={busy}
        onPress={() =>
          void persist().then((s) =>
            savedInvoiceSendAlert(s, (channel) => {
              void sendInvoiceToCustomer(s, channel).then((updated) => {
                if (updated) {
                  setInvoice(updated);
                  onSaved?.(updated);
                }
              });
            }),
          )
        }
      >
        <Text style={styles.primaryBtnText}>Save invoice</Text>
      </Pressable>

      <InvoiceCustomerSendButtons
        invoice={invoice}
        ensureSaved={() => persist()}
        onInvoiceUpdated={(saved) => {
          setInvoice(saved);
          onSaved?.(saved);
        }}
      />

      <Pressable style={styles.secondaryBtn} onPress={preview}>
        <Text style={styles.secondaryBtnText}>Preview</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} disabled={busy} onPress={() => void sendInvoice()}>
        <Text style={styles.secondaryBtnText}>Mark sent</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} disabled={busy} onPress={() => void exportPdf()}>
        <Text style={styles.secondaryBtnText}>PDF / share</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={() => void shareText()}>
        <Text style={styles.secondaryBtnText}>Share summary (text)</Text>
      </Pressable>
    </FormScrollView>
  );
}

function Field({
  label,
  colors,
  children,
}: {
  label: string;
  colors: ColorScheme;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    content: { paddingBottom: 40 },
    sectionLabel: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 10, marginBottom: 8 },
    invoiceNum: { fontSize: 18, fontWeight: "800", color: colors.accent, marginBottom: 8 },
    statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.text,
    },
    statusChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    statusText: { fontSize: 11, fontWeight: "700", color: colors.text },
    statusTextOn: { color: colors.background },
    input: { ...inputStyle(colors) },
    textArea: { minHeight: 80, textAlignVertical: "top" },
    dateRow: { flexDirection: "row", gap: 10 },
    dateCol: { flex: 1 },
    primaryBtn: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    primaryBtnText: { color: colors.background, fontWeight: "800", fontSize: 16 },
    secondaryBtn: {
      marginTop: 10,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: "center",
    },
    secondaryBtnText: { color: colors.accent, fontWeight: "800", fontSize: 15 },
  });
}
