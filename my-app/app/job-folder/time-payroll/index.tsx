import { Link, Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { AdminClockHistoryList } from "@/components/clockVerification/AdminClockHistoryList";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { employeeDisplayName, listEmployees } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";
import { loadActiveBossJobs } from "@/lib/bossMan/jobStorage";
import { buildPayrollSummary, formatMoney } from "@/lib/bossMan/payrollCalculations";
import type { BossJob } from "@/lib/bossMan/types";
import { ClockLocationRow } from "@/components/timeClock/ClockLocationRow";
import {
  countPendingClockEvents,
  loadClockEventHistory,
  performVerifiedClockIn,
  performVerifiedClockOut,
  syncPendingClockEvents,
  type ClockEvent,
} from "@/lib/clockVerification";
import {
  getActiveEntryForEmployee,
  loadActiveTimeEntries,
} from "@/lib/bossMan/timeTrackingStorage";
import type { TimeEntry } from "@/lib/bossMan/timeTrackingTypes";
import { formatDurationShort, entryDurationMs } from "@/lib/bossMan/timeTrackingUtils";
import { isProTier } from "@/lib/subscriptionGating";

export default function TimePayrollHubScreen() {
  const { activeTier } = useSubscription();
  const { scStyles, styles } = useBossManChrome();
  const router = useRouter();
  const { jobId: preselectedJobId } = useLocalSearchParams<{ jobId?: string }>();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<BossJob[]>([]);
  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    typeof preselectedJobId === "string" ? preselectedJobId : null,
  );
  const [weekHours, setWeekHours] = useState<number | null>(null);
  const [weekGross, setWeekGross] = useState<number | null>(null);
  const [verificationEvents, setVerificationEvents] = useState<ClockEvent[]>([]);
  const [pendingSync, setPendingSync] = useState(0);

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  const refresh = useCallback(() => {
    void Promise.all([
      listEmployees("current"),
      loadActiveBossJobs(),
      loadActiveTimeEntries(),
      buildPayrollSummary("this_week"),
      loadClockEventHistory(),
      countPendingClockEvents(),
    ]).then(([emps, activeJobs, active, summary, events, pending]) => {
      setEmployees(emps);
      setJobs(activeJobs);
      setActiveEntries(active);
      setWeekHours(summary.totalHours);
      setWeekGross(summary.totalGross);
      setVerificationEvents(events.slice(0, 5));
      setPendingSync(pending);
      setSelectedEmployeeId((prev) => prev ?? emps[0]?.id ?? null);
      void syncPendingClockEvents();
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!isProTier(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  const onClockIn = () => {
    if (!selectedEmployeeId) {
      Alert.alert("Select employee", "Add crew under Settings → My crew first.");
      return;
    }
    void (async () => {
      try {
        const active = await getActiveEntryForEmployee(selectedEmployeeId);
        if (active) {
          Alert.alert("Already clocked in", "Clock this employee out before starting again.");
          return;
        }
        const result = await performVerifiedClockIn({
          employeeId: selectedEmployeeId,
          jobsiteId: selectedJobId,
        });
        refresh();
        Alert.alert(
          "Clocked in",
          result.location
            ? "Time is tracking with GPS verification."
            : "Time is tracking for this employee.",
        );
      } catch (e) {
        Alert.alert("Could not clock in", e instanceof Error ? e.message : "Try again.");
      }
    })();
  };

  const onClockOut = (employeeId: string) => {
    void (async () => {
      try {
        await performVerifiedClockOut({ employeeId });
        refresh();
        Alert.alert("Clocked out", "Hours saved to the time log.");
      } catch (e) {
        Alert.alert("Could not clock out", e instanceof Error ? e.message : "Try again.");
      }
    })();
  };

  const jobLabel = (id?: string) => {
    if (!id) return "No job";
    const job = jobMap.get(id);
    if (!job) return "Job";
    return job.jobName.trim() || job.customerName.trim() || "Job";
  };

  return (
    <ScStickyScroll
      backHref="/job-folder/hub/employees"
      title="Time & Payroll"
      subtitle="Boss Man only — clock crew on jobs, review hours, and run payroll summaries."
    >
      <View style={[scStyles.card, { gap: 8 }]}>
        <Text style={scStyles.cardTitle}>This week</Text>
        <Text style={scStyles.cardMeta}>
          {weekHours != null ? `${weekHours.toFixed(1)} crew hours logged` : "—"}
          {weekGross != null ? ` · Est. gross ${formatMoney(weekGross)}` : ""}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
        onPress={() => router.push("/job-folder/time-payroll/payroll" as Href)}
      >
        <Text style={scStyles.menuButtonText}>Payroll summary →</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
        onPress={() => router.push("/job-folder/time-payroll/entries" as Href)}
      >
        <Text style={scStyles.menuButtonText}>Time log →</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
        onPress={() => router.push("/job-folder/time-payroll/clock-history" as Href)}
      >
        <Text style={scStyles.menuButtonText}>Clock verification log →</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
        onPress={() => router.push("/employee/clock" as Href)}
      >
        <Text style={scStyles.menuButtonText}>Employee self clock →</Text>
      </Pressable>

      <Text style={scStyles.sectionLabel}>Clock in</Text>
      {employees.length === 0 ? (
        <>
          <Text style={scStyles.emptyText}>Add employees under Settings → My crew to track time.</Text>
          <Link href={"/settings/employees" as Href} asChild>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}>
              <Text style={scStyles.menuButtonText}>Manage employees</Text>
            </Pressable>
          </Link>
        </>
      ) : (
        <>
          <Text style={scStyles.emptyText}>Employee</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {employees.map((emp) => (
              <Pressable
                key={emp.id}
                style={[
                  styles.actionBtn,
                  selectedEmployeeId === emp.id && styles.badgeAccent,
                  { marginBottom: 0, paddingVertical: 10 },
                ]}
                onPress={() => setSelectedEmployeeId(emp.id)}
              >
                <Text style={scStyles.menuButtonText}>{employeeDisplayName(emp)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[scStyles.emptyText, { marginTop: 8 }]}>Job (optional)</Text>
          <Pressable
            style={[styles.actionBtn, !selectedJobId && styles.badgeAccent, { marginBottom: 6 }]}
            onPress={() => setSelectedJobId(null)}
          >
            <Text style={scStyles.menuButtonText}>No job</Text>
          </Pressable>
          {jobs.map((job) => (
            <Pressable
              key={job.id}
              style={[
                styles.actionBtn,
                selectedJobId === job.id && styles.badgeAccent,
                { marginBottom: 6 },
              ]}
              onPress={() => setSelectedJobId(job.id)}
            >
              <Text style={scStyles.menuButtonText}>{jobLabel(job.id)}</Text>
            </Pressable>
          ))}

          <Pressable
            style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, { marginTop: 8 }]}
            onPress={onClockIn}
          >
            <Text style={scStyles.primaryCtaText}>Clock in now</Text>
          </Pressable>
        </>
      )}

      <Text style={scStyles.sectionLabel}>Currently clocked in</Text>
      {activeEntries.length === 0 ? (
        <Text style={scStyles.emptyText}>Nobody is on the clock.</Text>
      ) : (
        activeEntries.map((entry) => {
          const emp = employeeMap.get(entry.employeeId);
          const elapsed = formatDurationShort(entryDurationMs(entry));
          return (
            <View key={entry.id} style={scStyles.card}>
              <Text style={scStyles.cardTitle}>{emp ? employeeDisplayName(emp) : "Employee"}</Text>
              <Text style={scStyles.cardMeta}>
                {jobLabel(entry.jobId)} · {elapsed}
              </Text>
              <ClockLocationRow label="Clock-in" location={entry.clockInLocation} />
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 8 }]}
                onPress={() => onClockOut(entry.employeeId)}
              >
                <Text style={scStyles.menuButtonText}>Clock out</Text>
              </Pressable>
            </View>
          );
        })
      )}

      <Text style={scStyles.sectionLabel}>Recent verification punches</Text>
      <AdminClockHistoryList
        events={verificationEvents}
        employees={employees}
        pendingCount={pendingSync}
        onSync={() => {
          void syncPendingClockEvents().then(refresh);
        }}
      />

      <Link href={"/settings/clock-verification" as Href} asChild>
        <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}>
          <Text style={scStyles.menuButtonText}>Clock verification settings</Text>
        </Pressable>
      </Link>
      <Link href={"/settings/my-crew" as Href} asChild>
        <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}>
          <Text style={scStyles.menuButtonText}>Crew pay rates (My crew settings)</Text>
        </Pressable>
      </Link>
    </ScStickyScroll>
  );
}
