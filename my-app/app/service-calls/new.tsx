import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { InlineMonthCalendar } from "@/components/serviceCalls/InlineMonthCalendar";
import { ServiceCallForm } from "@/components/serviceCalls/ServiceCallForm";
import { ScheduleWebTimeInput } from "@/components/serviceCalls/ScheduleWebTimeInput";
import { StickyPageHeader, StickyScreenShell, useScStyles } from "@/components/serviceCalls/screenChrome";
import { accentPanelStyle, getAccentTints } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { buildISOFromDayAndTime, isValidScheduleDayKey, parseDayKey } from "@/lib/appointmentStorage";
import {
  isFromCustomerRequest,
  parseServiceCallFieldsFromParams,
} from "@/lib/customerServiceRequest";
import {
  emptyServiceCallCustomerFields,
  type ServiceCallCustomerFields,
} from "@/lib/mapPhoneContactToCustomer";
import { addServiceCall } from "@/lib/serviceCallStorage";

function mergePrefill(
  base: ServiceCallCustomerFields,
  partial: Partial<ServiceCallCustomerFields>,
): ServiceCallCustomerFields {
  return { ...base, ...partial };
}

function visitDateFromDayKey(dayKey: string): Date {
  if (isValidScheduleDayKey(dayKey)) return parseDayKey(dayKey.trim());
  const n = new Date();
  n.setHours(12, 0, 0, 0);
  return n;
}

function formatHm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function timeAsDate(dayKey: string, timeLocal: string): Date {
  const base = visitDateFromDayKey(dayKey);
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeLocal.trim());
  if (m) {
    base.setHours(Number(m[1]), Number(m[2]), 0, 0);
  } else {
    base.setHours(9, 0, 0, 0);
  }
  return base;
}

function formatVisitDateLabel(dayKey: string): string {
  if (!isValidScheduleDayKey(dayKey)) return "";
  try {
    return parseDayKey(dayKey.trim()).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dayKey.trim();
  }
}

