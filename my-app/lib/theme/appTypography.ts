/**
 * App-wide readability tokens (Apple App Store Guideline 4 ΓÇö Design).
 * Single source of truth for text colors, font minimums, cards, buttons, and backdrop overlay.
 * Screens should import helpers from `@/components/themed/screenChrome` (re-exports here).
 */
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { isTabletLayoutWidth } from "@/lib/layout/formContentWidth";

/** High-contrast text and surface tokens ΓÇö no gray, transparent, or faded label colors. */
export const COLORS = {
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.95)",
  textDisabled: "rgba(255,255,255,0.85)",
  cardBackground: "rgba(20,20,20,0.85)",
  globalOverlay: "rgba(0,0,0,0.65)",
  buttonBackground: "#CC7A29",
  buttonText: "#FFFFFF",
} as const;

export const MIN_FONT_SIZE = 16;

/** iPad layout breakpoint ΓÇö width ΓëÑ 768 uses tablet column from the spec table. */
export const TABLET_MIN_LAYOUT_WIDTH = 768;

const PHONE_FONT = {
  mainTitle: 36,
  sectionHeader: 26,
  cardTitle: 22,
  body: 18,
  small: 16,
  button: 18,
} as const;

const TABLET_FONT = {
  mainTitle: 42,
  sectionHeader: 30,
  cardTitle: 26,
  body: 22,
  small: 18,
  button: 22,
} as const;

/** +25% fonts on tablet (matches spec table). */
export const TABLET_FONT_SCALE = 1.25;
/** +25% spacing on tablet. */
export const TABLET_SPACING_SCALE = 1.25;
/** +20% button height on tablet. */
export const TABLET_BUTTON_HEIGHT_SCALE = 1.2;
/** +30% card padding on tablet. */
export const TABLET_CARD_PADDING_SCALE = 1.3;

export const BUTTON_MIN_HEIGHT = { phone: 56, tablet: 64 } as const;
export const CARD_PADDING = { phone: 20, tablet: 28 } as const;

export type TypographyRole =
  | "mainTitle"
  | "sectionHeader"
  | "cardTitle"
  | "body"
  | "small"
  | "button";

function fontSizes(isTablet: boolean) {
  return isTablet ? TABLET_FONT : PHONE_FONT;
}

export function lineHeightForFontSize(fontSize: number): number {
  return Math.round(fontSize * 1.35);
}

export function clampFontSize(size: number): number {
  return Math.max(MIN_FONT_SIZE, Math.round(size));
}

export function scaleFont(baseSize: number, isTablet: boolean): number {
  return clampFontSize(isTablet ? baseSize * TABLET_FONT_SCALE : baseSize);
}

export function scaleSpacing(base: number, isTablet: boolean): number {
  return isTablet ? Math.round(base * TABLET_SPACING_SCALE) : base;
}

export function scaleLineHeight(baseLineHeight: number, isTablet: boolean): number {
  return isTablet ? Math.round(baseLineHeight * TABLET_FONT_SCALE) : baseLineHeight;
}

export type AppResponsiveTypography = {
  isTablet: boolean;
  mainTitleFontSize: number;
  sectionHeaderFontSize: number;
  cardTitleFontSize: number;
  bodyFontSize: number;
  hintFontSize: number;
  linkFontSize: number;
  buttonFontSize: number;
  bodyLineHeight: number;
  hintLineHeight: number;
  legalBodyFontSize: number;
  legalBodyLineHeight: number;
  bodyFontWeight: TextStyle["fontWeight"];
  hintFontWeight: TextStyle["fontWeight"];
  linkFontWeight: TextStyle["fontWeight"];
  buttonMinHeight: number;
  cardPadding: number;
  scaleFont: (baseSize: number) => number;
  scaleLineHeight: (baseLineHeight: number) => number;
  scaleSpacing: (base: number) => number;
};

export const DEFAULT_BODY_FONT_WEIGHT: TextStyle["fontWeight"] = "600";
export const DEFAULT_HINT_FONT_WEIGHT: TextStyle["fontWeight"] = "600";
export const DEFAULT_LINK_FONT_WEIGHT: TextStyle["fontWeight"] = "700";

export function getResponsiveTypography(isTablet: boolean): AppResponsiveTypography {
  const sizes = fontSizes(isTablet);
  return {
    isTablet,
    mainTitleFontSize: sizes.mainTitle,
    sectionHeaderFontSize: sizes.sectionHeader,
    cardTitleFontSize: sizes.cardTitle,
    bodyFontSize: sizes.body,
    hintFontSize: sizes.small,
    linkFontSize: sizes.body,
    buttonFontSize: sizes.button,
    bodyLineHeight: lineHeightForFontSize(sizes.body),
    hintLineHeight: lineHeightForFontSize(sizes.small),
    legalBodyFontSize: sizes.body,
    legalBodyLineHeight: lineHeightForFontSize(sizes.body),
    bodyFontWeight: DEFAULT_BODY_FONT_WEIGHT,
    hintFontWeight: DEFAULT_HINT_FONT_WEIGHT,
    linkFontWeight: DEFAULT_LINK_FONT_WEIGHT,
    buttonMinHeight: isTablet ? BUTTON_MIN_HEIGHT.tablet : BUTTON_MIN_HEIGHT.phone,
    cardPadding: isTablet ? CARD_PADDING.tablet : CARD_PADDING.phone,
    scaleFont: (base) => scaleFont(base, isTablet),
    scaleLineHeight: (base) => scaleLineHeight(base, isTablet),
    scaleSpacing: (base) => scaleSpacing(base, isTablet),
  };
}

export function isTabletFromWidth(width: number): boolean {
  return isTabletLayoutWidth(width);
}

export function globalDarkOverlayStyle(): ViewStyle {
  return {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.globalOverlay,
    pointerEvents: "none",
  };
}

export function cardStyle(isTablet: boolean): ViewStyle {
  return {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: COLORS.cardBackground,
    padding: isTablet ? CARD_PADDING.tablet : CARD_PADDING.phone,
  };
}

export function primaryButtonStyle(isTablet: boolean): ViewStyle {
  return {
    backgroundColor: COLORS.buttonBackground,
    borderRadius: 14,
    minHeight: isTablet ? BUTTON_MIN_HEIGHT.tablet : BUTTON_MIN_HEIGHT.phone,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  };
}

export function primaryButtonTextStyle(isTablet: boolean): TextStyle {
  const sizes = fontSizes(isTablet);
  return {
    color: COLORS.buttonText,
    fontSize: sizes.button,
    fontWeight: "800",
  };
}

export function primaryTextStyle(): TextStyle {
  return { color: COLORS.textPrimary };
}

export function secondaryTextStyle(): TextStyle {
  return { color: COLORS.textSecondary };
}

export function disabledTextStyle(): TextStyle {
  return { color: COLORS.textDisabled };
}
