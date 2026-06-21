import type { ExistingContact } from "expo-contacts";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { CustomJobPhasePicker } from "@/components/bossMan/CustomJobPhasePicker";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { ContactPasteFieldsModal } from "@/components/ContactPasteFieldsModal";
import { CustomerContactPicker } from "@/components/CustomerContactPicker";
import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { StickyPageHeader, StickyScreenShell } from "@/components/serviceCalls/screenChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { addBossJob } from "@/lib/bossMan/jobStorage";
import { JOB_STATUSES, type JobStatus, type PersonalTabStatesMap } from "@/lib/bossMan/types";
import {
  alertPasteContactIntoJob,
  minimalJobContactPasteKeys,
  pickJobContactPasteFields,
  type JobContactPasteFields,
} from "@/lib/customerContactPick";

export default function JobFolderNewScreen() {
  const { colors } = useAppTheme();
  const { scStyles, styles: bossStyles } = useBossManChrome();
  const styles = useMemo(() => makeStyles(), []);
  const themedInput = useMemo(() => inputStyle(colors), [colors]);
  const inputPlaceholder = useMemo(() => placeholderTextColor(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    serviceCallId?: string;
  }>();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [jobName, setJobName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [serviceCallId, setServiceCallId] = useState("");
  const [status, setStatus] = useState<JobStatus>("New");
  const [jobPhase, setJobPhase] = useState<string | undefined>();
  const [personalTabNames, setPersonalTabNames] = useState<string[]>([]);
  const [personalTabStates, setPersonalTabStates] = useState<PersonalTabStatesMap>({});
  const [saving, setSaving] = useState(false);
  const [pasteChooserOpen, setPasteChooserOpen] = useState(false);
  const [pasteChooserMapped, setPasteChooserMapped] = useState<JobContactPasteFields | null>(null);

  const applyPastedContact = useCallback((picked: JobContactPasteFields) => {
    if (picked.name) {
      setCustomerName(picked.name);
      setJobName((prev) => prev.trim() || `${picked.name} — service request`);
    }
    if (picked.phone) setCustomerPhone(picked.phone);
    if (picked.email) setCustomerEmail(picked.email);
    if (picked.address) setCustomerAddress(picked.address);
  }, []);

  const handleDeviceContactPicked = useCallback(
    (contact: ExistingContact) => {
      alertPasteContactIntoJob(contact, {
        onYes: (mapped) => {
          applyPastedContact(
            pickJobContactPasteFields(mapped, ["name", "phone", "email", "address"]),
          );
        },
        onNo: (mapped) => {
          applyPastedContact(pickJobContactPasteFields(mapped, minimalJobContactPasteKeys(mapped)));
        },
        onChooseFields: (mapped) => {
          setPasteChooserMapped(mapped);
          setPasteChooserOpen(true);
        },
      });
    },
    [applyPastedContact],
  );

  useEffect(() => {
    const name = (params.customerName ?? "").trim();
    const phone = (params.customerPhone ?? "").trim();
    const email = (params.customerEmail ?? "").trim();
    const addr = (params.customerAddress ?? "").trim();
    const scId = (params.serviceCallId ?? "").trim();
    if (name) {
      setCustomerName(name);
      setJobName((prev) => prev.trim() || `${name} — service request`);
    }
    if (phone) setCustomerPhone(phone);
    if (email) setCustomerEmail(email);
    if (addr) setCustomerAddress(addr);
    if (scId) setServiceCallId(scId);
  }, [params]);

  const saveJob = async () => {
    if (!customerName.trim() && !jobName.trim()) {
      Alert.alert("Missing info", "Enter at least a customer name or job name.");
      return;
    }
    setSaving(true);
    try {
      const job = await addBossJob({
        customerName,
        jobName: jobName.trim() || "New job",
        address: customerAddress,
        status,
        jobPhase,
        personalTabNames: personalTabNames.length > 0 ? personalTabNames : undefined,
        personalTabStates:
          Object.keys(personalTabStates).length > 0 ? personalTabStates : undefined,
        serviceCallIds: serviceCallId ? [serviceCallId] : undefined,
      });
      router.replace(`/job-folder/job/${job.id}` as Href);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StickyScreenShell
      header={
        <StickyPageHeader
          title="New job"
          subtitle="Create a job in Job Folder. You can attach estimates, photos, and service calls from the job screen."
          fallbackHref={"/job-folder/hub/jobs-estimates" as Href}
        />
      }
    >
      <FormScrollView
        style={scStyles.scrollBody}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
      >
        <CustomerContactPicker
          value={{ name: customerName, phone: customerPhone, email: customerEmail }}
          deferAutoFillOnDevicePick
          onChange={(next) => {
            if (next.name) setCustomerName(next.name);
            if (next.phone) setCustomerPhone(next.phone);
            if (next.email) setCustomerEmail(next.email);
          }}
          onContactPicked={handleDeviceContactPicked}
        />

        <ContactPasteFieldsModal
          visible={pasteChooserOpen}
          mapped={pasteChooserMapped}
          onClose={() => {
            setPasteChooserOpen(false);
            setPasteChooserMapped(null);
          }}
          onConfirm={applyPastedContact}
        />

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Customer name</Text>
          <VoiceTextInput
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Full name or company"
            placeholderTextColor={inputPlaceholder}
            style={[styles.input, themedInput]}
            autoCapitalize="words"
            accessibilityLabel="Customer name"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Customer phone (optional)</Text>
          <VoiceTextInput
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="Mobile or main line"
            placeholderTextColor={inputPlaceholder}
            style={[styles.input, themedInput]}
            keyboardType="phone-pad"
            accessibilityLabel="Customer phone"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Customer email (optional)</Text>
          <VoiceTextInput
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="name@email.com"
            placeholderTextColor={inputPlaceholder}
            style={[styles.input, themedInput]}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Customer email"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Job name</Text>
          <VoiceTextInput
            value={jobName}
            onChangeText={setJobName}
            placeholder="Deck build, bathroom remodel, fence, etc."
            placeholderTextColor={inputPlaceholder}
            style={[styles.input, themedInput]}
            accessibilityLabel="Job name"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Job address</Text>
          <VoiceTextInput
            value={customerAddress}
            onChangeText={setCustomerAddress}
            placeholder="Street, city, state, ZIP"
            placeholderTextColor={inputPlaceholder}
            style={[styles.input, styles.textArea, themedInput]}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Job address"
          />
        </View>

        <Text style={scStyles.sectionLabel}>Status</Text>
        <View style={scStyles.chipRow}>
          {JOB_STATUSES.filter((s) => s !== "Completed").map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={[scStyles.chip, status === s && scStyles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Status ${s}`}
            >
              <Text style={[scStyles.chipText, status === s && scStyles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <CustomJobPhasePicker
          value={jobPhase}
          onChange={setJobPhase}
          jobPhases={personalTabNames}
          onJobPhasesChange={setPersonalTabNames}
          phaseStates={personalTabStates}
          onPhaseStatesChange={setPersonalTabStates}
        />

        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }, saving && { opacity: 0.6 }]}
          onPress={() => void saveJob()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save new job"
        >
          <Text style={scStyles.menuButtonText}>{saving ? "Saving…" : "Save job"}</Text>
        </Pressable>
      </FormScrollView>
    </StickyScreenShell>
  );
}

function makeStyles() {
  return StyleSheet.create({
    flex: { flex: 1 },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    field: { marginBottom: 14 },
    label: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
    input: {
      borderWidth: 0,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
    },
    textArea: { minHeight: 100 },
  });
}
