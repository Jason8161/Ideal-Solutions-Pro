import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  accentPanelStyle,
  getAccentTints,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { supplierIntegrationIcon } from "@/lib/supplierIntegration/supplierIcon";
import type { QuickLaunchSupplier } from "@/lib/supplierIntegration/types";

function formatLastUsed(ts?: number): string | null {
  if (!ts) return null;
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

type Props = {
  suppliers: QuickLaunchSupplier[];
  loading?: boolean;
  defaultSupplierId?: string | null;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onManageFavorites: () => void;
};

export function SupplierQuickLaunchRow({
  suppliers,
  loading,
  defaultSupplierId,
  onOpen,
  onToggleFavorite,
  onManageFavorites,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Supplier quick launch</Text>
        <Pressable
          onPress={onManageFavorites}
          style={({ pressed }) => [styles.manageBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Manage favorite suppliers"
        >
          <Text style={styles.manageBtnText}>Manage</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.loadingText}>Checking installed apps…</Text>
        </View>
      ) : suppliers.length === 0 ? (
        <Text style={styles.emptyHint}>Manage favorites in Settings to see quick launch tiles here.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {suppliers.map((s) => {
            const lastUsed = formatLastUsed(s.lastUsedAt);
            const isDefault = defaultSupplierId === s.id;
            return (
              <View key={s.id} style={styles.card}>
                <Pressable
                  onPress={() => onToggleFavorite(s.id)}
                  style={({ pressed }) => [styles.favBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={s.favorite ? `Unpin ${s.name}` : `Pin ${s.name}`}
                >
                  <MaterialCommunityIcons
                    name={s.favorite || isDefault ? "star" : "star-outline"}
                    size={20}
                    color={s.favorite || isDefault ? colors.accent : colors.text}
                  />
                </Pressable>
                <View style={styles.logoWrap}>{supplierIntegrationIcon(s, colors.text, 32)}</View>
                <Text style={styles.name} numberOfLines={2}>
                  {s.name}
                </Text>
                {s.installed ? (
                  <View style={styles.installedBadge}>
                    <Text style={styles.installedBadgeText}>Installed</Text>
                  </View>
                ) : (
                  <Text style={styles.webHint}>Website</Text>
                )}
                {s.preferredBranch ? (
                  <Text style={styles.branchHint} numberOfLines={1}>
                    {s.preferredBranch}
                    {s.branchDistanceMi != null ? ` · ${s.branchDistanceMi.toFixed(1)} mi` : ""}
                  </Text>
                ) : null}
                {lastUsed ? <Text style={styles.lastUsed}>{lastUsed}</Text> : null}
                <Pressable
                  onPress={() => onOpen(s.id)}
                  style={({ pressed }) => [styles.openBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${s.name}`}
                >
                  <Text style={styles.openBtnText}>Open app</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondary = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    section: {
      ...panel,
      paddingVertical: 14,
      paddingHorizontal: 12,
      marginBottom: 16,
      gap: 10,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: tints.mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    manageBtn: {
      ...secondary,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    manageBtnText: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 4,
    },
    loadingText: {
      fontSize: 13,
      color: tints.mutedText,
    },
    emptyHint: {
      fontSize: 13,
      lineHeight: 18,
      color: tints.mutedText,
      paddingHorizontal: 4,
    },
    scrollContent: {
      gap: 12,
      paddingHorizontal: 4,
      paddingBottom: 4,
    },
    card: {
      width: 148,
      minHeight: 200,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: hexToRgba(colors.accent, 0.45),
      backgroundColor: tints.accentTintActive,
      padding: 10,
      alignItems: "center",
    },
    favBtn: {
      alignSelf: "flex-end",
      padding: 2,
    },
    logoWrap: {
      marginBottom: 6,
    },
    name: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      minHeight: 36,
    },
    installedBadge: {
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: hexToRgba(colors.accent, 0.3),
    },
    installedBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.accent,
      textTransform: "uppercase",
    },
    webHint: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: "600",
      color: tints.mutedText,
    },
    branchHint: {
      marginTop: 4,
      fontSize: 10,
      color: tints.mutedText,
      textAlign: "center",
      maxWidth: "100%",
    },
    lastUsed: {
      marginTop: 2,
      fontSize: 10,
      color: tints.mutedText,
    },
    openBtn: {
      marginTop: "auto",
      paddingTop: 8,
      width: "100%",
      ...secondary,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: hexToRgba(colors.accent, 0.22),
    },
    openBtnText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
    },
    pressed: { opacity: 0.88 },
  });
}
