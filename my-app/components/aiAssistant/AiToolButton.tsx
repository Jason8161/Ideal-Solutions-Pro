import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function AiToolButton({ title, subtitle, onPress, disabled, loading }: Props) {
  const { scStyles } = useBossManChrome();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [
        scStyles.menuButton,
        styles.button,
        (pressed || loading) && { opacity: 0.88 },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={scStyles.menuButtonText}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {loading ? <ActivityIndicator color={colors.text} /> : null}
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    button: {
      paddingVertical: 20,
      paddingHorizontal: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent, 0.35),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    textBlock: {
      flex: 1,
      gap: 4,
    },
    subtitle: {
      color: colors.text,
      opacity: 0.72,
      fontSize: 14,
      lineHeight: 20,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
