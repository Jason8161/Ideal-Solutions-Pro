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
import { getActiveEntryForEmployee } from "@/lib/bossMan/timeTrackingStorage";
import type { TimeEntry } from "@/lib/bossMan/timeTrackingTypes";
import { entryDurationMs, formatDurationShort } from "@/lib/bossMan/timeTrackingUtils";
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

export default function EmployeeClockScreen() {
  const { scStyles, styles } = useBossManChrome();
  const { colors } = useAppTheme();
  const input = useMemo(() => inputStyle(colors), [colors]);
  const [session, setSession] = useState<EmployeeSession>({ active: false });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<BossJob[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [jobCompletion, setJobCompletion] = useState<JobCompletionStatus>("in_progress");
  const [pendingSync, setPendingSync] = useState(0);

  const employeeId = session.employeeId ?? null;
  const employee = useMemo(
    () => (employeeId ? employees.find((e) => e.id === employeeId) : null),
    [employeeId, employees],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sess, emps, activeJobs, pending] = await Promise.all([
        loadEmployeeSession(),
        listEmployees("current"),
        loadJobsForCurrentUser(),
        countPendingClockEvents(),
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
      } else {
        setActiveEntry(null);
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
      Alert.alert("Who are you?", "Pick your name below, or add yourself under Settings → My crew.");
      return;
    }
    setBusy(true);
    void performVerifiedClockIn({ employeeId, jobsiteId: selectedJobId })
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
      notes: clockOutNotes,
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

  return (
    <ScStickyScroll
      backHref="/"
      title="My time clock"
      subtitle="Clock in or out with one-shot GPS verification. No live tracking."
    >
      {loading ? (
        <ActivityIndicator color={scStyles.cardTitle.color} />
      ) : employees.length === 0 ? (
        <>
          <Text style={scStyles.emptyText}>
            No crew on file. Ask your boss to add you under Settings → My crew.
          </Text>
          <Link href={"/settings/employees" as Href} asChild>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}>
              <Text style={scStyles.menuButtonText}>My crew settings</Text>
            </Pressable>
          </Link>
        </>
      ) : (
        <>
          {pendingSync > 0 ? (
            <Text style={scStyles.cardMeta}>
              {pendingSync} punch{pendingSync === 1 ? "" : "es"} queued — will sync when online.
            </Text>
          ) : null}

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
                placeholder="Notes (optional)"
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
                <Text style={scStyles.primaryCtaText}>{busy ? "Saving…" : "Clock out"}</Text>
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
                <Text style={scStyles.primaryCtaText}>{busy ? "Getting location…" : "Clock in"}</Text>
              </Pressable>
            </>
          )}

          <Text style={[scStyles.emptyText, { marginTop: 16 }]}>
            Location is captured once at punch time for verification — not continuous tracking.
          </Text>
        </>
      )}

      <Link href={"/settings/clock-verification" as Href} asChild>
        <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}>
          <Text style={scStyles.menuButtonText}>Clock verification settings</Text>
        </Pressable>
      </Link>
      <Link href={"/settings/employee-ai" as Href} asChild>
        <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}>
          <Text style={scStyles.menuButtonText}>Employee session settings</Text>
        </Pressable>
      </Link>
    </ScStickyScroll>
  );
}
