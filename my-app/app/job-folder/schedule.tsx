import { Link, Redirect, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ScheduleAssignmentModal } from "@/components/scheduling/ScheduleAssignmentModal";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { employeeDisplayName, listEmployees } from "@/lib/employees/employeeStorage";
import { formatPayRate } from "@/lib/employees/format";
import type { Employee } from "@/lib/employees/types";
import { isBossJobActive, loadBossJobs, updateBossJob } from "@/lib/bossMan/jobStorage";
import {
  addDays,
  dayKeyFromDate,
  daysInRange,
  formatDayLabel,
  formatTime12h,
  parseDayKey,
  startOfToday,
  weekStartSunday,
} from "@/lib/bossMan/scheduling/dateUtils";
import {
  assignedJobIdForEmployeeOnDay,
  assignmentsForDay,
  loadEmployeeDayAvailability,
  loadScheduleAssignments,
  setEmployeeAvailabilityForDay,
} from "@/lib/bossMan/scheduling/scheduleStorage";
import type {
  EmployeeAvailabilityStatus,
  ScheduleAssignment,
} from "@/lib/bossMan/scheduling/types";
import {
  EMPLOYEE_AVAILABILITY_LABELS,
  SCHEDULE_ASSIGNMENT_STATUSES,
} from "@/lib/bossMan/scheduling/types";
import type { BossJob } from "@/lib/bossMan/types";
import { isEmployeeSessionActive, loadEmployeeSession } from "@/lib/employeeSession";
import { isProTier, canAccessCrewTools } from "@/lib/subscriptionGating";

type HubTab = "jobs" | "employees" | "schedule";
type ScheduleView = "daily" | "weekly" | "four_week";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AVAILABILITY_OPTIONS: EmployeeAvailabilityStatus[] = [
  "available",
  "unavailable",
  "off",
  "sick",
  "vacation",
];

