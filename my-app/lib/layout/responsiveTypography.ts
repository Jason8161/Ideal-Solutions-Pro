import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { getResponsiveTypography, type ResponsiveTypography } from "@/components/themed/screenChrome";

import { isTabletLayoutWidth } from "./formContentWidth";

export type { ResponsiveTypography };

/** Window-width tablet check (ΓëÑ768) ΓÇö matches form/home layout breakpoints. */
export function useIsTabletLayout(): boolean {
  const { width } = useWindowDimensions();
  return isTabletLayoutWidth(width);
}

/** Scaled body/hint/link tokens for the current window width. */
export function useResponsiveTypography(): ResponsiveTypography {
  const { width } = useWindowDimensions();
  const isTablet = isTabletLayoutWidth(width);
  return useMemo(() => getResponsiveTypography(isTablet), [isTablet]);
}
