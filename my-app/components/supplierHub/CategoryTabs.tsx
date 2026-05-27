import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getAccentTints, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import type { SupplierHubCategory } from "@/lib/supplierHub/supplierConfig";

export type SupplierHubTab = SupplierHubCategory | "Favorites";

type Props = {
  active: SupplierHubTab;
  onChange: (tab: SupplierHubTab) => void;
};

const TABS: readonly SupplierHubTab[] = ["Electrical", "Retail", "Industrial", "Favorites"];

export function CategoryTabs({ active, onChange }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const selected = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab}
          >
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondary = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 10,
      paddingVertical: 4,
    },
    tab: {
      ...secondary,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 12,
      minHeight: 48,
      justifyContent: "center",
    },
    tabActive: {
      backgroundColor: hexToRgba(colors.accent, 0.35),
      borderColor: hexToRgba(colors.accent, 0.75),
    },
    tabText: {
      fontSize: 14,
      fontWeight: "800",
      color: tints.mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    tabTextActive: {
      color: colors.text,
    },
    pressed: { opacity: 0.88 },
  });
}
