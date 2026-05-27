import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AndroidMiscLauncherBrowse } from "@/components/integrations/AndroidMiscLauncherBrowse";
import { MiscCatalogCategoryFilter } from "@/components/integrations/MiscCatalogCategoryFilter";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import {
  HOME_FALLBACK_HREF,
  ScreenScrollView,
  StickyPageHeader,
  useScStyles,
} from "@/components/serviceCalls/screenChrome";
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
import {
  MISC_INTEGRATIONS_CATALOG,
  miscIntegrationById,
} from "@/lib/integrations/miscCatalog";
import { openMiscIntegration } from "@/lib/integrations/openMiscIntegration";
import type { MiscCatalogFilter, MiscIntegrationDefinition } from "@/lib/integrations/types";
import { isLauncherAppDiscoverySupported } from "@/lib/installedPhoneApps";
import { safeOpenURL } from "@/lib/linkingSafe";
import { useDeferredFocusReload } from "@/lib/useDeferredFocusReload";

export default function MiscAppsScreen() {
  const scStyles = useScStyles();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [enabledSet, setEnabledSet] = useState<Set<string>>(new Set());
  const [installedMap, setInstalledMap] = useState<Partial<Record<string, boolean>>>({});
  const [probing, setProbing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MiscCatalogFilter>("all");
  const [browseVisible, setBrowseVisible] = useState(false);

  const reload = useCallback(async () => {
    setProbing(true);
    try {
      const enabled = await loadEnabledMiscIntegrationIds();
      setEnabledIds(enabled);
      setEnabledSet(new Set(enabled));
      const defs = enabled
        .map((id) => miscIntegrationById(id))
        .filter((d): d is NonNullable<typeof d> => d != null);
      const installed = await detectMiscInstalledMap(
        defs.length ? defs : MISC_INTEGRATIONS_CATALOG,
      );
      setInstalledMap(installed);
    } finally {
      setProbing(false);
    }
  }, []);

  useDeferredFocusReload(reload);

  const tiles = useMemo(
    () =>
      enabledIds
        .map((id) => miscIntegrationById(id))
        .filter((d): d is NonNullable<typeof d> => d != null),
    [enabledIds],
  );

  const catalogFiltered = useMemo(
    () => filterMiscIntegrations(MISC_INTEGRATIONS_CATALOG, query, categoryFilter),
    [query, categoryFilter],
  );

  const onToggleEnabled = useCallback(
    async (id: string, value: boolean) => {
      setBusyId(id);
      try {
        const next = await setMiscIntegrationEnabled(id, value);
        setEnabledIds(next);
        setEnabledSet(new Set(next));
        const defs = next
          .map((eid) => miscIntegrationById(eid))
          .filter((d): d is NonNullable<typeof d> => d != null);
        const installed = await detectMiscInstalledMap(
          defs.length > 0 ? defs : MISC_INTEGRATIONS_CATALOG,
        );
        setInstalledMap(installed);
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const onOpenShortcut = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      await openMiscIntegration(id);
    } finally {
      setBusyId(null);
    }
  }, []);

  const onOpenWebsite = useCallback(async (def: MiscIntegrationDefinition) => {
    setBusyId(def.id);
    try {
      await safeOpenURL(def.website);
    } finally {
      setBusyId(null);
    }
  }, []);

  const showAndroidBrowse =
    Platform.OS === "android" && isLauncherAppDiscoverySupported();

  return (
    <View style={styles.flex}>
      <StickyPageHeader
        title="Misc Apps"
        subtitle="Work tools and games — curated list, not a full phone scan on iOS."
        fallbackHref={HOME_FALLBACK_HREF}
      />
      <ScreenScrollView style={scStyles.scrollBody} contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          {Platform.OS === "ios"
            ? "Apple does not allow listing all apps on your phone. Search work apps and games below; Installed appears only when a known app link works. Tap Add anyway — opens website or store if needed."
            : "Search work apps and games, or browse installed apps on Android. Tap Add for shortcuts on this page."}
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
          <VoiceTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search apps and games: Roblox, Teams, Procore…"
            placeholderTextColor={placeholderTextColor(colors)}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>

        <MiscCatalogCategoryFilter value={categoryFilter} onChange={setCategoryFilter} />

        {showAndroidBrowse ? (
          <Pressable
            onPress={() => setBrowseVisible(true)}
            style={({ pressed }) => [styles.browseBtn, pressed && styles.pressed]}
          >
            <Ionicons name="apps-outline" size={20} color={colors.text} />
            <Text style={styles.browseBtnText}>Browse phone apps</Text>
          </Pressable>
        ) : null}

        {tiles.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Your shortcuts</Text>
            {probing ? (
              <View style={styles.probeRow}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.probeText}>Checking shortcuts…</Text>
              </View>
            ) : null}
            <View style={styles.grid}>
              {tiles.map((def) => {
                const installed = installedMap[def.id] === true;
                const busy = busyId === def.id;
                return (
                  <Pressable
                    key={def.id}
                    onPress={() => void onOpenShortcut(def.id)}
                    disabled={busy}
                    style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${def.name}`}
                  >
                    <MaterialCommunityIcons name={def.icon} size={36} color={colors.text} />
                    <Text style={styles.tileLabel} numberOfLines={2}>
                      {def.name}
                    </Text>
                    {installed ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Installed</Text>
                      </View>
                    ) : (
                      <Text style={styles.tileMeta}>{busy ? "Opening…" : "App or website"}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No shortcuts yet</Text>
            <Text style={styles.emptyBody}>
              Search below and tap Add on work apps or games you use. Shortcuts appear here for one-tap open.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>{query.trim() ? "Search results" : "Add apps"}</Text>
        <View style={styles.catalogList}>
          {catalogFiltered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBody}>No apps in our list match that search.</Text>
            </View>
          ) : (
            catalogFiltered.map((def) => (
              <CatalogRow
                key={def.id}
                def={def}
                enabled={enabledSet.has(def.id)}
                installed={installedMap[def.id] === true}
                busy={busyId === def.id}
                styles={styles}
                colors={colors}
                onToggle={(v) => void onToggleEnabled(def.id, v)}
                onOpen={() => void onOpenShortcut(def.id)}
                onWebsite={() => void onOpenWebsite(def)}
              />
            ))
          )}
        </View>

        <Text style={styles.footerNote}>
          {MISC_INTEGRATIONS_CATALOG.length} curated apps and games — updated in app releases, not from a device scan
          on iOS.
        </Text>
      </ScreenScrollView>

      <AndroidMiscLauncherBrowse
        visible={browseVisible}
        enabledIds={enabledSet}
        onClose={() => setBrowseVisible(false)}
        onAdd={(id) => void onToggleEnabled(id, true)}
      />
    </View>
  );
}

type CatalogRowProps = {
  def: MiscIntegrationDefinition;
  enabled: boolean;
  installed: boolean;
  busy: boolean;
  styles: ReturnType<typeof makeStyles>;
  colors: ColorScheme;
  onToggle: (enabled: boolean) => void;
  onOpen: () => void;
  onWebsite: () => void;
};

function CatalogRow({
  def,
  enabled,
  installed,
  busy,
  styles,
  colors,
  onToggle,
  onOpen,
  onWebsite,
}: CatalogRowProps) {
  return (
    <View style={styles.catalogRow}>
      <View style={styles.catalogHeader}>
        <MaterialCommunityIcons name={def.icon} size={32} color={colors.text} />
        <View style={styles.catalogText}>
          <Text style={styles.catalogTitle}>{def.name}</Text>
          <Text style={styles.catalogHint}>
            {installed ? "Installed on this device" : "Opens app, website, or store"}
          </Text>
        </View>
        {!enabled ? (
          <Pressable
            onPress={() => onToggle(true)}
            disabled={busy}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            accessibilityLabel={`Add ${def.name}`}
          >
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        ) : null}
      </View>
      {enabled ? (
        <View style={styles.catalogActions}>
          <Pressable
            onPress={onOpen}
            disabled={busy}
            style={({ pressed }) => [styles.openBtn, pressed && styles.pressed]}
          >
            <Text style={styles.openBtnText}>{busy ? "…" : "Open"}</Text>
          </Pressable>
          <Pressable
            onPress={onWebsite}
            disabled={busy}
            style={({ pressed }) => [styles.openBtnSecondary, pressed && styles.pressed]}
          >
            <Text style={styles.openBtnText}>Website</Text>
          </Pressable>
          <Pressable
            onPress={() => onToggle(false)}
            disabled={busy}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.removeBtnText}>Remove</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondaryButtonBase = secondaryButtonStyle(colors, tints);
  const themedInput = inputStyle(colors, tints);
  const textColor = colors.text;
  const mutedColor = tints.mutedText;

  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: "transparent" },
    content: {
      padding: 20,
      paddingBottom: 40,
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
    },
    hint: {
      fontSize: 14,
      lineHeight: 20,
      color: mutedColor,
      marginBottom: 12,
    },
    searchWrap: { flexDirection: "row", alignItems: "center", position: "relative", marginBottom: 12 },
    searchIcon: { position: "absolute", left: 14, zIndex: 1, opacity: 0.85 },
    searchInput: {
      ...themedInput,
      flex: 1,
      color: textColor,
      borderRadius: 14,
      paddingLeft: 42,
      paddingRight: 16,
      paddingVertical: 12,
      fontSize: 16,
    },
    browseBtn: {
      ...secondaryButtonBase,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      marginBottom: 16,
      backgroundColor: tints.accentTintActive,
    },
    browseBtnText: { fontSize: 15, fontWeight: "800", color: textColor },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: textColor,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
      marginTop: 4,
    },
    probeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    probeText: { fontSize: 13, color: mutedColor },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 20,
    },
    tile: {
      ...panel,
      width: "47%",
      minWidth: 140,
      flexGrow: 1,
      alignItems: "center",
      paddingVertical: 20,
      paddingHorizontal: 12,
      backgroundColor: tints.accentTintActive,
      gap: 8,
    },
    tileLabel: {
      fontSize: 15,
      fontWeight: "800",
      color: textColor,
      textAlign: "center",
    },
    tileMeta: {
      fontSize: 11,
      fontWeight: "600",
      color: mutedColor,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: hexToRgba(colors.accent, 0.35),
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: textColor,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    catalogList: { gap: 10, marginBottom: 16 },
    catalogRow: {
      ...panel,
      padding: 14,
      gap: 10,
    },
    catalogHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    catalogText: { flex: 1, minWidth: 0, gap: 4 },
    catalogTitle: { fontSize: 16, fontWeight: "800", color: textColor },
    catalogHint: { fontSize: 12, lineHeight: 16, color: mutedColor },
    catalogActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    addBtn: {
      ...secondaryButtonBase,
      paddingVertical: 10,
      paddingHorizontal: 18,
      alignSelf: "flex-start",
      backgroundColor: hexToRgba(colors.accent, 0.45),
    },
    addBtnText: { fontSize: 14, fontWeight: "800", color: textColor },
    openBtn: {
      ...secondaryButtonBase,
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: "center",
      backgroundColor: tints.accentTintActive,
    },
    openBtnSecondary: {
      ...secondaryButtonBase,
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: "center",
    },
    openBtnText: { fontSize: 14, fontWeight: "800", color: textColor },
    removeBtn: {
      ...secondaryButtonBase,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: "center",
    },
    removeBtnText: { fontSize: 14, fontWeight: "700", color: mutedColor },
    emptyBox: {
      ...panel,
      padding: 16,
      gap: 10,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: textColor,
    },
    emptyBody: {
      fontSize: 14,
      lineHeight: 20,
      color: mutedColor,
    },
    footerNote: {
      marginTop: 12,
      fontSize: 12,
      lineHeight: 17,
      color: mutedColor,
    },
    pressed: { opacity: 0.88 },
  });
}
