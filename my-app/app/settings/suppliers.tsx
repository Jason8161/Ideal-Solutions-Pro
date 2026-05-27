import { Link, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import {
  accentPanelStyle,
  getAccentTints,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  companyProfileFromPartial,
  loadCompanyProfile,
  type CompanyProfile,
} from "@/lib/profileStorage";
import {
  dedupeByPreset,
  loadSavedSupplyHouses,
  newSupplyHouseRowId,
  saveSavedSupplyHouses,
  type SavedSupplyHouse,
} from "@/lib/savedSuppliers";
import { computeNearbySupplyHouses } from "@/lib/suppliers/catalog";
import { resolveShippingOrigin } from "@/lib/suppliers/shippingOrigin";
import { inferTradeCategory } from "@/lib/suppliers/tradeCategory";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import {
  SEARCH_RADIUS_OPTIONS,
  type Coords,
  type NearbySupplyHouse,
  type SearchRadiusMiles,
} from "@/lib/suppliers/types";
import {
  labelForSupplyHousePreset,
  SUPPLY_HOUSE_SUGGESTIONS,
  type SupplyHousePresetId,
} from "@/lib/supplierPresets";

export default function SupplyHousesSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [saved, setSaved] = useState<SavedSupplyHouse[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<SearchRadiusMiles>(20);
  const [nearby, setNearby] = useState<NearbySupplyHouse[]>([]);
  const [originLabel, setOriginLabel] = useState<string>("");
  const [originApprox, setOriginApprox] = useState(false);
  const [originMissing, setOriginMissing] = useState<string | null>(null);
  const [originCoords, setOriginCoords] = useState<Coords | null>(null);
  const [loadingNearby, setLoadingNearby] = useState(true);

  const reload = useCallback(async () => {
    const rows = await loadSavedSupplyHouses();
    setSaved(dedupeByPreset(rows));
  }, []);

  const refreshNearby = useCallback(async () => {
    setLoadingNearby(true);
    try {
      const stored = await loadCompanyProfile();
      const p = companyProfileFromPartial(stored);
      setProfile(p);

      const origin = await resolveShippingOrigin(p);
      if (origin.status === "missing") {
        setOriginMissing(origin.message);
        setOriginLabel("");
        setOriginCoords(null);
        setNearby([]);
        return;
      }

      setOriginMissing(null);
      setOriginLabel(origin.label);
      setOriginApprox(origin.approximate);
      setOriginCoords(origin.coords);
      const trade = inferTradeCategory(p.businessType);
      setNearby(computeNearbySupplyHouses(origin.coords, radiusMiles, trade, origin.approximate));
    } finally {
      setLoadingNearby(false);
    }
  }, [radiusMiles]);

  const selectRadius = useCallback(
    (mi: SearchRadiusMiles) => {
      setRadiusMiles(mi);
      if (!originCoords || !profile) return;
      const trade = inferTradeCategory(profile.businessType);
      setNearby(computeNearbySupplyHouses(originCoords, mi, trade, originApprox));
    },
    [originApprox, originCoords, profile],
  );

  useFocusEffect(
    useCallback(() => {
      void reload();
      void refreshNearby();
    }, [reload, refreshNearby]),
  );

  const presetAlready = useCallback((presetId: string) => saved.some((s) => s.presetId === presetId), [saved]);

  const addPreset = useCallback(
    (presetId: SupplyHousePresetId) => {
      if (presetAlready(presetId)) {
        Alert.alert("Already added", `${labelForSupplyHousePreset(presetId)} is already in your list.`);
        return;
      }
      const next = dedupeByPreset([{ id: newSupplyHouseRowId(), presetId }, ...saved]);
      setSaved(next);
      void saveSavedSupplyHouses(next);
    },
    [presetAlready, saved],
  );

  const removeRow = useCallback(
    (row: SavedSupplyHouse) => {
      const label = labelForSupplyHousePreset(row.presetId);
      Alert.alert("Remove supply house?", label, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const next = saved.filter((s) => s.id !== row.id);
            setSaved(next);
            void saveSavedSupplyHouses(next);
          },
        },
      ]);
    },
    [saved],
  );

  const tradeLabel = profile?.businessType.trim() || "General";

  return (
    <StickyScrollScreen
      title="My supply houses"
      subtitle="Find wholesalers near your shipping address, add them to your list, and use them on Materials for catalog and live pricing when configured."
      backHref={settingsBackHref("suppliers")}
      backLabel={settingsBackLabel("suppliers")}
      contentContainerStyle={styles.content}
    >
      <Link href="/distributor" asChild>
        <Pressable
          style={({ pressed }) => [styles.supplierLoginRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Supplier login"
          accessibilityHint="Opens distributor portal settings"
        >
          <View style={styles.supplierLoginTextCol}>
            <Text style={styles.supplierLoginTitle}>Supplier login</Text>
            <Text style={styles.supplierLoginSub}>
              Save your distributor&apos;s https sign-in page, then open their portal here. Usernames and passwords stay
              on their site.
            </Text>
          </View>
          <Text style={styles.supplierLoginChevron} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            ›
          </Text>
        </Pressable>
      </Link>

      <Text style={styles.section}>Search from shipping address</Text>
      {originMissing ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{originMissing}</Text>
          <Link href={"/settings/user-info" as Href} asChild>
            <Pressable style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}>
              <Text style={styles.linkBtnText}>Open User info</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={styles.originBox}>
          <Text style={styles.originLine}>{originLabel}</Text>
          {originApprox ? (
            <Text style={styles.originHint}>Location is approximate (ZIP / saved geocode). Distances are estimates.</Text>
          ) : null}
          <Text style={styles.originHint}>Suggestions for: {tradeLabel}</Text>
        </View>
      )}

      <Text style={styles.section}>Search radius</Text>
      <View style={styles.radiusRow}>
        {SEARCH_RADIUS_OPTIONS.map((mi) => (
          <Pressable
            key={mi}
            onPress={() => selectRadius(mi)}
            style={({ pressed }) => [styles.radiusChip, radiusMiles === mi && styles.radiusChipOn, pressed && styles.pressed]}
          >
            <Text style={[styles.radiusChipText, radiusMiles === mi && styles.radiusChipTextOn]}>{mi} mi</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Nearby supply houses</Text>
      <Text style={styles.hint}>
        Home Depot and Lowe&apos;s always appear. Other chains match your trade and the radius above.
      </Text>
      {loadingNearby ? (
        <ActivityIndicator color={colors.text} style={styles.loader} />
      ) : originMissing ? null : nearby.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No trade suppliers in this radius. Try 50 mi or add from the full list below.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {nearby.map((row) => {
            const added = presetAlready(row.presetId);
            return (
              <View key={row.presetId} style={styles.savedRow}>
                <View style={styles.savedTextCol}>
                  <Text style={styles.savedTitle}>{row.label}</Text>
                  <Text style={styles.savedSub}>
                    {row.hint}
                    {row.distanceMiles != null
                      ? ` · ~${row.distanceMiles} mi${row.approximateDistance ? " (est.)" : ""}`
                      : ""}
                    {row.alwaysShown ? " · National chain" : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => addPreset(row.presetId as SupplyHousePresetId)}
                  disabled={added}
                  style={({ pressed }) => [styles.addBtn, added && styles.addBtnDisabled, pressed && !added && styles.pressed]}
                >
                  <Text style={styles.addBtnText}>{added ? "Added" : "Add"}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.section}>Your list</Text>
      {saved.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>None yet. Add from nearby results or the full list below.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {saved.map((row) => (
            <View key={row.id} style={styles.savedRow}>
              <View style={styles.savedTextCol}>
                <Text style={styles.savedTitle}>{labelForSupplyHousePreset(row.presetId)}</Text>
                <Text style={styles.savedSub}>Quick search on Materials</Text>
              </View>
              <Pressable
                onPress={() => removeRow(row)}
                style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.section}>All supply houses (tap to add)</Text>
      <Text style={styles.hint}>Full catalog — same names you know from the counter or the parking lot.</Text>
      <View style={styles.chipGrid}>
        {SUPPLY_HOUSE_SUGGESTIONS.map((s) => {
          const added = presetAlready(s.id);
          return (
            <Pressable
              key={s.id}
              onPress={() => addPreset(s.id)}
              disabled={added}
              style={({ pressed }) => [styles.chip, added && styles.chipAdded, pressed && !added && styles.pressed]}
            >
              <Text style={[styles.chipTitle, added && styles.chipTitleAdded]}>{s.label}</Text>
              <Text style={[styles.chipHint, added && styles.chipHintAdded]}>{added ? "Added" : s.hint}</Text>
            </Pressable>
          );
        })}
      </View>
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondaryBtn = secondaryButtonStyle(colors, tints);
  const removeBg = hexToRgba("#ef4444", 0.22);
  const addedTint = hexToRgba(colors.accent, 0.12);

  return StyleSheet.create({
    content: {
      padding: 20,
      paddingBottom: 40,
      gap: 12,
    },
    supplierLoginRow: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    supplierLoginTextCol: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    supplierLoginTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
    },
    supplierLoginSub: {
      fontSize: 13,
      lineHeight: 18,
      color: tints.mutedText,
    },
    supplierLoginChevron: {
      fontSize: 28,
      fontWeight: "300",
      color: colors.text,
      opacity: 0.55,
      paddingRight: 4,
    },
    section: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    hint: {
      fontSize: 13,
      lineHeight: 18,
      color: tints.mutedText,
    },
    originBox: {
      ...panel,
      padding: 14,
      gap: 6,
    },
    originLine: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    originHint: {
      fontSize: 12,
      lineHeight: 17,
      color: tints.mutedText,
    },
    radiusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    radiusChip: {
      flex: 1,
      minWidth: 88,
      paddingVertical: 12,
      paddingHorizontal: 14,
      ...secondaryBtn,
    },
    radiusChipOn: {
      backgroundColor: tints.accentTintActive,
    },
    radiusChipText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
      opacity: 0.88,
    },
    radiusChipTextOn: {
      fontWeight: "800",
      opacity: 1,
    },
    loader: {
      marginVertical: 12,
    },
    emptyBox: {
      ...panel,
      padding: 14,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 20,
      color: tints.mutedText,
      textAlign: "center",
    },
    linkBtn: {
      alignSelf: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
      ...secondaryBtn,
    },
    linkBtnText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14,
    },
    list: {
      gap: 10,
    },
    savedRow: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    savedTextCol: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    savedTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    savedSub: {
      fontSize: 12,
      color: tints.mutedText,
      lineHeight: 16,
    },
    addBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      ...secondaryBtn,
    },
    addBtnDisabled: {
      opacity: 0.55,
      backgroundColor: addedTint,
    },
    addBtnText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 13,
    },
    removeBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: removeBg,
    },
    removeBtnText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 13,
    },
    chipGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 4,
    },
    chip: {
      width: "47%",
      minWidth: 140,
      flexGrow: 1,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      ...secondaryBtn,
    },
    chipAdded: {
      opacity: 0.55,
      backgroundColor: addedTint,
    },
    chipTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    chipTitleAdded: {
      color: colors.text,
      opacity: 0.75,
    },
    chipHint: {
      fontSize: 12,
      lineHeight: 16,
      color: tints.mutedText,
    },
    chipHintAdded: {
      color: tints.mutedText,
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
