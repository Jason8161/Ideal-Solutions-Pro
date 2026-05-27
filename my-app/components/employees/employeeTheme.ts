import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { getAccentTints, inputStyle, navCardStyle, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { hexToRgba } from "@/lib/colorSchemeStorage";

/** Employees UI — white labels on translucent accent panels (no solid accent fills). */
export const EMPLOYEE_TEXT = "#FFFFFF";
export const EMPLOYEE_MUTED = "rgba(255,255,255,0.75)";
export const EMPLOYEE_HINT = "rgba(255,255,255,0.55)";

export function employeePlaceholderColor(): string {
  return EMPLOYEE_HINT;
}

export function useEmployeeChrome() {
  const { colors } = useAppTheme();

  return useMemo(() => {
    const tints = getAccentTints(colors);
    const nav = navCardStyle(colors);
    const btn = secondaryButtonStyle(colors, tints);
    const fieldInput = inputStyle(colors, tints);

    const styles = StyleSheet.create({
      navRow: {
        ...nav,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 12,
      },
      actionBtn: {
        ...btn,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        marginBottom: 10,
        alignItems: "center",
      },
      actionBtnText: {
        color: EMPLOYEE_TEXT,
        fontSize: 16,
        fontWeight: "800",
      },
      tab: {
        ...btn,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20,
        flex: 1,
        alignItems: "center",
      },
      tabActive: {
        backgroundColor: tints.accentTintActive,
        borderColor: "transparent",
      },
      input: {
        ...fieldInput,
        color: EMPLOYEE_TEXT,
      },
      inputMultiline: {
        minHeight: 88,
        textAlignVertical: "top",
      },
      label: {
        color: EMPLOYEE_TEXT,
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 4,
        marginTop: 6,
      },
      hint: {
        color: EMPLOYEE_MUTED,
        fontSize: 13,
        lineHeight: 18,
      },
      title: {
        color: EMPLOYEE_TEXT,
        fontSize: 17,
        fontWeight: "800",
      },
      meta: {
        color: EMPLOYEE_MUTED,
        fontSize: 15,
        lineHeight: 21,
      },
      section: {
        color: EMPLOYEE_TEXT,
        fontSize: 13,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginTop: 8,
        marginBottom: 8,
        opacity: 0.9,
      },
      badge: {
        backgroundColor: tints.accentTint,
        borderWidth: 1,
        borderColor: "transparent",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
      },
      badgePrevious: {
        backgroundColor: tints.accentTintLight,
      },
      badgeText: {
        color: EMPLOYEE_TEXT,
        fontSize: 12,
        fontWeight: "800",
      },
      chip: {
        ...btn,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
      },
      chipActive: {
        backgroundColor: tints.accentTintActive,
        borderColor: "transparent",
      },
      chipText: {
        color: EMPLOYEE_TEXT,
        fontSize: 13,
        fontWeight: "700",
      },
      sortChip: {
        ...btn,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
      },
      sortChipActive: {
        backgroundColor: tints.accentTintActive,
        borderColor: "transparent",
      },
      destructiveBtn: {
        ...btn,
        backgroundColor: hexToRgba("#ef4444", 0.22),
        borderColor: "transparent",
        marginTop: 8,
      },
      destructiveText: {
        color: EMPLOYEE_TEXT,
        fontSize: 15,
        fontWeight: "800",
      },
      modalBackdrop: {
        flex: 1,
        backgroundColor: "transparent",
      },
      modalKeyboard: {
        flex: 1,
      },
      modalScrollView: {
        flex: 1,
      },
      modalScroll: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 20,
        paddingBottom: 40,
      },
      modalCard: {
        ...nav,
        padding: 18,
        gap: 4,
        maxWidth: 480,
        width: "100%",
        alignSelf: "center",
      },
      modalTitle: {
        color: EMPLOYEE_TEXT,
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 8,
      },
      modalActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 12,
      },
      flex: { flex: 1 },
      pressed: { opacity: 0.88 },
      disabled: { opacity: 0.55 },
    });

    return { styles, tints };
  }, [colors]);
}
