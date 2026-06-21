import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { InlineMonthCalendar } from "@/components/serviceCalls/InlineMonthCalendar";
import { ServiceCallContactActions } from "@/components/serviceCalls/ServiceCallContactActions";
import { ServiceCallForm } from "@/components/serviceCalls/ServiceCallForm";
import { ServiceCallPhotoGallery } from "@/components/serviceCalls/ServiceCallPhotoGallery";
import { ServiceCallWorkflowPicker } from "@/components/serviceCalls/ServiceCallWorkflowPicker";
import { StickyPageHeader, StickyScreenShell, ScreenScrollView, useScStyles } from "@/components/serviceCalls/screenChrome";
import { priorityLabel } from "@/lib/customerServiceRequest";
import { workflowStatusLabel } from "@/lib/serviceRequestSync";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  addAppointment,
  buildISOFromDayAndTime,
  isValidScheduleDayKey,
  updateAppointment,
} from "@/lib/appointmentStorage";
import {
  getNotificationPermission,
  requestNotificationPermission,
  syncAppointmentNotification,
} from "@/lib/appointmentNotifications";
import type { ServiceCallCustomerFields } from "@/lib/mapPhoneContactToCustomer";
import {
  formatServiceCallDate,
  getServiceCallById,
  serviceCallTitle,
  updateServiceCall,
  type ServiceCallRecord,
} from "@/lib/serviceCallStorage";

function DetailRow({ label, value }: { label: string; value: string }) {
  const scStyles = useScStyles();
  if (!value.trim()) return null;
  return (
    <View>
      <Text style={scStyles.detailLabel}>{label}</Text>
      <Text style={scStyles.detailValue}>{value}</Text>
    </View>
  );
}

function formatScheduledVisitSummary(record: ServiceCallRecord): string {
  const day = (record.scheduledDayKey ?? "").trim();
  const tm = (record.scheduledTimeLocal ?? "").trim();
  if (!day || !tm) return "";
  const iso = buildISOFromDayAndTime(day, tm);
  if (!iso) return `${day} at ${tm}`;
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return `${day} at ${tm}`;
  }
}

