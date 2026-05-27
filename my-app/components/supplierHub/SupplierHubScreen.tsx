import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { SupplierCard } from "@/components/supplierHub/SupplierCard";
import {
  HOME_FALLBACK_HREF,
  ScreenScrollView,
  StickyPageHeader,
  useScStyles,
} from "@/components/serviceCalls/screenChrome";
import {
  accentPanelStyle,
  getAccentTints,
  navCardStyle,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { loadSupplierFavorites } from "@/lib/supplierIntegration/preferencesStorage";
import {
  detectHubInstalledMap,
  hubStoreUrlForEntry,
  installSupplierApp,
  openSupplierApp,
  openSupplierWebsite,
} from "@/lib/supplierHub/launchActions";
import { supplierHubHasNativeApp } from "@/lib/supplierHub/supplierConfig";
import {
  getSupplierHubEntry,
  SUPPLIER_HUB_NATIVE_PROBE_IDS,
} from "@/lib/supplierHub/supplierConfig";
import { navigateToSupplierIntegrationSettings } from "@/lib/supplierIntegration/navigateToSupplierIntegration";
import { deferRouterPush } from "@/lib/deferNavigation";
import { useDeferredFocusReload } from "@/lib/useDeferredFocusReload";

export function SupplierHubScreen() {
  const router = useRouter();
  const scStyles = useScStyles();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [installedMap, setInstalledMap] = useState<Partial<Record<string, boolean>>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
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
      const [installed, favorites] = await Promise.all([
        detectHubInstalledMap(SUPPLIER_HUB_NATIVE_PROBE_IDS),
        loadSupplierFavorites(),
      ]);
      if (!mountedRef.current) return;
      setInstalledMap(installed);
      setFavoriteIds(new Set(Array.isArray(favorites.favoriteIds) ? favorites.favoriteIds : []));
    } catch {
      if (!mountedRef.current) return;
      setInstalledMap({});
      setFavoriteIds(new Set());
    } finally {
      if (mountedRef.current) setProbing(false);
    }
  }, []);

  const onManageFavoritesInSettings = useCallback(() => {
    navigateToSupplierIntegrationSettings(router);
  }, [router]);

  useDeferredFocusReload(reload);

  const favoriteSuppliers = useMemo(() => {
    const list = Array.from(favoriteIds)
      .map((id) => getSupplierHubEntry(id))
      .filter((s): s is NonNullable<typeof s> => s != null);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [favoriteIds]);

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
    <View style={styles.flex}>
      <StickyPageHeader
        title="Supplier Hub"
        subtitle="Quick launch for your favorite suppliers."
        fallbackHref={HOME_FALLBACK_HREF}
      />
      <ScreenScrollView style={scStyles.scrollBody} contentContainerStyle={styles.content}>
        <Pressable
          style={({ pressed }) => [styles.materialListCta, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Material list"
          onPress={() => deferRouterPush(router, "/material-list")}
        >
          <View style={styles.materialListCtaTextBlock}>
            <Text style={styles.materialListCtaTitle}>Material list</Text>
            <Text style={styles.materialListCtaSubtitle}>Saved lines and in-app price lookup</Text>
          </View>
          <Text style={styles.materialListCtaChevron} accessible={false}>
            ›
          </Text>
        </Pressable>

        {probing && favoriteSuppliers.length === 0 ? (
          <Text style={styles.loadingText}>Loading favorites…</Text>
        ) : null}

        {favoriteSuppliers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No favorite suppliers</Text>
            <Text style={styles.emptyBody}>
              Manage favorites in Settings to see quick-launch cards here.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Manage favorite suppliers in Settings"
              onPress={onManageFavoritesInSettings}
            >
              <Text style={styles.emptyCtaText}>Manage favorites in Settings</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {favoriteSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                hasNativeApp={supplierHubHasNativeApp(supplier)}
                installed={installedMap[supplier.id] === true}
                hasStoreListing={Boolean(hubStoreUrlForEntry(supplier))}
                favorite
                busy={busyId === supplier.id}
                showFavoriteToggle={false}
                onToggleFavorite={() => {}}
                onOpenApp={(id) => void onOpenApp(id)}
                onOpenWebsite={(id) => void onOpenWebsite(id)}
                onInstallApp={(id) => void onInstallApp(id)}
              />
            ))}
          </View>
        )}
      </ScreenScrollView>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const navCard = navCardStyle(colors);
  const secondaryButtonBase = secondaryButtonStyle(colors, tints);
  const panel = accentPanelStyle(colors, tints);
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
      gap: 16,
    },
    materialListCta: {
      ...navCard,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    materialListCtaTextBlock: {
      flex: 1,
      minWidth: 0,
      paddingRight: 12,
    },
    materialListCtaTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: textColor,
    },
    materialListCtaSubtitle: {
      marginTop: 4,
      fontSize: 14,
      fontWeight: "600",
      color: mutedColor,
      lineHeight: 20,
    },
    materialListCtaChevron: {
      fontSize: 32,
      fontWeight: "300",
      color: textColor,
      lineHeight: 34,
    },
    loadingText: {
      fontSize: 14,
      color: mutedColor,
      textAlign: "center",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    emptyBox: {
      ...panel,
      padding: 16,
      gap: 10,
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
    emptyCta: {
      alignSelf: "flex-start",
      marginTop: 4,
      ...secondaryButtonBase,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    emptyCtaText: {
      fontSize: 14,
      fontWeight: "700",
      color: textColor,
    },
    pressed: { opacity: 0.88 },
  });
}
