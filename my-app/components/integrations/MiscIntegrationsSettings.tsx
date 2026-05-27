import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AndroidMiscLauncherBrowse } from "@/components/integrations/AndroidMiscLauncherBrowse";
import { MiscCatalogCategoryFilter } from "@/components/integrations/MiscCatalogCategoryFilter";
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
import { detectMiscInstalledMap } from "@/lib/integrations/detectInstalled";
import {
  loadEnabledMiscIntegrationIds,
  setMiscIntegrationEnabled,
} from "@/lib/integrations/enabledMiscIntegrationsStorage";
import { filterMiscIntegrations } from "@/lib/integrations/miscCatalogSearch";
import type { MiscCatalogFilter } from "@/lib/integrations/types";
import {
  MISC_INTEGRATIONS_CATALOG,
  type MiscIntegrationDefinition,
} from "@/lib/integrations/miscCatalog";
import { openMiscIntegration } from "@/lib/integrations/openMiscIntegration";
import { isLauncherAppDiscoverySupported } from "@/lib/installedPhoneApps";
import { safeOpenURL } from "@/lib/linkingSafe";
import { useDeferredFocusReload } from "@/lib/useDeferredFocusReload";

export function MiscIntegrationsSettings() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [installedMap, setInstalledMap] = useState<Partial<Record<string, boolean>>>({});
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [probing, setProbing] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MiscCatalogFilter>("all");
  const [browseVisible, setBrowseVisible] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!mountedRef.current) return;
    setProbing(true);
    try {
      const [installed, enabled] = await Promise.all([
        detectMiscInstalledMap(MISC_INTEGRATIONS_CATALOG),
        loadEnabledMiscIntegrationIds(),
      ]);
      if (!mountedRef.current) return;
      setInstalledMap(installed);
      setEnabledIds(new Set(enabled));
    } catch {
      if (!mountedRef.current) return;
      setInstalledMap({});
      setEnabledIds(new Set());
    } finally {
      if (mountedRef.current) setProbing(false);
    }
  }, []);

  useDeferredFocusReload(reload);

  const onToggleEnabled = useCallback(async (id: string, value: boolean) => {
    setBusyId(id);
    try {
      const next = await setMiscIntegrationEnabled(id, value);
      if (!mountedRef.current) return;
      setEnabledIds(new Set(next));
    } catch {
      if (!mountedRef.current) return;
      const enabled = await loadEnabledMiscIntegrationIds().catch(() => []);
      if (!mountedRef.current) return;
      setEnabledIds(new Set(enabled));
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  }, []);

  const onOpenApp = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      await openMiscIntegration(id);
      if (mountedRef.current) void reload();
    } catch (e) {
      Alert.alert("Could not open", e instanceof Error ? e.message : "Try again.");
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  }, [reload]);

  const catalogFiltered = useMemo(
    () => filterMiscIntegrations(MISC_INTEGRATIONS_CATALOG, query, categoryFilter),
    [query, categoryFilter],
  );

  const onOpenWebsite = useCallback(async (def: MiscIntegrationDefinition) => {
    setBusyId(def.id);
    try {
      await safeOpenURL(def.website);
    } catch (e) {
      Alert.alert("Could not open", e instanceof Error ? e.message : "Try again.");
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  }, []);

  const showAndroidBrowse =
    Platform.OS === "android" && isLauncherAppDiscoverySupported();

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>Add apps to Misc Apps</Text>
      <View style={styles.noteBox}>
        {Platform.OS === "ios" ? (
          <Text style={styles.noteBody}>
            Apple doesn&apos;t allow listing all phone apps. Pick from supported work apps and games below; we&apos;ll
            show Installed only when a known app link responds. You can still tap Add for any entry.
          </Text>
        ) : (
          <Text style={styles.noteBody}>
            Search work apps and games from our list, or browse installed apps on this device. Tap Add to show
            shortcuts on the Misc Apps page.
          </Text>
        )}
      </View>

      {showAndroidBrowse ? (
        <Pressable
          onPress={() => setBrowseVisible(true)}
          style={({ pressed }) => [styles.browseBtn, pressed && styles.pressed]}
        >
          <Ionicons name="apps-outline" size={20} color={colors.text} />
          <Text style={styles.browseBtnText}>Browse phone apps</Text>
        </Pressable>
      ) : null}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
        <VoiceTextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search apps and games"
          placeholderTextColor={placeholderTextColor(colors)}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      <MiscCatalogCategoryFilter value={categoryFilter} onChange={setCategoryFilter} />

      {probing ? (
        <View style={styles.probeRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.probeText}>Checking known app links…</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {catalogFiltered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No apps in our list match that search.</Text>
          </View>
        ) : null}
        {catalogFiltered.map((def) => {
          const installed = installedMap[def.id] === true;
          const enabled = enabledIds.has(def.id);
          const busy = busyId === def.id;
          return (
            <View key={def.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name={def.icon} size={28} color={colors.text} />
                <View style={styles.cardText}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle}>{def.name}</Text>
                    {installed ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Installed</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardHint}>
                    {installed ? "On your device" : "Opens app, website, or store"}
                  </Text>
                </View>
                {!enabled ? (
                  <Pressable
                    onPress={() => void onToggleEnabled(def.id, true)}
                    disabled={busy}
                    style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
                    accessibilityLabel={`Add ${def.name}`}
                  >
                    <Text style={styles.addBtnText}>Add</Text>
                  </Pressable>
                ) : null}
              </View>
              {enabled ? (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => void onOpenApp(def.id)}
                    disabled={busy}
                    style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.actionBtnText}>{busy ? "…" : "Open app"}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void onOpenWebsite(def)}
                    disabled={busy}
                    style={({ pressed }) => [styles.actionBtnSecondary, pressed && styles.pressed]}
                  >
                    <Text style={styles.actionBtnText}>Website</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void onToggleEnabled(def.id, false)}
                    disabled={busy}
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <AndroidMiscLauncherBrowse
        visible={browseVisible}
        enabledIds={enabledIds}
        onClose={() => setBrowseVisible(false)}
        onAdd={(id) => {
          void onToggleEnabled(id, true);
        }}
      />
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondary = secondaryButtonStyle(colors, tints);
  const themedInput = inputStyle(colors, tints);

  return StyleSheet.create({
    wrap: { gap: 12 },
    searchWrap: { flexDirection: "row", alignItems: "center", position: "relative" },
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
    emptyBox: { ...panel, padding: 14 },
    emptyText: { fontSize: 14, lineHeight: 20, color: tints.mutedText },
    section: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    noteBox: { ...panel, padding: 14, gap: 6 },
    noteBody: { fontSize: 13, lineHeight: 19, color: tints.mutedText },
    browseBtn: {
      ...secondary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      backgroundColor: tints.accentTintActive,
    },
    browseBtnText: { fontSize: 15, fontWeight: "800", color: colors.text },
    probeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    probeText: { fontSize: 13, color: tints.mutedText },
    list: { gap: 10 },
    card: { ...panel, padding: 14, gap: 10 },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    cardText: { flex: 1, minWidth: 0, gap: 4 },
    titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
    cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    cardHint: { fontSize: 12, lineHeight: 16, color: tints.mutedText },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: hexToRgba(colors.accent, 0.35),
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    addBtn: {
      ...secondary,
      paddingVertical: 10,
      paddingHorizontal: 18,
      backgroundColor: hexToRgba(colors.accent, 0.45),
    },
    addBtnText: { fontSize: 14, fontWeight: "800", color: colors.text },
    actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    actionBtn: {
      ...secondary,
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: tints.accentTintActive,
    },
    actionBtnSecondary: {
      ...secondary,
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
    },
    actionBtnText: { fontSize: 14, fontWeight: "800", color: colors.text },
    removeBtn: {
      ...secondary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: "center",
    },
    removeBtnText: { fontSize: 14, fontWeight: "700", color: tints.mutedText },
    pressed: { opacity: 0.88 },
  });
}
