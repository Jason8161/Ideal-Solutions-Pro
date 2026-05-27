import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { useScStyles } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, navCardStyle, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";

/** Job Folder / Boss Man screens — translucent accent panels, white labels. */
export function useBossManChrome() {
  const scStyles = useScStyles();
  const { colors } = useAppTheme();

  const styles = useMemo(() => {
    const tints = getAccentTints(colors);
    const nav = navCardStyle(colors);
    const btn = secondaryButtonStyle(colors, tints);

    return StyleSheet.create({
      navRow: {
        ...nav,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 12,
      },
      categoryCard: {
        paddingVertical: 22,
        paddingHorizontal: 20,
        marginBottom: 16,
      },
      actionBtn: {
        ...btn,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        marginBottom: 10,
        alignItems: "center",
      },
      badge: {
        backgroundColor: tints.accentTint,
        borderWidth: 1,
        borderColor: "transparent",
      },
      badgeAccent: {
        backgroundColor: tints.accentTintActive,
        borderWidth: 1,
        borderColor: "transparent",
      },
    });
  }, [colors]);

  return { scStyles, styles };
}
