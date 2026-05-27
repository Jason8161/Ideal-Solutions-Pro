import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { EstimateEditorForm } from "@/components/accounting/EstimateEditorForm";
import { StickyPageHeader } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  createEstimate,
  customerFromServiceCallFields,
  emptyEstimateCustomer,
  lineItemsFromJobCost,
  newCustomerAcceptToken,
  peekNextInvoiceNumber,
  saveEstimate,
  type EstimateRecord,
} from "@/lib/estimateStorage";
import { getServiceCallById } from "@/lib/serviceCallStorage";
import { defaultPricingModeForNewEstimate } from "@/lib/estimatePricing";
import { loadMyCrewSettings } from "@/lib/myCrewSettings";

export default function NewEstimateScreen() {
  const { colors } = useAppTheme();
  const { serviceCallId } = useLocalSearchParams<{ serviceCallId?: string }>();
  const router = useRouter();
  const [draft, setDraft] = useState<EstimateRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const crew = await loadMyCrewSettings();
      const scId = typeof serviceCallId === "string" ? serviceCallId : undefined;
      const pricingMode = defaultPricingModeForNewEstimate(scId);
      const base: EstimateRecord = {
        id: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customer: emptyEstimateCustomer(),
        pricingMode,
        lumpSumAmount: "",
        lineItems: [],
        includeTax: false,
        taxPercent: crew.defaultTaxPercent,
        jobScope: "",
        notes: "",
        invoiceNumber: "",
        approved: false,
        schedulingPhase: false,
        customerAcceptToken: newCustomerAcceptToken(),
      };

      if (scId) {
        const call = await getServiceCallById(scId);
        if (call && !cancelled) {
          base.serviceCallId = call.id;
          base.customer = customerFromServiceCallFields(call.fields);
          base.notes = call.fields.workOrderNotes.trim();
          if (call.jobCost) {
            base.lineItems = lineItemsFromJobCost(call.jobCost, crew, "service_call");
          }
        }
      }

      const suggested = await peekNextInvoiceNumber();
      if (!cancelled) setDraft({ ...base, invoiceNumber: suggested });
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceCallId]);

  const onSave = useCallback(
    async (record: EstimateRecord): Promise<EstimateRecord> => {
      if (record.id) {
        const saved = await saveEstimate(record);
        setDraft(saved);
        return saved;
      }
      const saved = await createEstimate({
        serviceCallId: record.serviceCallId,
        customer: record.customer,
        pricingMode: record.pricingMode,
        lumpSumAmount: record.lumpSumAmount,
        lineItems: record.lineItems,
        includeTax: record.includeTax,
        taxPercent: record.taxPercent,
        jobScope: record.jobScope,
        notes: record.notes,
        invoiceNumber: record.invoiceNumber,
        approved: record.approved,
        schedulingPhase: record.schedulingPhase,
        customerAcceptToken: record.customerAcceptToken,
      });
      setDraft(saved);
      router.replace(`/estimates/${saved.id}`);
      return saved;
    },
    [router],
  );

  if (!draft) {
    return (
      <View style={styles.flexCenter}>
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StickyPageHeader title="New estimate" backHref="/estimates" backLabel="← Estimates" />
      <EstimateEditorForm initial={draft} onSave={onSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "transparent" },
  flexCenter: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "transparent" },
});
