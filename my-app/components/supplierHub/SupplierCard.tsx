import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  accentPanelStyle,
  getAccentTints,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { supplierIntegrationIcon } from "@/lib/supplierIntegration/supplierIcon";
import type { SupplierHubEntry } from "@/lib/supplierHub/supplierConfig";

type Props = {
  supplier: SupplierHubEntry;
  hasNativeApp: boolean;
  /** Detected install, or user previously opened this supplier app successfully. */
  installed: boolean;
  /** App Store / Play Store listing available (Install App secondary action). */
  hasStoreListing: boolean;
  favorite: boolean;
  busy?: boolean;
  /** When false, star control is hidden (e.g. Materials search favorites-only view). */
  showFavoriteToggle?: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenApp: (id: string) => void;
  onOpenWebsite: (id: string) => void;
  onInstallApp: (id: string) => void;
};

export function SupplierCard({
  supplier,
  hasNativeApp,
  installed,
  hasStoreListing,
  favorite,
  busy,
  showFavoriteToggle = true,
  onToggleFavorite,
  onOpenApp,
  onOpenWebsite,
  onInstallApp,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      {showFavoriteToggle ? (
        <Pressable
          onPress={() => onToggleFavorite(supplier.id)}
          style={({ pressed }) => [styles.favBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={favorite ? `Unpin ${supplier.name}` : `Pin ${supplier.name} to favorites`}
        >
          <MaterialCommunityIcons
            name={favorite ? "star" : "star-outline"}
            size={22}
            color={favorite ? colors.accent : colors.text}
          />
        </Pressable>
      ) : null}

      <View style={styles.logoWrap}>
        {supplierIntegrationIcon(
          { id: supplier.id, icon: supplier.logo ?? "store" },
          colors.text,
          44,
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {supplier.name}
      </Text>
      <Text style={styles.category}>{supplier.category}</Text>

      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.busyText}>Opening…</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          {hasNativeApp ? (
            <>
              <Pressable
                onPress={() => onOpenApp(supplier.id)}
                style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${supplier.name} app`}
              >
                <MaterialCommunityIcons name="application-export" size={18} color={colors.text} />
                <Text style={styles.actionText}>Open App</Text>
              </Pressable>
              {hasStoreListing && !installed ? (
                <Pressable
                  onPress={() => onInstallApp(supplier.id)}
                  style={({ pressed }) => [styles.actionBtn, styles.actionSecondary, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Get ${supplier.name} app from the store`}
                >
                  <MaterialCommunityIcons name="download" size={16} color={colors.text} />
                  <Text style={styles.actionTextSecondary}>Install App</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => onOpenWebsite(supplier.id)}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${supplier.name} website`}
              >
                <MaterialCommunityIcons name="web" size={18} color={colors.text} />
                <Text style={styles.actionText}>Open Website</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => onOpenWebsite(supplier.id)}
              style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${supplier.name}`}
            >
              <MaterialCommunityIcons name="web" size={18} color={colors.text} />
              <Text style={styles.actionText}>Open supplier</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondary = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    card: {
      ...panel,
      width: "47%",
      minWidth: 160,
      flexGrow: 1,
      padding: 14,
      paddingTop: 10,
      alignItems: "center",
      backgroundColor: tints.accentTintActive,
      borderWidth: 2,
      borderColor: hexToRgba(colors.accent, 0.35),
      borderRadius: 16,
      gap: 6,
    },
    favBtn: {
      alignSelf: "flex-end",
      padding: 4,
    },
    logoWrap: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      minHeight: 40,
    },
    category: {
      fontSize: 11,
      fontWeight: "700",
      color: tints.mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.35,
      marginBottom: 4,
    },
    actions: {
      width: "100%",
      gap: 8,
      marginTop: 4,
    },
    actionBtn: {
      ...secondary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      minHeight: 48,
    },
    actionPrimary: {
      backgroundColor: hexToRgba(colors.accent, 0.28),
      borderColor: hexToRgba(colors.accent, 0.55),
    },
    actionSecondary: {
      paddingVertical: 10,
      minHeight: 40,
      opacity: 0.92,
    },
    actionText: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
    },
    actionTextSecondary: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    busyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 16,
    },
    busyText: {
      fontSize: 13,
      fontWeight: "600",
      color: tints.mutedText,
    },
    pressed: { opacity: 0.88 },
  });
}
