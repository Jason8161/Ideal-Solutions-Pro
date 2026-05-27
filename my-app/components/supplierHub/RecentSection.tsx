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
import type { SupplierHubEntry } from "@/lib/supplierHub/supplierConfig";

type Props = {
  suppliers: SupplierHubEntry[];
  loading?: boolean;
  onOpenApp: (id: string) => void;
  onOpenWebsite: (id: string) => void;
  hasNativeApp?: (entry: SupplierHubEntry) => boolean;
};

export function RecentSection({
  suppliers,
  loading,
  onOpenApp,
  onOpenWebsite,
  hasNativeApp,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.label}>Recent suppliers</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  if (suppliers.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Recent suppliers</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {suppliers.map((s) => {
          const nativeApp = hasNativeApp?.(s) === true;
          return (
            <View key={s.id} style={styles.chip}>
              <View style={styles.iconWrap}>
                {supplierIntegrationIcon({ id: s.id, icon: s.logo }, colors.text, 28)}
              </View>
              <Text style={styles.name} numberOfLines={2}>
                {s.name}
              </Text>
              <View style={styles.actions}>
                {nativeApp ? (
                  <Pressable
                    onPress={() => onOpenApp(s.id)}
                    style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${s.name} app`}
                  >
                    <MaterialCommunityIcons name="application" size={16} color={colors.text} />
                    <Text style={styles.btnText}>App</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => onOpenWebsite(s.id)}
                  style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${s.name} website`}
                >
                  <MaterialCommunityIcons name="web" size={16} color={colors.text} />
                  <Text style={styles.btnText}>Web</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
      padding: 14,
      marginBottom: 16,
      gap: 10,
    },
    label: {
      fontSize: 12,
      fontWeight: "800",
      color: tints.mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    loadingText: {
      fontSize: 13,
      color: tints.mutedText,
    },
    scroll: {
      gap: 12,
      paddingBottom: 2,
    },
    chip: {
      width: 140,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: hexToRgba(colors.accent, 0.4),
      backgroundColor: tints.accentTintActive,
      padding: 10,
      alignItems: "center",
      gap: 6,
    },
    iconWrap: {
      marginBottom: 2,
    },
    name: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      minHeight: 34,
    },
    actions: {
      flexDirection: "row",
      gap: 6,
      marginTop: 4,
    },
    btn: {
      ...secondary,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      minHeight: 36,
    },
    btnPrimary: {
      backgroundColor: hexToRgba(colors.accent, 0.28),
    },
    btnText: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
    },
    pressed: { opacity: 0.88 },
  });
}
