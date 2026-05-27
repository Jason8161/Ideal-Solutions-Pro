import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { VoiceTextInput } from "@/components/VoiceTextInput";

import { EstimateCustomerSelectModal } from "@/components/accounting/EstimateCustomerSelectModal";
import {
  accentPanelStyle,
  getAccentTints,
  inputStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { AddressSearchWithMaps } from "@/components/AddressSearchWithMaps";
import { money } from "@/lib/accountingMoney";
import {
  accountingExportSubtitle,
  estimateToExportRows,
  exportFilename,
  exportSummaryLabel,
  rowsToCsv,
  shareCsvExport,
  totalFromExportRows,
} from "@/lib/accountingExport";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";
import {
  computeEstimateTotals,
  newEstimateLineId,
  type EstimateCustomer,
  type EstimateLineItem,
  type EstimateLineKind,
  type EstimatePricingMode,
  type EstimateRecord,
} from "@/lib/estimateStorage";
import {
  applyLaborRatesFromTable,
  buildLumpSumLineItems,
  ESTIMATE_PRICING_MODES,
  laborRateTableForPricingMode,
  lumpSumAmountFromLineItems,
  newLaborLineWithTable,
  syncLumpSumLineItems,
} from "@/lib/estimatePricing";
import { generateAndSharePdf, generatePdfUri, invoicePayloadFromEstimate, sharePdf } from "@/lib/invoicePdf";
import { loadMaterialLines, type MaterialLine } from "@/lib/materialListStorage";
import {
  LABOR_RATE_TABLE_LABELS,
  loadMyCrewSettings,
  parseNumericInput,
  type MyCrewSettings,
} from "@/lib/myCrewSettings";

const LINE_KINDS: { kind: EstimateLineKind; label: string }[] = [
  { kind: "material", label: "Material" },
  { kind: "labor", label: "Labor" },
  { kind: "other", label: "Other" },
];

type Props = {
  initial: EstimateRecord;
  onSave: (record: EstimateRecord) => Promise<EstimateRecord>;
  backLabel?: string;
};

export function EstimateEditorForm({ initial, onSave }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [customer, setCustomer] = useState<EstimateCustomer>(initial.customer);
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>(initial.lineItems);
  const [includeTax, setIncludeTax] = useState(initial.includeTax);
  const [taxPercent, setTaxPercent] = useState(initial.taxPercent);
  const [jobScope, setJobScope] = useState(initial.jobScope);
  const [notes, setNotes] = useState(initial.notes);
  const [invoiceNumber, setInvoiceNumber] = useState(initial.invoiceNumber);
  const [approved, setApproved] = useState(initial.approved);
  const [schedulingPhase, setSchedulingPhase] = useState(initial.schedulingPhase);
  const [saving, setSaving] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [busyExport, setBusyExport] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [exportHint, setExportHint] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [pricingMode, setPricingMode] = useState<EstimatePricingMode>(
    initial.pricingMode ?? "project_labor",
  );
  const [lumpSumAmount, setLumpSumAmount] = useState(initial.lumpSumAmount ?? "");
  const [crewSettings, setCrewSettings] = useState<MyCrewSettings | null>(null);

  const prevSyncKeyRef = useRef<string>("__mount__");
  const syncKey = `${initial.id}|${initial.updatedAt}`;
  useEffect(() => {
    if (prevSyncKeyRef.current === syncKey) return;
    prevSyncKeyRef.current = syncKey;
    setCustomer(initial.customer);
    setLineItems(initial.lineItems);
    setIncludeTax(initial.includeTax);
    setTaxPercent(initial.taxPercent);
    setJobScope(initial.jobScope);
    setNotes(initial.notes);
    setInvoiceNumber(initial.invoiceNumber);
    setApproved(initial.approved);
    setSchedulingPhase(initial.schedulingPhase);
    setPricingMode(initial.pricingMode ?? "project_labor");
    setLumpSumAmount(initial.lumpSumAmount ?? lumpSumAmountFromLineItems(initial.lineItems));
  }, [initial, syncKey]);

  const draft: EstimateRecord = useMemo(
    () => ({
      ...initial,
      customer,
      pricingMode,
      lumpSumAmount,
      lineItems,
      includeTax,
      taxPercent,
      jobScope,
      notes,
      invoiceNumber,
      approved,
      schedulingPhase,
    }),
    [
      approved,
      customer,
      includeTax,
      initial,
      invoiceNumber,
      jobScope,
      lineItems,
      lumpSumAmount,
      notes,
      pricingMode,
      schedulingPhase,
      taxPercent,
    ],
  );

  const totals = useMemo(() => computeEstimateTotals(draft), [draft]);

  const isNewEstimate = !initial.id.trim();
  const canEmailCustomer = customer.email.trim().length > 0;

  useEffect(() => {
    void loadMyCrewSettings().then((s) => {
      setCrewSettings(s);
      if (!taxPercent.trim() && s.defaultTaxPercent.trim()) {
        setTaxPercent(s.defaultTaxPercent);
      }
    });
    void accountingExportSubtitle().then(setExportHint);
  }, [taxPercent]);

  const isLumpSum = pricingMode === "lump_sum";
  const activeRateTable = laborRateTableForPricingMode(pricingMode);

  const setPricingModeAndApply = useCallback(
    (mode: EstimatePricingMode) => {
      setPricingMode(mode);
      if (mode === "lump_sum") {
        const amount = lumpSumAmount.trim() || lumpSumAmountFromLineItems(lineItems);
        setLumpSumAmount(amount);
        setLineItems(buildLumpSumLineItems(amount));
        return;
      }
      const table = laborRateTableForPricingMode(mode);
      if (!table || !crewSettings) return;
      setLineItems((prev) => {
        const nonLabor = prev.filter((l) => l.kind !== "other" || !l.description.toLowerCase().startsWith("lump sum"));
        const labor = prev.filter((l) => l.kind === "labor");
        const materials = nonLabor.filter((l) => l.kind !== "labor");
        const nextLabor =
          labor.length > 0
            ? applyLaborRatesFromTable(labor, crewSettings, table)
            : [newLaborLineWithTable(crewSettings, table)];
        return [...materials, ...nextLabor];
      });
    },
    [crewSettings, lineItems, lumpSumAmount],
  );

  const patchLumpSumAmount = useCallback((amount: string) => {
    setLumpSumAmount(amount);
    setLineItems(syncLumpSumLineItems(amount, lineItems));
  }, [lineItems]);

  const patchCustomer = useCallback((key: keyof EstimateCustomer, value: string) => {
    setCustomer((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addLine = useCallback(
    (kind: EstimateLineKind) => {
      if (isLumpSum) return;
      if (kind === "labor" && crewSettings && activeRateTable) {
        setLineItems((prev) => [...prev, newLaborLineWithTable(crewSettings, activeRateTable)]);
        return;
      }
      setLineItems((prev) => [
        ...prev,
        { id: newEstimateLineId(), kind, description: "", quantity: kind === "labor" ? "" : "1", rate: "" },
      ]);
    },
    [activeRateTable, crewSettings, isLumpSum],
  );

  const patchLine = useCallback((id: string, patch: Partial<EstimateLineItem>) => {
    setLineItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const removeLine = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const importMaterials = useCallback(async () => {
    const lines = await loadMaterialLines();
    if (lines.length === 0) {
      Alert.alert("No materials", "Add items on Material List first.");
      return;
    }
    setLineItems((prev) => [...prev, ...lines.map((row) => materialToLine(row))]);
  }, []);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(draft);
      Alert.alert("Saved", "Estimate saved on this device.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not save estimate.");
    } finally {
      setSaving(false);
    }
  }, [draft, onSave]);

  const shareInvoice = useCallback(
    async (kind: "invoice" | "estimate") => {
      setBusyPdf(true);
      try {
        const saved = await onSave(draft);
        const payload = await invoicePayloadFromEstimate(saved, kind);
        await generateAndSharePdf(payload);
      } catch (e) {
        Alert.alert("PDF", e instanceof Error ? e.message : "Could not create PDF.");
      } finally {
        setBusyPdf(false);
      }
    },
    [draft, onSave],
  );

  const emailPdfToCustomer = useCallback(
    async (kind: "estimate" | "invoice") => {
      setBusyEmail(true);
      try {
        const saved = await onSave(draft);
        const to = saved.customer.email.trim();
        if (!to) {
          Alert.alert("Customer email", "Add an email address for this customer, then try again.");
          return;
        }
        const payload = await invoicePayloadFromEstimate(saved, kind);
        const uri = await generatePdfUri(payload);
        const label = kind === "estimate" ? "Estimate" : "Invoice";
        await sharePdf(uri, `${label} ${saved.invoiceNumber} — pick Mail, To: ${to}`);
        Alert.alert(
          `${label} PDF`,
          `In Mail (or Gmail), set To: ${to}. The PDF shows Job scope (when you entered it), then line items and totals${
            kind === "estimate" ? ", plus the accept link" : ""
          }.`,
        );
      } catch (e) {
        Alert.alert("Email", e instanceof Error ? e.message : "Could not prepare the PDF.");
      } finally {
        setBusyEmail(false);
      }
    },
    [draft, onSave],
  );

  const exportCsv = useCallback(async () => {
    setBusyExport(true);
    try {
      const saved = await onSave(draft);
      const rows = estimateToExportRows(saved);
      if (rows.length === 0) {
        Alert.alert("Nothing to export", "Add at least one line item.");
        return;
      }
      const csv = rowsToCsv(rows);
      const filename = exportFilename("ideal-solutions-export");
      await shareCsvExport(csv, filename, "Export for accounting");
      Alert.alert("Export ready", exportSummaryLabel(rows.length, totalFromExportRows(rows)));
    } catch (e) {
      Alert.alert("Export", e instanceof Error ? e.message : "Could not export.");
    } finally {
      setBusyExport(false);
    }
  }, [draft, onSave]);

  return (
    <FormScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
    >
        <Text style={styles.title}>{initial.id ? "Edit estimate" : "New estimate"}</Text>
        <Text style={styles.subtitle}>{exportHint}</Text>

        <Text style={styles.section}>Customer</Text>
        <Pressable
          onPress={() => setCustomerPickerOpen(true)}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Select customer from contacts or directory"
        >
          <Text style={styles.secondaryBtnText}>Pick from contacts · Add customer</Text>
        </Pressable>
        <EstimateCustomerSelectModal
          visible={customerPickerOpen}
          onClose={() => setCustomerPickerOpen(false)}
          onCustomerSelected={setCustomer}
        />
        <Field
          label="Customer name"
          value={customer.customerName}
          onChangeText={(t) => patchCustomer("customerName", t)}
          styles={styles}
          placeholderTint={styles.placeholderTint}
        />
        <Field
          label="Company"
          value={customer.company}
          onChangeText={(t) => patchCustomer("company", t)}
          styles={styles}
          placeholderTint={styles.placeholderTint}
        />
        <AddressSearchWithMaps
          address={{ street: customer.street, city: customer.city, state: customer.state, zip: customer.zip }}
          onApplyAddress={(next) => {
            patchCustomer("street", next.street);
            patchCustomer("city", next.city);
            patchCustomer("state", next.state);
            patchCustomer("zip", next.zip);
          }}
        />
        <Field label="Street" value={customer.street} onChangeText={(t) => patchCustomer("street", t)} styles={styles} placeholderTint={styles.placeholderTint} />
        <Field label="City" value={customer.city} onChangeText={(t) => patchCustomer("city", t)} styles={styles} placeholderTint={styles.placeholderTint} />
        <Field label="State" value={customer.state} onChangeText={(t) => patchCustomer("state", t)} styles={styles} placeholderTint={styles.placeholderTint} />
        <Field label="ZIP" value={customer.zip} onChangeText={(t) => patchCustomer("zip", t)} styles={styles} placeholderTint={styles.placeholderTint} />
        <Field
          label="Email"
          value={customer.email}
          onChangeText={(t) => patchCustomer("email", t)}
          keyboardType="email-address"
          styles={styles}
          placeholderTint={styles.placeholderTint}
        />
        <Field
          label="Phone"
          value={customer.phone}
          onChangeText={(t) => patchCustomer("phone", t)}
          keyboardType="phone-pad"
          styles={styles}
          placeholderTint={styles.placeholderTint}
        />

        {isNewEstimate ? (
          <View style={styles.newEstimateActions}>
            <Text style={styles.section}>Save or email</Text>
            <Text style={styles.helpMuted}>
              {canEmailCustomer
                ? `Share a PDF that includes Job scope, then choose Mail and set To: ${customer.email.trim()}.`
                : "Add the customer’s email above so we can show the right address when you email. You can still save now and email later."}
            </Text>
            <Pressable
              onPress={() => void persist()}
              disabled={saving}
              style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed, saving && styles.disabled]}
            >
              <Text style={styles.primaryCtaText}>{saving ? "Saving…" : "Save estimate"}</Text>
            </Pressable>
            <Pressable
              onPress={() => void emailPdfToCustomer("estimate")}
              disabled={busyEmail || busyPdf || saving || !canEmailCustomer}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
                (busyEmail || busyPdf || saving || !canEmailCustomer) && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {busyEmail ? "Preparing PDF…" : "Email estimate PDF to customer"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void emailPdfToCustomer("invoice")}
              disabled={busyEmail || busyPdf || saving || !canEmailCustomer}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
                (busyEmail || busyPdf || saving || !canEmailCustomer) && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {busyEmail ? "Preparing PDF…" : "Email invoice PDF to customer"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.section}>Status</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.label}>Estimate approved</Text>
            <Text style={styles.helpMuted}>Turn on when the customer has approved this estimate (or you have written approval).</Text>
          </View>
          <Switch
            value={approved}
            onValueChange={setApproved}
            trackColor={{ false: styles.switchTrackOff, true: styles.switchTrackOn }}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.label}>Scheduling phase</Text>
            <Text style={styles.helpMuted}>
              Turn on when the job is ready to schedule. The customer “accept estimate” link sets this automatically.
            </Text>
          </View>
          <Switch
            value={schedulingPhase}
            onValueChange={setSchedulingPhase}
            trackColor={{ false: styles.switchTrackOff, true: styles.switchTrackOn }}
          />
        </View>

        <Text style={styles.section}>Pricing</Text>
        <Text style={styles.helpMuted}>
          Choose which labor rate table to use, or enter one lump-sum total. Rates come from Settings → My crew.
        </Text>
        <View style={styles.pricingModeRow}>
          {ESTIMATE_PRICING_MODES.map(({ mode, label }) => (
            <Pressable
              key={mode}
              onPress={() => setPricingModeAndApply(mode)}
              style={({ pressed }) => [
                styles.pricingChip,
                pricingMode === mode && styles.pricingChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.pricingChipText, pricingMode === mode && styles.pricingChipTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {activeRateTable ? (
          <Text style={styles.helpMuted}>
            Using {LABOR_RATE_TABLE_LABELS[activeRateTable].toLowerCase()} from My crew. New labor lines prefill those
            hourly rates; you can still edit hours and rates per line.
          </Text>
        ) : null}

        {isLumpSum ? (
          <>
            <Field
              label="Lump sum total ($)"
              value={lumpSumAmount}
              onChangeText={patchLumpSumAmount}
              keyboardType="decimal-pad"
              styles={styles}
              placeholderTint={styles.placeholderTint}
            />
            <Text style={styles.helpMuted}>
              One total for the job. Tax (if enabled) applies to this amount. Add materials on a separate estimate if
              needed.
            </Text>
          </>
        ) : (
          <>
        <Text style={styles.section}>Line items</Text>
        <Pressable onPress={() => void importMaterials()} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
          <Text style={styles.secondaryBtnText}>Import from material list</Text>
        </Pressable>
        <View style={styles.kindRow}>
          {LINE_KINDS.map(({ kind, label }) => (
            <Pressable key={kind} onPress={() => addLine(kind)} style={({ pressed }) => [styles.kindChip, pressed && styles.pressed]}>
              <Text style={styles.kindChipText}>+ {label}</Text>
            </Pressable>
          ))}
        </View>
          </>
        )}

        {!isLumpSum
          ? lineItems.map((line) => (
          <View key={line.id} style={styles.lineCard}>
            <Text style={styles.lineKind}>{line.kind}</Text>
            <VoiceTextInput
              value={line.description}
              onChangeText={(t) => patchLine(line.id, { description: t })}
              placeholder="Description"
              placeholderTextColor={styles.placeholderTint}
              style={styles.input}
            />
            <View style={styles.qtyRow}>
              <VoiceTextInput
                value={line.quantity}
                onChangeText={(t) => patchLine(line.id, { quantity: t })}
                placeholder={line.kind === "labor" ? "Hours" : "Qty"}
                placeholderTextColor={styles.placeholderTint}
                keyboardType="decimal-pad"
                style={[styles.input, styles.qtyInput]}
              />
              <VoiceTextInput
                value={line.rate}
                onChangeText={(t) => patchLine(line.id, { rate: t })}
                placeholder="Rate $"
                placeholderTextColor={styles.placeholderTint}
                keyboardType="decimal-pad"
                style={[styles.input, styles.qtyInput]}
              />
            </View>
            <View style={styles.lineFooter}>
              <Text style={styles.lineAmt}>
                {money(parseNumericInput(line.quantity) * parseNumericInput(line.rate))}
              </Text>
              <Pressable onPress={() => removeLine(line.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))
          : null}

        <Text style={styles.section}>Estimate / invoice #</Text>
        <Text style={styles.helpMuted}>
          Auto-filled as the next four-digit number (0001–9999). Used on estimate and invoice PDFs; change only if it
          must match your books.
        </Text>
        <Field label="Number" value={invoiceNumber} onChangeText={setInvoiceNumber} styles={styles} placeholderTint={styles.placeholderTint} />

        <Text style={styles.section}>Job scope</Text>
        <Text style={styles.helpMuted}>Describe the work this estimate covers. Shown on estimate and invoice PDFs.</Text>
        <Field
          label="Scope of work"
          value={jobScope}
          onChangeText={setJobScope}
          multiline
          styles={styles}
          placeholderTint={styles.placeholderTint}
        />

        <View style={styles.totalsCard}>
          <Row label="Materials" value={money(totals.materials)} styles={styles} />
          <Row label="Labor" value={money(totals.labor)} styles={styles} />
          {totals.other > 0 ? <Row label="Other" value={money(totals.other)} styles={styles} /> : null}
          <View style={styles.divider} />
          <Row label="Subtotal" value={money(totals.subtotal)} bold styles={styles} />
          <Pressable onPress={() => setIncludeTax((v) => !v)} style={({ pressed }) => [styles.taxToggle, pressed && styles.pressed]}>
            <Text style={styles.taxToggleText}>{includeTax ? "Tax on" : "Add tax"}</Text>
          </Pressable>
          {includeTax ? (
            <>
              <Field
                label="Tax %"
                value={taxPercent}
                onChangeText={setTaxPercent}
                keyboardType="decimal-pad"
                styles={styles}
                placeholderTint={styles.placeholderTint}
              />
              <Row label={`Tax (${taxPercent || "0"}%)`} value={money(totals.tax)} styles={styles} />
            </>
          ) : null}
          <View style={styles.divider} />
          <Row label="Total" value={money(totals.total)} bold large styles={styles} />
        </View>

        <Field label="Notes" value={notes} onChangeText={setNotes} multiline styles={styles} placeholderTint={styles.placeholderTint} />

        {!isNewEstimate ? (
          <Pressable
            onPress={() => void persist()}
            disabled={saving}
            style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed, saving && styles.disabled]}
          >
            <Text style={styles.primaryCtaText}>{saving ? "Saving…" : "Save estimate"}</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => void shareInvoice("invoice")}
          disabled={busyPdf || busyEmail}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed, (busyPdf || busyEmail) && styles.disabled]}
        >
          <Text style={styles.secondaryBtnText}>{busyPdf ? "Creating PDF…" : "Generate invoice PDF & share"}</Text>
        </Pressable>

        <Pressable
          onPress={() => void shareInvoice("estimate")}
          disabled={busyPdf || busyEmail}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed, (busyPdf || busyEmail) && styles.disabled]}
        >
          <Text style={styles.secondaryBtnText}>Share as estimate PDF</Text>
        </Pressable>

        {!isNewEstimate ? (
          <>
            <Pressable
              onPress={() => void emailPdfToCustomer("estimate")}
              disabled={busyEmail || busyPdf || !canEmailCustomer}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
                (busyEmail || busyPdf || !canEmailCustomer) && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {busyEmail ? "Preparing PDF…" : "Email estimate PDF to customer"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void emailPdfToCustomer("invoice")}
              disabled={busyEmail || busyPdf || !canEmailCustomer}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
                (busyEmail || busyPdf || !canEmailCustomer) && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {busyEmail ? "Preparing PDF…" : "Email invoice PDF to customer"}
              </Text>
            </Pressable>
          </>
        ) : null}

        <Pressable
          onPress={() => void exportCsv()}
          disabled={busyExport}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed, busyExport && styles.disabled]}
        >
          <Text style={styles.secondaryBtnText}>{busyExport ? "Exporting…" : "Export CSV for accounting"}</Text>
        </Pressable>
    </FormScrollView>
  );
}

function materialToLine(row: MaterialLine): EstimateLineItem {
  return {
    id: newEstimateLineId(),
    kind: "material",
    description: row.text,
    quantity: "1",
    rate: "",
  };
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  multiline,
  styles,
  placeholderTint,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad" | "decimal-pad";
  multiline?: boolean;
  styles: ReturnType<typeof makeStyles>;
  placeholderTint: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <VoiceTextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={placeholderTint}
        style={[styles.input, multiline && styles.textArea]}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "auto"}
      />
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  large,
  styles,
}: {
  label: string;
  value: string;
  bold?: boolean;
  large?: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.rowWrap}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, large && styles.rowValueLarge, bold && styles.rowValueBold]}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const outlineBtn = secondaryButtonStyle(colors, tints);
  const fieldInput = inputStyle(colors, tints);

  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 48 },
    placeholderTint: placeholderTextColor(colors),
    title: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 8 },
    subtitle: { fontSize: 14, lineHeight: 20, color: colors.text, opacity: 0.72, marginBottom: 16 },
    section: {
      marginTop: 12,
      marginBottom: 10,
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    field: { marginBottom: 12 },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      paddingVertical: 4,
    },
    switchCopy: { flex: 1, paddingRight: 4 },
    helpMuted: { fontSize: 13, lineHeight: 18, color: colors.text, opacity: 0.72, marginTop: 4 },
    label: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 },
    input: fieldInput,
    textArea: { minHeight: 88 },
    kindRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    kindChip: {
      ...outlineBtn,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    kindChipText: { color: colors.text, fontWeight: "700", fontSize: 14 },
    pricingModeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
    pricingChip: {
      ...outlineBtn,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
    },
    pricingChipActive: {
      borderColor: tints.accentTintActive,
      backgroundColor: tints.accentTint,
    },
    pricingChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
    pricingChipTextActive: { fontWeight: "800" },
    lineCard: {
      ...panel,
      marginBottom: 10,
      padding: 12,
    },
    lineKind: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.65,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    switchTrackOff: hexToRgba(colors.text, 0.25),
    switchTrackOn: tints.accentTintActive,
    qtyRow: { flexDirection: "row", gap: 8 },
    qtyInput: { flex: 1 },
    lineFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
    lineAmt: { color: colors.text, fontWeight: "700" },
    removeText: { color: "#f87171", fontWeight: "700" },
    totalsCard: {
      ...panel,
      padding: 16,
      borderRadius: 16,
      marginVertical: 16,
    },
    rowWrap: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    rowLabel: { fontSize: 15, color: colors.text, opacity: 0.72, fontWeight: "400" },
    rowLabelBold: { fontWeight: "800", color: colors.text },
    rowValue: { fontSize: 15, color: colors.text, fontWeight: "600" },
    rowValueLarge: { fontSize: 18 },
    rowValueBold: { fontWeight: "800" },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexToRgba(colors.text, 0.2),
      marginVertical: 8,
    },
    taxToggle: {
      ...outlineBtn,
      marginVertical: 8,
      paddingVertical: 10,
      borderRadius: 10,
    },
    taxToggleText: { color: colors.text, fontWeight: "800" },
    primaryCta: {
      ...outlineBtn,
      paddingVertical: 16,
      borderRadius: 14,
      marginBottom: 10,
    },
    primaryCtaText: { color: colors.text, fontSize: 17, fontWeight: "800" },
    secondaryBtn: {
      ...outlineBtn,
      paddingVertical: 14,
      borderRadius: 14,
      marginBottom: 10,
    },
    secondaryBtnText: { color: colors.text, fontSize: 15, fontWeight: "800" },
    newEstimateActions: {
      marginTop: 4,
      marginBottom: 8,
      paddingTop: 4,
      paddingBottom: 4,
    },
    pressed: { opacity: 0.88 },
    disabled: { opacity: 0.55 },
  });
}
