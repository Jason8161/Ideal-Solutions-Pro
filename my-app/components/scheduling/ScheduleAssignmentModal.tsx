import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { AppConstructionBackdrop } from "@/components/AppConstructionBackdrop";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { inputStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { employeeDisplayName } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";
import {
  checkScheduleConflicts,
  hasBlockingConflicts,
} from "@/lib/bossMan/scheduling/conflicts";
import {
  defaultEndTime,
  defaultStartTime,
  formatDayLabel,
  isDayInScheduleWindow,
} from "@/lib/bossMan/scheduling/dateUtils";
import {
  dispatchWithContactCheck,
  buildDispatchMessage,
  loadDispatchContact,
} from "@/lib/bossMan/scheduling/dispatchShare";
import {
  deleteScheduleAssignment,
  loadEmployeeDayAvailability,
  upsertScheduleAssignment,
} from "@/lib/bossMan/scheduling/scheduleStorage";
import type {
  ScheduleAssignment,
  ScheduleAssignmentPriority,
  ScheduleAssignmentStatus,
  ScheduleConflict,
} from "@/lib/bossMan/scheduling/types";
import {
  SCHEDULE_ASSIGNMENT_STATUSES,
  SCHEDULE_PRIORITY_LABELS,
} from "@/lib/bossMan/scheduling/types";
import type { BossJob } from "@/lib/bossMan/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  jobs: BossJob[];
  employees: Employee[];
  assignments: ScheduleAssignment[];
  initial?: ScheduleAssignment | null;
  presetJobId?: string | null;
  presetDate?: string | null;
  presetEmployeeIds?: string[];
};

