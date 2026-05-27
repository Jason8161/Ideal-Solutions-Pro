import { Redirect, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { PAY_TYPE_LABELS } from "@/lib/employees/types";
import {
  buildPayrollSummary,
  formatMoney,
  payrollHoursLabel,
} from "@/lib/bossMan/payrollCalculations";
import { sharePayrollCsv } from "@/lib/bossMan/payrollExport";
import type { PayPeriodPreset, PayrollSummary } from "@/lib/bossMan/timeTrackingTypes";
import { isProTier } from "@/lib/subscriptionGating";

const PRESETS: { id: PayPeriodPreset; label: string }[] = [
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "last_14_days", label: "Last 14 days" },
];

export default function PayrollSummaryScreen() {
  const { activeTier } = useSubscription();
  const { scStyles, styles } = useBossManChrome();
  const [preset, setPreset] = useState<PayPeriodPreset>("this_week");
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: PayPeriodPreset) => {
    setLoading(true);
    void buildPayrollSummary(p).then((result) => {
      setSummary(result);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(preset);
    }, [load, preset]),
  );

  if (!isProTier(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  return (
    <ScStickyScroll
      backHref="/job-folder/time-payroll"
      title="Payroll summary"
      subtitle="Hours from your time log × employee pay rates. Hourly uses 40h/week OT at 1.5×."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PRESETS.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.actionBtn, preset === p.id && styles.badgeAccent, { marginBottom: 0 }]}
            onPress={() => {
              setPreset(p.id);
              load(p.id);
            }}
          >
            <Text style={scStyles.menuButtonText}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading || !summary ? (
        <ActivityIndicator color={scStyles.subtitle.color} style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={[scStyles.card, { gap: 6 }]}>
            <Text style={scStyles.cardTitle}>{summary.label}</Text>
            <Text style={scStyles.cardMeta}>{summary.totalHours.toFixed(1)} total hours</Text>
            {summary.totalGross != null ? (
              <Text style={scStyles.cardMeta}>Est. gross payroll: {formatMoney(summary.totalGross)}</Text>
            ) : (
              <Text style={scStyles.cardMeta}>Gross pay varies by pay type — see each row.</Text>
            )}
          </View>

          {summary.rows.length === 0 ? (
            <Text style={scStyles.emptyText}>No time logged in this period. Clock in or add manual hours.</Text>
          ) : (
            summary.rows.map((row) => (
              <View key={row.employeeId} style={scStyles.card}>
                <Text style={scStyles.cardTitle}>{row.employeeName}</Text>
                <Text style={scStyles.cardMeta}>
                  {PAY_TYPE_LABELS[row.payType]}
                  {row.payRate > 0 ? ` · $${row.payRate}/hr` : ""} · {payrollHoursLabel(row)}
                </Text>
                {row.grossPay != null ? (
                  <Text style={scStyles.cardMeta}>Est. gross: {formatMoney(row.grossPay)}</Text>
                ) : row.grossPayNote ? (
                  <Text style={scStyles.cardMeta}>{row.grossPayNote}</Text>
                ) : null}
                {row.byJob.length > 0 ? (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {row.byJob.map((j) => (
                      <Text key={j.jobId} style={scStyles.cardMeta}>
                        {j.jobLabel}: {j.hours.toFixed(1)}h
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))
          )}

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
            onPress={() => summary && void sharePayrollCsv(summary)}
            disabled={!summary || summary.rows.length === 0}
          >
            <Text style={scStyles.menuButtonText}>Export payroll CSV</Text>
          </Pressable>
        </>
      )}
    </ScStickyScroll>
  );
}
