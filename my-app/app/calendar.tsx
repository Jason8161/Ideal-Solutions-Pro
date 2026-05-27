import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CustomerContactPicker } from "@/components/CustomerContactPicker";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { AppConstructionBackdrop } from "@/components/AppConstructionBackdrop";
import { HOME_FALLBACK_HREF, StickyPageHeader, useScStyles } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  cancelAppointmentNotification,
  getNotificationPermission,
  requestNotificationPermission,
  syncAppointmentNotification,
  type NotificationPermissionState,
} from "@/lib/appointmentNotifications";
import { INPUT_ACCENT_FILL_OPACITY } from "@/components/themed/screenChrome";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";
import {
  addAppointment,
  appointmentDayKey,
  appointmentsForDay,
  buildISOFromDayAndTime,
  dayKeyFromDate,
  deleteAppointment,
  daysWithAppointments,
  formatAppointmentDate,
  formatAppointmentTimeRange,
  formatTimeFromISO,
  loadAppointments,
  parseDayKey,
  REMINDER_OPTIONS,
  reminderLabel,
  sameCalendarDay,
  updateAppointment,
  type AppointmentRecord,
} from "@/lib/appointmentStorage";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type FutureHorizon = "2weeks" | "1month" | "3months" | "6months" | "all";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Exclusive upper bound on appointment start (local): events with start < this are included. */
function exclusiveFutureUpperBound(todayStart: Date, h: FutureHorizon): Date | null {
  if (h === "all") return null;
  const u = new Date(todayStart.getTime());
  if (h === "2weeks") {
    u.setDate(u.getDate() + 14);
  } else if (h === "1month") {
    u.setMonth(u.getMonth() + 1);
  } else if (h === "3months") {
    u.setMonth(u.getMonth() + 3);
  } else {
    u.setMonth(u.getMonth() + 6);
  }
  return u;
}

function filterFutureAppointments(rows: AppointmentRecord[], h: FutureHorizon): AppointmentRecord[] {
  const t0 = startOfToday().getTime();
  const upper = exclusiveFutureUpperBound(startOfToday(), h);
  const upperMs = upper?.getTime() ?? null;
  return rows.filter((r) => {
    const t = new Date(r.startISO).getTime();
    if (t < t0) return false;
    if (upperMs === null) return true;
    return t < upperMs;
  });
}

function horizonDisplayLabel(h: FutureHorizon): string {
  switch (h) {
    case "2weeks":
      return "Next 2 weeks";
    case "1month":
      return "Next month";
    case "3months":
      return "Next 3 months";
    case "6months":
      return "Next 6 months";
    default:
      return "All upcoming";
  }
}

type EditorState = {
  id: string | null;
  title: string;
  startTime: string;
  endTime: string;
  notes: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reminderMinutes: number | null;
  dayKey: string;
};

function parseCustomerLinesFromNotes(notes: string): {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
} {
  const lines = notes.split(/\r?\n/);
  let customerName = "";
  let customerPhone = "";
  let customerEmail = "";
  const rest: string[] = [];
  for (const line of lines) {
    const nameMatch = /^Customer:\s*(.+)$/i.exec(line.trim());
    const phoneMatch = /^Phone:\s*(.+)$/i.exec(line.trim());
    const emailMatch = /^Email:\s*(.+)$/i.exec(line.trim());
    if (nameMatch) customerName = nameMatch[1].trim();
    else if (phoneMatch) customerPhone = phoneMatch[1].trim();
    else if (emailMatch) customerEmail = emailMatch[1].trim();
    else rest.push(line);
  }
  return { customerName, customerPhone, customerEmail, notes: rest.join("\n").trim() };
}

function composeAppointmentNotes(editor: EditorState): string {
  const header: string[] = [];
  if (editor.customerName.trim()) header.push(`Customer: ${editor.customerName.trim()}`);
  if (editor.customerPhone.trim()) header.push(`Phone: ${editor.customerPhone.trim()}`);
  if (editor.customerEmail.trim()) header.push(`Email: ${editor.customerEmail.trim()}`);
  const body = editor.notes.trim();
  if (header.length === 0) return body;
  if (!body) return header.join("\n");
  return `${header.join("\n")}\n\n${body}`;
}

function defaultEditor(dayKey: string): EditorState {
  return {
    id: null,
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    notes: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    reminderMinutes: 15,
    dayKey,
  };
}

