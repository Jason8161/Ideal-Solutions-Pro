import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import type { MiscCatalogFilter } from "@/lib/integrations/types";

const FILTERS: { id: MiscCatalogFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "work", label: "Work" },
  { id: "games", label: "Games" },
];

type Props = {
  value: MiscCatalogFilter;
  onChange: (next: MiscCatalogFilter) => void;
};

export function MiscCatalogCategoryFilter({ value, onChange }: Props) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {FILTERS.map((f) => {
        const active = value === f.id;
        return (
          <Pressable
            key={f.id}
            onPress={() => onChange(f.id)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter ${f.label}`}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    row: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: hexToRgba(colors.text, 0.2),
    },
    chipActive: {
      backgroundColor: hexToRgba(colors.accent, 0.35),
      borderColor: hexToRgba(colors.accent, 0.6),
    },
    chipText: { fontSize: 14, fontWeight: "700", color: colors.text, opacity: 0.75 },
    chipTextActive: { opacity: 1, fontWeight: "800" },
    pressed: { opacity: 0.88 },
  });
}