export default function ScheduleDispatchScreen() {
  const { jobId: scheduleJobIdParam } = useLocalSearchParams<{ jobId?: string }>();
  const { activeTier } = useSubscription();
  const { scStyles, styles } = useBossManChrome();
  const openedScheduleFromParam = useRef(false);

  const [hubTab, setHubTab] = useState<HubTab>("schedule");
  const [scheduleView, setScheduleView] = useState<ScheduleView>("weekly");
  const [selectedDay, setSelectedDay] = useState(() => dayKeyFromDate(startOfToday()));

  const [jobs, setJobs] = useState<BossJob[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [dayAssignments, setDayAssignments] = useState<ScheduleAssignment[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ScheduleAssignment | null>(null);
  const [presetJobId, setPresetJobId] = useState<string | null>(null);
  const [presetEmployeeIds, setPresetEmployeeIds] = useState<string[]>([]);

  const [selectedJobForAssign, setSelectedJobForAssign] = useState<string | null>(null);
  const [employeeAvailDay, setEmployeeAvailDay] = useState(() => dayKeyFromDate(startOfToday()));
  const [availabilityByKey, setAvailabilityByKey] = useState<Record<string, EmployeeAvailabilityStatus>>({});
  const [employeeMode, setEmployeeMode] = useState(false);

  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const fourWeekDays = useMemo(() => daysInRange(startOfToday(), 28), []);
  const weekDays = useMemo(() => {
    const start = weekStartSunday(parseDayKey(selectedDay) ?? startOfToday());
    return daysInRange(start, 7);
  }, [selectedDay]);

  const refresh = useCallback(() => {
    void Promise.all([
      loadBossJobs(),
      listEmployees("current"),
      loadScheduleAssignments(),
      assignmentsForDay(selectedDay),
      loadEmployeeDayAvailability(),
      isEmployeeSessionActive(),
      loadEmployeeSession(),
    ]).then(([allJobs, emps, allAssignments, forDay, availRows, empMode, empSession]) => {
      setEmployeeMode(empMode);
      setJobs(allJobs.filter(isBossJobActive));
      setEmployees(emps);
      const scopedAssignments =
        empMode && empSession.employeeId
          ? allAssignments.filter((row) => row.employeeIds.includes(empSession.employeeId!))
          : allAssignments;
      setAssignments(scopedAssignments);
      const scopedDay =
        empMode && empSession.employeeId
          ? forDay.filter((row) => row.employeeIds.includes(empSession.employeeId!))
          : forDay;
      setDayAssignments(scopedDay);
      const map: Record<string, EmployeeAvailabilityStatus> = {};
      for (const row of availRows) {
        map[`${row.employeeId}::${row.date}`] = row.status;
      }
      setAvailabilityByKey(map);
    });
  }, [selectedDay]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    void assignmentsForDay(selectedDay).then(setDayAssignments);
  }, [selectedDay, assignments]);

  const openNewAssignment = (opts?: {
    jobId?: string;
    date?: string;
    employeeIds?: string[];
  }) => {
    setEditingAssignment(null);
    setPresetJobId(opts?.jobId ?? selectedJobForAssign ?? null);
    setPresetEmployeeIds(opts?.employeeIds ?? []);
    if (opts?.date) setSelectedDay(opts.date);
    setModalOpen(true);
  };

  useEffect(() => {
    if (employeeMode) return;
    const jobId =
      typeof scheduleJobIdParam === "string" ? scheduleJobIdParam.trim() : "";
    if (!jobId || openedScheduleFromParam.current || jobs.length === 0) return;
    const exists = jobs.some((j) => j.id === jobId);
    if (!exists) return;
    openedScheduleFromParam.current = true;
    openNewAssignment({ jobId });
  }, [employeeMode, scheduleJobIdParam, jobs]);

  const openEditAssignment = (row: ScheduleAssignment) => {
    setEditingAssignment(row);
    setPresetJobId(null);
    setPresetEmployeeIds([]);
    setModalOpen(true);
  };

  const jobNotesPreview = (job: BossJob) => {
    const last = job.notes[job.notes.length - 1];
    return last?.text?.trim() || "—";
  };

  const patchJobScheduling = (job: BossJob, patch: Partial<BossJob>) => {
    void updateBossJob(job.id, patch).then((updated) => {
      if (updated) {
        setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
      }
    });
  };

  const onSetEmployeeAvailability = (employeeId: string, status: EmployeeAvailabilityStatus) => {
    void setEmployeeAvailabilityForDay(employeeId, employeeAvailDay, status).then(refresh);
  };

  if (!isProTier(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  const crewAllowed = canAccessCrewTools(activeTier);

  const hubTabs: { key: HubTab; label: string }[] = [
    { key: "jobs", label: "Jobs" },
    { key: "employees", label: "Employees" },
    { key: "schedule", label: "Schedule" },
  ];

  const scheduleViews: { key: ScheduleView; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "four_week", label: "4 weeks" },
  ];

  const renderSegmented = <T extends string>(
    options: { key: T; label: string }[],
    value: T,
    onChange: (k: T) => void,
  ) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          onPress={() => onChange(opt.key)}
          style={[styles.badge, value === opt.key && styles.badgeAccent, { paddingHorizontal: 14, paddingVertical: 10 }]}
        >
          <Text style={scStyles.cardMeta}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const assignmentCard = (row: ScheduleAssignment) => {
    const job = jobMap.get(row.jobId);
    const crew = row.employeeIds
      .map((id) => employeeMap.get(id))
      .filter(Boolean)
      .map((e) => employeeDisplayName(e!))
      .join(", ");
    return (
      <Pressable
        key={row.id}
        onPress={() => {
          if (!employeeMode) openEditAssignment(row);
        }}
        style={({ pressed }) => [scStyles.card, pressed && !employeeMode && { opacity: 0.9 }, { marginBottom: 10, gap: 4 }]}
      >
        <Text style={scStyles.cardTitle}>
          {job?.jobName.trim() || job?.customerName.trim() || "Job"} · {formatTime12h(row.startTime)}
        </Text>
        <Text style={scStyles.cardMeta}>
          {formatDayLabel(row.date)} · {row.status} · {crew || "No crew"}
        </Text>
        {row.notes?.trim() ? <Text style={scStyles.cardMeta} numberOfLines={2}>{row.notes}</Text> : null}
      </Pressable>
    );
  };

  return (
    <>
      <ScStickyScroll
        backHref={employeeMode ? "/employee" : "/job-folder/hub/employees"}
        title={employeeMode ? "My schedule" : "Schedule Dispatch"}
        subtitle={
          employeeMode
            ? "Your assigned shifts — read only."
            : "Direct crews, assign jobs, and dispatch by text, email, or share."
        }
      >
        {!employeeMode && crewAllowed ? (
          <Link href={"/job-folder/crew/dispatch" as Href} asChild>
            <Pressable style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.9 }, { marginBottom: 14 }]}>
              <Text style={scStyles.menuButtonText}>Dispatch board</Text>
              <Text style={scStyles.subtitle}>Available, assigned, emergency, and completed today</Text>
            </Pressable>
          </Link>
        ) : null}

        {!employeeMode ? renderSegmented(hubTabs, hubTab, setHubTab) : null}

        {!employeeMode && hubTab === "jobs" ? (
          <>
            <Pressable
              style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, { marginBottom: 12 }]}
              onPress={() => openNewAssignment()}
            >
              <Text style={scStyles.primaryCtaText}>+ New assignment</Text>
            </Pressable>
            {jobs.length === 0 ? (
              <Text style={scStyles.emptyText}>No active jobs. Create one from Current Jobs.</Text>
            ) : (
              jobs.map((job) => (
                <Pressable
                  key={job.id}
                  onPress={() => setSelectedJobForAssign(job.id)}
                  style={({ pressed }) => [
                    scStyles.card,
                    pressed && { opacity: 0.9 },
                    selectedJobForAssign === job.id && styles.badgeAccent,
                    { marginBottom: 12, gap: 6 },
                  ]}
                >
                  <Text style={scStyles.cardTitle}>{job.jobName.trim() || "Untitled job"}</Text>
                  <Text style={scStyles.cardMeta}>{job.customerName.trim() || "Customer"}</Text>
                  <Text style={scStyles.cardMeta}>{job.address.trim() || "No address"}</Text>
                  <Text style={scStyles.cardMeta}>Status: {job.status}</Text>
                  <Text style={scStyles.cardMeta}>
                    Est. start: {job.estimatedStartDate ? formatDayLabel(job.estimatedStartDate) : "—"}
                  </Text>
                  <Text style={scStyles.cardMeta}>
                    Crew needed: {job.crewSizeNeeded != null ? String(job.crewSizeNeeded) : "—"}
                  </Text>
                  <Text style={scStyles.cardMeta} numberOfLines={2}>
                    Notes: {jobNotesPreview(job)}
                  </Text>
                  <VoiceTextInput
                    style={{
                      borderBottomWidth: 1,
                      borderColor: "#888888",
                      paddingVertical: 6,
                      color: "#fff",
                      marginTop: 4,
                    }}
                    value={job.estimatedStartDate ?? ""}
                    onChangeText={(val) =>
                      patchJobScheduling(job, { estimatedStartDate: val.trim() || undefined })
                    }
                    placeholder="YYYY-MM-DD est. start"
                    placeholderTextColor="#888888"
                  />
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { flex: 1, minWidth: 120 }]}
                      onPress={() => {
                        const next = (job.crewSizeNeeded ?? 1) + 1;
                        patchJobScheduling(job, { crewSizeNeeded: next > 12 ? 1 : next });
                      }}
                    >
                      <Text style={scStyles.menuButtonText}>
                        Crew: {job.crewSizeNeeded ?? "—"} (tap +1)
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { flex: 1, minWidth: 120 }]}
                      onPress={() => openNewAssignment({ jobId: job.id, date: selectedDay })}
                    >
                      <Text style={scStyles.menuButtonText}>Assign crew</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))
            )}
          </>
        ) : null}

        {!employeeMode && hubTab === "employees" ? (
          <>
            <Text style={scStyles.sectionLabel}>Availability for day</Text>
            <ScrollDayPicker days={fourWeekDays.slice(0, 14)} selected={employeeAvailDay} onSelect={setEmployeeAvailDay} />
            {employees.length === 0 ? (
              <Text style={scStyles.emptyText}>Add crew under Settings → My crew.</Text>
            ) : (
              employees.map((emp) => {
                const assignedJobId = assignedJobIdForEmployeeOnDay(assignments, emp.id, employeeAvailDay);
                const assignedJob = assignedJobId ? jobMap.get(assignedJobId) : undefined;
                const availKey = `${emp.id}::${employeeAvailDay}`;
                const availStatus = availabilityByKey[availKey] ?? "available";
                return (
                  <View key={emp.id} style={[scStyles.card, { marginBottom: 12, gap: 6 }]}>
                    <Text style={scStyles.cardTitle}>{employeeDisplayName(emp)}</Text>
                    <Text style={scStyles.cardMeta}>{emp.jobTitle?.trim() || "Crew"}</Text>
                    <Text style={scStyles.cardMeta}>
                      Availability: {EMPLOYEE_AVAILABILITY_LABELS[availStatus]}
                    </Text>
                    <Text style={scStyles.cardMeta}>{emp.phone?.trim() || "No phone"}</Text>
                    <Text style={scStyles.cardMeta}>{formatPayRate(emp.payRate, emp.payType)}</Text>
                    <Text style={scStyles.cardMeta}>
                      Today&apos;s job:{" "}
                      {assignedJob
                        ? assignedJob.jobName.trim() || assignedJob.customerName
                        : "Unassigned"}
                    </Text>
                    <Text style={scStyles.sectionLabel}>Status</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {AVAILABILITY_OPTIONS.map((st) => (
                        <Pressable
                          key={st}
                          onPress={() => onSetEmployeeAvailability(emp.id, st)}
                          style={[styles.badge, { padding: 8 }]}
                        >
                          <Text style={scStyles.cardMeta}>{EMPLOYEE_AVAILABILITY_LABELS[st]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
                      onPress={() =>
                        openNewAssignment({
                          employeeIds: [emp.id],
                          date: employeeAvailDay,
                          jobId: selectedJobForAssign ?? undefined,
                        })
                      }
                    >
                      <Text style={scStyles.menuButtonText}>Assign to job</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </>
        ) : null}

        {employeeMode || hubTab === "schedule" ? (
          <>
            {renderSegmented(scheduleViews, scheduleView, setScheduleView)}
            {!employeeMode ? (
              <Pressable
                style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, { marginBottom: 12 }]}
                onPress={() => openNewAssignment({ date: selectedDay, jobId: selectedJobForAssign ?? undefined })}
              >
                <Text style={scStyles.primaryCtaText}>+ Assignment on {formatDayLabel(selectedDay)}</Text>
              </Pressable>
            ) : null}

            {scheduleView === "daily" ? (
              <>
                <ScrollDayPicker
                  days={fourWeekDays}
                  selected={selectedDay}
                  onSelect={setSelectedDay}
                  onDayPress={
                    employeeMode
                      ? undefined
                      : (dayKey) =>
                          openNewAssignment({
                            date: dayKey,
                            jobId: selectedJobForAssign ?? undefined,
                          })
                  }
                />
                {dayAssignments.length === 0 ? (
                  <Text style={scStyles.emptyText}>No assignments this day.</Text>
                ) : (
                  dayAssignments.map(assignmentCard)
                )}
              </>
            ) : null}

            {scheduleView === "weekly" ? (
              <>
                <View style={{ flexDirection: "row", marginBottom: 10 }}>
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { flex: 1 }]}
                    onPress={() => {
                      const d = parseDayKey(selectedDay) ?? startOfToday();
                      setSelectedDay(dayKeyFromDate(addDays(d, -7)));
                    }}
                  >
                    <Text style={scStyles.menuButtonText}>← Prev week</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { flex: 1, marginLeft: 8 }]}
                    onPress={() => {
                      const d = parseDayKey(selectedDay) ?? startOfToday();
                      setSelectedDay(dayKeyFromDate(addDays(d, 7)));
                    }}
                  >
                    <Text style={scStyles.menuButtonText}>Next week →</Text>
                  </Pressable>
                </View>
                {weekDays.map((dayKey) => {
                  const count = assignments.filter((a) => a.date === dayKey && a.status !== "Cancelled").length;
                  const dow = parseDayKey(dayKey)?.getDay() ?? 0;
                  const hasAssignments = count > 0;
                  return (
                    <Pressable
                      key={dayKey}
                      onPress={
                        employeeMode
                          ? () => setSelectedDay(dayKey)
                          : () =>
                              openNewAssignment({
                                date: dayKey,
                                jobId: selectedJobForAssign ?? undefined,
                              })
                      }
                      style={({ pressed }) => [
                        scStyles.card,
                        pressed && { opacity: 0.9 },
                        selectedDay === dayKey && styles.badgeAccent,
                        hasAssignments && selectedDay !== dayKey && { borderWidth: 1, borderColor: "#888888" },
                        { marginBottom: 8, flexDirection: "row", justifyContent: "space-between" },
                      ]}
                    >
                      <Text style={scStyles.cardTitle}>
                        {WEEKDAY_LABELS[dow]} · {formatDayLabel(dayKey)}
                      </Text>
                      <Text style={scStyles.cardMeta}>{count} assignment{count === 1 ? "" : "s"}</Text>
                    </Pressable>
                  );
                })}
                <Text style={[scStyles.sectionLabel, { marginTop: 12 }]}>
                  {formatDayLabel(selectedDay)}
                </Text>
                {dayAssignments.length === 0 ? (
                  <Text style={scStyles.emptyText}>Tap a day above to add an assignment.</Text>
                ) : (
                  dayAssignments.map(assignmentCard)
                )}
              </>
            ) : null}

            {scheduleView === "four_week" ? (
              <>
                <ScrollDayPicker
                  days={fourWeekDays}
                  selected={selectedDay}
                  onSelect={setSelectedDay}
                  onDayPress={(dayKey) =>
                    openNewAssignment({
                      date: dayKey,
                      jobId: selectedJobForAssign ?? undefined,
                    })
                  }
                />
                {fourWeekDays.map((dayKey) => {
                  const dayRows = assignments.filter(
                    (a) => a.date === dayKey && a.status !== "Cancelled",
                  );
                  if (dayRows.length === 0) return null;
                  return (
                    <View key={dayKey} style={{ marginBottom: 14 }}>
                      <Text style={scStyles.sectionLabel}>{formatDayLabel(dayKey)}</Text>
                      {dayRows.map(assignmentCard)}
                    </View>
                  );
                })}
                {assignments.filter((a) => a.status !== "Cancelled").length === 0 ? (
                  <Text style={scStyles.emptyText}>No assignments in the next 4 weeks.</Text>
                ) : null}
              </>
            ) : null}

            <Text style={[scStyles.cardMeta, { marginTop: 8 }]}>
              Statuses: {SCHEDULE_ASSIGNMENT_STATUSES.join(", ")}
            </Text>
          </>
        ) : null}
      </ScStickyScroll>

      {!employeeMode ? (
        <ScheduleAssignmentModal
          visible={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={refresh}
          jobs={jobs}
          employees={employees}
          assignments={assignments}
          initial={editingAssignment}
          presetJobId={presetJobId}
          presetDate={selectedDay}
          presetEmployeeIds={presetEmployeeIds}
        />
      ) : null}
    </>
  );
}

function ScrollDayPicker({
  days,
  selected,
  onSelect,
  onDayPress,
}: {
  days: string[];
  selected: string;
  onSelect: (key: string) => void;
  /** When set (Schedule tab), tap opens new-assignment flow for that day. */
  onDayPress?: (key: string) => void;
}) {
  const { scStyles, styles } = useBossManChrome();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {days.map((dayKey) => (
        <Pressable
          key={dayKey}
          onPress={() => {
            onSelect(dayKey);
            onDayPress?.(dayKey);
          }}
          style={({ pressed }) => [
            styles.badge,
            selected === dayKey && styles.badgeAccent,
            onDayPress && pressed && { opacity: 0.85 },
            { paddingHorizontal: 10, paddingVertical: 8 },
          ]}
        >
          <Text style={scStyles.cardMeta}>{formatDayLabel(dayKey)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
