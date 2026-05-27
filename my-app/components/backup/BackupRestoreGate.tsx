import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Alert, BackHandler, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PreUpdateBackupModal } from "@/components/backup/PreUpdateBackupModal";
import { RestorePromptModal } from "@/components/backup/RestorePromptModal";
import { useAppTheme } from "@/context/ThemeContext";
import {
  exportBackup,
  formatMegabytes,
  getCurrentAppVersion,
  hasSignificantAppData,
  importBackup,
  markRestorePromptSeen,
  markUpdateBackupAcknowledged,
  shouldShowPreUpdateBackupModal,
  shouldShowRestorePrompt,
} from "@/lib/backup";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { useHomeBoot } from "@/lib/homeBoot";
import type { ImportBackupProgress } from "@/lib/backup/types";

type GateMode = "none" | "pre-update" | "restore-prompt";

type GateState = {
  hydrated: boolean;
  mode: GateMode;
  busy: boolean;
  restoreProgress: ImportBackupProgress | null;
};

export function BackupRestoreGate({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { coldSplashDone, profileHydrated } = useHomeBoot();
  const [state, setState] = useState<GateState>({
    hydrated: false,
    mode: "none",
    busy: false,
    restoreProgress: null,
  });

  const overlayStyles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: hexToRgba(colors.background, 0.96),
          zIndex: 1100,
          elevation: 1100,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
        progressBanner: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom + 12,
          padding: 12,
          borderRadius: 12,
          backgroundColor: hexToRgba(colors.accent, 0.22),
        },
        progressText: {
          color: colors.text,
          fontSize: 13,
          fontWeight: "700",
          textAlign: "center",
        },
      }),
    [colors, insets.bottom, insets.top],
  );

  const refresh = useCallback(async () => {
    const showPreUpdate = await shouldShowPreUpdateBackupModal();
    if (showPreUpdate) {
      setState({ hydrated: true, mode: "pre-update", busy: false, restoreProgress: null });
      return;
    }

    const showRestore = await shouldShowRestorePrompt();
    const hasData = await hasSignificantAppData();
    if (showRestore && !hasData) {
      setState({ hydrated: true, mode: "restore-prompt", busy: false, restoreProgress: null });
      return;
    }

    if (showRestore) {
      await markRestorePromptSeen();
    }

    setState({ hydrated: true, mode: "none", busy: false, restoreProgress: null });
  }, []);

  useEffect(() => {
    if (!profileHydrated) return;
    void refresh();
  }, [profileHydrated, refresh]);

  const showOverlay = coldSplashDone && state.hydrated && state.mode !== "none";

  useEffect(() => {
    if (!showOverlay) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [showOverlay]);

  const runBackupAndAck = useCallback(async () => {
    setState((s) => ({ ...s, busy: true }));
    try {
      const result = await exportBackup();
      if (!result.ok) {
        if (result.reason === "low_space") {
          Alert.alert(
            "Not enough space",
            `This backup needs about ${formatMegabytes(result.requiredBytes)} free. Only ${formatMegabytes(result.freeBytes)} is available.`,
          );
        } else {
          Alert.alert("Backup failed", result.reason === "no_storage" ? result.message : result.message);
        }
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.fileUri, {
          mimeType: "application/zip",
          dialogTitle: "Save Ideal Solutions Pro backup",
          UTI: "com.pkware.zip-archive",
        });
      }

      await markUpdateBackupAcknowledged(getCurrentAppVersion());
      setState({ hydrated: true, mode: "none", busy: false, restoreProgress: null });
    } finally {
      setState((s) => ({ ...s, busy: false }));
    }
  }, []);

  const continueWithoutBackup = useCallback(async () => {
    setState((s) => ({ ...s, busy: true }));
    await markUpdateBackupAcknowledged(getCurrentAppVersion());
    setState({ hydrated: true, mode: "none", busy: false, restoreProgress: null });
  }, []);

  const cancelUpdate = useCallback(() => {
    setState((s) => ({ ...s, mode: "none" }));
  }, []);

  const skipRestorePrompt = useCallback(async () => {
    setState((s) => ({ ...s, busy: true }));
    await markRestorePromptSeen();
    setState({ hydrated: true, mode: "none", busy: false, restoreProgress: null });
  }, []);

  const pickAndRestore = useCallback(async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ["application/zip", "application/json", "text/json", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });
      if (pick.canceled) return;

      const uri = pick.assets[0]?.uri;
      if (!uri) {
        Alert.alert("Could not read file", "Try another backup file.");
        return;
      }

      Alert.alert(
        "Restore from backup?",
        "This replaces saved Ideal Solutions Pro data on this device with the backup contents. A checkpoint of your current data is saved first. Fully close and reopen the app afterward.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: () => {
              void (async () => {
                setState((s) => ({ ...s, busy: true, restoreProgress: { phase: "reading", message: "Starting…", percent: 0 } }));
                try {
                  const result = await importBackup(uri, (progress) => {
                    setState((s) => ({ ...s, restoreProgress: progress }));
                  });
                  if (!result.ok) {
                    Alert.alert("Restore failed", result.reason);
                    return;
                  }
                  await markRestorePromptSeen();
                  setState({ hydrated: true, mode: "none", busy: false, restoreProgress: null });
                  Alert.alert(
                    "Restore complete",
                    `Restored ${result.restoredKeys} saved items${result.restoredAssets ? ` and ${result.restoredAssets} files` : ""}. Close Ideal Solutions Pro completely, then open it again.`,
                  );
                } catch (e) {
                  Alert.alert("Restore failed", e instanceof Error ? e.message : "Invalid or unreadable backup.");
                } finally {
                  setState((s) => ({ ...s, busy: false, restoreProgress: null }));
                }
              })();
            },
          },
        ],
      );
    } catch {
      Alert.alert("Picker error", "Could not open the file picker.");
    }
  }, []);

  if (!coldSplashDone || !state.hydrated) {
    return <>{children}</>;
  }

  if (!showOverlay) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <View style={overlayStyles.overlay}>
        {state.mode === "pre-update" ? (
          <PreUpdateBackupModal
            busy={state.busy}
            onBackUpNow={runBackupAndAck}
            onContinueWithoutBackup={continueWithoutBackup}
            onCancelUpdate={cancelUpdate}
          />
        ) : (
          <RestorePromptModal busy={state.busy} onRestore={pickAndRestore} onSkip={skipRestorePrompt} />
        )}
        {state.restoreProgress && state.restoreProgress.phase !== "done" ? (
          <View style={overlayStyles.progressBanner}>
            <Text style={overlayStyles.progressText}>
              {state.restoreProgress.message} ({state.restoreProgress.percent}%)
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}
