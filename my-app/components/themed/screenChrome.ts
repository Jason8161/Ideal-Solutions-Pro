import type { TextStyle, ViewStyle } from "react-native";

import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

export type AccentTints = {
  accentTint: string;
  accentTintLight: string;
  accentTintActive: string;
  mutedText: string;
};

/** Shared accent overlay opacities for cards, chips, and pressables. */
export function getAccentTints(colors: ColorScheme): AccentTints {
  return {
    accentTint: hexToRgba(colors.accent, 0.22),
    accentTintLight: hexToRgba(colors.accent, 0.12),
    accentTintActive: hexToRgba(colors.accent, 0.38),
    mutedText: hexToRgba(colors.text, 0.72),
  };
}

/** Settings / nav row — translucent accent panel, no visible border. */
export function navCardStyle(colors: ColorScheme): ViewStyle {
  return {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: hexToRgba(colors.accent, 0.22),
  };
}

/** Rounded panel (cards, list rows) matching nav tint. */
export function accentPanelStyle(colors: ColorScheme, tints?: AccentTints): ViewStyle {
  const { accentTint } = tints ?? getAccentTints(colors);
  return {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: accentTint,
  };
}

/** Secondary / outline-style button — accent tint, white label. */
export function secondaryButtonStyle(colors: ColorScheme, tints?: AccentTints): ViewStyle {
  const { accentTint } = tints ?? getAccentTints(colors);
  return {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: accentTint,
    alignItems: "center",
  };
}

/** Default TextInput accent fill (~25% opacity). */
export const INPUT_ACCENT_FILL_OPACITY = 0.25;

/** TextInput field — accent fill, white text. Optional fillOpacity (default 0.25). */
export function inputStyle(
  colors: ColorScheme,
  _tints?: AccentTints,
  fillOpacity: number = INPUT_ACCENT_FILL_OPACITY,
): TextStyle & ViewStyle {
  return {
    backgroundColor: hexToRgba(colors.accent, fillOpacity),
    color: colors.text,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  };
}

export function placeholderTextColor(colors: ColorScheme): string {
  return hexToRgba(colors.text, 0.5);
}

/** Label on solid accent CTA (copper) — dark background token for contrast. */
export function onAccentTextColor(colors: ColorScheme): string {
  return colors.background;
}
