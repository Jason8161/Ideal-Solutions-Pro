import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import {
  EXTERNAL_BACKUP_OPTIONS,
  LOCAL_ONLY_DISCLAIMER,
  type ExternalBackupProvider,
  type StorageBackupPreferences,
} from "@/lib/subscriptions/storagePolicy";
import {
  loadStorageBackupPreferences,
  saveStorageBackupPreferences,
} from "@/lib/subscriptions/storagePrefsStorage";

export default function StorageBackupSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<StorageBackupPreferences | null>(null);

  const refresh = useCallback(async () => {
    setPrefs(await loadStorageBackupPreferences());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggleProvider(id: ExternalBackupProvider) {
    if (!prefs) return;
    const has = prefs.providers.includes(id);
    const providers = has ? prefs.providers.filter((p) => p !== id) : [...prefs.providers, id];
    const usesExternalBackup = providers.some((p) => p !== "none");
    const next: StorageBackupPreferences = {
      ...prefs,
      providers,
      usesExternalBackup,
      acknowledgedLocalOnly: true,
    };
    await saveStorageBackupPreferences(next);
    setPrefs(next);
  }

  async function acknowledgeLocalOnly() {
    if (!prefs) return;
    const next = { ...prefs, acknowledgedLocalOnly: true };
    await saveStorageBackupPreferences(next);
    setPrefs(next);
  }

  return (
    <StickyScrollScreen
      title="Storage & backup"
      subtitle="Local files only — use your own cloud backup"
      backHref={settingsBackHref("storage-backup")}
      backLabel={settingsBackLabel("storage-backup")}
    >
      <Text style={styles.disclaimer}>{LOCAL_ONLY_DISCLAIMER}</Text>

      <Text style={styles.question}>Do you back up this device with a cloud service?</Text>

      {EXTERNAL_BACKUP_OPTIONS.map((opt) => {
        const selected = prefs?.providers.includes(opt.id) ?? false;
        return (
          <Pressable
            key={opt.id}
            onPress={() => void toggleProvider(opt.id)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed, selected && styles.rowSelected]}
          >
            <Text style={styles.rowText}>{opt.label}</Text>
            {opt.recommend ? <Text style={styles.badge}>Recommended</Text> : null}
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => void acknowledgeLocalOnly()}
        style={({ pressed }) => [styles.ack, pressed && styles.pressed]}
      >
        <Text style={styles.ackText}>
          {prefs?.acknowledgedLocalOnly ? "✓ Understood — files stay on device" : "I understand — no app cloud hosting"}
        </Text>
      </Pressable>
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    disclaimer: { fontSize: 14, lineHeight: 20, color: colors.text, opacity: 0.88, marginBottom: 16 },
    question: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 10 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      borderRadius: 10,
      marginBottom: 8,
      backgroundColor: colors.card,
    },
    rowSelected: { borderWidth: 1, borderColor: colors.accent },
    rowText: { fontSize: 15, color: colors.text, fontWeight: "600" },
    badge: { fontSize: 11, fontWeight: "700", color: colors.accent },
    ack: {
      marginTop: 16,
      padding: 14,
      borderRadius: 10,
      backgroundColor: colors.card,
    },
    ackText: { fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center" },
    pressed: { opacity: 0.88 },
  });
}
