import { Link, Redirect, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { employeeDisplayName, listEmployees } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";
import { loadBossJobs } from "@/lib/bossMan/jobStorage";
import type { BossJob } from "@/lib/bossMan/types";
import { ClockLocationRow } from "@/components/timeClock/ClockLocationRow";
import {
  createManualTimeEntry,
  deleteTimeEntry,
  loadTimeEntries,
} from "@/lib/bossMan/timeTrackingStorage";
import type { TimeEntry } from "@/lib/bossMan/timeTrackingTypes";
import {
  entryDurationMs,
  entryOverlapsPeriod,
  formatClockRange,
  formatDurationShort,
  periodForPreset,
} from "@/lib/bossMan/timeTrackingUtils";
import { isProTier } from "@/lib/subscriptionGating";

type PeriodFilter = "this_week" | "last_week" | "all";

export default function TimeEntriesScreen() {
  const { activeTier } = useSubscription();
  const { colors } = useAppTheme();
  const { scStyles, styles } = useBossManChrome();
  const input = useMemo(() => inputStyle(colors), [colors]);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<BossJob[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>("this_week");

  const [manualEmployeeId, setManualEmployeeId] = useState<string | null>(null);
  const [manualJobId, setManualJobId] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualHours, setManualHours] = useState("8");
  const [manualNotes, setManualNotes] = useState("");

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  const refresh = useCallback(() => {
    void Promise.all([loadTimeEntries(), listEmployees("current"), loadBossJobs()]).then(
      ([rows, emps, allJobs]) => {
        setEntries(rows);
        setEmployees(emps);
        setJobs(allJobs);
        setManualEmployeeId((prev) => prev ?? emps[0]?.id ?? null);
      },
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    if (period === "all") return entries;
    const preset = period === "this_week" ? "this_week" : "last_week";
    const { start, end } = periodForPreset(preset);
    return entries.filter((e) => entryOverlapsPeriod(e, start, end));
  }, [entries, period]);

  if (!isProTier(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  const jobLabel = (id?: string) => {
    if (!id) return "—";
    const job = jobMap.get(id);
    if (!job) return "Job";
    return job.jobName.trim() || job.customerName.trim() || "Job";
  };

  const onAddManual = () => {
    if (!manualEmployeeId) {
      Alert.alert("Select employee", "Choose who worked the hours.");
      return;
    }
    const hours = parseFloat(manualHours.replace(/,/g, ""));
    if (!Number.isFinite(hours) || hours <= 0) {
      Alert.alert("Invalid hours", "Enter a positive number of hours.");
      return;
    }
    void createManualTimeEntry({
      employeeId: manualEmployeeId,
      jobId: manualJobId ?? undefined,
      workDate: manualDate,
      hours,
      notes: manualNotes,
    })
      .then(() => {
        setManualNotes("");
        refresh();
        Alert.alert("Added", "Manual time entry saved.");
      })
      .catch((e) => Alert.alert("Could not save", e instanceof Error ? e.message : "Try again."));
  };

  const onDelete = (entry: TimeEntry) => {
    Alert.alert("Delete entry?", "This removes the time record.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void deleteTimeEntry(entry.id).then(refresh),
      },
    ]);
  };

  return (
    <ScStickyScroll
      backHref="/job-folder/time-payroll"
      title="Time log"
      subtitle="All clock and manual entries. Long-press delete from the delete button."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["this_week", "last_week", "all"] as const).map((p) => (
          <Pressable
            key={p}
            style={[styles.actionBtn, period === p && styles.badgeAccent, { marginBottom: 0 }]}
            onPress={() => setPeriod(p)}
          >
            <Text style={scStyles.menuButtonText}>
              {p === "this_week" ? "This week" : p === "last_week" ? "Last week" : "All"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={scStyles.sectionLabel}>Add manual hours</Text>
      <Text style={scStyles.emptyText}>Employee</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {employees.map((emp) => (
          <Pressable
            key={emp.id}
            style={[
              styles.actionBtn,
              manualEmployeeId === emp.id && styles.badgeAccent,
              { marginBottom: 0, paddingVertical: 8 },
            ]}
            onPress={() => setManualEmployeeId(emp.id)}
          >
            <Text style={scStyles.menuButtonText}>{employeeDisplayName(emp)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={scStyles.emptyText}>Job (optional)</Text>
      <Pressable
        style={[styles.actionBtn, !manualJobId && styles.badgeAccent]}
        onPress={() => setManualJobId(null)}
      >
        <Text style={scStyles.menuButtonText}>No job</Text>
      </Pressable>
      {jobs.slice(0, 12).map((job) => (
        <Pressable
          key={job.id}
          style={[styles.actionBtn, manualJobId === job.id && styles.badgeAccent]}
          onPress={() => setManualJobId(job.id)}
        >
          <Text style={scStyles.menuButtonText}>{jobLabel(job.id)}</Text>
        </Pressable>
      ))}
      <VoiceTextInput
        style={input}
        value={manualDate}
        onChangeText={setManualDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={placeholderTextColor(colors)}
      />
      <VoiceTextInput
        style={input}
        value={manualHours}
        onChangeText={setManualHours}
        placeholder="Hours"
        placeholderTextColor={placeholderTextColor(colors)}
        keyboardType="decimal-pad"
      />
      <VoiceTextInput
        style={input}
        value={manualNotes}
        onChangeText={setManualNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={placeholderTextColor(colors)}
      />
      <Pressable style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }]} onPress={onAddManual}>
        <Text style={scStyles.primaryCtaText}>Save manual entry</Text>
      </Pressable>

      <Text style={scStyles.sectionLabel}>Entries ({filtered.length})</Text>
      {filtered.length === 0 ? (
        <Text style={scStyles.emptyText}>No entries in this period.</Text>
      ) : (
        filtered.map((entry) => {
          const emp = employeeMap.get(entry.employeeId);
          const hours = formatDurationShort(entryDurationMs(entry));
          return (
            <View key={entry.id} style={scStyles.card}>
              <Text style={scStyles.cardTitle}>{emp ? employeeDisplayName(emp) : "Employee"}</Text>
              <Text style={scStyles.cardMeta}>
                {jobLabel(entry.jobId)} · {hours} · {entry.source === "manual" ? "Manual" : "Clock"}
              </Text>
              <Text style={scStyles.cardMeta}>{formatClockRange(entry)}</Text>
              <ClockLocationRow label="Clock-in" location={entry.clockInLocation} />
              <ClockLocationRow label="Clock-out" location={entry.clockOutLocation} />
              {entry.notes ? <Text style={scStyles.cardMeta}>{entry.notes}</Text> : null}
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 8 }]}
                onPress={() => onDelete(entry)}
              >
                <Text style={scStyles.menuButtonText}>Delete</Text>
              </Pressable>
            </View>
          );
        })
      )}

      <Link href={"/settings/employees" as Href} asChild>
        <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}>
          <Text style={scStyles.menuButtonText}>Manage employees</Text>
        </Pressable>
      </Link>
    </ScStickyScroll>
  );
}