async function createCalendarVisitFromServiceCall(
  record: ServiceCallRecord,
  dayKey: string,
  timeLocal: string,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const startISO = buildISOFromDayAndTime(dayKey, timeLocal);
  if (!startISO) {
    Alert.alert("Invalid time", "Use 24-hour time like 09:00 or 14:30.");
    return;
  }
  const end = new Date(startISO);
  end.setHours(end.getHours() + 1);
  const endISO = end.toISOString();

  let reminderMinutes: number | null = 60;
  let permission = await getNotificationPermission();
  if (reminderMinutes !== null && permission !== "granted") {
    permission = await requestNotificationPermission();
    if (permission !== "granted") reminderMinutes = null;
  }

  const title = `Visit: ${serviceCallTitle(record)}`;
  const addr = [record.fields.street, record.fields.city, record.fields.state, record.fields.zip]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  const notes = [
    addr && `Location: ${addr}`,
    record.fields.phoneMobile.trim() && `Phone: ${record.fields.phoneMobile.trim()}`,
    record.fields.email.trim() && `Email: ${record.fields.email.trim()}`,
    `Service call: ${record.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  const created = await addAppointment({
    title,
    startISO,
    endISO,
    notes,
    reminderMinutesBefore: reminderMinutes,
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

  Alert.alert("Appointment added", "You can review or edit it on the Calendar screen.", [
    { text: "OK" },
    { text: "Open Calendar", onPress: () => router.push("/calendar") },
  ]);
}

export default function ServiceCallDetailScreen() {
  const scStyles = useScStyles();
  const { colors } = useAppTheme();
  const themedInput = useMemo(() => inputStyle(colors), [colors]);
  const inputPlaceholder = useMemo(() => placeholderTextColor(colors), [colors]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<ServiceCallRecord | null>(null);
  const [draftFields, setDraftFields] = useState<ServiceCallCustomerFields | null>(null);
  const [scheduledDayKey, setScheduledDayKey] = useState("");
  const [scheduledTimeLocal, setScheduledTimeLocal] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id || typeof id !== "string") return;
      let cancelled = false;
      setRecord(null);
      void getServiceCallById(id).then((r) => {
        if (cancelled) return;
        setRecord(r);
        if (r?.status === "current") {
          setDraftFields(r.fields);
          setScheduledDayKey((r.scheduledDayKey ?? "").trim());
          setScheduledTimeLocal((r.scheduledTimeLocal ?? "").trim());
        } else {
          setDraftFields(null);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  if (!record) {
    return (
      <StickyScreenShell
        header={
          <StickyPageHeader title="Service call" fallbackHref="/service-calls/current" />
        }
      >
        <ScreenScrollView style={scStyles.scrollBody} contentContainerStyle={scStyles.content}>
          <Text style={scStyles.emptyText}>Loading…</Text>
        </ScreenScrollView>
      </StickyScreenShell>
    );
  }

  const f = record.fields;
  const address = [f.street, f.city, f.state, f.zip].filter((p) => p.trim()).join(", ");
  const visitSummary = formatScheduledVisitSummary(record);

  const saveCustomerAndVisit = async () => {
    if (!draftFields) return;
    const hasName = draftFields.customerName.trim().length > 0;
    const hasPhone =
      draftFields.phoneMobile.trim() ||
      draftFields.phoneHome.trim() ||
      draftFields.phoneWork.trim();
    if (!hasName && !hasPhone) {
      Alert.alert("Customer required", "Enter at least a customer name or one phone number.");
      return;
    }

    const d = scheduledDayKey.trim();
    const t = scheduledTimeLocal.trim();
    if ((d && !t) || (!d && t)) {
      Alert.alert("Visit date and time", "Enter both the visit date and start time, or leave both blank.");
      return;
    }
    if (d || t) {
      if (!isValidScheduleDayKey(d)) {
        Alert.alert("Visit date", "Use the form YYYY-MM-DD (example: 2026-05-20).");
        return;
      }
      if (!buildISOFromDayAndTime(d, t)) {
        Alert.alert("Visit time", "Use 24-hour time like 09:00 or 14:30.");
        return;
      }
    }

    setSavingDetails(true);
    try {
      const updated = await updateServiceCall(record.id, {
        fields: draftFields,
        scheduledDayKey: d,
        scheduledTimeLocal: t,
      });
      if (!updated) {
        Alert.alert("Error", "Could not save this service call.");
        return;
      }
      setRecord(updated);
      setDraftFields(updated.fields);
      setScheduledDayKey((updated.scheduledDayKey ?? "").trim());
      setScheduledTimeLocal((updated.scheduledTimeLocal ?? "").trim());

      if (d && t) {
        Alert.alert(
          "Details saved",
          "Would you like to add this visit to the in-app calendar? You can set reminders there if notifications are allowed.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Add to calendar",
              onPress: () => void createCalendarVisitFromServiceCall(updated, d, t, router),
            },
          ],
        );
      } else {
        Alert.alert("Saved", "Customer details were updated.");
      }
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSavingDetails(false);
    }
  };

  const headerTitle =
    record.status === "current" && draftFields
      ? serviceCallTitle({ ...record, fields: draftFields })
      : serviceCallTitle(record);

  const stickyHeader = (
    <StickyPageHeader
      showBack
      fallbackHref={record.status === "completed" ? "/service-calls/completed" : "/service-calls/current"}
      title={headerTitle}
      subtitle={
        record.status === "completed"
          ? `Completed ${record.completion ? formatServiceCallDate(record.completion.completedAt) : ""}`
          : `Created ${formatServiceCallDate(record.createdAt)} · Current`
      }
    />
  );

  const innerBody = (
    <>
      <ServiceCallWorkflowPicker record={record} onUpdated={setRecord} />
      <ServiceCallPhotoGallery record={record} />
      <ServiceCallContactActions record={record} />

      {record.source === "customer_link" ? (
        <View style={scStyles.card}>
          <Text style={scStyles.cardTitle}>Customer request</Text>
          <Text style={scStyles.cardMeta}>
            Status: {workflowStatusLabel(record.workflowStatus ?? "new")}
            {record.priority ? ` · ${priorityLabel(record.priority)}` : ""}
            {record.customerSubmittedAt
              ? ` · Submitted ${formatServiceCallDate(record.customerSubmittedAt)}`
              : ""}
            {record.bestTimeToContact?.trim()
              ? `\nBest time: ${record.bestTimeToContact.trim()}`
              : ""}
          </Text>
        </View>
      ) : null}

      {record.status === "current" && draftFields ? (
        <>
          <View style={scStyles.card}>
            <Text style={scStyles.cardTitle}>Customer & visit</Text>
            <Text style={scStyles.cardMeta}>
              Update the customer&apos;s name, address, phones, email, and when you plan to be on site. Tap save when
              done.
            </Text>
          </View>
          <ServiceCallForm fields={draftFields} onChangeFields={setDraftFields} />
          <Text style={scStyles.sectionLabel}>Scheduled visit</Text>
          <Text style={[scStyles.cardMeta, { marginBottom: 10 }]}>
            Pick the visit day on the calendar, then enter the start time (24-hour, e.g. 09:00). Leave both blank if not
            scheduled yet.
          </Text>
          <Text style={scStyles.detailLabel}>Visit date</Text>
          <InlineMonthCalendar
            selectedDayKey={scheduledDayKey}
            onSelectDay={(dayKey) => {
              setScheduledDayKey(dayKey);
              setScheduledTimeLocal((t) => (dayKey.trim() && !t.trim() ? "09:00" : t));
            }}
          />
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Visit start time</Text>
            <VoiceTextInput
              value={scheduledTimeLocal}
              onChangeText={setScheduledTimeLocal}
              placeholder="09:00"
              placeholderTextColor={inputPlaceholder}
              style={[styles.input, themedInput]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Pressable
            onPress={() => void saveCustomerAndVisit()}
            disabled={savingDetails}
            style={({ pressed }) => [
              scStyles.primaryCta,
              pressed && { opacity: 0.9 },
              savingDetails && { opacity: 0.6 },
            ]}
          >
            <Text style={scStyles.primaryCtaText}>{savingDetails ? "Saving…" : "Save customer & visit details"}</Text>
          </Pressable>
        </>
      ) : (
        <>
          {visitSummary ? (
            <>
              <Text style={scStyles.detailLabel}>Scheduled visit</Text>
              <Text style={scStyles.detailValue}>{visitSummary}</Text>
            </>
          ) : null}
          <DetailRow label="Company" value={f.companyName} />
          <DetailRow label="Address" value={address} />
          <DetailRow label="Email" value={f.email} />
          <DetailRow label="Alt email" value={f.emailAlt} />
          <DetailRow label="Mobile" value={f.phoneMobile} />
          <DetailRow label="Home" value={f.phoneHome} />
          <DetailRow label="Work" value={f.phoneWork} />
          <DetailRow label="Work to perform" value={f.workOrderNotes} />
        </>
      )}
    </>
  );

  if (record.status === "current" && draftFields) {
    return (
      <StickyScreenShell header={stickyHeader}>
        <FormScrollView
          style={scStyles.scrollBody}
          contentContainerStyle={scStyles.content}
          keyboardShouldPersistTaps="handled"
          extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
        >
          {innerBody}
        </FormScrollView>
      </StickyScreenShell>
    );
  }

  return (
    <StickyScreenShell header={stickyHeader}>
      <ScreenScrollView style={scStyles.scrollBody} contentContainerStyle={scStyles.content}>
        {innerBody}
      </ScreenScrollView>
    </StickyScreenShell>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
