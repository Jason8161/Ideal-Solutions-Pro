import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { formatBossMoney } from "@/lib/bossMan/money";
import { getBossJobById } from "@/lib/bossMan/jobStorage";
import {
  PAYMENT_DRAW_PRESETS,
  PAYMENT_DRAW_STATUS_LABELS,
  addPaymentDrawToJob,
  createPaymentDraw,
  formatDrawAmountSummary,
  getJobPaymentDraws,
  jobHasDrawLabel,
  removePaymentDrawFromJob,
  saveJobPaymentDraws,
  sumDrawAmounts,
} from "@/lib/bossMan/paymentDraws";
import type { BossJob, PaymentDraw, PaymentDrawStatus } from "@/lib/bossMan/types";
import { parseNumericInput } from "@/lib/myCrewSettings";

const PAID_GREEN = "#22c55e";
const REQUESTED_AMBER = "#f59e0b";

export default function BossJobPaymentDrawsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { scStyles, styles: bossStyles } = useBossManChrome();
  const localStyles = useMemo(() => makeStyles(colors), [colors]);
  const inputPlaceholder = useMemo(() => placeholderTextColor(colors), [colors]);

  const [job, setJob] = useState<BossJob | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadJob = useCallback(() => {
    if (!id || typeof id !== "string") return;
    void getBossJobById(id).then((row) => {
      setJob(row);
      setLoaded(true);
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadJob();
    }, [loadJob]),
  );

  const draws = job ? getJobPaymentDraws(job) : [];
  const jobTotal = job?.estimateTotal ?? 0;
  const scheduledTotal = sumDrawAmounts(draws, jobTotal);
  const backHref = id ? (`/job-folder/job/${id}` as Href) : ("/job-folder/current-jobs" as Href);
  const jobTitle = job?.jobName.trim() || job?.customerName.trim() || "Job";

  const persistDraws = async (next: PaymentDraw[]) => {
    if (!id || typeof id !== "string") return;
    setSaving(true);
    try {
      const updated = await saveJobPaymentDraws(id, next);
      if (updated) setJob(updated);
    } finally {
      setSaving(false);
    }
  };

  const addPreset = async (label: string) => {
    if (!id || typeof id !== "string" || !job) return;
    if (jobHasDrawLabel(draws, label)) {
      Alert.alert("Already added", `"${label}" is already on this job's draw schedule.`);
      return;
    }
    const updated = await addPaymentDrawToJob(id, createPaymentDraw(label));
    if (updated) setJob(updated);
  };

  const commitCustomDraw = async (rawName: string) => {
    const name = rawName.trim();
    if (!name || !id || typeof id !== "string") return;
    if (jobHasDrawLabel(draws, name)) {
      Alert.alert("Already added", `"${name}" is already on this draw schedule.`);
      return;
    }
    const updated = await addPaymentDrawToJob(id, createPaymentDraw(name));
    if (updated) {
      setJob(updated);
      setCustomDraft("");
      setShowCustomInput(false);
    }
  };

  const promptCustomDraw = () => {
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        "Custom payment draw",
        "Name this draw (e.g. Deposit, Rough-in balance).",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add",
            onPress: (input?: string) => {
              void commitCustomDraw(input ?? "");
            },
          },
        ],
        "plain-text",
        "",
      );
      return;
    }
    setShowCustomInput(true);
  };

  const setDrawStatus = (drawId: string, status: PaymentDrawStatus) => {
    void persistDraws(
      draws.map((d) => (d.id === drawId ? { ...d, status } : d)),
    );
  };

  const promptDrawStatus = (draw: PaymentDraw) => {
    Alert.alert(draw.label, "Update billing status for this draw.", [
      { text: "Cancel", style: "cancel" },
      { text: "Pending", onPress: () => setDrawStatus(draw.id, "pending") },
      { text: "Requested", onPress: () => setDrawStatus(draw.id, "requested") },
      { text: "Paid", onPress: () => setDrawStatus(draw.id, "paid") },
    ]);
  };

  const promptDrawAmount = (draw: PaymentDraw) => {
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        draw.label,
        "Fixed amount in dollars (leave blank to clear).",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (input?: string) => {
              const amount = parseNumericInput(input ?? "");
              void persistDraws(
                draws.map((d) =>
                  d.id === draw.id
                    ? {
                        ...d,
                        amount: amount > 0 ? amount : undefined,
                        percent: amount > 0 ? undefined : d.percent,
                      }
                    : d,
                ),
              );
            },
          },
        ],
        "plain-text",
        draw.amount != null ? String(draw.amount) : "",
        "decimal-pad",
      );
      return;
    }
    Alert.alert(
      draw.label,
      "Edit amount on web/desktop soon. Set a percent from the job estimate on the job detail screen.",
    );
  };

  const promptDrawPercent = (draw: PaymentDraw) => {
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        draw.label,
        "Percent of job estimate (0–100).",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (input?: string) => {
              const pct = parseNumericInput(input ?? "");
              void persistDraws(
                draws.map((d) =>
                  d.id === draw.id
                    ? {
                        ...d,
                        percent: pct > 0 && pct <= 100 ? pct : undefined,
                        amount: pct > 0 ? undefined : d.amount,
                      }
                    : d,
                ),
              );
            },
          },
        ],
        "plain-text",
        draw.percent != null ? String(draw.percent) : "",
        "number-pad",
      );
      return;
    }
    Alert.alert(draw.label, "Percent editing is available on iOS in this build.");
  };

  const confirmRemoveDraw = (draw: PaymentDraw) => {
    if (!id || typeof id !== "string") return;
    Alert.alert("Remove draw?", `"${draw.label}" will be removed from this job.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removePaymentDrawFromJob(id, draw.id).then((updated) => {
            if (updated) setJob(updated);
          });
        },
      },
    ]);
  };

  const openCreateInvoice = (draw: PaymentDraw) => {
    if (!id || typeof id !== "string") return;
    router.push(
      `/job-folder/invoices/invoice-edit?jobId=${encodeURIComponent(id)}&drawId=${encodeURIComponent(draw.id)}` as Href,
    );
  };

  const openLinkedInvoice = (draw: PaymentDraw) => {
    if (!draw.invoiceId) return;
    router.push(`/job-folder/invoices/invoice-edit?id=${draw.invoiceId}` as Href);
  };

  if (!loaded) {
    return (
      <ScStickyScroll title="Payment draws" subtitle="Loading…" backHref={backHref}>
        <Text style={scStyles.emptyText}>Loading…</Text>
      </ScStickyScroll>
    );
  }

  if (!job) {
    return (
      <ScStickyScroll title="Payment draws" backHref="/job-folder/current-jobs">
        <Text style={scStyles.emptyText}>Job not found.</Text>
        <Pressable
          style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.replace("/job-folder/current-jobs" as Href)}
        >
          <Text style={scStyles.menuButtonText}>Back to current jobs</Text>
        </Pressable>
      </ScStickyScroll>
    );
  }

  return (
    <ScStickyScroll
      title="Payment draws"
      subtitle={`${jobTitle} · ${formatBossMoney(jobTotal)}`}
      backHref={backHref}
    >
      <Text style={localStyles.hint}>
        Set up progress billing — rough-in, trim-out, final, or your own draws. Mark requested when
        invoiced and paid when collected.
      </Text>

      <Text style={scStyles.sectionLabel}>Schedule total</Text>
      <Text style={scStyles.subtitle}>
        {scheduledTotal > 0
          ? `${formatBossMoney(scheduledTotal)} scheduled across ${draws.length} draw${draws.length === 1 ? "" : "s"}`
          : draws.length > 0
            ? `${draws.length} draw${draws.length === 1 ? "" : "s"} — set amounts or percents below`
            : "No draws yet — add presets or a custom draw"}
      </Text>

      <Text style={scStyles.sectionLabel}>Add preset</Text>
      <View style={scStyles.chipRow}>
        {PAYMENT_DRAW_PRESETS.map((label) => {
          const exists = jobHasDrawLabel(draws, label);
          return (
            <Pressable
              key={label}
              disabled={exists || saving}
              onPress={() => void addPreset(label)}
              style={[
                scStyles.chip,
                exists && localStyles.chipDisabled,
                !exists && localStyles.presetChip,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Add ${label} draw`}
              accessibilityState={{ disabled: exists }}
            >
              <Text style={[scStyles.chipText, exists && localStyles.chipDisabledText]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={promptCustomDraw}
          style={[scStyles.chip, localStyles.addChip]}
          accessibilityRole="button"
          accessibilityLabel="Add custom draw"
        >
          <Text style={scStyles.chipText}>+ Custom</Text>
        </Pressable>
      </View>

      {showCustomInput ? (
        <View style={localStyles.addRow}>
          <VoiceTextInput
            value={customDraft}
            onChangeText={setCustomDraft}
            placeholder="Draw name"
            placeholderTextColor={inputPlaceholder}
            style={localStyles.addInput}
            autoFocus
            maxLength={48}
            onSubmitEditing={() => void commitCustomDraw(customDraft)}
            returnKeyType="done"
          />
          <Pressable
            style={localStyles.addSave}
            onPress={() => void commitCustomDraw(customDraft)}
            accessibilityRole="button"
          >
            <Text style={localStyles.addSaveText}>Add</Text>
          </Pressable>
          <Pressable
            style={localStyles.addCancel}
            onPress={() => {
              setShowCustomInput(false);
              setCustomDraft("");
            }}
            accessibilityRole="button"
          >
            <Text style={localStyles.addCancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={[scStyles.sectionLabel, { marginTop: 8 }]}>Draws on this job</Text>
      {draws.length === 0 ? (
        <Text style={scStyles.emptyText}>No payment draws yet. Tap a preset or add a custom draw.</Text>
      ) : (
        draws.map((draw) => (
          <View
            key={draw.id}
            style={[
              scStyles.card,
              draw.status === "paid" && localStyles.cardPaid,
              draw.status === "requested" && localStyles.cardRequested,
            ]}
          >
            <View style={localStyles.cardHeader}>
              <Text style={scStyles.cardTitle}>{draw.label}</Text>
              <Pressable
                onPress={() => promptDrawStatus(draw)}
                style={[
                  localStyles.statusBadge,
                  draw.status === "paid" && localStyles.statusPaid,
                  draw.status === "requested" && localStyles.statusRequested,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Status ${PAYMENT_DRAW_STATUS_LABELS[draw.status]}, tap to change`}
              >
                <Text style={localStyles.statusBadgeText}>
                  {PAYMENT_DRAW_STATUS_LABELS[draw.status]}
                </Text>
              </Pressable>
            </View>
            <Text style={scStyles.cardMeta}>{formatDrawAmountSummary(draw, jobTotal)}</Text>
            {draw.dueDate ? (
              <Text style={scStyles.cardMeta}>Due {draw.dueDate}</Text>
            ) : null}
            {draw.invoiceId ? (
              <Pressable onPress={() => openLinkedInvoice(draw)} accessibilityRole="link">
                <Text style={localStyles.linkText}>View linked invoice</Text>
              </Pressable>
            ) : null}

            <View style={localStyles.actionRow}>
              <Pressable
                style={({ pressed }) => [localStyles.smallBtn, pressed && { opacity: 0.85 }]}
                onPress={() => promptDrawAmount(draw)}
              >
                <Text style={localStyles.smallBtnText}>Amount $</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [localStyles.smallBtn, pressed && { opacity: 0.85 }]}
                onPress={() => promptDrawPercent(draw)}
              >
                <Text style={localStyles.smallBtnText}>Percent %</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [localStyles.smallBtn, pressed && { opacity: 0.85 }]}
                onPress={() => setDrawStatus(draw.id, "requested")}
              >
                <Text style={localStyles.smallBtnText}>Requested</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [localStyles.smallBtn, pressed && { opacity: 0.85 }]}
                onPress={() => setDrawStatus(draw.id, "paid")}
              >
                <Text style={localStyles.smallBtnText}>Paid</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 8 }]}
              onPress={() => openCreateInvoice(draw)}
            >
              <Text style={scStyles.menuButtonText}>
                {draw.invoiceId ? "Create another invoice" : "Create invoice for this draw"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => confirmRemoveDraw(draw)}
              style={localStyles.removeLink}
              accessibilityRole="button"
            >
              <Text style={localStyles.removeText}>Remove draw</Text>
            </Pressable>
          </View>
        ))
      )}

      <Pressable
        style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 12 }]}
        onPress={() => router.push(backHref)}
      >
        <Text style={scStyles.menuButtonText}>Back to job</Text>
      </Pressable>
    </ScStickyScroll>
  );
}

function makeStyles(colors: import("@/lib/colorSchemeStorage").ColorScheme) {
  return StyleSheet.create({
    hint: {
      color: hexToRgba(colors.text, 0.65),
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
    },
    presetChip: {
      borderStyle: "solid",
    },
    addChip: {
      borderStyle: "dashed",
    },
    chipDisabled: {
      opacity: 0.45,
    },
    chipDisabledText: {
      opacity: 0.7,
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    addInput: {
      flex: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: hexToRgba(colors.text, 0.08),
    },
    addSave: { paddingVertical: 10, paddingHorizontal: 12 },
    addSaveText: { color: colors.text, fontWeight: "700", fontSize: 15 },
    addCancel: { paddingVertical: 10, paddingHorizontal: 8 },
    addCancelText: { color: hexToRgba(colors.text, 0.7), fontWeight: "600", fontSize: 15 },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    cardPaid: {
      borderWidth: 1,
      borderColor: PAID_GREEN,
    },
    cardRequested: {
      borderWidth: 1,
      borderColor: REQUESTED_AMBER,
      borderStyle: "dashed",
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: hexToRgba(colors.text, 0.12),
    },
    statusPaid: {
      backgroundColor: hexToRgba(PAID_GREEN, 0.35),
    },
    statusRequested: {
      backgroundColor: hexToRgba(REQUESTED_AMBER, 0.25),
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    linkText: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: "600",
      color: colors.accent,
    },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    smallBtn: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: hexToRgba(colors.text, 0.1),
    },
    smallBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    removeLink: { marginTop: 10, alignSelf: "flex-start" },
    removeText: {
      fontSize: 14,
      fontWeight: "600",
      color: hexToRgba(colors.text, 0.65),
    },
  });
}