function editorFromRecord(record: AppointmentRecord): EditorState {
  const parsed = parseCustomerLinesFromNotes(record.notes);
  return {
    id: record.id,
    title: record.title,
    startTime: formatTimeFromISO(record.startISO),
    endTime: formatTimeFromISO(record.endISO),
    notes: parsed.notes,
    customerName: parsed.customerName,
    customerPhone: parsed.customerPhone,
    customerEmail: parsed.customerEmail,
    reminderMinutes: record.reminderMinutesBefore,
    dayKey: appointmentDayKey(record),
  };
}

function monthMatrix(viewMonth: Date): (Date | null)[][] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export default function CalendarScreen() {
  const { colors } = useAppTheme();
  const scStyles = useScStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeholderColor = hexToRgba(colors.text, 0.5);

  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState(() => dayKeyFromDate(today));
  const [allAppointments, setAllAppointments] = useState<AppointmentRecord[]>([]);
  const [dayAppointments, setDayAppointments] = useState<AppointmentRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionState>("undetermined");
  const [futureHorizon, setFutureHorizon] = useState<FutureHorizon | null>(null);

  const markedDays = useMemo(() => daysWithAppointments(allAppointments), [allAppointments]);

  const futureAppointments = useMemo(() => {
    if (!futureHorizon) return [];
    return filterFutureAppointments(allAppointments, futureHorizon);
  }, [allAppointments, futureHorizon]);

  const openFutureHorizonPicker = useCallback(() => {
    const apply = (h: FutureHorizon) => () => setFutureHorizon(h);
    Alert.alert("How far ahead?", "Choose how many upcoming appointments to show.", [
      { text: "2 weeks", onPress: apply("2weeks") },
      { text: "1 month", onPress: apply("1month") },
      { text: "3 months", onPress: apply("3months") },
      { text: "6 months", onPress: apply("6months") },
      { text: "All", onPress: apply("all") },
      { text: "Cancel", style: "cancel" },
    ]);
  }, []);

  const refresh = useCallback(async () => {
    const rows = await loadAppointments();
    setAllAppointments(rows);
    const forDay = await appointmentsForDay(selectedDayKey);
    setDayAppointments(forDay);
    setLoaded(true);
  }, [selectedDayKey]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void getNotificationPermission().then(setPermission);
    }, [refresh]),
  );

  useEffect(() => {
    void appointmentsForDay(selectedDayKey).then(setDayAppointments);
  }, [selectedDayKey]);

  const matrix = useMemo(() => monthMatrix(viewMonth), [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const openCreate = () => {
    setEditor(defaultEditor(selectedDayKey));
  };

  const openEdit = (record: AppointmentRecord) => {
    setEditor(editorFromRecord(record));
  };

  const closeEditor = () => setEditor(null);

  const handleSave = async () => {
    if (!editor) return;
    const title = editor.title.trim();
    if (!title) {
      Alert.alert("Title required", "Enter a title for this appointment.");
      return;
    }
    const startISO = buildISOFromDayAndTime(editor.dayKey, editor.startTime);
    const endISO = buildISOFromDayAndTime(editor.dayKey, editor.endTime);
    if (!startISO || !endISO) {
      Alert.alert("Invalid time", "Use 24-hour times like 09:00 and 17:30.");
      return;
    }
    if (new Date(endISO) <= new Date(startISO)) {
      Alert.alert("Invalid range", "End time must be after start time.");
      return;
    }

    setSaving(true);
    try {
      let permissionState = permission;
      if (editor.reminderMinutes !== null && permissionState !== "granted") {
        permissionState = await requestNotificationPermission();
        setPermission(permissionState);
        if (permissionState !== "granted") {
          Alert.alert(
            "Notifications off",
            "Reminders need notification permission. You can enable alerts in device Settings, or save without a reminder.",
            [
              { text: "Save without reminder", onPress: () => void saveWithReminder(null, permissionState) },
              { text: "Cancel", style: "cancel" },
            ],
          );
          return;
        }
      }
      await saveWithReminder(editor.reminderMinutes, permissionState);
    } finally {
      setSaving(false);
    }
  };

  const saveWithReminder = async (
    reminderMinutes: number | null,
    permissionState: NotificationPermissionState,
  ) => {
    if (!editor) return;
    const startISO = buildISOFromDayAndTime(editor.dayKey, editor.startTime)!;
    const endISO = buildISOFromDayAndTime(editor.dayKey, editor.endTime)!;
    const effectiveReminder =
      reminderMinutes !== null && permissionState === "granted" ? reminderMinutes : null;

    if (editor.id) {
      const existing = allAppointments.find((r) => r.id === editor.id);
      const notes = composeAppointmentNotes(editor);
      const updated = await updateAppointment(editor.id, {
        title: editor.title,
        startISO,
        endISO,
        notes,
        reminderMinutesBefore: effectiveReminder,
        notificationId: existing?.notificationId ?? null,
      });
      if (!updated) {
        Alert.alert("Not found", "This appointment was removed.");
        closeEditor();
        await refresh();
        return;
      }
      const notificationId = await syncAppointmentNotification(updated, existing?.notificationId ?? null);
      if (notificationId !== updated.notificationId) {
        await updateAppointment(editor.id, {
          title: updated.title,
          startISO: updated.startISO,
          endISO: updated.endISO,
          notes: updated.notes,
          reminderMinutesBefore: updated.reminderMinutesBefore,
          notificationId,
        });
      }
    } else {
      const notes = composeAppointmentNotes(editor);
      const created = await addAppointment({
        title: editor.title,
        startISO,
        endISO,
        notes,
        reminderMinutesBefore: effectiveReminder,
        notificationId: null,
      });
      const notificationId = await syncAppointmentNotification(created, null);
      if (notificationId) {
        await updateAppointment(created.id, {
          title: created.title,
          startISO: created.startISO,
          endISO: created.endISO,
          notes: created.notes,
          reminderMinutesBefore: created.reminderMinutesBefore,
          notificationId,
        });
      }
    }

    closeEditor();
    await refresh();
  };

  const handleDelete = (record: AppointmentRecord) => {
    Alert.alert("Delete appointment?", record.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await cancelAppointmentNotification(record.notificationId);
            await deleteAppointment(record.id);
            if (editor?.id === record.id) closeEditor();
            await refresh();
          })();
        },
      },
    ]);
  };

  const selectedDateLabel = parseDayKey(selectedDayKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={scStyles.screen}>
      <StickyPageHeader
        title="Calendar"
        subtitle="Schedule jobs and visits. Pick a day, add an appointment, and get a phone alert before it starts."
        fallbackHref={HOME_FALLBACK_HREF}
      />
      <ScrollView style={scStyles.scrollBody} contentContainerStyle={styles.content}>
      <View style={styles.topActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add new appointment"
          accessibilityHint="Opens the form to create an appointment on the selected day"
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed, saving && styles.disabled]}
          onPress={openCreate}
          disabled={saving}
        >
          <Text style={styles.addBtnText}>Add new appointment</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See future appointments"
          accessibilityHint="Choose how far ahead to list upcoming appointments"
          style={({ pressed }) => [styles.secondaryActionBtn, pressed && styles.pressed]}
          onPress={openFutureHorizonPicker}
        >
          <Text style={styles.secondaryActionBtnText}>See future appointments</Text>
        </Pressable>
      </View>

      {permission === "denied" ? (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Notifications are off. Enable them in device Settings to receive appointment reminders on your phone.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.permissionBtn, pressed && styles.pressed]}
            onPress={() => void requestNotificationPermission().then(setPermission)}
          >
            <Text style={styles.permissionBtnText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.monthBar}>
        <Pressable
          accessibilityLabel="Previous month"
          style={({ pressed }) => [styles.monthNavBtn, pressed && styles.pressed]}
          onPress={() => shiftMonth(-1)}
        >
          <Text style={styles.monthNavText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          accessibilityLabel="Next month"
          style={({ pressed }) => [styles.monthNavBtn, pressed && styles.pressed]}
          onPress={() => shiftMonth(1)}
        >
          <Text style={styles.monthNavText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {matrix.map((week, wi) => (
        <View key={`week-${wi}`} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) {
              return <View key={`empty-${wi}-${di}`} style={styles.dayCell} />;
            }
            const key = dayKeyFromDate(day);
            const selected = key === selectedDayKey;
            const isToday = sameCalendarDay(day, today);
            const hasDot = markedDays.has(key);
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.dayCell,
                  styles.dayButton,
                  selected && styles.daySelected,
                  pressed && styles.pressed,
                ]}
                onPress={() => setSelectedDayKey(key)}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    selected && styles.dayNumberSelected,
                    isToday && !selected && styles.dayNumberToday,
                  ]}
                >
                  {day.getDate()}
                </Text>
                {hasDot ? <View style={[styles.dot, selected && styles.dotSelected]} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}

      {futureHorizon ? (
        <View style={styles.futureSection}>
          <View style={styles.futureHeaderRow}>
            <Text style={styles.futureHeading}>Future appointments</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change how far ahead"
              style={({ pressed }) => [styles.changeRangeBtn, pressed && styles.pressed]}
              onPress={openFutureHorizonPicker}
            >
              <Text style={styles.changeRangeBtnText}>Change range</Text>
            </Pressable>
          </View>
          <Text style={styles.futureSub}>{horizonDisplayLabel(futureHorizon)}</Text>
          {!loaded ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : futureAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No appointments in this range yet.</Text>
            </View>
          ) : (
            futureAppointments.map((record) => (
              <Pressable
                key={record.id}
                accessibilityRole="button"
                accessibilityLabel={`${record.title}, ${formatAppointmentDate(record.startISO)}`}
                style={({ pressed }) => [styles.apptCard, pressed && styles.pressed]}
                onPress={() => {
                  const d = new Date(record.startISO);
                  setSelectedDayKey(appointmentDayKey(record));
                  setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  openEdit(record);
                }}
              >
                <View style={styles.apptHeader}>
                  <Text style={styles.apptTitle}>{record.title}</Text>
                  <Text style={styles.apptMetaSmall}>{formatAppointmentDate(record.startISO)}</Text>
                </View>
                <Text style={styles.apptMeta}>{formatAppointmentTimeRange(record.startISO, record.endISO)}</Text>
                {record.notes.trim() ? <Text style={styles.apptNotes}>{record.notes.trim()}</Text> : null}
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      <View style={styles.daySection}>
        <Text style={styles.dayHeading}>{selectedDateLabel}</Text>

        {!loaded ? (
          <Text style={styles.muted}>Loading appointments…</Text>
        ) : dayAppointments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No appointments this day. Tap “Add new appointment” to add one.</Text>
          </View>
        ) : (
          dayAppointments.map((record) => (
            <Pressable
              key={record.id}
              style={({ pressed }) => [styles.apptCard, pressed && styles.pressed]}
              onPress={() => openEdit(record)}
            >
              <View style={styles.apptHeader}>
                <Text style={styles.apptTitle}>{record.title}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleDelete(record);
                  }}
                >
                  <Text style={styles.deleteLink}>Delete</Text>
                </Pressable>
              </View>
              <Text style={styles.apptMeta}>{formatAppointmentTimeRange(record.startISO, record.endISO)}</Text>
              {record.notes.trim() ? <Text style={styles.apptNotes}>{record.notes.trim()}</Text> : null}
              <Text style={styles.apptReminder}>{reminderLabel(record.reminderMinutesBefore)}</Text>
            </Pressable>
          ))
        )}
      </View>

      <Modal visible={editor !== null} animationType="slide" transparent onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <AppConstructionBackdrop />
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editor?.id ? "Edit appointment" : "New appointment"}</Text>
              <Text style={styles.fieldLabel}>Title</Text>
              <VoiceTextInput
                style={styles.input}
                value={editor?.title ?? ""}
                onChangeText={(title) => setEditor((prev) => (prev ? { ...prev, title } : prev))}
                placeholder="Job site visit, estimate, etc."
                placeholderTextColor={placeholderColor}
              />
              <Text style={styles.fieldLabel}>Date</Text>
              <Text style={styles.dateReadout}>
                {editor ? parseDayKey(editor.dayKey).toLocaleDateString(undefined, { dateStyle: "full" }) : ""}
              </Text>
              <Text style={styles.fieldHint}>Change the selected day on the calendar before saving.</Text>
              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>Start</Text>
                  <VoiceTextInput
                    style={styles.input}
                    value={editor?.startTime ?? ""}
                    onChangeText={(startTime) => setEditor((prev) => (prev ? { ...prev, startTime } : prev))}
                    placeholder="09:00"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>End</Text>
                  <VoiceTextInput
                    style={styles.input}
                    value={editor?.endTime ?? ""}
                    onChangeText={(endTime) => setEditor((prev) => (prev ? { ...prev, endTime } : prev))}
                    placeholder="10:00"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Customer</Text>
              <CustomerContactPicker
                value={{
                  name: editor?.customerName ?? "",
                  phone: editor?.customerPhone ?? "",
                  email: editor?.customerEmail ?? "",
                }}
                onChange={(next) =>
                  setEditor((prev) =>
                    prev
                      ? {
                          ...prev,
                          customerName: next.name || prev.customerName,
                          customerPhone: next.phone || prev.customerPhone,
                          customerEmail: next.email || prev.customerEmail,
                        }
                      : prev,
                  )
                }
              />
              <Text style={styles.fieldLabel}>Customer name</Text>
              <VoiceTextInput
                style={styles.input}
                value={editor?.customerName ?? ""}
                onChangeText={(customerName) => setEditor((prev) => (prev ? { ...prev, customerName } : prev))}
                placeholder="Optional"
                placeholderTextColor={placeholderColor}
              />
              <Text style={styles.fieldLabel}>Phone</Text>
              <VoiceTextInput
                style={styles.input}
                value={editor?.customerPhone ?? ""}
                onChangeText={(customerPhone) => setEditor((prev) => (prev ? { ...prev, customerPhone } : prev))}
                placeholder="Optional"
                placeholderTextColor={placeholderColor}
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldLabel}>Email</Text>
              <VoiceTextInput
                style={styles.input}
                value={editor?.customerEmail ?? ""}
                onChangeText={(customerEmail) => setEditor((prev) => (prev ? { ...prev, customerEmail } : prev))}
                placeholder="Optional"
                placeholderTextColor={placeholderColor}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.fieldLabel}>Notes</Text>
              <VoiceTextInput
                style={[styles.input, styles.notesInput]}
                value={editor?.notes ?? ""}
                onChangeText={(notes) => setEditor((prev) => (prev ? { ...prev, notes } : prev))}
                placeholder="Address, materials, extra details…"
                placeholderTextColor={placeholderColor}
                multiline
              />
              <Text style={styles.fieldLabel}>Reminder</Text>
              <View style={styles.chipRow}>
                {REMINDER_OPTIONS.map((opt) => {
                  const active = editor?.reminderMinutes === opt.minutes;
                  return (
                    <Pressable
                      key={opt.label}
                      style={({ pressed }) => [
                        styles.chip,
                        active && styles.chipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        setEditor((prev) => (prev ? { ...prev, reminderMinutes: opt.minutes } : prev))
                      }
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                  onPress={closeEditor}
                  disabled={saving}
                >
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.pressed,
                    saving && styles.disabled,
                  ]}
                  onPress={() => void handleSave()}
                  disabled={saving}
                >
                  <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save"}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const accentTint = hexToRgba(colors.accent, 0.22);
  const accentTintLight = hexToRgba(colors.accent, 0.12);
  const inputFill = hexToRgba(colors.accent, INPUT_ACCENT_FILL_OPACITY);
  const accentTintActive = hexToRgba(colors.accent, 0.38);
  const textColor = colors.text;
  const mutedText = hexToRgba(colors.text, 0.72);

  return StyleSheet.create({
    content: {
      padding: 20,
      paddingBottom: 24,
    },
    topActions: {
      gap: 10,
      marginBottom: 16,
    },
    secondaryActionBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    secondaryActionBtnText: {
      color: textColor,
      fontWeight: "800",
      fontSize: 16,
    },
    futureSection: {
      marginTop: 20,
      gap: 10,
    },
    futureHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    futureHeading: {
      fontSize: 17,
      fontWeight: "800",
      color: textColor,
      flex: 1,
    },
    futureSub: {
      fontSize: 14,
      fontWeight: "700",
      color: mutedText,
      marginTop: -4,
      marginBottom: 4,
    },
    changeRangeBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    changeRangeBtnText: {
      color: textColor,
      fontWeight: "700",
      fontSize: 14,
    },
    permissionBanner: {
      backgroundColor: accentTint,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "transparent",
      gap: 10,
    },
    permissionText: {
      color: textColor,
      fontSize: 14,
      lineHeight: 20,
    },
    permissionBtn: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    permissionBtnText: {
      color: textColor,
      fontWeight: "800",
      fontSize: 14,
    },
    monthBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    monthNavBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: "transparent",
    },
    monthNavText: {
      fontSize: 28,
      fontWeight: "700",
      color: textColor,
      lineHeight: 32,
    },
    monthLabel: {
      fontSize: 18,
      fontWeight: "800",
      color: textColor,
    },
    weekdayRow: {
      flexDirection: "row",
      marginBottom: 6,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "700",
      color: mutedText,
    },
    weekRow: {
      flexDirection: "row",
    },
    dayCell: {
      flex: 1,
      aspectRatio: 1,
      maxHeight: 48,
      padding: 2,
    },
    dayButton: {
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    daySelected: {
      backgroundColor: accentTintActive,
      borderWidth: 1,
      borderColor: "transparent",
    },
    dayNumber: {
      fontSize: 15,
      fontWeight: "700",
      color: textColor,
    },
    dayNumberSelected: {
      color: textColor,
    },
    dayNumberToday: {
      color: textColor,
      fontWeight: "800",
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: textColor,
      marginTop: 2,
    },
    dotSelected: {
      backgroundColor: textColor,
    },
    daySection: {
      marginTop: 20,
      gap: 10,
    },
    dayHeading: {
      fontSize: 17,
      fontWeight: "800",
      color: textColor,
    },
    addBtn: {
      backgroundColor: accentTint,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "transparent",
    },
    addBtnText: {
      color: textColor,
      fontWeight: "800",
      fontSize: 16,
    },
    muted: {
      color: mutedText,
      fontSize: 14,
      fontWeight: "700",
    },
    emptyCard: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: accentTint,
      borderWidth: 1,
      borderColor: "transparent",
    },
    emptyText: {
      color: mutedText,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      fontWeight: "700",
    },
    apptCard: {
      backgroundColor: accentTint,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: "transparent",
      gap: 4,
    },
    apptHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8,
    },
    apptTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "800",
      color: textColor,
    },
    deleteLink: {
      color: "#f87171",
      fontWeight: "700",
      fontSize: 14,
    },
    apptMeta: {
      color: textColor,
      fontSize: 14,
      fontWeight: "700",
      opacity: 0.85,
    },
    apptMetaSmall: {
      fontSize: 13,
      fontWeight: "700",
      color: mutedText,
      flexShrink: 0,
      marginLeft: 8,
      textAlign: "right",
    },
    apptNotes: {
      color: textColor,
      fontSize: 14,
      lineHeight: 20,
      opacity: 0.9,
      fontWeight: "700",
    },
    apptReminder: {
      color: mutedText,
      fontSize: 13,
      marginTop: 2,
      fontWeight: "700",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "transparent",
    },
    modalScrollView: {
      flex: 1,
    },
    modalScroll: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      borderRadius: 16,
      padding: 18,
      gap: 8,
      backgroundColor: accentTint,
      borderWidth: 1,
      borderColor: "transparent",
      maxWidth: 480,
      width: "100%",
      alignSelf: "center",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: textColor,
      marginBottom: 4,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginTop: 6,
    },
    fieldHint: {
      fontSize: 12,
      color: mutedText,
      marginBottom: 4,
    },
    dateReadout: {
      fontSize: 16,
      fontWeight: "700",
      color: textColor,
    },
    input: {
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 12 : 10,
      fontSize: 16,
      color: textColor,
      backgroundColor: inputFill,
    },
    notesInput: {
      minHeight: 88,
      textAlignVertical: "top",
    },
    timeRow: {
      flexDirection: "row",
      gap: 10,
    },
    timeCol: {
      flex: 1,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
      marginBottom: 8,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTintLight,
    },
    chipActive: {
      backgroundColor: accentTintActive,
      borderColor: "transparent",
    },
    chipText: {
      color: textColor,
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.85,
    },
    chipTextActive: {
      color: textColor,
      opacity: 1,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: accentTint,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "transparent",
    },
    primaryBtnText: {
      color: textColor,
      fontWeight: "800",
      fontSize: 16,
    },
    secondaryBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTintLight,
    },
    secondaryBtnText: {
      color: textColor,
      fontWeight: "700",
      fontSize: 16,
    },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.55,
    },
  });
}
