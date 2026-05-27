import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ServiceCallList } from "@/components/serviceCalls/ServiceCallList";
import { ScStickyScroll, useScStyles } from "@/components/serviceCalls/screenChrome";
import {
  COMPLETED_PERIOD_LABELS,
  loadCompletedServiceCalls,
  type CompletedPeriod,
  type ServiceCallRecord,
} from "@/lib/serviceCallStorage";

const PERIODS: CompletedPeriod[] = ["week", "month", "3months", "6months"];

export default function CompletedServiceCallsScreen() {
  const scStyles = useScStyles();
  const [period, setPeriod] = useState<CompletedPeriod>("month");
  const [records, setRecords] = useState<ServiceCallRecord[]>([]);

  const reload = useCallback(() => {
    void loadCompletedServiceCalls(period).then(setRecords);
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <ScStickyScroll
      backHref="/service-calls"
      title="Completed service calls"
      subtitle="Choose how far back to look, then tap a job to view details."
    >
      <View style={scStyles.chipRow}>
        {PERIODS.map((p) => {
          const active = period === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[scStyles.chip, active && scStyles.chipActive]}
            >
              <Text style={[scStyles.chipText, active && scStyles.chipTextActive]}>
                {COMPLETED_PERIOD_LABELS[p]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ServiceCallList
        records={records}
        emptyMessage={`No completed service calls in the ${COMPLETED_PERIOD_LABELS[period].toLowerCase()} window.`}
        hrefForId={(id) => `/service-calls/${id}`}
      />
    </ScStickyScroll>
  );
}
