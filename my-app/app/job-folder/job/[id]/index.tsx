import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { CustomJobPhasePicker } from "@/components/bossMan/CustomJobPhasePicker";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { StickyPageHeader, StickyScreenShell } from "@/components/serviceCalls/screenChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { pickImageFromLibrary } from "@/lib/companyLogoPicker";
import { formatBossMoney } from "@/lib/bossMan/money";
import { addBossJobPhoto, getBossJobById, removeBossJobPhoto, updateBossJob } from "@/lib/bossMan/jobStorage";
import {
  PAYMENT_DRAW_STATUS_LABELS,
  getJobPaymentDraws,
} from "@/lib/bossMan/paymentDraws";
import { JOB_STATUSES, type BossJob, type JobStatus, type PersonalTabStatesMap } from "@/lib/bossMan/types";
import { parseNumericInput } from "@/lib/myCrewSettings";
import { isProTier } from "@/lib/subscriptionGating";
import { isEmployeeSessionActive } from "@/lib/employeeSession";

export default function BossJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { activeTier } = useSubscription();
  const { scStyles, styles: bossStyles } = useBossManChrome();
  const fieldStyles = useMemo(() => makeFieldStyles(colors), [colors]);
  const photoStyles = useMemo(() => makePhotoStyles(colors), [colors]);

  const [job, setJob] = useState<BossJob | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [jobName, setJobName] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<JobStatus>("New");
  const [jobPhase, setJobPhase] = useState<string | undefined>();
  const [personalTabNames, setPersonalTabNames] = useState<string[]>([]);
  const [personalTabStates, setPersonalTabStates] = useState<PersonalTabStatesMap>({});
  const [estimateTotal, setEstimateTotal] = useState("");
  const [paid, setPaid] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [employeeMode, setEmployeeMode] = useState(false);

  const loadJob = useCallback(() => {
    if (!id || typeof id !== "string") return;
    void Promise.all([getBossJobById(id), isEmployeeSessionActive()]).then(([row, emp]) => {
      setEmployeeMode(emp);
      if (!row) {
        setLoaded(true);
        return;
      }
      setJob(row);
      setCustomerName(row.customerName);
      setJobName(row.jobName);
      setAddress(row.address);
      setStatus(row.status);
      setJobPhase(row.jobPhase);
      setPersonalTabNames(row.personalTabNames ?? []);
      setPersonalTabStates(row.personalTabStates ?? {});
      setEstimateTotal(String(row.estimateTotal || ""));
      setPaid(row.paid);
      setLoaded(true);
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadJob();
    }, [loadJob]),
  );

  const saveFields = async () => {
    if (!id || typeof id !== "string") return;
    const updated = await updateBossJob(id, {
      customerName,
      jobName,
      address,
      status,
      jobPhase,
      personalTabNames: personalTabNames.length > 0 ? personalTabNames : undefined,
      personalTabStates:
        Object.keys(personalTabStates).length > 0 ? personalTabStates : undefined,
      estimateTotal: parseNumericInput(estimateTotal),
      paid,
    });
    if (updated) {
      setJob(updated);
      Alert.alert("Saved", "Job details updated.");
    }
  };

  const addPhoto = async () => {
    if (!id || typeof id !== "string") return;
    const uri = await pickImageFromLibrary();
    if (!uri) return;
    const updated = await addBossJobPhoto(id, uri);
    if (updated) setJob(updated);
  };

  const removePhoto = (uri: string) => {
    if (!id || typeof id !== "string") return;
    Alert.alert("Remove photo?", "This photo will be removed from the job.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeBossJobPhoto(id, uri).then((updated) => {
            if (updated) setJob(updated);
          });
        },
      },
    ]);
  };

  if (!loaded) {
    return (
      <StickyScreenShell
        header={<StickyPageHeader title="Job" fallbackHref="/job-folder/current-jobs" />}
      >
        <ScrollView style={scStyles.scrollBody} contentContainerStyle={scStyles.content}>
          <Text style={scStyles.emptyText}>Loading…</Text>
        </ScrollView>
      </StickyScreenShell>
    );
  }

  if (!job) {
    return (
      <StickyScreenShell
        header={<StickyPageHeader title="Job" fallbackHref="/job-folder/current-jobs" />}
      >
        <ScrollView style={scStyles.scrollBody} contentContainerStyle={scStyles.content}>
        <Text style={scStyles.emptyText}>Job not found.</Text>
        <Pressable style={bossStyles.actionBtn} onPress={() => router.replace("/job-folder/current-jobs" as Href)}>
          <Text style={scStyles.menuButtonText}>Back to current jobs</Text>
        </Pressable>
        </ScrollView>
      </StickyScreenShell>
    );
  }

  if (employeeMode) {
    return (
      <StickyScreenShell
        header={
          <StickyPageHeader
            title={jobName.trim() || customerName.trim() || "Job"}
            subtitle={`${status}${jobPhase?.trim() ? ` · ${jobPhase.trim()}` : ""}`}
            fallbackHref="/job-folder/current-jobs"
          />
        }
      >
        <ScrollView style={scStyles.scrollBody} contentContainerStyle={scStyles.content}>
          <Field label="Customer" styles={fieldStyles}>
            <Text style={fieldStyles.readOnly}>{customerName.trim() || "—"}</Text>
          </Field>
          <Field label="Job name" styles={fieldStyles}>
            <Text style={fieldStyles.readOnly}>{jobName.trim() || "—"}</Text>
          </Field>
          <Field label="Address" styles={fieldStyles}>
            <Text style={fieldStyles.readOnly}>{address.trim() || "—"}</Text>
          </Field>
          <Field label="Status" styles={fieldStyles}>
            <Text style={fieldStyles.readOnly}>{status}</Text>
          </Field>
          {jobPhase?.trim() ? (
            <Field label="Phase" styles={fieldStyles}>
              <Text style={fieldStyles.readOnly}>{jobPhase.trim()}</Text>
            </Field>
          ) : null}

          <Text style={scStyles.sectionLabel}>Stored notes</Text>
          {job.notes.length === 0 ? (
            <Text style={scStyles.emptyText}>No notes saved yet.</Text>
          ) : (
            [...job.notes]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((note: BossJob["notes"][number]) => (
                <View key={note.id} style={scStyles.card}>
                  <Text style={scStyles.cardMeta}>{formatNoteTimestamp(note.createdAt)}</Text>
                  <Text style={[scStyles.cardTitle, { marginTop: 4, fontWeight: "600" }]}>{note.text}</Text>
                </View>
              ))
          )}
          <Pressable
            style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.push(`/job-folder/job/${id}/notes` as Href)}
          >
            <Text style={scStyles.menuButtonText}>Add note</Text>
          </Pressable>

          <Text style={scStyles.sectionLabel}>Photos</Text>
          {job.photoUris.length === 0 ? (
            <Text style={scStyles.emptyText}>No photos yet.</Text>
          ) : (
            job.photoUris.map((uri: string, index: number) => (
              <View key={`${uri}-${index}`} style={photoStyles.block}>
                <Image
                  source={{ uri }}
                  style={photoStyles.image}
                  resizeMode="cover"
                  accessibilityLabel="Job photo"
                />
              </View>
            ))
          )}
          <Pressable style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]} onPress={() => void addPhoto()}>
            <Text style={scStyles.menuButtonText}>Add photo</Text>
          </Pressable>
        </ScrollView>
      </StickyScreenShell>
    );
  }

  return (
    <StickyScreenShell
      header={
        <StickyPageHeader
          title={jobName.trim() || customerName.trim() || "Job"}
          subtitle={`Estimate ${formatBossMoney(job.estimateTotal)} · ${job.paid ? "Paid" : "Unpaid"}`}
          fallbackHref="/job-folder/current-jobs"
        />
      }
    >
      <FormScrollView
        style={scStyles.scrollBody}
        contentContainerStyle={scStyles.content}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
      >
        <Field label="Customer name" styles={fieldStyles}>
          <VoiceTextInput
            value={customerName}
            onChangeText={setCustomerName}
            style={fieldStyles.input}
            placeholderTextColor={placeholderTextColor(colors)}
            placeholder="Customer or company"
          />
        </Field>
        <Field label="Job name" styles={fieldStyles}>
          <VoiceTextInput
            value={jobName}
            onChangeText={setJobName}
            style={fieldStyles.input}
            placeholderTextColor={placeholderTextColor(colors)}
            placeholder="Job title"
          />
        </Field>
        <Field label="Address" styles={fieldStyles}>
          <VoiceTextInput
            value={address}
            onChangeText={setAddress}
            style={[fieldStyles.input, fieldStyles.textArea]}
            multiline
            placeholderTextColor={placeholderTextColor(colors)}
            placeholder="Street, city, state, ZIP"
          />
        </Field>
        <Field label="Estimate total ($)" styles={fieldStyles}>
          <VoiceTextInput
            value={estimateTotal}
            onChangeText={setEstimateTotal}
            style={fieldStyles.input}
            keyboardType="decimal-pad"
            placeholderTextColor={placeholderTextColor(colors)}
          />
        </Field>

        <Text style={scStyles.sectionLabel}>Status</Text>
        <View style={scStyles.chipRow}>
          {JOB_STATUSES.filter((s) => s !== "Completed").map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={[scStyles.chip, status === s && scStyles.chipActive]}
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
          jobId={typeof id === "string" ? id : undefined}
        />

        <View style={fieldStyles.paidRow}>
          <Text style={fieldStyles.label}>Paid</Text>
          <Switch value={paid} onValueChange={setPaid} trackColor={{ true: colors.accent }} />
        </View>

        <Pressable style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]} onPress={() => void saveFields()}>
          <Text style={scStyles.menuButtonText}>Save job</Text>
        </Pressable>

        <Text style={scStyles.sectionLabel}>Job report</Text>
        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push(`/job-folder/job/${id}/report` as Href)}
        >
          <Text style={scStyles.menuButtonText}>View job report</Text>
        </Pressable>

        <Text style={scStyles.sectionLabel}>Payment draws</Text>
        {getJobPaymentDraws(job).length === 0 ? (
          <Text style={scStyles.emptyText}>
            No progress billing draws yet. Set up rough-in, trim-out, final, or custom milestones.
          </Text>
        ) : (
          getJobPaymentDraws(job).map((draw) => (
            <View key={draw.id} style={scStyles.card}>
              <Text style={scStyles.cardTitle}>{draw.label}</Text>
              <Text style={scStyles.cardMeta}>
                {PAYMENT_DRAW_STATUS_LABELS[draw.status]}
              </Text>
            </View>
          ))
        )}
        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push(`/job-folder/job/${id}/draws` as Href)}
        >
          <Text style={scStyles.menuButtonText}>Manage payment draws</Text>
        </Pressable>

        <Text style={scStyles.sectionLabel}>Invoices</Text>
        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push(`/job-folder/invoices?jobId=${id}` as Href)}
        >
          <Text style={scStyles.menuButtonText}>View job invoices</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push(`/job-folder/invoices/invoice-edit?jobId=${id}` as Href)}
        >
          <Text style={scStyles.menuButtonText}>Create invoice for this job</Text>
        </Pressable>

        {isProTier(activeTier) ? (
          <>
            <Text style={scStyles.sectionLabel}>Time & payroll</Text>
            <Pressable
              style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
              onPress={() => router.push(`/job-folder/time-payroll?jobId=${id}` as Href)}
            >
              <Text style={scStyles.menuButtonText}>Clock time on this job</Text>
            </Pressable>
          </>
        ) : null}

        <Text style={scStyles.sectionLabel}>Stored notes</Text>
        {job.notes.length === 0 ? (
          <Text style={scStyles.emptyText}>No notes saved yet.</Text>
        ) : (
          [...job.notes]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((note: BossJob["notes"][number]) => (
              <View key={note.id} style={scStyles.card}>
                <Text style={scStyles.cardMeta}>{formatNoteTimestamp(note.createdAt)}</Text>
                <Text style={[scStyles.cardTitle, { marginTop: 4, fontWeight: "600" }]}>{note.text}</Text>
              </View>
            ))
        )}
        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push(`/job-folder/job/${id}/notes` as Href)}
        >
          <Text style={scStyles.menuButtonText}>Add note</Text>
        </Pressable>

        <Text style={scStyles.sectionLabel}>Photos</Text>
        {job.photoUris.map((uri: string, index: number) => (
          <View key={`${uri}-${index}`} style={photoStyles.block}>
            <Image
              source={{ uri }}
              style={photoStyles.image}
              resizeMode="cover"
              accessibilityLabel="Job photo"
            />
            <Pressable
              style={({ pressed }) => [photoStyles.removeBtn, pressed && { opacity: 0.85 }]}
              onPress={() => removePhoto(uri)}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Text style={photoStyles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Pressable style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]} onPress={() => void addPhoto()}>
          <Text style={scStyles.menuButtonText}>Add photo</Text>
        </Pressable>
      </FormScrollView>
    </StickyScreenShell>
  );
}

function formatNoteTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Field({
  label,
  styles,
  children,
}: {
  label: string;
  styles: ReturnType<typeof makeFieldStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function makePhotoStyles(colors: import("@/lib/colorSchemeStorage").ColorScheme) {
  return StyleSheet.create({
    block: { marginBottom: 10 },
    image: { width: "100%", height: 180, borderRadius: 12 },
    removeBtn: {
      alignSelf: "flex-end",
      marginTop: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "transparent",
    },
    removeText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  });
}

function makeFieldStyles(colors: import("@/lib/colorSchemeStorage").ColorScheme) {
  return StyleSheet.create({
    field: { marginBottom: 14 },
    label: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 },
    input: {
      ...inputStyle(colors),
    },
    textArea: { minHeight: 88, textAlignVertical: "top" },
    readOnly: { fontSize: 16, color: colors.text, lineHeight: 22 },
    paidRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: 12,
    },
  });
}
