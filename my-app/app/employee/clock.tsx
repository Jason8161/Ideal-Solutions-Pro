import { Link, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { ClockConfirmationCard } from "@/components/clockVerification/ClockConfirmationCard";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { ClockLocationRow } from "@/components/timeClock/ClockLocationRow";
import {
  countPendingClockEvents,
  performJobsiteCheckIn,
  performVerifiedClockIn,
  performVerifiedClockOut,
  syncPendingClockEvents,
  type JobCompletionStatus,
  type VerifiedClockResult,
} from "@/lib/clockVerification";
import { loadJobsForCurrentUser } from "@/lib/bossMan/employeeJobFilter";
import type { BossJob } from "@/lib/bossMan/types";
import { getActiveEntryForEmployee, loadTimeEntries } from "@/lib/bossMan/timeTrackingStorage";
import type { TimeEntry } from "@/lib/bossMan/timeTrackingTypes";
import {
  entryDurationMs,
  formatDurationShort,
  formatHours,
  msToHours,
  startOfWeek,
} from "@/lib/bossMan/timeTrackingUtils";
import { employeeDisplayName, listEmployees } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";
import {
  loadEmployeeSession,
  saveEmployeeSession,
  type EmployeeSession,
} from "@/lib/employeeSession";

type ConfirmationState =
  | { mode: "clock_in"; result: VerifiedClockResult }
  | { mode: "clock_out"; result: VerifiedClockResult };

type WeeklyDayRow = {
  key: string;
  label: string;
  hours: number;
};

function buildWeeklyRows(entries: TimeEntry[], employeeId: string): WeeklyDayRow[] {
  const weekStart = startOfWeek();
  const rows: WeeklyDayRow[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const ms = entries
      .filter((entry) => {
        if (entry.employeeId !== employeeId) return false;
        const clockIn = new Date(entry.clockIn).getTime();
        return clockIn >= dayStart.getTime() && clockIn < dayEnd.getTime();
      })
      .reduce((sum, entry) => sum + entryDurationMs(entry), 0);
    rows.push({
      key: dayStart.toISOString(),
      label: day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      hours: msToHours(ms),
    });
  }
  return rows;
}

export default function EmployeeClockScreen() {
  const { scStyles, styles } = useBossManChrome();
  const { colors } = useAppTheme();
  const input = useMemo(() => inputStyle(colors), [colors]);
  const [session, setSession] = useState<EmployeeSession>({ active: false });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<BossJob[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyDayRow[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [dailyNotes, setDailyNotes] = useState("");
  const [jobCompletion, setJobCompletion] = useState<JobCompletionStatus>("in_progress");
  const [pendingSync, setPendingSync] = useState(0);

  const employeeId = session.employeeId ?? null;
  const employee = useMemo(
    () => (employeeId ? employees.find((e) => e.id === employeeId) : null),
    [employeeId, employees],
  );
  const clockedIn = Boolean(activeEntry);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sess, emps, activeJobs, pending, allEntries] = await Promise.all([
        loadEmployeeSession(),
        listEmployees("current"),
        loadJobsForCurrentUser(),
        countPendingClockEvents(),
        loadTimeEntries(),
      ]);
      setSession(sess);
      setEmployees(emps);
      setJobs(activeJobs);
      setPendingSync(pending);

      const resolvedId = sess.employeeId ?? emps[0]?.id ?? null;
      if (resolvedId && !sess.employeeId) {
        const emp = emps.find((e) => e.id === resolvedId);
        await saveEmployeeSession({
          active: true,
          employeeId: resolvedId,
          displayName: emp ? employeeDisplayName(emp) : undefined,
        });
        setSession({ active: true, employeeId: resolvedId, displayName: emp ? employeeDisplayName(emp) : undefined });
      }

      if (resolvedId) {
        const entry = await getActiveEntryForEmployee(resolvedId);
        setActiveEntry(entry);
        if (entry?.jobId) setSelectedJobId(entry.jobId);
        setWeeklyRows(buildWeeklyRows(allEntries, resolvedId));
      } else {
        setActiveEntry(null);
        setWeeklyRows([]);
      }

      void syncPendingClockEvents().then(() => countPendingClockEvents().then(setPendingSync));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const jobLabel = (id?: string | null) => {
    if (!id) return "No job";
    const job = jobs.find((j) => j.id === id);
    if (!job) return "Job";
    return job.jobName.trim() || job.customerName.trim() || "Job";
  };

  const onSelectEmployee = async (emp: Employee) => {
    await saveEmployeeSession({
      active: true,
      employeeId: emp.id,
      displayName: employeeDisplayName(emp),
    });
    await refresh();
  };

  const onClockIn = () => {
    if (!employeeId) {
      Alert.alert("Who are you?", "Pick your name below, or ask your boss to add you to the crew.");
      return;
    }
    setBusy(true);
    void performVerifiedClockIn({ employeeId, jobsiteId: selectedJobId, notes: dailyNotes })
      .then((result) => {
        setConfirmation({ mode: "clock_in", result });
        return refresh();
      })
      .catch((e) => Alert.alert("Could not clock in", e instanceof Error ? e.message : "Try again."))
      .finally(() => setBusy(false));
  };

  const onClockOut = () => {
    if (!employeeId) return;
    setBusy(true);
    void performVerifiedClockOut({
      employeeId,
      notes: clockOutNotes || dailyNotes,
      jobCompletionStatus: jobCompletion,
    })
      .then((result) => {
        setConfirmation({ mode: "clock_out", result });
        setClockOutNotes("");
        return refresh();
      })
      .catch((e) => Alert.alert("Could not clock out", e instanceof Error ? e.message : "Try again."))
      .finally(() => setBusy(false));
  };

  const onJobsiteCheckIn = () => {
    if (!employeeId || !selectedJobId) {
      Alert.alert("Pick a job", "Select a jobsite for a manual check-in.");
      return;
    }
    setBusy(true);
    void performJobsiteCheckIn({ employeeId, jobsiteId: selectedJobId })
      .then((result) => {
        Alert.alert(
          "Jobsite check-in",
          result.verification.jobsiteName
            ? `${result.verification.jobsiteName}: ${result.verification.status.replace(/_/g, " ")}`
            : "Location recorded.",
        );
        return refresh();
      })
      .catch((e) => Alert.alert("Check-in failed", e instanceof Error ? e.message : "Try again."))
      .finally(() => setBusy(false));
  };

  const requestTimeOff = () => {
    Alert.alert(
      "Request time off",
      "Your request will be sent to your employer for approval.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit request", onPress: () => Alert.alert("Submitted", "Time-off request recorded.") },
      ],
    );
  };

  const requestVacation = () => {
    Alert.alert(
      "Request vacation",
      "Your vacation request will be sent to your employer for approval.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit request", onPress: () => Alert.alert("Submitted", "Vacation request recorded.") },
      ],
    );
  };

  const weeklyTotal = weeklyRows.reduce((sum, row) => sum + row.hours, 0);

  return (
    <ScStickyScroll
      backHref={session.active ? "/employee" : "/"}
      title="Time / Hours"
      subtitle="Clock in or out, daily notes, weekly hours, and time-off requests."
    >
      {loading ? (
        <ActivityIndicator color={scStyles.cardTitle.color} />
      ) : employees.length === 0 ? (
        <Text style={scStyles.emptyText}>
          No crew on file. Ask your boss to add you under Settings → My crew.
        </Text>
      ) : (
        <>
          <View style={[scStyles.card, { marginBottom: 12 }]}>
            <Text style={scStyles.cardTitle}>Status</Text>
            <Text style={[scStyles.cardMeta, { fontWeight: "700", fontSize: 16 }]}>
              {clockedIn ? "Clocked In" : "Clocked Out"}
            </Text>
            {clockedIn && activeEntry ? (
              <Text style={scStyles.cardMeta}>
                {jobLabel(activeEntry.jobId)} · {formatDurationShort(entryDurationMs(activeEntry))}
              </Text>
            ) : null}
          </View>

          {pendingSync > 0 ? (
            <Text style={scStyles.cardMeta}>
              {pendingSync} punch{pendingSync === 1 ? "" : "es"} queued — will sync when online.
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginBottom: 8 }]}
            onPress={requestTimeOff}
          >
            <Text style={scStyles.menuButtonText}>Request Time Off</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginBottom: 8 }]}
            onPress={requestVacation}
          >
            <Text style={scStyles.menuButtonText}>Request Vacation</Text>
          </Pressable>
          <Link href={"/employee/time-off" as Href} asChild>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginBottom: 12 }]}>
              <Text style={scStyles.menuButtonText}>View time-off balance</Text>
            </Pressable>
          </Link>

          <Text style={scStyles.sectionLabel}>Daily notes</Text>
          <VoiceTextInput
            style={[input, { marginBottom: 12 }]}
            value={dailyNotes}
            onChangeText={setDailyNotes}
            placeholder="Add note explaining attendance issue or missed time today."
            placeholderTextColor={placeholderTextColor(colors)}
            multiline
          />

          <Text style={scStyles.sectionLabel}>This week</Text>
          {weeklyRows.length === 0 ? (
            <Text style={scStyles.emptyText}>No hours logged this week yet.</Text>
          ) : (
            <>
              {weeklyRows.map((row) => (
                <View key={row.key} style={[scStyles.card, { marginBottom: 6, paddingVertical: 8 }]}>
                  <Text style={scStyles.cardTitle}>{row.label}</Text>
                  <Text style={scStyles.cardMeta}>{formatHours(row.hours)} hrs</Text>
                </View>
              ))}
              <Text style={[scStyles.cardMeta, { marginBottom: 12, fontWeight: "700" }]}>
                Week total: {formatHours(weeklyTotal)} hrs
              </Text>
            </>
          )}

          {confirmation ? (
            <>
              <ClockConfirmationCard
                title={confirmation.mode === "clock_in" ? "Clocked in" : "Clocked out"}
                timestamp={confirmation.result.event.timestamp}
                jobsiteName={confirmation.result.event.jobsiteName}
                verification={confirmation.result.verification}
                location={confirmation.result.location}
                shiftDurationMs={confirmation.result.shiftDurationMs}
                notes={confirmation.result.event.notes}
              />
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 8 }]}
                onPress={() => setConfirmation(null)}
              >
                <Text style={scStyles.menuButtonText}>Done</Text>
              </Pressable>
            </>
          ) : null}

          <Text style={scStyles.sectionLabel}>I am</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {employees.map((emp) => (
              <Pressable
                key={emp.id}
                style={[
                  styles.actionBtn,
                  employeeId === emp.id && styles.badgeAccent,
                  { marginBottom: 0, paddingVertical: 10 },
                ]}
                onPress={() => void onSelectEmployee(emp)}
              >
                <Text style={scStyles.menuButtonText}>{employeeDisplayName(emp)}</Text>
              </Pressable>
            ))}
          </View>

          {employee ? (
            <Text style={scStyles.cardMeta}>Clocking as {employeeDisplayName(employee)}</Text>
          ) : null}

          {activeEntry ? (
            <View style={[scStyles.card, { marginTop: 8 }]}>
              <Text style={scStyles.cardTitle}>On the clock</Text>
              <Text style={scStyles.cardMeta}>
                {jobLabel(activeEntry.jobId)} · {formatDurationShort(entryDurationMs(activeEntry))}
              </Text>
              <ClockLocationRow label="Clock-in location" location={activeEntry.clockInLocation} />
              <Text style={[scStyles.sectionLabel, { marginTop: 8 }]}>Job status (optional)</Text>
              {(["in_progress", "completed", "needs_return"] as JobCompletionStatus[]).map((status) => (
                <Pressable
                  key={status}
                  style={[styles.actionBtn, jobCompletion === status && styles.badgeAccent]}
                  onPress={() => setJobCompletion(status)}
                >
                  <Text style={scStyles.menuButtonText}>{status.replace(/_/g, " ")}</Text>
                </Pressable>
              ))}
              <VoiceTextInput
                style={[input, { marginTop: 8 }]}
                value={clockOutNotes}
                onChangeText={setClockOutNotes}
                placeholder="Clock-out notes (optional)"
                placeholderTextColor={placeholderTextColor(colors)}
                multiline
              />
              <Pressable
                style={({ pressed }) => [
                  scStyles.primaryCta,
                  pressed && { opacity: 0.9 },
                  { marginTop: 12 },
                  busy && { opacity: 0.6 },
                ]}
                onPress={onClockOut}
                disabled={busy}
              >
                <Text style={scStyles.primaryCtaText}>{busy ? "Saving…" : "Clock Out"}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[scStyles.sectionLabel, { marginTop: 12 }]}>Job (optional)</Text>
              <Pressable
                style={[styles.actionBtn, !selectedJobId && styles.badgeAccent]}
                onPress={() => setSelectedJobId(null)}
              >
                <Text style={scStyles.menuButtonText}>No job</Text>
              </Pressable>
              {jobs.map((job) => (
                <Pressable
                  key={job.id}
                  style={[styles.actionBtn, selectedJobId === job.id && styles.badgeAccent]}
                  onPress={() => setSelectedJobId(job.id)}
                >
                  <Text style={scStyles.menuButtonText}>{jobLabel(job.id)}</Text>
                </Pressable>
              ))}
              {selectedJobId ? (
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 4 }]}
                  onPress={onJobsiteCheckIn}
                  disabled={busy}
                >
                  <Text style={scStyles.menuButtonText}>Jobsite check-in (no shift)</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [
                  scStyles.primaryCta,
                  pressed && { opacity: 0.9 },
                  { marginTop: 12 },
                  busy && { opacity: 0.6 },
                ]}
                onPress={onClockIn}
                disabled={busy}
              >
                <Text style={scStyles.primaryCtaText}>{busy ? "Getting location…" : "Clock In"}</Text>
              </Pressable>
            </>
          )}

          <Text style={[scStyles.emptyText, { marginTop: 16 }]}>
            Location is captured once at punch time for verification — not continuous tracking.
          </Text>
        </>
      )}
    </ScStickyScroll>
  );
}
