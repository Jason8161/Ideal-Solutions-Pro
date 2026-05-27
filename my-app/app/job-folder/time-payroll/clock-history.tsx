import { useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { AdminClockHistoryList } from "@/components/clockVerification/AdminClockHistoryList";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import {
  countPendingClockEvents,
  loadClockEventHistory,
  syncPendingClockEvents,
  type ClockEvent,
} from "@/lib/clockVerification";
import { listEmployees } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";

export default function ClockVerificationHistoryScreen() {
  const { scStyles } = useBossManChrome();
  const [events, setEvents] = useState<ClockEvent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pending, setPending] = useState(0);

  const refresh = useCallback(async () => {
    const [rows, emps, pendingCount] = await Promise.all([
      loadClockEventHistory(),
      listEmployees("current"),
      countPendingClockEvents(),
    ]);
    setEvents(rows);
    setEmployees(emps);
    setPending(pendingCount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onSync = () => {
    void syncPendingClockEvents().then((result) => {
      if (result.synced.length === 0 && result.failed.length === 0) {
        Alert.alert("Sync", "Nothing to sync or cloud API not configured.");
      } else {
        Alert.alert(
          "Sync complete",
          `${result.synced.length} synced${result.failed.length ? `, ${result.failed.length} failed` : ""}.`,
        );
      }
      return refresh();
    });
  };

  return (
    <ScStickyScroll
      backHref={"/job-folder/time-payroll" as Href}
      title="Clock verification log"
      subtitle="GPS punch history, verification status, and sync queue."
    >
      <Text style={scStyles.sectionLabel}>Recent punches</Text>
      <AdminClockHistoryList
        events={events}
        employees={employees}
        pendingCount={pending}
        onSync={onSync}
      />
    </ScStickyScroll>
  );
}
