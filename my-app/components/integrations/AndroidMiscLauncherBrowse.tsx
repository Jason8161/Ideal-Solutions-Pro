import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { VoiceTextInput } from "@/components/VoiceTextInput";
import {
  accentPanelStyle,
  getAccentTints,
  inputStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { miscIntegrationById } from "@/lib/integrations/miscCatalog";
import { miscIntegrationIdForAndroidPackage } from "@/lib/integrations/miscAndroidPackages";
import {
  getLauncherAppsOnDevice,
  isLauncherAppDiscoverySupported,
  type LauncherAppInfo,
} from "@/lib/installedPhoneApps";

type Props = {
  visible: boolean;
  enabledIds: Set<string>;
  onClose: () => void;
  onAdd: (integrationId: string) => void;
};

type BrowseRow = LauncherAppInfo & { integrationId: string };

export function AndroidMiscLauncherBrowse({ visible, enabledIds, onClose, onAdd }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (Platform.OS !== "android" || !isLauncherAppDiscoverySupported()) {
      setRows([]);
      setError("Browse phone apps is only available on Android.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const launcher = await getLauncherAppsOnDevice();
      const matched: BrowseRow[] = [];
      for (const app of launcher) {
        const integrationId = miscIntegrationIdForAndroidPackage(app.packageName);
        if (integrationId == null) continue;
        matched.push({ ...app, integrationId });
      }
      matched.sort((a, b) => a.appName.localeCompare(b.appName, undefined, { sensitivity: "base" }));
      setRows(matched);
      if (matched.length === 0) {
        setError("No supported work apps or games found on this device. Search the catalog above instead.");
      }
    } catch {
      setRows([]);
      setError("Could not read installed apps. Use the catalog search above.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    void load();
  }, [visible, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.appName.toLowerCase().includes(q) ||
        miscIntegrationById(r.integrationId)?.name.toLowerCase().includes(q),
    );
  }, [query, rows]);

  if (Platform.OS !== "android") return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Browse phone apps</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Installed apps and games that match our supported list. Tap Add to show them on Misc Apps.
        </Text>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
          <VoiceTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Filter installed apps"
            placeholderTextColor={placeholderTextColor(colors)}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.muted}>Loading installed apps…</Text>
          </View>
        ) : error && filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {filtered.map((row) => {
              const def = miscIntegrationById(row.integrationId);
              const added = enabledIds.has(row.integrationId);
              return (
                <View key={row.packageName} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{def?.name ?? row.appName}</Text>
                    <Text style={styles.rowHint}>{row.appName}</Text>
                  </View>
                  {added ? (
                    <Text style={styles.addedLabel}>Added</Text>
                  ) : (
                    <Pressable
                      onPress={() => onAdd(row.integrationId)}
                      style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.addBtnText}>Add</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondary = secondaryButtonStyle(colors, tints);
  const themedInput = inputStyle(colors, tints);

  return StyleSheet.create({
    sheet: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 48,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    title: { fontSize: 20, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: 13, lineHeight: 18, color: tints.mutedText, marginBottom: 12 },
    searchWrap: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    searchIcon: { position: "absolute", left: 14, zIndex: 1, opacity: 0.85 },
    searchInput: {
      ...themedInput,
      flex: 1,
      color: colors.text,
      borderRadius: 14,
      paddingLeft: 42,
      paddingRight: 16,
      paddingVertical: 12,
      fontSize: 16,
    },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    muted: { fontSize: 14, color: tints.mutedText },
    list: { gap: 10, paddingBottom: 32 },
    row: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 10,
    },
    rowText: { flex: 1, gap: 4 },
    rowTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    rowHint: { fontSize: 12, color: tints.mutedText },
    addedLabel: { fontSize: 13, fontWeight: "700", color: tints.mutedText },
    addBtn: {
      ...secondary,
      paddingVertical: 10,
      paddingHorizontal: 18,
      backgroundColor: hexToRgba(colors.accent, 0.45),
    },
    addBtnText: { fontSize: 14, fontWeight: "800", color: colors.text },
    emptyBox: { ...panel, padding: 16 },
    emptyText: { fontSize: 14, lineHeight: 20, color: tints.mutedText },
    pressed: { opacity: 0.88 },
  });
}
