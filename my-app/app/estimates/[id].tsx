import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { EstimateEditorForm } from "@/components/accounting/EstimateEditorForm";
import { StickyPageHeader } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { getEstimateById, saveEstimate, type EstimateRecord } from "@/lib/estimateStorage";

export default function EditEstimateScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<EstimateRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id || typeof id !== "string") return;
      void getEstimateById(id).then(setRecord);
    }, [id]),
  );

  const onSave = useCallback(async (next: EstimateRecord): Promise<EstimateRecord> => {
    const saved = await saveEstimate(next);
    setRecord(saved);
    return saved;
  }, []);

  if (!record) {
    return (
      <View style={styles.flexCenter}>
        <ActivityIndicator color={colors.text} size="large" />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StickyPageHeader title="Edit estimate" backHref="/estimates" backLabel="← Estimates" />
      <EstimateEditorForm initial={record} onSave={onSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "transparent" },
  flexCenter: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "transparent" },
  loadingText: { marginTop: 12, fontSize: 16, fontWeight: "600" },
});