export function ScheduleAssignmentModal({
  visible,
  onClose,
  onSaved,
  jobs,
  employees,
  assignments,
  initial,
  presetJobId,
  presetDate,
  presetEmployeeIds,
}: Props) {
  const { colors } = useAppTheme();
  const { scStyles, styles } = useBossManChrome();
  const fieldStyle = useMemo(() => inputStyle(colors), [colors]);

  const [jobId, setJobId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState(defaultStartTime());
  const [endTime, setEndTime] = useState(defaultEndTime());
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [materialsNotes, setMaterialsNotes] = useState("");
  const [priority, setPriority] = useState<ScheduleAssignmentPriority>("normal");
  const [status, setStatus] = useState<ScheduleAssignmentStatus>("Scheduled");
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    if (initial) {
      setJobId(initial.jobId);
      setDate(initial.date);
      setStartTime(initial.startTime);
      setEndTime(initial.endTime ?? defaultEndTime());
      setEmployeeIds(initial.employeeIds);
      setNotes(initial.notes ?? "");
      setMaterialsNotes(initial.materialsNotes ?? "");
      setPriority(initial.priority);
      setStatus(initial.status);
    } else {
      setJobId(presetJobId ?? jobs[0]?.id ?? "");
      setDate(presetDate ?? "");
      setStartTime(defaultStartTime());
      setEndTime(defaultEndTime());
      setEmployeeIds(presetEmployeeIds ?? []);
      setNotes("");
      setMaterialsNotes("");
      setPriority("normal");
      setStatus("Scheduled");
    }
    setConflicts([]);
  }, [initial, jobs, presetDate, presetEmployeeIds, presetJobId]);

  useEffect(() => {
    if (visible) resetForm();
  }, [visible, resetForm]);

  const job = useMemo(() => jobs.find((j) => j.id === jobId), [jobs, jobId]);

  const runConflictCheck = useCallback(async () => {
    const draft = {
      id: initial?.id ?? "__draft__",
      date: date.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim() || undefined,
      jobId,
      employeeIds,
    };
    const availability = await loadEmployeeDayAvailability();
    const found = await checkScheduleConflicts({
      assignment: draft,
      allAssignments: assignments,
      jobs,
      employees,
      availability,
    });
    setConflicts(found);
    return found;
  }, [assignments, date, employeeIds, employees, endTime, initial?.id, jobId, jobs, startTime]);

  const toggleEmployee = (id: string) => {
    setEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSave = async () => {
    if (!jobId) {
      Alert.alert("Select job", "Choose a job for this assignment.");
      return;
    }
    if (!date.trim() || !isDayInScheduleWindow(date.trim())) {
      Alert.alert("Date", "Enter a date within the next 4 weeks (YYYY-MM-DD).");
      return;
    }
    const found = await runConflictCheck();
    if (hasBlockingConflicts(found)) {
      Alert.alert(
        "Conflicts",
        found.map((c) => c.message).join("\n"),
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save anyway", onPress: () => void persistAssignment() },
        ],
      );
      return;
    }
    if (found.length > 0) {
      Alert.alert("Warnings", found.map((c) => c.message).join("\n"), [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => void persistAssignment() },
      ]);
      return;
    }
    await persistAssignment();
  };

  const persistAssignment = async () => {
    setSaving(true);
    try {
      await upsertScheduleAssignment({
        id: initial?.id,
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim() || undefined,
        jobId,
        employeeIds,
        notes,
        materialsNotes,
        priority,
        status,
      });
      onSaved();
      onClose();
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!initial) return;
    Alert.alert("Delete assignment?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteScheduleAssignment(initial.id).then(() => {
            onSaved();
            onClose();
          });
        },
      },
    ]);
  };

  const onDispatch = (channel: "sms" | "email" | "share") => {
    if (!initial || !job) return;
    void (async () => {
      const contact = await loadDispatchContact();
      if (!contact) {
        Alert.alert("Company profile needed", "Add company info under Settings → User info.");
        return;
      }
      const saved = await upsertScheduleAssignment({
        id: initial.id,
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim() || undefined,
        jobId,
        employeeIds,
        notes,
        materialsNotes,
        priority,
        status,
      });
      const crew = employees.filter((e) => employeeIds.includes(e.id));
      const message = buildDispatchMessage(saved, job, crew, contact);
      await dispatchWithContactCheck(saved.id, channel, () => message);
      onSaved();
    })();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <AppConstructionBackdrop />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
        <Text style={scStyles.cardTitle}>{initial ? "Edit assignment" : "New assignment"}</Text>

        <Text style={scStyles.sectionLabel}>Job</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {jobs.map((j) => (
            <Pressable
              key={j.id}
              onPress={() => setJobId(j.id)}
              style={[
                styles.badge,
                jobId === j.id && styles.badgeAccent,
                { marginRight: 8, paddingHorizontal: 12, paddingVertical: 8 },
              ]}
            >
              <Text style={scStyles.cardMeta}>{j.jobName.trim() || j.customerName.trim() || "Job"}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={scStyles.sectionLabel}>Date (YYYY-MM-DD)</Text>
        <VoiceTextInput
          style={fieldStyle}
          value={date}
          onChangeText={setDate}
          placeholder="2026-05-23"
          placeholderTextColor={colors.textMuted}
        />
        {date ? <Text style={scStyles.cardMeta}>{formatDayLabel(date)}</Text> : null}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={scStyles.sectionLabel}>Start (HH:mm)</Text>
            <VoiceTextInput
              style={fieldStyle}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="08:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={scStyles.sectionLabel}>End (HH:mm)</Text>
            <VoiceTextInput
              style={fieldStyle}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="17:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <Text style={scStyles.sectionLabel}>Crew</Text>
        {employees.length === 0 ? (
          <Text style={scStyles.emptyText}>Add employees under Settings → My crew.</Text>
        ) : (
          employees.map((emp) => {
            const selected = employeeIds.includes(emp.id);
            return (
              <Pressable
                key={emp.id}
                onPress={() => toggleEmployee(emp.id)}
                style={[
                  styles.navRow,
                  selected && styles.badgeAccent,
                  { marginBottom: 8, paddingVertical: 12 },
                ]}
              >
                <Text style={scStyles.menuButtonText}>{employeeDisplayName(emp)}</Text>
                <Text style={scStyles.cardMeta}>{selected ? "Assigned" : "Tap to assign"}</Text>
              </Pressable>
            );
          })
        )}

        <Text style={scStyles.sectionLabel}>Priority</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(Object.keys(SCHEDULE_PRIORITY_LABELS) as ScheduleAssignmentPriority[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPriority(p)}
              style={[styles.badge, priority === p && styles.badgeAccent, { padding: 10 }]}
            >
              <Text style={scStyles.cardMeta}>{SCHEDULE_PRIORITY_LABELS[p]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={scStyles.sectionLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SCHEDULE_ASSIGNMENT_STATUSES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={[
                styles.badge,
                status === s && styles.badgeAccent,
                { marginRight: 8, padding: 10 },
              ]}
            >
              <Text style={scStyles.cardMeta}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={scStyles.sectionLabel}>Notes</Text>
        <VoiceTextInput
          style={[fieldStyle, { minHeight: 72 }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Job notes for crew"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={scStyles.sectionLabel}>Materials / tools</Text>
        <VoiceTextInput
          style={[fieldStyle, { minHeight: 72 }]}
          value={materialsNotes}
          onChangeText={setMaterialsNotes}
          multiline
          placeholder="What to bring"
          placeholderTextColor={colors.textMuted}
        />

        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => void runConflictCheck()}
        >
          <Text style={scStyles.menuButtonText}>Check conflicts</Text>
        </Pressable>

        {conflicts.length > 0 ? (
          <View style={[scStyles.card, { gap: 6 }]}>
            <Text style={scStyles.cardTitle}>Conflicts & warnings</Text>
            {conflicts.map((c, i) => (
              <Text key={`${c.code}-${i}`} style={scStyles.cardMeta}>
                • {c.message}
              </Text>
            ))}
          </View>
        ) : null}

        {initial ? (
          <>
            <Text style={[scStyles.subtitle, { fontWeight: "800", marginTop: 8 }]}>Dispatch</Text>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
              onPress={() => onDispatch("sms")}
            >
              <Text style={scStyles.menuButtonText}>Send by text</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
              onPress={() => onDispatch("email")}
            >
              <Text style={scStyles.menuButtonText}>Send by email</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
              onPress={() => onDispatch("share")}
            >
              <Text style={scStyles.menuButtonText}>Share assignment</Text>
            </Pressable>
          </>
        ) : null}

        <Pressable
          style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, saving && { opacity: 0.6 }]}
          onPress={() => void onSave()}
          disabled={saving}
        >
          <Text style={scStyles.primaryCtaText}>{saving ? "Saving…" : "Save assignment"}</Text>
        </Pressable>

        {initial ? (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
            onPress={onDelete}
          >
            <Text style={[scStyles.menuButtonText, { color: "#f87171" }]}>Delete assignment</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={onClose}
        >
          <Text style={scStyles.menuButtonText}>Cancel</Text>
        </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
