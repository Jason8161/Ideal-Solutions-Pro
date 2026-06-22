import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Link, Redirect, type Href } from "expo-router";
import { StickyPageHeader, useScStyles } from "@/components/serviceCalls/screenChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import {
  getAccentTints,
  inputStyle,
  navCardStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { CrewCloudInvites } from "@/components/cloud/CrewCloudInvites";
import { defaultMyCrewSettings, loadMyCrewSettings, saveMyCrewSettings, type MyCrewSettings } from "@/lib/myCrewSettings";
import { settingsBackHref, settingsBackLabel, settingsGroupHref } from "@/lib/settingsGroups";
import { canAccessCrewTools } from "@/lib/subscriptionGating";

function Field({
  label,
  hint,
  value,
  onChangeText,
  keyboardType = "default",
  styles,
  placeholderColor,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "decimal-pad";
  styles: ReturnType<typeof makeStyles>;
  placeholderColor: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <VoiceTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={placeholderColor}
        style={styles.input}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export default function MyCrewSettingsScreen() {
  const { activeTier } = useSubscription();
  const { colors } = useAppTheme();
  const scStyles = useScStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeholderColor = useMemo(() => placeholderTextColor(colors), [colors]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MyCrewSettings>(defaultMyCrewSettings());

  useEffect(() => {
    let cancelled = false;
    void loadMyCrewSettings().then((s) => {
      if (!cancelled) {
        setForm(s);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback((key: keyof MyCrewSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveMyCrewSettings(form);
      Alert.alert("Saved", "My crew settings were saved on this device.");
    } catch {
      Alert.alert("Error", "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }, [form]);

  if (!canAccessCrewTools(activeTier)) {
    return <Redirect href={settingsGroupHref("team")} />;
  }

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <StickyPageHeader
        title="My crew"
        subtitle="Default tax and crew billing rates for estimates and job costing."
        backHref={settingsBackHref("my-crew")}
        backLabel={settingsBackLabel("my-crew")}
      />
      <ScrollView
        style={scStyles.scrollBody}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Link href={"/settings/employees" as Href} asChild>
          <Pressable
            style={({ pressed }) => [styles.employeesCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Employees"
            accessibilityHint="Opens employee directory"
          >
            <View style={styles.employeesTextCol}>
              <Text style={styles.employeesTitle}>Employees</Text>
              <Text style={styles.employeesSub}>
                Current and previous crew — pay, contacts, and emergency info
              </Text>
            </View>
            <Text style={styles.employeesChevron} accessibilityElementsHidden>
              ›
            </Text>
          </Pressable>
        </Link>

        <CrewCloudInvites />

        <Text style={styles.intro}>
          Default tax is used on the Estimates screen when you turn tax on. Set project, service call, and emergency
          labor rates — estimates let you pick which table to use when pricing labor.
        </Text>

        <Text style={styles.section}>Tax (estimates)</Text>
        <View style={styles.sectionCard}>
          <Field
            label="Default sales tax %"
            hint="Example: 8.25 for eight and a quarter percent. Used when Estimates → Add tax is on."
            value={form.defaultTaxPercent}
            onChangeText={(t) => patch("defaultTaxPercent", t)}
            keyboardType="decimal-pad"
            styles={styles}
            placeholderColor={placeholderColor}
          />
        </View>

        <Text style={styles.section}>Project labor rates</Text>
        <View style={styles.sectionCard}>
          <Field
            label="Default rate ($/hr)"
            hint="Project jobs and estimates using project labor rates."
            value={form.defaultLaborRate}
            onChangeText={(t) => patch("defaultLaborRate", t)}
            keyboardType="decimal-pad"
            styles={styles}
            placeholderColor={placeholderColor}
          />
          <Field label="Lead man" value={form.rateLeadMan} onChangeText={(t) => patch("rateLeadMan", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
          <Field label="Tech" value={form.rateTech} onChangeText={(t) => patch("rateTech", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
          <Field label="Journeyman" value={form.rateJourneyman} onChangeText={(t) => patch("rateJourneyman", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
          <Field label="Helper" value={form.rateHelper} onChangeText={(t) => patch("rateHelper", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
        </View>

        <Text style={styles.section}>Service call labor rates</Text>
        <View style={styles.sectionCard}>
          <Field
            label="Default rate ($/hr)"
            hint="Service call estimates and troubleshooting visits."
            value={form.serviceCallDefaultLaborRate}
            onChangeText={(t) => patch("serviceCallDefaultLaborRate", t)}
            keyboardType="decimal-pad"
            styles={styles}
            placeholderColor={placeholderColor}
          />
          <Field label="Lead man" value={form.serviceCallRateLeadMan} onChangeText={(t) => patch("serviceCallRateLeadMan", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
          <Field label="Tech" value={form.serviceCallRateTech} onChangeText={(t) => patch("serviceCallRateTech", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
          <Field label="Journeyman" value={form.serviceCallRateJourneyman} onChangeText={(t) => patch("serviceCallRateJourneyman", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
          <Field label="Helper" value={form.serviceCallRateHelper} onChangeText={(t) => patch("serviceCallRateHelper", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
        </View>

        <Text style={styles.section}>Emergency call labor rates</Text>
        <View style={styles.sectionCard}>
          <Field
            label="Default rate ($/hr)"
            hint="After-hours or emergency estimates."
            value={form.emergencyDefaultLaborRate}
            onChangeText={(t) => patch("emergencyDefaultLaborRate", t)}
            keyboardType="decimal-pad"
            styles={styles}
            placeholderColor={placeholderColor}
          />
          <Field label="Lead man" value={form.emergencyRateLeadMan} onChangeText={(t) => patch("emergencyRateLeadMan", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
          <Field label="Tech" value={form.emergencyRateTech} onChangeText={(t) => patch("emergencyRateTech", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
          <Field label="Journeyman" value={form.emergencyRateJourneyman} onChangeText={(t) => patch("emergencyRateJourneyman", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
          <Field label="Helper" value={form.emergencyRateHelper} onChangeText={(t) => patch("emergencyRateHelper", t)} keyboardType="decimal-pad" styles={styles} placeholderColor={placeholderColor} />
        </View>

        <Pressable
          onPress={() => void onSave()}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, saving && styles.disabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const cardBase = navCardStyle(colors);
  const secondaryBtn = secondaryButtonStyle(colors, tints);
  const fieldInput = inputStyle(colors, tints);

  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: "transparent" },
    centered: { flex: 1, backgroundColor: "transparent", justifyContent: "center", alignItems: "center" },
    content: { padding: 20, paddingBottom: 40, backgroundColor: "transparent" },
    employeesCard: {
      ...cardBase,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      marginBottom: 20,
    },
    employeesTextCol: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    employeesTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    employeesSub: {
      fontSize: 13,
      lineHeight: 18,
      color: "rgba(255,255,255,0.75)",
    },
    employeesChevron: {
      fontSize: 28,
      fontWeight: "300",
      color: "#FFFFFF",
      opacity: 0.75,
      paddingRight: 4,
    },
    intro: {
      fontSize: 15,
      lineHeight: 22,
      color: "rgba(255,255,255,0.75)",
      marginBottom: 20,
    },
    section: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
      marginTop: 8,
    },
    sectionCard: {
      ...cardBase,
      padding: 14,
      marginBottom: 16,
      gap: 4,
    },
    field: { marginBottom: 12 },
    label: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4 },
    hint: { fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.75)", marginBottom: 6 },
    input: {
      ...fieldInput,
      fontSize: 17,
    },
    saveBtn: {
      marginTop: 12,
      ...secondaryBtn,
      paddingVertical: 16,
      borderRadius: 12,
    },
    saveBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
    pressed: { opacity: 0.88 },
    disabled: { opacity: 0.55 },
  });
}
