import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

export function useWidgetPanelStyles() {
  const { colors } = useAppTheme();
  return useMemo(() => makeWidgetPanelStyles(colors), [colors]);
}

function makeWidgetPanelStyles(colors: ColorScheme) {
  return StyleSheet.create({
    surface: {
      backgroundColor: colors.button,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderWidth: 0,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.45,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    surfacePressed: {
      opacity: 0.92,
    },
  });
}