export default function NewServiceCallScreen() {
  const scStyles = useScStyles();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeLocalStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromCustomer = useMemo(() => isFromCustomerRequest(params), [params]);
  const prefill = useMemo(() => parseServiceCallFieldsFromParams(params), [params]);
  const [fields, setFields] = useState<ServiceCallCustomerFields>(() =>
    mergePrefill(emptyServiceCallCustomerFields(), prefill),
  );
  const [scheduledDayKey, setScheduledDayKey] = useState("");
  const [scheduledTimeLocal, setScheduledTimeLocal] = useState("");
  const [iosShowTimePicker, setIosShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Object.keys(prefill).length > 0) {
      setFields((prev) => mergePrefill(prev, prefill));
    }
  }, [prefill]);

  const openVisitTimePicker = useCallback(() => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: timeAsDate(scheduledDayKey, scheduledTimeLocal),
        mode: "time",
        is24Hour: true,
        onChange: (event, date) => {
          if (event.type === "set" && date) setScheduledTimeLocal(formatHm(date));
        },
      });
      return;
    }
    if (Platform.OS === "ios") {
      setIosShowTimePicker((prev) => !prev);
    }
  }, [scheduledDayKey, scheduledTimeLocal]);

  const clearVisitSchedule = useCallback(() => {
    setScheduledDayKey("");
    setScheduledTimeLocal("");
    setIosShowTimePicker(false);
  }, []);

  const onSelectVisitDay = useCallback((dayKey: string) => {
    setScheduledDayKey(dayKey);
    setScheduledTimeLocal((t) => (dayKey.trim() && !t.trim() ? "09:00" : t));
  }, []);

  const save = useCallback(async () => {
    const hasName = fields.customerName.trim().length > 0;
    const hasPhone =
      fields.phoneMobile.trim() || fields.phoneHome.trim() || fields.phoneWork.trim();
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
        Alert.alert("Visit date", "Use a valid calendar date (YYYY-MM-DD).");
        return;
      }
      if (!buildISOFromDayAndTime(d, t)) {
        Alert.alert("Visit time", "Use 24-hour time like 09:00 or 14:30.");
        return;
      }
    }

    setSaving(true);
    try {
      const record = await addServiceCall(fields, { scheduledDayKey: d, scheduledTimeLocal: t });
      router.replace(`/service-calls/${record.id}`);
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }, [fields, router, scheduledDayKey, scheduledTimeLocal]);

  const dateSummary = formatVisitDateLabel(scheduledDayKey);
  const timeSummary = scheduledTimeLocal.trim() || "";

  return (
    <StickyScreenShell
      header={
        <StickyPageHeader
          title="Create new service call"
          subtitle="New calls are saved to Current service calls when you tap Save below."
          fallbackHref="/service-calls"
        />
      }
    >
      <FormScrollView
        style={scStyles.scrollBody}
        contentContainerStyle={scStyles.content}
        extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
      >
        {fromCustomer ? (
          <View style={scStyles.card}>
            <Text style={scStyles.cardTitle}>Customer request</Text>
            <Text style={scStyles.cardMeta}>
              Details were filled in from a customer request link. Review and tap Save to add to Current service calls.
            </Text>
          </View>
        ) : null}
        <ServiceCallForm fields={fields} onChangeFields={setFields} />

        <Text style={scStyles.sectionLabel}>Scheduled visit (optional)</Text>
        <Text style={scStyles.cardMeta}>
          Pick the visit day on the calendar, then set a start time (24-hour). Leave both empty if the visit is not
          scheduled yet.{" "}
          {Platform.OS === "web"
            ? "Use the time picker below."
            : Platform.OS === "ios"
              ? "Tap the time row to show or hide the time picker."
              : "Tap the time row to open the clock."}
        </Text>

        <Text style={scStyles.detailLabel}>Visit date</Text>
        <InlineMonthCalendar selectedDayKey={scheduledDayKey} onSelectDay={onSelectVisitDay} />
        {dateSummary ? <Text style={[scStyles.cardMeta, styles.dateSummaryLine]}>{dateSummary}</Text> : null}

        {Platform.OS === "web" ? (
          <View style={styles.webFields}>
            <ScheduleWebTimeInput value={scheduledTimeLocal} onChange={setScheduledTimeLocal} />
          </View>
        ) : (
          <>
            <Pressable
              onPress={openVisitTimePicker}
              style={({ pressed }) => [
                scStyles.menuButton,
                scStyles.menuButtonSecondary,
                pressed && { opacity: 0.9 },
                { marginTop: 14 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Choose visit start time"
            >
              <Text style={scStyles.menuButtonSecondaryText}>Start time — clock</Text>
              <Text style={styles.valueLine}>{timeSummary || "Tap to choose time"}</Text>
            </Pressable>

            {Platform.OS === "ios" && iosShowTimePicker ? (
              <View style={styles.iosPickerBlock}>
                <DateTimePicker
                  value={timeAsDate(scheduledDayKey, scheduledTimeLocal)}
                  mode="time"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) setScheduledTimeLocal(formatHm(date));
                  }}
                />
                <Pressable
                  onPress={() => setIosShowTimePicker(false)}
                  style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, { marginTop: 8 }]}
                >
                  <Text style={scStyles.primaryCtaText}>Done</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        {(scheduledDayKey.trim() || scheduledTimeLocal.trim()) && (
          <Pressable onPress={clearVisitSchedule} style={({ pressed }) => [styles.clearLink, pressed && { opacity: 0.8 }]}>
            <Text style={styles.clearLinkText}>Clear visit date & time</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => void save()}
          style={({ pressed }) => [
            scStyles.primaryCta,
            pressed && { opacity: 0.9 },
            saving && { opacity: 0.6 },
            { marginTop: 16 },
          ]}
          disabled={saving}
        >
          <Text style={scStyles.primaryCtaText}>{saving ? "Saving…" : "Save to current service calls"}</Text>
        </Pressable>
      </FormScrollView>
    </StickyScreenShell>
  );
}

function makeLocalStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);

  return StyleSheet.create({
    valueLine: {
      marginTop: 8,
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    iosPickerBlock: {
      ...panel,
      marginTop: 14,
      padding: 8,
    },
    webFields: {
      marginTop: 8,
      marginBottom: 8,
    },
    dateSummaryLine: {
      marginTop: 8,
    },
    clearLink: {
      alignSelf: "flex-start",
      marginTop: 12,
      paddingVertical: 8,
    },
    clearLinkText: {
      color: tints.mutedText,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
