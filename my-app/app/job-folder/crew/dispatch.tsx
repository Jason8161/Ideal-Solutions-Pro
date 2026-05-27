import { Redirect, useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { CrewDispatchModal } from "@/components/crew/CrewDispatchModal";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { dayKeyFromDate, formatTime12h, startOfToday } from "@/lib/bossMan/scheduling/dateUtils";
import {
  loadEmployeeDayAvailability,
  loadScheduleAssignments,
} from "@/lib/bossMan/scheduling/scheduleStorage";
import { isBossJobActive, loadBossJobs } from "@/lib/bossMan/jobStorage";
import type { BossJob } from "@/lib/bossMan/types";
import { getEmergencyEmployeeIdsForDay } from "@/lib/crew/dispatchStorage";
import { resolveEmployeeDispatchStatus } from "@/lib/crew/dispatchStatus";
import { employeeDisplayName, listEmployees } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";
import type { ScheduleAssignment } from "@/lib/bossMan/scheduling/types";
import { isProTier } from "@/lib/subscriptionGating";

type BoardColumn = "available" | "assigned" | "emergency" | "completed";

export default function CrewDispatchBoardScreen() {
  const { activeTier } = useSubscription();
  const { scStyles, styles } = useBossManChrome();
  const router = useRouter();
  const dayKey = dayKeyFromDate(startOfToday());

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<BossJob[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [availability, setAvailability] = useState<
    Awaited<ReturnType<typeof loadEmployeeDayAvailability>>
  >([]);
  const [emergencyIds, setEmergencyIds] = useState<Set<string>>(new Set());
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [presetEmployeeIds, setPresetEmployeeIds] = useState<string[]>([]);
  const [presetJobId, setPresetJobId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void Promise.all([
      listEmployees("current"),
      loadBossJobs(),
      loadScheduleAssignments(),
      loadEmployeeDayAvailability(),
      getEmergencyEmployeeIdsForDay(dayKey),
    ]).then(([emps, allJobs, allAssignments, avail, emerg]) => {
      setEmployees(emps);
      setJobs(allJobs.filter(isBossJobActive));
      setAssignments(allAssignments.filter((a) => a.date === dayKey));
      setAvailability(avail);
      setEmergencyIds(emerg);
    });
  }, [dayKey]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  const availableEmployees = useMemo(
    () =>
      employees.filter(
        (e) =>
          resolveEmployeeDispatchStatus({
            employeeId: e.id,
            dayKey,
            assignments,
            availability,
            emergencyIds,
          }) === "available",
      ),
    [employees, dayKey, assignments, availability, emergencyIds],
  );

  const assignedRows = useMemo(
    () =>
      assignments.filter(
        (a) => a.status !== "Cancelled" && a.status !== "Completed" && a.employeeIds.length > 0,
      ),
    [assignments],
  );

  const emergencyRows = useMemo(() => {
    const urgent = assignments.filter((a) => a.priority === "urgent" && a.status !== "Cancelled");
    const flagged = employees.filter((e) => emergencyIds.has(e.id));
    return { urgent, flagged };
  }, [assignments, employees, emergencyIds]);

  const completedRows = useMemo(
    () => assignments.filter((a) => a.status === "Completed"),
    [assignments],
  );

  if (!isProTier(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  const tapAssignEmployee = (employeeId: string) => {
    setPresetEmployeeIds([employeeId]);
    setPresetJobId(null);
    setDispatchOpen(true);
  };

  const tapAssignJob = (jobId: string) => {
    setPresetJobId(jobId);
    setPresetEmployeeIds([]);
    setDispatchOpen(true);
  };

  const renderSection = (title: string, column: BoardColumn, body: ReactNode) => (
    <View key={column} style={{ marginBottom: 16 }}>
      <Text style={[scStyles.subtitle, { fontWeight: "900", marginBottom: 8 }]}>{title}</Text>
      {body}
    </View>
  );

  return (
    <>
      <ScStickyScroll
        backHref="/job-folder/schedule"
        title="Dispatch board"
        subtitle="Tap an available tech or open job to assign. Drag-and-drop coming later."
      >
        {renderSection(
          "Available",
          "available",
          availableEmployees.length === 0 ? (
            <Text style={scStyles.subtitle}>No available techs right now.</Text>
          ) : (
            availableEmployees.map((e) => (
              <Pressable
                key={e.id}
                style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.9 }]}
                onPress={() => tapAssignEmployee(e.id)}
              >
                <Text style={scStyles.menuButtonText}>{employeeDisplayName(e)}</Text>
                <Text style={scStyles.subtitle}>Tap to dispatch</Text>
              </Pressable>
            ))
          ),
        )}

        {renderSection(
          "Assigned jobs",
          "assigned",
          assignedRows.length === 0 ? (
            <Text style={scStyles.subtitle}>Nothing assigned for today.</Text>
          ) : (
            assignedRows.map((a) => {
              const job = jobMap.get(a.jobId);
              const crew = employees
                .filter((e) => a.employeeIds.includes(e.id))
                .map(employeeDisplayName)
                .join(", ");
              return (
                <Pressable
                  key={a.id}
                  style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.9 }]}
                  onPress={() => tapAssignJob(a.jobId)}
                >
                  <Text style={scStyles.menuButtonText}>
                    {job?.jobName.trim() || job?.customerName.trim() || "Job"} ·{" "}
                    {formatTime12h(a.startTime)}
                  </Text>
                  <Text style={scStyles.subtitle}>{crew || "Unassigned crew"}</Text>
                </Pressable>
              );
            })
          ),
        )}

        {renderSection(
          "Emergency",
          "emergency",
          emergencyRows.urgent.length === 0 && emergencyRows.flagged.length === 0 ? (
            <Text style={scStyles.subtitle}>No emergency calls (placeholder 0).</Text>
          ) : (
            <>
              {emergencyRows.flagged.map((e) => (
                <View key={e.id} style={styles.navRow}>
                  <Text style={scStyles.menuButtonText}>{employeeDisplayName(e)} — flagged</Text>
                </View>
              ))}
              {emergencyRows.urgent.map((a) => {
                const job = jobMap.get(a.jobId);
                return (
                  <Pressable
                    key={a.id}
                    style={styles.navRow}
                    onPress={() => router.push(`/job-folder/job/${a.jobId}` as Href)}
                  >
                    <Text style={scStyles.menuButtonText}>
                      URGENT: {job?.jobName.trim() || job?.customerName.trim() || "Job"}
                    </Text>
                  </Pressable>
                );
              })}
            </>
          ),
        )}

        {renderSection(
          "Completed",
          "completed",
          completedRows.length === 0 ? (
            <Text style={scStyles.subtitle}>No completed dispatches today.</Text>
          ) : (
            completedRows.map((a) => {
              const job = jobMap.get(a.jobId);
              return (
                <View key={a.id} style={styles.navRow}>
                  <Text style={scStyles.menuButtonText}>
                    {job?.jobName.trim() || job?.customerName.trim() || "Job"} — done
                  </Text>
                </View>
              );
            })
          ),
        )}

        <Pressable
          style={styles.navRow}
          onPress={() => {
            setPresetEmployeeIds([]);
            setPresetJobId(null);
            setDispatchOpen(true);
          }}
        >
          <Text style={scStyles.menuButtonText}>+ New dispatch</Text>
        </Pressable>
      </ScStickyScroll>

      <CrewDispatchModal
        visible={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        onSaved={refresh}
        jobs={jobs}
        employees={employees}
        presetEmployeeIds={presetEmployeeIds}
        presetJobId={presetJobId}
      />
    </>
  );
}
