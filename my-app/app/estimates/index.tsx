import { Link, useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { HOME_FALLBACK_HREF, ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import {
  accentPanelStyle,
  getAccentTints,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { accountingExportSubtitle } from "@/lib/accountingExport";
import {
  estimateSubtitle,
  estimateTitle,
  loadEstimates,
  type EstimateRecord,
} from "@/lib/estimateStorage";
import { loadCurrentServiceCalls, serviceCallTitle, type ServiceCallRecord } from "@/lib/serviceCallStorage";

export default function EstimatesHubScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [serviceCalls, setServiceCalls] = useState<ServiceCallRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [exportHint, setExportHint] = useState("");

  const refresh = useCallback(() => {
    void Promise.all([loadEstimates(), loadCurrentServiceCalls(), accountingExportSubtitle()]).then(
      ([rows, calls, hint]) => {
        setEstimates(rows);
        setServiceCalls(calls);
        setExportHint(hint);
        setLoaded(true);
      },
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <ScStickyScroll
      title="Estimates"
      subtitle="Build quotes, PDF invoices, and CSV exports for bookkeeping."
      fallbackHref={HOME_FALLBACK_HREF}
    >
      <Text style={styles.lead}>
        Build quotes from materials and labor, generate PDF invoices, and export CSV when you are ready for
        bookkeeping. {exportHint}
      </Text>

      <Pressable
        style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
        onPress={() => router.push("/estimates/new" as Href)}
        accessibilityRole="button"
        accessibilityLabel="New Estimate"
      >
        <Text style={styles.primaryCtaText}>New Estimate</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={() => router.push("/job-folder/estimates/photo-to-estimate" as Href)}
        accessibilityRole="button"
        accessibilityLabel="Photo to estimate with AI"
      >
        <Text style={styles.rowTitle}>Photo to estimate (AI)</Text>
        <Text style={styles.rowSub}>Upload jobsite photos — draft a quick Boss Man estimate</Text>
      </Pressable>

      {serviceCalls.length > 0 ? (
        <>
          <Text style={styles.sectionHeading}>From service call</Text>
          {serviceCalls.slice(0, 6).map((call) => (
            <Pressable
              key={call.id}
              onPress={() => router.push(`/estimates/new?serviceCallId=${call.id}` as Href)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.rowTitle}>{serviceCallTitle(call)}</Text>
              <Text style={styles.rowSub}>Pre-fill customer & job cost</Text>
            </Pressable>
          ))}
        </>
      ) : null}

      <Text style={styles.sectionHeading}>Saved estimates</Text>
      {!loaded ? (
        <ActivityIndicator color={colors.text} style={styles.loader} />
      ) : estimates.length === 0 ? (
        <Text style={styles.empty}>No saved estimates yet. Tap New Estimate to start.</Text>
      ) : (
        estimates.map((row) => (
          <Link key={row.id} href={`/estimates/${row.id}`} asChild>
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.rowTitle}>{estimateTitle(row)}</Text>
              <Text style={styles.rowSub}>{estimateSubtitle(row)}</Text>
            </Pressable>
          </Link>
        ))
      )}
    </ScStickyScroll>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const outlineBtn = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40 },
    lead: { fontSize: 16, lineHeight: 24, color: colors.text, opacity: 0.92, marginBottom: 18 },
    sectionHeading: {
      marginTop: 20,
      marginBottom: 10,
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    primaryCta: {
      ...outlineBtn,
      paddingVertical: 16,
      borderRadius: 14,
    },
    primaryCtaText: { color: colors.text, fontSize: 17, fontWeight: "800" },
    row: {
      ...panel,
      padding: 14,
      marginBottom: 10,
    },
    rowTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    rowSub: { fontSize: 13, color: tints.mutedText },
    empty: { fontSize: 15, color: tints.mutedText, fontStyle: "italic", marginBottom: 8 },
    loader: { marginVertical: 16 },
    pressed: { opacity: 0.88 },
  });
}
