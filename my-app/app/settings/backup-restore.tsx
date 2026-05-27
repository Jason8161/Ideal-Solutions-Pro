import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { accentPanelStyle, getAccentTints, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  BACKUP_FILE_EXTENSION,
  exportBackup,
  formatMegabytes,
  getCurrentAppVersion,
  importBackup,
  listBackupFiles,
  loadLatestBackupTimestamp,
  ONEDRIVE_INFO_URL,
  saveBackupToDevice,
  type BackupListItem,
  type ExportBackupResult,
  type ImportBackupProgress,
} from "@/lib/backup";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";

const DOMAIN_LABELS: Record<string, string> = {
  profile: "Profile",
  bossJobs: "Boss jobs",
  estimates: "Estimates",
  employees: "Employees",
  invoices: "Invoices",
  calendar: "Calendar",
  aiProjects: "AI projects",
  settings: "Settings",
  materialLists: "Material lists",
  serviceCalls: "Service calls",
  images: "Photos & images",
};

export default function BackupRestoreSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [files, setFiles] = useState<BackupListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sharingAvailable, setSharingAvailable] = useState(true);
  const [latestBackupAt, setLatestBackupAt] = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<ImportBackupProgress | null>(null);

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const [items, latest] = await Promise.all([listBackupFiles(), loadLatestBackupTimestamp()]);
      setFiles(items);
      setLatestBackupAt(latest);
      setSharingAvailable(await Sharing.isAvailableAsync());
    } finally {
      setLoadingList(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshList();
    }, [refreshList]),
  );

  const showLowSpaceHelp = (result: Extract<ExportBackupResult, { ok: false; reason: "low_space" }>) => {
    Alert.alert(
      "Not enough free space on this phone",
      `Saving a backup needs about ${formatMegabytes(result.requiredBytes)} free (including a small safety margin). This device shows about ${formatMegabytes(result.freeBytes)} free.\n\nFree up space, or use Microsoft OneDrive to move photos and files to the cloud so more room is available here, then try again.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "OneDrive info", onPress: () => void Linking.openURL(ONEDRIVE_INFO_URL) },
      ],
    );
  };

  const runBackup = async () => {
    setBusy(true);
    try {
      const result = await exportBackup();
      if (result.ok) {
        await refreshList();
        Alert.alert(
          "Backup saved in app",
          `Saved inside Ideal Solutions Pro (${formatMegabytes(result.sizeBytes)}). Use Save backup to device to keep a copy in Files or Downloads.`,
        );
        return;
      }
      if (result.reason === "low_space") {
        showLowSpaceHelp(result);
        return;
      }
      if (result.reason === "no_storage") {
        Alert.alert("Backup unavailable", result.message);
        return;
      }
      Alert.alert("Backup failed", result.message);
    } finally {
      setBusy(false);
    }
  };

  const saveToDevice = async () => {
    setBusy(true);
    try {
      const result = await saveBackupToDevice();
      if (result.ok) {
        await refreshList();
        Alert.alert(
          "Backup ready",
          result.shared
            ? `Your ${BACKUP_FILE_EXTENSION} file (${formatMegabytes(result.sizeBytes)}) was created. If you chose Save to Files or Downloads, that copy stays on your device through app updates.`
            : `Backup saved (${formatMegabytes(result.sizeBytes)}).`,
        );
        return;
      }
      if (result.reason === "low_space") {
        showLowSpaceHelp(result);
        return;
      }
      if (result.reason === "no_storage") {
        Alert.alert("Backup unavailable", result.message);
        return;
      }
      if (result.reason === "write_failed") {
        Alert.alert("Backup failed", result.message);
        return;
      }
      if (result.reason === "share_unavailable") {
        await refreshList();
        Alert.alert(
          "Save to device unavailable",
          `The backup was saved inside the app (${formatMegabytes(result.sizeBytes)}), but this environment cannot open the save dialog. Use Share on a listed backup file, or try on iOS/Android.`,
        );
        return;
      }
      if (result.reason === "share_failed") {
        await refreshList();
        Alert.alert(
          "Could not open save dialog",
          `${result.message}\n\nThe backup is still saved inside the app (${formatMegabytes(result.sizeBytes)}). You can tap Share on it below.`,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const shareFile = async (item: BackupListItem) => {
    if (!sharingAvailable) {
      Alert.alert("Sharing unavailable", "Sharing files is not supported in this environment.");
      return;
    }
    setBusy(true);
    try {
      await Sharing.shareAsync(item.fileUri, {
        mimeType: "application/zip",
        dialogTitle: "Share Ideal Solutions Pro backup",
        UTI: "com.pkware.zip-archive",
      });
    } catch (e) {
      Alert.alert("Share failed", e instanceof Error ? e.message : "Could not open the share sheet.");
    } finally {
      setBusy(false);
    }
  };

  const pickAndRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/zip", "application/x-zip-compressed", "application/json", "text/json", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const uri = asset?.uri;
      if (!uri) {
        Alert.alert("Could not read file", "Try another backup file.");
        return;
      }
      Alert.alert(
        "Restore from backup?",
        "This replaces saved Ideal Solutions Pro data on this phone with the contents of the backup file. A checkpoint of your current data is saved first. Custom images referenced in the backup are restored when included. Fully close and reopen the app afterward so every screen reloads.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: () => {
              void (async () => {
                setBusy(true);
                setRestoreProgress({ phase: "reading", message: "Starting restore…", percent: 0 });
                try {
                  const restoreResult = await importBackup(uri, (progress) => setRestoreProgress(progress));
                  if (!restoreResult.ok) {
                    Alert.alert("Restore failed", restoreResult.reason);
                    return;
                  }
                  await refreshList();
                  Alert.alert(
                    "Restore complete",
                    `Restored ${restoreResult.restoredKeys} saved items${restoreResult.restoredAssets ? ` and ${restoreResult.restoredAssets} files` : ""}. Close Ideal Solutions Pro completely (swipe it away from recents), then open it again.`,
                  );
                } catch (e) {
                  Alert.alert("Restore failed", e instanceof Error ? e.message : "Invalid or unreadable backup.");
                } finally {
                  setBusy(false);
                  setRestoreProgress(null);
                }
              })();
            },
          },
        ],
      );
    } catch {
      Alert.alert("Picker error", "Could not open the file picker.");
    }
  };

  return (
    <StickyScrollScreen
      title="Backup & restore"
      subtitle={`Save ${BACKUP_FILE_EXTENSION} files to Files or Downloads, then restore after updates.`}
      backHref={settingsBackHref("backup-restore")}
      backLabel={settingsBackLabel("backup-restore")}
      scrollViewProps={{ keyboardShouldPersistTaps: "handled" }}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.lede}>
        Backups include jobs, estimates, employees, invoices, calendar, AI projects, settings, material lists, service
        calls, and on-device photos referenced by your data. App version {getCurrentAppVersion()}.
      </Text>

      <Text style={styles.deviceHint}>
        Save a backup outside the app (Files, Downloads, or cloud) so it survives app updates and reinstalls. Use Restore
        from file on device to bring data back.
      </Text>

      {latestBackupAt ? (
        <Text style={styles.metaLine}>
          Latest backup:{" "}
          {new Date(latestBackupAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </Text>
      ) : (
        <Text style={styles.metaLineMuted}>No backup recorded on this device yet.</Text>
      )}

      {restoreProgress && restoreProgress.phase !== "done" ? (
        <View style={styles.progressCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.progressText}>
            {restoreProgress.message} ({restoreProgress.percent}%)
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Included in MVP backup</Text>
      <View style={styles.domainList}>
        {Object.values(DOMAIN_LABELS).map((label) => (
          <Text key={label} style={styles.domainItem}>
            • {label}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, busy ? styles.primaryButtonDisabled : null]}
        onPress={() => void saveToDevice()}
        disabled={busy}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>{busy ? "Working…" : "Save backup to device"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, busy ? styles.secondaryButtonDisabled : null]}
        onPress={() => void pickAndRestore()}
        disabled={busy}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>Restore from file on device</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tertiaryButton, busy ? styles.secondaryButtonDisabled : null]}
        onPress={() => void runBackup()}
        disabled={busy}
        activeOpacity={0.85}
      >
        <Text style={styles.tertiaryButtonText}>Save copy in app only</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkRow} onPress={() => void Linking.openURL(ONEDRIVE_INFO_URL)} activeOpacity={0.85}>
        <Text style={styles.linkRowText}>Learn about Microsoft OneDrive (cloud storage)</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Backups in app storage</Text>
      <Text style={styles.sectionNote}>
        These copies live inside Ideal Solutions Pro and may be removed if the app is uninstalled. Use Save backup to
        device for a file that stays in Files or Downloads.
      </Text>
      {loadingList ? (
        <View style={styles.listLoading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : files.length === 0 ? (
        <Text style={styles.empty}>No in-app backups yet. Tap Save backup to device.</Text>
      ) : (
        files.map((item) => (
          <View key={item.fileName} style={styles.card}>
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.fileName}
              </Text>
              <Text style={styles.cardMeta}>
                {formatMegabytes(item.sizeBytes)}
                {item.modificationTime != null
                  ? ` · ${new Date(item.modificationTime * 1000).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}`
                  : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.shareChip, !sharingAvailable ? styles.shareChipDisabled : null]}
              onPress={() => void shareFile(item)}
              disabled={busy || !sharingAvailable}
              activeOpacity={0.85}
            >
              <Text style={styles.shareChipText}>Share</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {Platform.OS === "web" ? (
        <Text style={styles.webHint}>On web preview, device storage and sharing may be limited. Use iOS or Android.</Text>
      ) : null}
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondaryBtn = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    lede: {
      color: colors.text,
      opacity: 0.88,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 10,
    },
    deviceHint: {
      color: colors.text,
      opacity: 0.82,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 10,
    },
    metaLine: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 14,
    },
    metaLineMuted: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 14,
      fontStyle: "italic",
    },
    progressCard: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      marginBottom: 14,
    },
    progressText: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },
    sectionLabel: {
      marginTop: 8,
      marginBottom: 10,
      fontSize: 13,
      fontWeight: "800",
      color: colors.textMuted,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    domainList: {
      ...panel,
      padding: 14,
      marginBottom: 16,
      gap: 4,
    },
    domainItem: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
      opacity: 0.9,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      marginBottom: 12,
    },
    primaryButtonDisabled: {
      opacity: 0.55,
    },
    primaryButtonText: {
      color: colors.background,
      fontSize: 17,
      fontWeight: "800",
    },
    secondaryButton: {
      ...secondaryBtn,
      paddingVertical: 14,
      borderRadius: 16,
      marginBottom: 14,
    },
    secondaryButtonDisabled: {
      opacity: 0.55,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    tertiaryButton: {
      ...secondaryBtn,
      paddingVertical: 12,
      borderRadius: 16,
      marginBottom: 14,
      opacity: 0.92,
    },
    tertiaryButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    sectionNote: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 10,
      fontStyle: "italic",
    },
    linkRow: {
      paddingVertical: 12,
      marginBottom: 8,
    },
    linkRowText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "700",
    },
    listLoading: {
      paddingVertical: 20,
      alignItems: "center",
    },
    empty: {
      color: colors.text,
      opacity: 0.65,
      fontSize: 14,
      fontStyle: "italic",
    },
    card: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      marginBottom: 10,
    },
    cardMain: {
      flex: 1,
      minWidth: 0,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    },
    cardMeta: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    shareChip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: tints.accentTintLight,
      borderWidth: 1,
      borderColor: "transparent",
    },
    shareChipDisabled: {
      opacity: 0.45,
    },
    shareChipText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "800",
    },
    webHint: {
      marginTop: 12,
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
