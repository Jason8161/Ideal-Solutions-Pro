import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { money } from "@/lib/accountingMoney";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { loadMaterialLines, type MaterialLine } from "@/lib/materialListStorage";
import {
  CREW_ROLE_LABELS,
  loadMyCrewSettings,
  parseNumericInput,
  rateForCrewRole,
  type CrewRoleKey,
  type MyCrewSettings,
} from "@/lib/myCrewSettings";
import {
  computeJobCostTotals,
  emptyServiceCallJobCost,
  newJobCostLaborLineId,
  newJobCostMaterialLineId,
  updateServiceCallJobCost,
  type JobCostLaborLine,
  type JobCostMaterialLine,
  type ServiceCallJobCost,
  type ServiceCallRecord,
} from "@/lib/serviceCallStorage";

const CREW_ROLES: CrewRoleKey[] = ["lead-man", "tech", "journeyman", "helper", "default"];

type Props = {
  record: ServiceCallRecord;
  onUpdated: (record: ServiceCallRecord) => void;
};

export function JobCostSection({ record, onUpdated }: Props) {
  const [crewSettings, setCrewSettings] = useState<MyCrewSettings | null>(null);
  const [jobCost, setJobCost] = useState<ServiceCallJobCost>(record.jobCost ?? emptyServiceCallJobCost());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setJobCost(record.jobCost ?? emptyServiceCallJobCost());
  }, [record.id, record.jobCost]);

  useEffect(() => {
    void loadMyCrewSettings().then(setCrewSettings);
  }, []);

  const totals = useMemo(() => computeJobCostTotals(jobCost), [jobCost]);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await updateServiceCallJobCost(record.id, jobCost);
      if (updated) {
        onUpdated(updated);
        Alert.alert("Saved", "Job cost updated for this service call.");
      }
    } catch {
      Alert.alert("Error", "Could not save job cost.");
    } finally {
      setSaving(false);
    }
  }, [jobCost, onUpdated, record.id]);

  const importMaterialList = useCallback(async () => {
    const lines = await loadMaterialLines();
    if (lines.length === 0) {
      Alert.alert("No materials", "Add items on Material List first, or enter a manual materials total.");
      return;
    }
    setJobCost((prev) => ({
      ...prev,
      useManualMaterialTotal: false,
      materialLines: materialLinesFromList(lines, prev.materialLines),
    }));
  }, []);

  const addLaborLine = useCallback(() => {
    const role: CrewRoleKey = "default";
    const rate = crewSettings ? rateForCrewRole(crewSettings, role) : "";
    setJobCost((prev) => ({
      ...prev,
      laborLines: [
        ...prev.laborLines,
        { id: newJobCostLaborLineId(), role, hours: "", ratePerHour: rate },
      ],
    }));
  }, [crewSettings]);

  const patchMaterial = useCallback((id: string, patch: Partial<JobCostMaterialLine>) => {
    setJobCost((prev) => ({
      ...prev,
      materialLines: prev.materialLines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }, []);

  const patchLabor = useCallback(
    (id: string, patch: Partial<JobCostLaborLine>) => {
      setJobCost((prev) => ({
        ...prev,
        laborLines: prev.laborLines.map((l) => {
          if (l.id !== id) return l;
          const next = { ...l, ...patch };
          if (patch.role && crewSettings) {
            next.ratePerHour = rateForCrewRole(crewSettings, patch.role);
          }
          return next;
        }),
      }));
    },
    [crewSettings],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Job cost</Text>
      <Text style={styles.hint}>Materials plus labor (hours × rate). Saved on this service call.</Text>

      <View style={styles.rowBetween}>
        <Text style={styles.label}>Manual materials total</Text>
        <Switch
          value={jobCost.useManualMaterialTotal}
          onValueChange={(v) => setJobCost((prev) => ({ ...prev, useManualMaterialTotal: v }))}
        />
      </View>

      {jobCost.useManualMaterialTotal ? (
        <VoiceTextInput
          value={jobCost.manualMaterialTotal}
          onChangeText={(t) => setJobCost((prev) => ({ ...prev, manualMaterialTotal: t }))}
          placeholder="0.00"
          placeholderTextColor="#6b7fa8"
          keyboardType="decimal-pad"
          style={styles.input}
        />
      ) : (
        <>
          <Pressable onPress={() => void importMaterialList()} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
            <Text style={styles.secondaryBtnText}>Import from material list</Text>
          </Pressable>
          {jobCost.materialLines.map((line) => (
            <View key={line.id} style={styles.lineCard}>
              <VoiceTextInput
                value={line.description}
                onChangeText={(t) => patchMaterial(line.id, { description: t })}
                placeholder="Description"
                placeholderTextColor="#6b7fa8"
                style={styles.input}
              />
              <VoiceTextInput
                value={line.amount}
                onChangeText={(t) => patchMaterial(line.id, { amount: t })}
                placeholder="Amount $"
                placeholderTextColor="#6b7fa8"
                keyboardType="decimal-pad"
                style={[styles.input, styles.inputTight]}
              />
            </View>
          ))}
          <Pressable
            onPress={() =>
              setJobCost((prev) => ({
                ...prev,
                materialLines: [
                  ...prev.materialLines,
                  { id: newJobCostMaterialLineId(), description: "", amount: "" },
                ],
              }))
            }
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
          >
            <Text style={styles.linkBtnText}>+ Add material line</Text>
          </Pressable>
        </>
      )}

      <Text style={[styles.label, styles.laborHeading]}>Labor</Text>
      {jobCost.laborLines.map((line) => (
        <View key={line.id} style={styles.lineCard}>
          <View style={styles.roleRow}>
            {CREW_ROLES.map((role) => {
              const selected = line.role === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => patchLabor(line.id, { role })}
                  style={[styles.roleChip, selected && styles.roleChipOn]}
                >
                  <Text style={[styles.roleChipText, selected && styles.roleChipTextOn]}>
                    {CREW_ROLE_LABELS[role]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.hoursRateRow}>
            <VoiceTextInput
              value={line.hours}
              onChangeText={(t) => patchLabor(line.id, { hours: t })}
              placeholder="Hours"
              placeholderTextColor="#6b7fa8"
              keyboardType="decimal-pad"
              style={[styles.input, styles.flexInput]}
            />
            <VoiceTextInput
              value={line.ratePerHour}
              onChangeText={(t) => patchLabor(line.id, { ratePerHour: t })}
              placeholder="$/hr"
              placeholderTextColor="#6b7fa8"
              keyboardType="decimal-pad"
              style={[styles.input, styles.flexInput]}
            />
          </View>
          <Text style={styles.lineSub}>
            {money(lineAmountSafe(line.hours, line.ratePerHour))}
          </Text>
        </View>
      ))}
      <Pressable onPress={addLaborLine} style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}>
        <Text style={styles.linkBtnText}>+ Add labor line</Text>
      </Pressable>

      <View style={styles.totalsCard}>
        <TotalRow label="Materials" value={money(totals.materials)} />
        <TotalRow label="Labor" value={money(totals.labor)} />
        <TotalRow label="Estimated cost" value={money(totals.total)} bold />
      </View>

      <Pressable
        onPress={() => void persist()}
        disabled={saving}
        style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, saving && styles.disabled]}
      >
        <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save job cost"}</Text>
      </Pressable>
    </View>
  );
}

function lineAmountSafe(hours: string, rate: string): number {
  return parseNumericInput(hours) * parseNumericInput(rate);
}

function materialLinesFromList(
  source: MaterialLine[],
  existing: JobCostMaterialLine[],
): JobCostMaterialLine[] {
  const imported = source.map((row) => ({
    id: newJobCostMaterialLineId(),
    description: row.text,
    amount: "",
  }));
  return [...existing, ...imported];
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.totalBold]}>{label}</Text>
      <Text style={[styles.totalValue, bold && styles.totalBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#d3e0ff", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  hint: { fontSize: 14, lineHeight: 20, color: "#94a8d6", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "700", color: "#e8eeff", marginBottom: 6 },
  laborHeading: { marginTop: 16 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  input: {
    backgroundColor: "#102C55",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3d5a8a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 8,
  },
  inputTight: { marginTop: 4 },
  lineCard: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#0f2848",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3d5a8a",
  },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#102C55",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3d5a8a",
  },
  roleChipOn: { borderColor: "#1E90FF", backgroundColor: "#1D4E89" },
  roleChipText: { fontSize: 11, fontWeight: "700", color: "#94a8d6" },
  roleChipTextOn: { color: "#ffffff" },
  hoursRateRow: { flexDirection: "row", gap: 8 },
  flexInput: { flex: 1 },
  lineSub: { fontSize: 13, color: "#c7d8ff", marginTop: 4 },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1D4E89",
    marginBottom: 10,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#1E90FF", fontSize: 15, fontWeight: "800" },
  linkBtn: { paddingVertical: 8 },
  linkBtnText: { color: "#1E90FF", fontSize: 15, fontWeight: "700" },
  totalsCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#102C55",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3d5a8a",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totalLabel: { fontSize: 15, color: "#c7d8ff" },
  totalValue: { fontSize: 15, color: "#ffffff", fontWeight: "600" },
  totalBold: { fontWeight: "800", color: "#ffffff" },
  saveBtn: {
    marginTop: 12,
    backgroundColor: "#1E90FF",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#0B1F3A", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.55 },
});
