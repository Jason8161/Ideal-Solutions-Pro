import { type TextStyle, type ViewStyle } from "react-native";

import type { ColorScheme } from "@/lib/colorSchemeStorage";
import type { ResponsiveTypography } from "@/components/themed/screenChrome";
import {
  CARD_PADDING,
  COLORS,
  globalDarkOverlayStyle,
  lineHeightForFontSize,
  primaryButtonStyle,
  primaryButtonTextStyle,
  cardStyle,
} from "@/lib/theme/appTypography";

/** Re-export global tokens for legal screens (aligned with app-wide theme). */
export const LEGAL_TEXT_PRIMARY = COLORS.textPrimary;
export const LEGAL_TEXT_SECONDARY = COLORS.textSecondary;
export const LEGAL_CARD_BG = COLORS.cardBackground;
export const LEGAL_DARK_OVERLAY = COLORS.globalOverlay;

export type LegalTypography = {
  isTablet: boolean;
  mainTitle: number;
  sectionTitle: number;
  version: number;
  instruction: number;
  checkbox: number;
  viewButton: number;
  viewButtonPadH: number;
  viewButtonPadV: number;
  cardPadding: number;
  cardGap: number;
  listGap: number;
  checkboxSize: number;
};

export function getLegalTypography(typo: ResponsiveTypography): LegalTypography {
  const pad = typo.isTablet ? CARD_PADDING.tablet : CARD_PADDING.phone;
  const gap = typo.scaleSpacing(10);
  const listGap = typo.scaleSpacing(12);
  const checkboxSize = typo.scaleSpacing(24);
  return {
    isTablet: typo.isTablet,
    mainTitle: typo.mainTitleFontSize,
    sectionTitle: typo.sectionHeaderFontSize,
    version: typo.hintFontSize,
    instruction: typo.bodyFontSize,
    checkbox: typo.buttonFontSize,
    viewButton: typo.buttonFontSize,
    viewButtonPadH: typo.scaleSpacing(14),
    viewButtonPadV: typo.scaleSpacing(8),
    cardPadding: pad,
    cardGap: gap,
    listGap,
    checkboxSize,
  };
}

export function legalDarkOverlayStyle(): ViewStyle {
  return globalDarkOverlayStyle();
}

export function legalCardStyle(typo: ResponsiveTypography): ViewStyle {
  const legal = getLegalTypography(typo);
  return {
    ...cardStyle(typo.isTablet),
    gap: legal.cardGap,
  };
}

export function legalPrimaryTextStyle(): TextStyle {
  return { color: LEGAL_TEXT_PRIMARY };
}

export function legalSecondaryTextStyle(): TextStyle {
  return { color: LEGAL_TEXT_SECONDARY };
}

export function legalViewButtonStyle(_colors: ColorScheme, typo: ResponsiveTypography): ViewStyle {
  return {
    ...primaryButtonStyle(typo.isTablet),
    flexShrink: 0,
    borderRadius: 10,
    paddingHorizontal: typo.scaleSpacing(14),
    paddingVertical: typo.scaleSpacing(8),
  };
}

export function legalViewButtonTextStyle(typo: ResponsiveTypography): TextStyle {
  const legal = getLegalTypography(typo);
  return {
    ...primaryButtonTextStyle(typo.isTablet),
    fontSize: legal.viewButton,
    lineHeight: lineHeightForFontSize(legal.viewButton),
  };
}
