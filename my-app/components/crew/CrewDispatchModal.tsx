import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { AppConstructionBackdrop } from "@/components/AppConstructionBackdrop";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { appendCrewActivity } from "@/lib/crew/activityLog";
import { queueLocalDispatchNotification } from "@/lib/crew/dispatchStorage";
import { employeeDisplayName } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";
import {
  buildDispatchMessage,
  dispatchWithContactCheck,
} from "@/lib/bossMan/scheduling/dispatchShare";
import {
  defaultEndTime,
  defaultStartTime,
  dayKeyFromDate,
  startOfToday,
} from "@/lib/bossMan/scheduling/dateUtils";
import { upsertScheduleAssignment } from "@/lib/bossMan/scheduling/scheduleStorage";
import type { ScheduleAssignmentPriority } from "@/lib/bossMan/scheduling/types";
import { SCHEDULE_PRIORITY_LABELS } from "@/lib/bossMan/scheduling/types";
import type { BossJob } from "@/lib/bossMan/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  jobs: BossJob[];
  employees: Employee[];
  presetEmployeeIds?: string[];
  presetJobId?: string | null;
};

export function CrewDispatchModal({
  visible,
  onClose,
  onSaved,
  jobs,
  employees,
  presetEmployeeIds = [],
  presetJobId = null,
}: Props) {
  const { colors } = useAppTheme();
  const { scStyles, styles } = useBossManChrome();
  const fieldStyle = useMemo(() => inputStyle(colors), [colors]);
  const placeholder = placeholderTextColor(colors);

  const [jobId, setJobId] = useState("");
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [date, setDate] = useState(() => dayKeyFromToday());
  const [startTime, setStartTime] = useState(defaultStartTime());
  const [notes, setNotes] = useState("");
  const [materialsNotes, setMaterialsNotes] = useState("");
  const [priority, setPriority] = useState<ScheduleAssignmentPriority>("normal");
  const [saving, setSaving] = useState(false);

  function dayKeyFromToday() {
    return dayKeyFromDate(startOfToday());
  }

  const selectedJob = useMemo(() => jobs.find((j) => j.id === jobId) ?? null, [jobs, jobId]);

  const resetForm = useCallback(() => {
    setJobId(presetJobId ?? jobs[0]?.id ?? "");
    setEmployeeIds(presetEmployeeIds);
    setDate(dayKeyFromToday());
    setStartTime(defaultStartTime());
    setNotes("");
    setMaterialsNotes("");
    setPriority("normal");
  }, [jobs, presetEmployeeIds, presetJobId]);

  useEffect(() => {
    if (visible) resetForm();
  }, [visible, resetForm]);

  const toggleEmployee = (id: string) => {
    setEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const openMaps = () => {
    const addr = selectedJob?.address?.trim();
    if (!addr) {
      Alert.alert("No address", "Select a job with an address first.");
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    void Linking.openURL(url);
  };

  const onSend = async (channel: "sms" | "email" | "share") => {
    if (!jobId) {
      Alert.alert("Select job", "Choose a job to dispatch.");
      return;
    }
    if (employeeIds.length === 0) {
      Alert.alert("Select crew", "Pick at least one employee.");
      return;
    }
    setSaving(true);
    try {
      const assignment = await upsertScheduleAssignment({
        date,
        startTime,
        endTime: defaultEndTime(),
        jobId,
        employeeIds,
        notes,
        materialsNotes,
        priority,
        status: "Scheduled",
      });
      const job = jobs.find((j) => j.id === jobId)!;
      const crew = employees.filter((e) => employeeIds.includes(e.id));
      await dispatchWithContactCheck(assignment.id, channel, (contact) =>
        buildDispatchMessage(assignment, job, crew, contact),
      );
      for (const empId of employeeIds) {
        await queueLocalDispatchNotification({
          employeeId: empId,
          assignmentId: assignment.id,
          title: "New job assignment",
          body: `${job.jobName || job.customerName || "Job"} — ${date} ${startTime}`,
        });
      }
      await appendCrewActivity({
        type: "dispatch_sent",
        message: `Dispatched ${crew.map(employeeDisplayName).join(", ")} to ${job.jobName || job.customerName || "job"}`,
        assignmentId: assignment.id,
        jobId,
        employeeId: employeeIds[0],
      });
      onSaved();
      onClose();
    } catch (e) {
      Alert.alert("Dispatch failed", e instanceof Error ? e.message : "Could not send dispatch.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}>
        <AppConstructionBackdrop />
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              maxHeight: "92%",
              backgroundColor: "rgba(20,24,32,0.96)",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 16,
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[scStyles.title, { marginBottom: 4 }]}>Dispatch crew</Text>
              <Text style={[scStyles.subtitle, { marginBottom: 12 }]}>
                Assign and send job details to the field.
              </Text>

              <Text style={scStyles.subtitle}>Job</Text>
              {jobs.map((j) => (
                <Pressable
                  key={j.id}
                  style={[styles.navRow, jobId === j.id && styles.badgeAccent]}
                  onPress={() => setJobId(j.id)}
                >
                  <Text style={scStyles.menuButtonText}>
                    {j.jobName.trim() || j.customerName.trim() || "Untitled job"}
                  </Text>
                  {j.address.trim() ? (
                    <Text style={scStyles.subtitle} numberOfLines={1}>
                      {j.address.trim()}
                    </Text>
                  ) : null}
                </Pressable>
              ))}

              {selectedJob ? (
                <View style={{ marginVertical: 8 }}>
                  <Text style={scStyles.subtitle}>
                    Customer: {selectedJob.customerName.trim() || "—"}
                  </Text>
                  <Pressable style={styles.actionBtn} onPress={openMaps}>
                    <Text style={scStyles.menuButtonText}>Open in Maps</Text>
                  </Pressable>
                </View>
              ) : null}

              <Text style={scStyles.subtitle}>Crew</Text>
              {employees.map((e) => (
                <Pressable
                  key={e.id}
                  style={[styles.navRow, employeeIds.includes(e.id) && styles.badgeAccent]}
                  onPress={() => toggleEmployee(e.id)}
                >
                  <Text style={scStyles.menuButtonText}>{employeeDisplayName(e)}</Text>
                </Pressable>
              ))}

              <Text style={scStyles.subtitle}>Date (YYYY-MM-DD)</Text>
              <VoiceTextInput
                style={fieldStyle}
                value={date}
                onChangeText={setDate}
                placeholderTextColor={placeholder}
              />
              <Text style={scStyles.subtitle}>Start time (HH:mm)</Text>
              <VoiceTextInput
                style={fieldStyle}
                value={startTime}
                onChangeText={setStartTime}
                placeholderTextColor={placeholder}
              />
              <Text style={scStyles.subtitle}>Notes</Text>
              <VoiceTextInput
                style={[fieldStyle, { minHeight: 72 }]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholderTextColor={placeholder}
              />
              <Text style={scStyles.subtitle}>Materials / tools</Text>
              <VoiceTextInput
                style={[fieldStyle, { minHeight: 56 }]}
                value={materialsNotes}
                onChangeText={setMaterialsNotes}
                multiline
                placeholderTextColor={placeholder}
              />

              <Text style={scStyles.subtitle}>Priority</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {(Object.keys(SCHEDULE_PRIORITY_LABELS) as ScheduleAssignmentPriority[]).map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.actionBtn, priority === p && styles.badgeAccent, { flex: 1 }]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={scStyles.menuButtonText}>{SCHEDULE_PRIORITY_LABELS[p]}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.actionBtn, saving && { opacity: 0.6 }]}
                disabled={saving}
                onPress={() => void onSend("sms")}
              >
                <Text style={scStyles.menuButtonText}>Send dispatch (text)</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                disabled={saving}
                onPress={() => void onSend("email")}
              >
                <Text style={scStyles.menuButtonText}>Send by email</Text>
              </Pressable>
              <Pressable style={styles.navRow} onPress={onClose}>
                <Text style={scStyles.menuButtonText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}
