import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ClockLocationRow } from "@/components/timeClock/ClockLocationRow";
import { formatClockEventTime } from "@/lib/bossMan/clockLocationDisplay";
import type { ClockEvent } from "@/lib/clockVerification/types";
import { formatDurationShort } from "@/lib/bossMan/timeTrackingUtils";
import type { Employee } from "@/lib/employees/types";

type Props = {
  events: ClockEvent[];
  employees: Employee[];
  onSync?: () => void;
  pendingCount?: number;
};

function kindLabel(kind: ClockEvent["kind"]): string {
  if (kind === "clock_in") return "Clock in";
  if (kind === "clock_out") return "Clock out";
  return "Jobsite check-in";
}

function syncBadge(status: ClockEvent["syncStatus"]): string {
  if (status === "synced") return "Synced";
  if (status === "failed") return "Sync failed";
  return "Pending";
}

export function AdminClockHistoryList({ events, employees, onSync, pendingCount }: Props) {
  const { scStyles, styles } = useBossManChrome();
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  if (events.length === 0) {
    return <Text style={scStyles.emptyText}>No verification punches yet.</Text>;
  }

  return (
    <>
      {pendingCount != null && pendingCount > 0 ? (
        <View style={[scStyles.card, { marginBottom: 8 }]}>
          <Text style={scStyles.cardMeta}>
            {pendingCount} punch{pendingCount === 1 ? "" : "es"} waiting to sync
          </Text>
          {onSync ? (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 8 }]}
              onPress={onSync}
            >
              <Text style={scStyles.menuButtonText}>Sync now</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {events.map((event) => {
        const emp = empMap.get(event.employeeId);
        const name = emp
          ? `${emp.firstName} ${emp.lastName}`.trim() || "Employee"
          : "Employee";
        return (
          <View key={event.id} style={[scStyles.card, { marginBottom: 8 }]}>
            <Text style={scStyles.cardTitle}>
              {name} · {kindLabel(event.kind)}
            </Text>
            <Text style={scStyles.cardMeta}>
              {formatClockEventTime(event.timestamp)} · {syncBadge(event.syncStatus)}
            </Text>
            {event.jobsiteName ? (
              <Text style={scStyles.cardMeta}>Jobsite: {event.jobsiteName}</Text>
            ) : null}
            {event.jobsiteVerification?.status ? (
              <Text style={scStyles.cardMeta}>
                Verification: {event.jobsiteVerification.status.replace(/_/g, " ")}
                {event.jobsiteVerification.distanceFeet != null
                  ? ` (${event.jobsiteVerification.distanceFeet} ft)`
                  : ""}
              </Text>
            ) : null}
            {event.shiftDurationMs != null ? (
              <Text style={scStyles.cardMeta}>
                Shift: {formatDurationShort(event.shiftDurationMs)}
              </Text>
            ) : null}
            <ClockLocationRow
              label={event.kind === "clock_out" ? "Clock-out" : "Location"}
              location={event.location}
            />
          </View>
        );
      })}
    </>
  );
}
