import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { isInvoiceOverdue } from "@/lib/invoices/overdueInvoices";
import {
  deleteBossInvoice,
  duplicateBossInvoice,
  invoiceSubtitle,
  invoiceTitle,
  loadBossInvoices,
  loadBossInvoicesForJob,
} from "@/lib/invoices/invoiceStorage";
import type { BossInvoice } from "@/lib/invoices/types";

export default function BossInvoicesHubScreen() {
  const { jobId, filter } = useLocalSearchParams<{ jobId?: string; filter?: string }>();
  const router = useRouter();
  const { scStyles, styles } = useBossManChrome();
  const [invoices, setInvoices] = useState<BossInvoice[]>([]);
  const resolvedJobId = Array.isArray(jobId) ? jobId[0] : jobId;
  const resolvedFilter = Array.isArray(filter) ? filter[0] : filter;
  const overdueOnly = resolvedFilter === "overdue";

  const refresh = useCallback(() => {
    const apply = (rows: BossInvoice[]) => {
      setInvoices(overdueOnly ? rows.filter(isInvoiceOverdue) : rows);
    };
    if (resolvedJobId) {
      void loadBossInvoicesForJob(resolvedJobId).then(apply);
    } else {
      void loadBossInvoices().then(apply);
    }
  }, [overdueOnly, resolvedJobId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const createNew = () => {
    const q = resolvedJobId ? `?jobId=${resolvedJobId}` : "";
    router.push(`/job-folder/invoices/invoice-edit${q}` as Href);
  };

  const listLabel = useMemo(() => {
    if (overdueOnly) {
      return resolvedJobId ? "Overdue invoices for this job" : "Overdue invoices";
    }
    return resolvedJobId ? "Invoices for this job" : "All saved invoices";
  }, [overdueOnly, resolvedJobId]);

  return (
    <ScStickyScroll
      backHref={
        resolvedJobId ? (`/job-folder/job/${resolvedJobId}` as Href) : "/job-folder/hub/jobs-estimates"
      }
      title={overdueOnly ? "Overdue invoices" : "Invoices"}
      subtitle={
        overdueOnly
          ? "Past due with an outstanding balance."
          : resolvedJobId
            ? "Create, send, and track payments for this job."
            : "Professional invoices tied to jobs and customers."
      }
    >
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
        onPress={createNew}
      >
        <Text style={scStyles.menuButtonText}>Create invoice</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
        onPress={() => router.push("/settings/invoice-customization" as Href)}
      >
        <Text style={scStyles.menuButtonText}>Invoice customization (Settings)</Text>
      </Pressable>

      {overdueOnly ? (
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.replace("/job-folder/invoices" as Href)}
        >
          <Text style={scStyles.menuButtonText}>Show all invoices</Text>
        </Pressable>
      ) : null}

      <Text style={scStyles.sectionLabel}>{listLabel}</Text>
      {invoices.length === 0 ? (
        <Text style={scStyles.emptyText}>
          {overdueOnly
            ? "No overdue invoices. You're caught up."
            : "No invoices yet. Tap Create invoice to start."}
        </Text>
      ) : (
        invoices.map((row) => (
          <View key={row.id} style={scStyles.card}>
            <Text style={scStyles.cardTitle}>{invoiceTitle(row)}</Text>
            <Text style={scStyles.cardMeta}>{invoiceSubtitle(row)}</Text>
            <View style={scStyles.actionRow}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/job-folder/invoices/invoice-edit?id=${row.id}` as Href)}
              >
                <Text style={scStyles.menuButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/job-folder/invoices/invoice-preview?id=${row.id}` as Href)}
              >
                <Text style={scStyles.menuButtonText}>Preview</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
                onPress={() => {
                  void duplicateBossInvoice(row.id).then((copy) => {
                    if (copy) {
                      refresh();
                      Alert.alert("Duplicated", `Created ${copy.invoiceNumber}.`);
                    }
                  });
                }}
              >
                <Text style={scStyles.menuButtonText}>Duplicate</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
                onPress={() => {
                  Alert.alert("Delete invoice?", row.invoiceNumber, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        void deleteBossInvoice(row.id).then((ok) => {
                          if (ok) refresh();
                        });
                      },
                    },
                  ]);
                }}
              >
                <Text style={scStyles.menuButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScStickyScroll>
  );
}
