import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  addCustomJobPhase,
  loadCustomJobPhases,
  mergePersonalTabPhaseNames,
  removeCustomJobPhase,
} from "@/lib/bossMan/customJobPhases";
import {
  getPersonalTabInvoicePercent,
  getPersonalTabNeedsInvoice,
  getPersonalTabStatus,
  setPersonalTabInvoicePercent,
  setPersonalTabNeedsInvoice,
  setPersonalTabStatus,
} from "@/lib/bossMan/personalTabStates";
import type { PersonalTabStatesMap, PersonalTabStatus } from "@/lib/bossMan/types";
import { parseNumericInput } from "@/lib/myCrewSettings";

const COMPLETED_TAB_GREEN = "#22c55e";

type Props = {
  value?: string;
  onChange: (phase: string | undefined) => void;
  phaseStates?: PersonalTabStatesMap;
  onPhaseStatesChange?: (states: PersonalTabStatesMap) => void;
  /** Tab names for this job (unlimited); merged with the global library for display. */
  jobPhases?: string[];
  onJobPhasesChange?: (phases: string[]) => void;
  /** When set, Schedule opens the job scheduling screen for this job. */
  jobId?: string;
};

export function CustomJobPhasePicker({
  value,
  onChange,
  phaseStates,
  onPhaseStatesChange,
  jobPhases,
  onJobPhasesChange,
  jobId,
}: Props) {
  const { colors } = useAppTheme();
  const { scStyles } = useBossManChrome();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inputPlaceholder = useMemo(() => placeholderTextColor(colors), [colors]);

  const [phases, setPhases] = useState<string[]>([]);
  const [addDraft, setAddDraft] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [percentDraft, setPercentDraft] = useState("");
  const [showPercentInput, setShowPercentInput] = useState(false);
  const [pendingPercentPhase, setPendingPercentPhase] = useState<string | null>(null);

  const refreshPhases = useCallback(() => {
    void loadCustomJobPhases().then(setPhases);
  }, []);

  useEffect(() => {
    refreshPhases();
  }, [refreshPhases]);

  const visiblePhases = useMemo(
    () => mergePersonalTabPhaseNames(phases, jobPhases, phaseStates),
    [phases, jobPhases, phaseStates],
  );

  const appendJobPhase = (name: string) => {
    if (!onJobPhasesChange) return;
    const normalized = name.trim().replace(/\s+/g, " ");
    if (!normalized) return;
    const exists = (jobPhases ?? []).some((p) => p.toLowerCase() === normalized.toLowerCase());
    if (exists) return;
    onJobPhasesChange([...(jobPhases ?? []), normalized]);
  };

  const removeJobPhase = (phase: string) => {
    if (!onJobPhasesChange || !jobPhases?.length) return;
    const key = phase.toLowerCase();
    const next = jobPhases.filter((p) => p.toLowerCase() !== key);
    if (next.length === jobPhases.length) return;
    onJobPhasesChange(next);
  };

  const updatePhaseStatus = (phase: string, status: PersonalTabStatus) => {
    if (!onPhaseStatesChange) return;
    onPhaseStatesChange(setPersonalTabStatus(phaseStates, phase, status));
  };

  const applyInvoicePercent = (phase: string, raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setPercentDraft("");
      setShowPercentInput(false);
      setPendingPercentPhase(null);
      return;
    }
    const pct = parseNumericInput(trimmed);
    if (pct <= 0 || pct > 100) {
      Alert.alert("Invalid percent", "Enter a number from 0 to 100.");
      return;
    }
    if (!onPhaseStatesChange) return;
    onPhaseStatesChange(setPersonalTabInvoicePercent(phaseStates, phase, pct));
    setPercentDraft("");
    setShowPercentInput(false);
    setPendingPercentPhase(null);
  };

  const promptInvoicePercent = (phase: string) => {
    if (!onPhaseStatesChange) return;
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        "Invoice percent",
        `What percent of the total job cost should "${phase}" be invoiced? (0–100)`,
        [
          { text: "Skip", style: "cancel" },
          {
            text: "Save",
            onPress: (input?: string) => {
              applyInvoicePercent(phase, input ?? "");
            },
          },
        ],
        "plain-text",
        "",
        "number-pad",
      );
      return;
    }
    setPendingPercentPhase(phase);
    setPercentDraft("");
    setShowPercentInput(true);
  };

  const commitNewPhase = async (rawName: string) => {
    const name = rawName.trim();
    if (!name) return;
    const next = await addCustomJobPhase(name);
    setPhases(next);
    appendJobPhase(name);
    onChange(name);
    setAddDraft("");
    setShowAddInput(false);
    promptInvoicePercent(name);
  };

  const promptNewPhase = () => {
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        "New personal tab",
        "Name this job phase (e.g. Rough in, Trim out, Final).",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add",
            onPress: (input?: string) => {
              void commitNewPhase(input ?? "");
            },
          },
        ],
        "plain-text",
        "",
      );
      return;
    }
    setShowAddInput(true);
  };

  const confirmRemovePhase = (phase: string) => {
    Alert.alert("Remove tab?", `"${phase}" will be removed from your personal tabs.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeCustomJobPhase(phase).then((next) => {
            setPhases(next);
            removeJobPhase(phase);
            if (value?.toLowerCase() === phase.toLowerCase()) onChange(undefined);
          });
        },
      },
    ]);
  };

  const schedulePhase = (phase: string) => {
    onChange(phase);
    updatePhaseStatus(phase, "scheduled");
    if (jobId) {
      router.push(`/job-folder/schedule?jobId=${encodeURIComponent(jobId)}` as Href);
    }
  };

  const completePhase = (phase: string) => {
    onChange(phase);
    updatePhaseStatus(phase, "completed");
  };

  const flagPhaseNeedsInvoice = (phase: string) => {
    onChange(phase);
    if (!onPhaseStatesChange) return;
    onPhaseStatesChange(setPersonalTabNeedsInvoice(phaseStates, phase, true));
  };

  const openCreateInvoice = (phase: string) => {
    onChange(phase);
    if (jobId) {
      router.push(
        `/job-folder/invoices/invoice-edit?jobId=${encodeURIComponent(jobId)}` as Href,
      );
      return;
    }
    flagPhaseNeedsInvoice(phase);
    Alert.alert(
      "Save job first",
      "This tab is flagged for invoicing. Save the job, then open it and use Create invoice to build and send.",
    );
  };

  const promptInvoiceForPhase = (phase: string) => {
    Alert.alert(
      "Invoice",
      "Create and send an invoice now, or flag this tab for invoicing?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Create & send invoice", onPress: () => openCreateInvoice(phase) },
        { text: "Needs invoice", onPress: () => flagPhaseNeedsInvoice(phase) },
      ],
    );
  };

  const promptPhaseAction = (phase: string) => {
    Alert.alert(phase, "Schedule, complete, or handle invoicing for this phase.", [
      { text: "Cancel", style: "cancel" },
      { text: "Schedule", onPress: () => schedulePhase(phase) },
      { text: "Mark complete", onPress: () => completePhase(phase) },
      {
        text: "Invoice needs to be made and sent",
        onPress: () => promptInvoiceForPhase(phase),
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={scStyles.sectionLabel}>Personal tabs</Text>
      <Text style={styles.hint}>Track where you are on the job — rough-in, trim-out, final, etc.</Text>
      <View style={[scStyles.chipRow, styles.chipRow]}>
        {visiblePhases.map((phase) => {
          const active = value?.toLowerCase() === phase.toLowerCase();
          const tabStatus = getPersonalTabStatus(phaseStates, phase);
          const needsInvoice = getPersonalTabNeedsInvoice(phaseStates, phase);
          const invoicePercent = getPersonalTabInvoicePercent(phaseStates, phase);
          const completed = tabStatus === "completed";
          const scheduled = tabStatus === "scheduled";
          return (
            <Pressable
              key={phase}
              onPress={() => promptPhaseAction(phase)}
              onLongPress={() => confirmRemovePhase(phase)}
              style={[
                scStyles.chip,
                active && scStyles.chipActive,
                scheduled && !completed && styles.scheduledChip,
                needsInvoice && !completed && styles.needsInvoiceChip,
                completed && styles.completedChip,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Job phase ${phase}, ${tabStatus}${
                invoicePercent != null ? `, ${invoicePercent}% to invoice` : ""
              }`}
              accessibilityHint="Long press to remove this tab"
            >
              <Text
                style={[
                  scStyles.chipText,
                  active && scStyles.chipTextActive,
                  completed && styles.completedChipText,
                ]}
              >
                {phase}
              </Text>
              {invoicePercent != null ? (
                <Text
                  style={[
                    styles.chipSubtitle,
                    active && styles.chipSubtitleActive,
                    completed && styles.completedChipSubtitle,
                  ]}
                >
                  {invoicePercent}% to invoice
                </Text>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={promptNewPhase}
          style={[scStyles.chip, styles.addChip]}
          accessibilityRole="button"
          accessibilityLabel="Add personal tab"
        >
          <Text style={[scStyles.chipText, styles.addChipText]}>+ Add tab</Text>
        </Pressable>
      </View>

      {showPercentInput && pendingPercentPhase ? (
        <View style={styles.addRow}>
          <VoiceTextInput
            value={percentDraft}
            onChangeText={setPercentDraft}
            placeholder={`% of job for "${pendingPercentPhase}"`}
            placeholderTextColor={inputPlaceholder}
            style={styles.addInput}
            autoFocus
            maxLength={5}
            keyboardType="number-pad"
            onSubmitEditing={() => applyInvoicePercent(pendingPercentPhase, percentDraft)}
            returnKeyType="done"
            accessibilityLabel="Invoice percent of total job cost"
          />
          <Pressable
            style={styles.addSave}
            onPress={() => applyInvoicePercent(pendingPercentPhase, percentDraft)}
            accessibilityRole="button"
            accessibilityLabel="Save invoice percent"
          >
            <Text style={styles.addSaveText}>Save</Text>
          </Pressable>
          <Pressable
            style={styles.addCancel}
            onPress={() => {
              setShowPercentInput(false);
              setPendingPercentPhase(null);
              setPercentDraft("");
            }}
            accessibilityRole="button"
            accessibilityLabel="Skip invoice percent"
          >
            <Text style={styles.addCancelText}>Skip</Text>
          </Pressable>
        </View>
      ) : null}

      {showAddInput ? (
        <View style={styles.addRow}>
          <VoiceTextInput
            value={addDraft}
            onChangeText={setAddDraft}
            placeholder="Tab name"
            placeholderTextColor={inputPlaceholder}
            style={styles.addInput}
            autoFocus
            maxLength={40}
            onSubmitEditing={() => void commitNewPhase(addDraft)}
            returnKeyType="done"
            accessibilityLabel="New personal tab name"
          />
          <Pressable
            style={styles.addSave}
            onPress={() => void commitNewPhase(addDraft)}
            accessibilityRole="button"
            accessibilityLabel="Save new tab"
          >
            <Text style={styles.addSaveText}>Add</Text>
          </Pressable>
          <Pressable
            style={styles.addCancel}
            onPress={() => {
              setShowAddInput(false);
              setAddDraft("");
            }}
            accessibilityRole="button"
            accessibilityLabel="Cancel new tab"
          >
            <Text style={styles.addCancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: import("@/lib/colorSchemeStorage").ColorScheme) {
  return StyleSheet.create({
    wrap: { marginBottom: 8 },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    hint: {
      color: hexToRgba(colors.text, 0.65),
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 8,
      marginTop: -4,
    },
    scheduledChip: {
      borderWidth: 1,
      borderColor: hexToRgba(colors.text, 0.35),
    },
    needsInvoiceChip: {
      borderWidth: 1,
      borderColor: "#f59e0b",
      borderStyle: "dashed",
    },
    completedChip: {
      backgroundColor: hexToRgba(COMPLETED_TAB_GREEN, 0.5),
      borderWidth: 1,
      borderColor: COMPLETED_TAB_GREEN,
    },
    completedChipText: {
      color: colors.text,
      opacity: 1,
    },
    chipSubtitle: {
      color: hexToRgba(colors.text, 0.55),
      fontSize: 10,
      fontWeight: "600",
      marginTop: 2,
    },
    chipSubtitleActive: {
      color: hexToRgba(colors.text, 0.75),
    },
    completedChipSubtitle: {
      color: hexToRgba(colors.text, 0.85),
    },
    addChip: {
      borderStyle: "dashed",
    },
    addChipText: {
      opacity: 0.9,
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    addInput: {
      flex: 1,
      borderWidth: 0,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: hexToRgba(colors.text, 0.08),
    },
    addSave: {
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    addSaveText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 15,
    },
    addCancel: {
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    addCancelText: {
      color: hexToRgba(colors.text, 0.7),
      fontWeight: "600",
      fontSize: 15,
    },
  });
}
