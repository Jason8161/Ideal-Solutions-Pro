import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { onAccentTextColor } from "@/components/themed/screenChrome";

type Props = {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
};

export function AgreementCheckbox({ checked, onToggle, label, disabled = false }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={disabled ? undefined : onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked, disabled && styles.checkboxDisabled]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    rowDisabled: {
      opacity: 0.55,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: colors.accent,
    },
    checkboxDisabled: {
      borderColor: hexToRgba(colors.accent, 0.4),
    },
    checkmark: {
      color: onAccentTextColor(colors),
      fontWeight: "800",
      fontSize: 14,
    },
    label: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
    },
    labelDisabled: {
      color: hexToRgba(colors.text, 0.65),
    },
  });
}
