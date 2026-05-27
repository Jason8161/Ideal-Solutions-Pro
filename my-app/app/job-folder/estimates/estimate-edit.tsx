import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { EstimateCustomerSelectModal } from "@/components/accounting/EstimateCustomerSelectModal";
import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { StickyPageHeader, StickyScreenShell } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { formatEstimateCustomerAddress } from "@/lib/estimateCustomerPick";
import type { EstimateCustomer } from "@/lib/estimateStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  emptyBossEstimate,
  getBossEstimateById,
  newBossEstimateLine,
  saveBossEstimate,
} from "@/lib/bossMan/bossEstimateStorage";
import { computeBossEstimateTotal, formatBossMoney } from "@/lib/bossMan/money";
import { ESTIMATE_TEMPLATE_LABELS, type BossEstimate, type EstimateTemplateType } from "@/lib/bossMan/types";

function parseTemplate(value: string | string[] | undefined): EstimateTemplateType {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw === "deck-build" ||
    raw === "bathroom-remodel" ||
    raw === "fence-install" ||
    raw === "new-house-rough-in" ||
    raw === "panel-change" ||
    raw === "service-call" ||
    raw === "generator-install" ||
    raw === "custom"
  ) {
    return raw;
  }
  return "custom";
}

export default function BossEstimateEditScreen() {
  const { id, template } = useLocalSearchParams<{ id?: string; template?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { scStyles, styles: bossStyles } = useBossManChrome();
  const tints = useMemo(() => getAccentTints(colors), [colors]);
  const fieldStyles = useMemo(() => makeFieldStyles(colors, tints), [colors, tints]);

  const [estimate, setEstimate] = useState<BossEstimate | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  const applyEstimateCustomer = useCallback((picked: EstimateCustomer) => {
    setEstimate((prev) =>
      prev
        ? {
            ...prev,
            customerName: picked.customerName,
            address: formatEstimateCustomerAddress(picked),
          }
        : prev,
    );
  }, []);

  useEffect(() => {
    const estimateId = Array.isArray(id) ? id[0] : id;
    if (estimateId) {
      void getBossEstimateById(estimateId).then((row) => {
        setEstimate(row ?? emptyBossEstimate("custom"));
      });
    } else {
      setEstimate(emptyBossEstimate(parseTemplate(template)));
    }
  }, [id, template]);

  if (!estimate) {
    return (
      <StickyScreenShell
        header={<StickyPageHeader title="Estimate" fallbackHref="/job-folder/estimates" />}
      >
        <FormScrollView
          style={scStyles.scrollBody}
          contentContainerStyle={scStyles.content}
          extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
        >
          <Text style={scStyles.emptyText}>Loading…</Text>
        </FormScrollView>
      </StickyScreenShell>
    );
  }

  const total = computeBossEstimateTotal(estimate);

  const patch = (partial: Partial<BossEstimate>) => {
    setEstimate((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const save = async () => {
    const saved = await saveBossEstimate(estimate);
    Alert.alert("Saved", `Estimate total ${formatBossMoney(computeBossEstimateTotal(saved))}`, [
      { text: "OK", onPress: () => router.replace("/job-folder/estimates" as Href) },
    ]);
  };

  return (
    <StickyScreenShell
      header={
        <StickyPageHeader
          title={ESTIMATE_TEMPLATE_LABELS[estimate.templateType]}
          subtitle={`Running total ${formatBossMoney(total)}`}
          fallbackHref="/job-folder/estimates"
        />
      }
    >
      <FormScrollView
        style={scStyles.scrollBody}
        contentContainerStyle={scStyles.content}
        extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
      >
        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() =>
            router.push(
              (estimate.id
                ? `/job-folder/estimates/photo-to-estimate?id=${estimate.id}`
                : "/job-folder/estimates/photo-to-estimate") as Href,
            )
          }
        >
          <Text style={scStyles.menuButtonText}>Photo to estimate (AI)</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => setCustomerPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Select customer from contacts or directory"
        >
          <Text style={scStyles.menuButtonText}>Pick from contacts · Add customer</Text>
        </Pressable>
        <EstimateCustomerSelectModal
          visible={customerPickerOpen}
          onClose={() => setCustomerPickerOpen(false)}
          onCustomerSelected={applyEstimateCustomer}
        />
        <Field label="Customer" styles={fieldStyles}>
          <VoiceTextInput
            value={estimate.customerName}
            onChangeText={(customerName) => patch({ customerName })}
            style={fieldStyles.input}
            placeholderTextColor={fieldStyles.placeholderTint}
          />
        </Field>
        <Field label="Job name" styles={fieldStyles}>
          <VoiceTextInput
            value={estimate.jobName}
            onChangeText={(jobName) => patch({ jobName })}
            style={fieldStyles.input}
            placeholderTextColor={fieldStyles.placeholderTint}
          />
        </Field>
        <Field label="Address" styles={fieldStyles}>
          <VoiceTextInput
            value={estimate.address}
            onChangeText={(address) => patch({ address })}
            style={[fieldStyles.input, fieldStyles.textArea]}
            multiline
            placeholderTextColor={fieldStyles.placeholderTint}
          />
        </Field>

        <Text style={scStyles.sectionLabel}>Amounts ($)</Text>
        {(
          [
            ["laborAmount", "Labor"],
            ["materialAmount", "Material"],
            ["permitAmount", "Permit"],
            ["miscAmount", "Misc"],
            ["markupPercent", "Markup %"],
            ["taxPercent", "Tax %"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label} styles={fieldStyles}>
            <VoiceTextInput
              value={estimate[key]}
              onChangeText={(value) => patch({ [key]: value })}
              style={fieldStyles.input}
              keyboardType="decimal-pad"
              placeholderTextColor={fieldStyles.placeholderTint}
            />
          </Field>
        ))}

        <Text style={scStyles.sectionLabel}>Line items</Text>
        {estimate.lineItems.map((line, index) => (
          <View key={line.id} style={scStyles.card}>
            <VoiceTextInput
              value={line.description}
              onChangeText={(description) => {
                const lineItems = [...estimate.lineItems];
                lineItems[index] = { ...line, description };
                patch({ lineItems });
              }}
              style={fieldStyles.input}
              placeholder="Description"
              placeholderTextColor={fieldStyles.placeholderTint}
            />
            <VoiceTextInput
              value={line.amount}
              onChangeText={(amount) => {
                const lineItems = [...estimate.lineItems];
                lineItems[index] = { ...line, amount };
                patch({ lineItems });
              }}
              style={[fieldStyles.input, { marginTop: 8 }]}
              keyboardType="decimal-pad"
              placeholder="Amount"
              placeholderTextColor={fieldStyles.placeholderTint}
            />
          </View>
        ))}
        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => patch({ lineItems: [...estimate.lineItems, newBossEstimateLine()] })}
        >
          <Text style={scStyles.menuButtonText}>Add line item</Text>
        </Pressable>

        <Field label="Scope of work" styles={fieldStyles}>
          <VoiceTextInput
            value={estimate.scope}
            onChangeText={(scope) => patch({ scope })}
            style={[fieldStyles.input, fieldStyles.textArea]}
            multiline
            placeholderTextColor={fieldStyles.placeholderTint}
          />
        </Field>
        <Field label="Terms" styles={fieldStyles}>
          <VoiceTextInput
            value={estimate.terms}
            onChangeText={(terms) => patch({ terms })}
            style={[fieldStyles.input, fieldStyles.textArea]}
            multiline
            placeholderTextColor={fieldStyles.placeholderTint}
          />
        </Field>
        <Field label="Notes" styles={fieldStyles}>
          <VoiceTextInput
            value={estimate.notes}
            onChangeText={(notes) => patch({ notes })}
            style={[fieldStyles.input, fieldStyles.textArea]}
            multiline
            placeholderTextColor={fieldStyles.placeholderTint}
          />
        </Field>

        <View style={fieldStyles.switchRow}>
          <Text style={fieldStyles.label}>Signature approved</Text>
          <Switch
            value={estimate.signatureApproved}
            onValueChange={(signatureApproved) => patch({ signatureApproved })}
            trackColor={{ false: fieldStyles.switchTrackOff, true: fieldStyles.switchTrackOn }}
          />
        </View>

        <View style={scStyles.summaryCard}>
          <Text style={scStyles.summaryTotal}>Total {formatBossMoney(total)}</Text>
        </View>

        <Pressable style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]} onPress={() => void save()}>
          <Text style={scStyles.menuButtonText}>Save estimate</Text>
        </Pressable>
      </FormScrollView>
    </StickyScreenShell>
  );
}

function Field({
  label,
  styles,
  children,
}: {
  label: string;
  styles: ReturnType<typeof makeFieldStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function makeFieldStyles(
  colors: import("@/lib/colorSchemeStorage").ColorScheme,
  tints: ReturnType<typeof getAccentTints>,
) {
  return StyleSheet.create({
    placeholderTint: placeholderTextColor(colors),
    switchTrackOff: hexToRgba(colors.text, 0.25),
    switchTrackOn: tints.accentTintActive,
    field: { marginBottom: 14 },
    label: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 },
    input: {
      ...inputStyle(colors, tints),
    },
    textArea: { minHeight: 88, textAlignVertical: "top" },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: 12,
    },
  });
}
