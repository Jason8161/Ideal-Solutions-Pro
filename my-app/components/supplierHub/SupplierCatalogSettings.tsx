import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { CategoryTabs, type SupplierHubTab } from "@/components/supplierHub/CategoryTabs";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { SupplierCard } from "@/components/supplierHub/SupplierCard";
import {
  accentPanelStyle,
  getAccentTints,
  inputStyle,
  placeholderTextColor,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import {
  loadEnabledSupplierIntegrationIds,
  setSupplierIntegrationEnabled,
} from "@/lib/supplierIntegration/enabledIntegrationsStorage";
import { getIntegrationSupplierIds } from "@/lib/supplierIntegration/integrationSuppliers";
import {
  loadSupplierFavorites,
  toggleSupplierFavorite,
} from "@/lib/supplierIntegration/preferencesStorage";
import {
  detectHubInstalledMap,
  hubStoreUrlForEntry,
  installSupplierApp,
  openSupplierApp,
  openSupplierWebsite,
} from "@/lib/supplierHub/launchActions";
import { supplierHubHasNativeApp } from "@/lib/supplierHub/supplierConfig";
import {
  getSupplierHubCatalog,
  SUPPLIER_HUB_NATIVE_PROBE_IDS,
  type SupplierHubEntry,
} from "@/lib/supplierHub/supplierConfig";
import { useDeferredFocusReload } from "@/lib/useDeferredFocusReload";

const INTEGRATION_ID_SET = new Set(getIntegrationSupplierIds());

type Props = {
  /** Extra content rendered after the catalog (launch behavior, accounts, etc.). */
  footer?: ReactNode;
  onFavoritesChanged?: () => void;
};

export function SupplierCatalogSettings({ footer, onFavoritesChanged }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState<SupplierHubTab>("Electrical");
  const [catalog] = useState(() => getSupplierHubCatalog());
  const [installedMap, setInstalledMap] = useState<Partial<Record<string, boolean>>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [probing, setProbing] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
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
      const [installed, favorites, enabled] = await Promise.all([
        detectHubInstalledMap(SUPPLIER_HUB_NATIVE_PROBE_IDS),
        loadSupplierFavorites(),
        loadEnabledSupplierIntegrationIds(),
      ]);
      if (!mountedRef.current) return;
      setInstalledMap(installed);
      setFavoriteIds(new Set(Array.isArray(favorites.favoriteIds) ? favorites.favoriteIds : []));
      setEnabledIds(new Set(enabled));
    } catch {
      if (!mountedRef.current) return;
      setInstalledMap({});
      setFavoriteIds(new Set());
      setEnabledIds(new Set());
    } finally {
      if (mountedRef.current) setProbing(false);
    }
  }, []);

  useDeferredFocusReload(reload);

  const filteredSuppliers = useMemo(() => {
    const term = filter.trim().toLowerCase();
    let list: SupplierHubEntry[] = catalog;

    if (activeTab === "Favorites") {
      list = list.filter((s) => favoriteIds.has(s.id));
    } else if (activeTab === "Industrial") {
      list = list.filter((s) => s.category === "Industrial");
    } else {
      list = list.filter((s) => s.category === activeTab);
    }

    if (term) {
      list = list.filter((s) => s.name.toLowerCase().includes(term));
    }

    return [...list].sort((a, b) => {
      const aFav = favoriteIds.has(a.id) ? 0 : 1;
      const bFav = favoriteIds.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });
  }, [activeTab, catalog, favoriteIds, filter]);

  const onToggleFavorite = useCallback(
    (id: string) => {
      void toggleSupplierFavorite(id).then((state) => {
        setFavoriteIds(new Set(Array.isArray(state.favoriteIds) ? state.favoriteIds : []));
        onFavoritesChanged?.();
      });
    },
    [onFavoritesChanged],
  );

  const onToggleEnabled = useCallback(async (id: string, value: boolean) => {
    if (!INTEGRATION_ID_SET.has(id) || !mountedRef.current) return;
    try {
      const next = await setSupplierIntegrationEnabled(id, value);
      if (!mountedRef.current) return;
      setEnabledIds(new Set(next));
    } catch {
      if (!mountedRef.current) return;
      const enabled = await loadEnabledSupplierIntegrationIds().catch(() => []);
      if (!mountedRef.current) return;
      setEnabledIds(new Set(enabled));
    }
  }, []);

  const onOpenApp = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await openSupplierApp(id);
        if (mountedRef.current) void reload();
      } catch (e) {
        Alert.alert("Could not open", e instanceof Error ? e.message : "Try again.");
      } finally {
        if (mountedRef.current) setBusyId(null);
      }
    },
    [reload],
  );

  const onOpenWebsite = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await openSupplierWebsite(id);
        if (mountedRef.current) void reload();
      } catch (e) {
        Alert.alert("Could not open", e instanceof Error ? e.message : "Try again.");
      } finally {
        if (mountedRef.current) setBusyId(null);
      }
    },
    [reload],
  );

  const onInstallApp = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      await installSupplierApp(id);
    } catch (e) {
      Alert.alert("Could not open store", e instanceof Error ? e.message : "Try again.");
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.noteBox}>
        <Text style={styles.noteTitle}>Suppliers</Text>
        <Text style={styles.noteBody}>
          Home Depot, Lowe&apos;s, Grainger, Graybar, Rexel, CES, Ferguson, Platt, and more. Star favorites
          and use the enable switch for native app launch. Installed status uses declared app links only — the
          app never scans your device for other apps.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
        <VoiceTextInput
          value={filter}
          onChangeText={setFilter}
          placeholder="Search suppliers by name"
          placeholderTextColor={placeholderTextColor(colors)}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      <CategoryTabs active={activeTab} onChange={setActiveTab} />

      {probing ? (
        <View style={styles.probeRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.probeText}>Checking Home Depot & Lowe&apos;s apps…</Text>
        </View>
      ) : null}

      {filteredSuppliers.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>
            {activeTab === "Favorites" ? "No favorites yet" : "No suppliers in this category"}
          </Text>
          <Text style={styles.emptyBody}>
            {activeTab === "Favorites"
              ? "Star suppliers in any category to add quick-launch tiles on Materials search."
              : activeTab === "Industrial"
                ? "Industrial suppliers will appear here as they are added."
                : "Try another category or clear your search."}
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {filteredSuppliers.map((supplier) => (
            <View key={supplier.id} style={styles.cardWrap}>
              {INTEGRATION_ID_SET.has(supplier.id) ? (
                <View style={styles.enableRow}>
                  <Text style={styles.enableLabel}>Enabled</Text>
                  <Switch
                    value={enabledIds.has(supplier.id)}
                    onValueChange={(v) => void onToggleEnabled(supplier.id, v)}
                    accessibilityLabel={`Enable ${supplier.name}`}
                  />
                </View>
              ) : null}
              <SupplierCard
                supplier={supplier}
                hasNativeApp={supplierHubHasNativeApp(supplier)}
                installed={installedMap[supplier.id] === true}
                hasStoreListing={Boolean(hubStoreUrlForEntry(supplier))}
                favorite={favoriteIds.has(supplier.id)}
                busy={busyId === supplier.id}
                showFavoriteToggle
                onToggleFavorite={onToggleFavorite}
                onOpenApp={(id) => void onOpenApp(id)}
                onOpenWebsite={(id) => void onOpenWebsite(id)}
                onInstallApp={(id) => void onInstallApp(id)}
              />
            </View>
          ))}
        </View>
      )}

      {footer}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const themedInput = inputStyle(colors, tints);

  return StyleSheet.create({
    wrap: { gap: 16 },
    noteBox: { ...panel, padding: 14, gap: 6 },
    noteTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
    noteBody: { fontSize: 13, lineHeight: 19, color: tints.mutedText },
    searchWrap: { flexDirection: "row", alignItems: "center", position: "relative" },
    searchIcon: { position: "absolute", left: 14, zIndex: 1, opacity: 0.85 },
    searchInput: {
      ...themedInput,
      flex: 1,
      color: colors.text,
      borderRadius: 14,
      paddingLeft: 42,
      paddingRight: 16,
      paddingVertical: Platform.OS === "ios" ? 14 : 12,
      fontSize: 16,
      minHeight: Platform.OS === "ios" ? 52 : 48,
    },
    probeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    probeText: { fontSize: 13, color: tints.mutedText },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    cardWrap: { width: "47%", minWidth: 160, flexGrow: 1, gap: 6 },
    enableRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    enableLabel: { fontSize: 12, fontWeight: "700", color: tints.mutedText, textTransform: "uppercase" },
    emptyBox: { ...panel, padding: 16, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    emptyBody: { fontSize: 14, lineHeight: 20, color: tints.mutedText },
  });
}
