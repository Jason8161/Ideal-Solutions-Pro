import { useWindowDimensions } from "react-native";

import { HOME_AI_ASSISTANCE_TILE_ASPECT_RATIO } from "@/lib/homeMenuItems";

export const TABLET_MIN_WIDTH = 768;
const TABLET_HORIZONTAL_INSET = 48;
const FORM_MAX_WIDTH = 480;

/**
 * Home menu tile sizing ΓÇö tune constants below for each device class.
 *
 * Sizing formula (recalculates on rotation via `useWindowDimensions`):
 * - **iPhone:** `tileWidth = (windowWidth ΓêÆ 2├ùHOME_MENU_HORIZONTAL_PADDING) ├ù HOME_PHONE_TILE_WIDTH_FRACTION`
 * - **iPad portrait:** `tileWidth = min(HOME_MAX_WIDTH, windowWidth ΓêÆ TABLET_HORIZONTAL_INSET)`
 * - **iPad landscape:** `tileWidth = min(HOME_MAX_WIDTH_LANDSCAPE, windowWidth ΓêÆ TABLET_HORIZONTAL_INSET)`
 * - **All devices:** `tileHeight = tileWidth / HOME_TILE_ASPECT_RATIO`
 *
 * Tiles are centered in the scroll area; artwork uses `contentFit: fill` so every PNG fills the
 * same width/height frame as AI Assistance (intrinsic PNG aspect ratios differ).
 */
/** Intrinsic width ├╖ height of AI Assistance plaque art (`ideal-solutions-pro-button.png`, 1024├ù516). */
export const HOME_TILE_ASPECT_RATIO = HOME_AI_ASSISTANCE_TILE_ASPECT_RATIO;
/** Max tile width on iPad portrait (centered, not edge-to-edge). Tune: 480ΓÇô520. */
export const HOME_MAX_WIDTH = 500;
/** Max tile width on iPad landscape (slightly wider cap, still centered). Tune: 480ΓÇô560. */
export const HOME_MAX_WIDTH_LANDSCAPE = 520;
/** Fraction of padded content width used by tiles on phone. Tune: 0.90ΓÇô0.95. */
export const HOME_PHONE_TILE_WIDTH_FRACTION = 0.92;
/** Horizontal padding on home ScrollView content (each side). */
export const HOME_MENU_HORIZONTAL_PADDING = 24;
/** Vertical gap between home menu button rows. */
export const HOME_MENU_TILE_GAP = 16;

export type HomeDeviceClass = "phone" | "tablet-portrait" | "tablet-landscape";

export function isTabletLayoutWidth(width: number): boolean {
  return width >= TABLET_MIN_WIDTH;
}

function tabletContentWidth(width: number, maxWidth: number): number {
  return Math.min(maxWidth, width - TABLET_HORIZONTAL_INSET);
}

/** Classifies the current window for home tile sizing (orientation-aware on tablet). */
export function getHomeDeviceClass(windowWidth: number, windowHeight: number): HomeDeviceClass {
  if (!isTabletLayoutWidth(windowWidth)) return "phone";
  return windowHeight > windowWidth ? "tablet-portrait" : "tablet-landscape";
}

function tabletHomeMaxWidth(windowWidth: number, windowHeight: number): number {
  return getHomeDeviceClass(windowWidth, windowHeight) === "tablet-landscape"
    ? HOME_MAX_WIDTH_LANDSCAPE
    : HOME_MAX_WIDTH;
}

function homeMenuButtonWidth(windowWidth: number, windowHeight: number): number {
  if (isTabletLayoutWidth(windowWidth)) {
    return tabletContentWidth(windowWidth, tabletHomeMaxWidth(windowWidth, windowHeight));
  }
  const paddedWidth = windowWidth - HOME_MENU_HORIZONTAL_PADDING * 2;
  return Math.round(paddedWidth * HOME_PHONE_TILE_WIDTH_FRACTION);
}

/** Keeps auth and onboarding forms readable on iPad (avoids stretched iPhone-compat layout). */
export function useFormContentWidth(): number | undefined {
  const { width } = useWindowDimensions();
  if (!isTabletLayoutWidth(width)) return undefined;
  return tabletContentWidth(width, FORM_MAX_WIDTH);
}

/** Centers home menu tiles on iPad so buttons keep phone-like aspect ratio. */
export function useHomeContentWidth(): number | undefined {
  const { width, height } = useWindowDimensions();
  if (!isTabletLayoutWidth(width)) return undefined;
  return tabletContentWidth(width, tabletHomeMaxWidth(width, height));
}

/** Uniform home tile size derived from AI Assistance plaque aspect ratio (1024├ù516). */
export function useHomeMenuButtonDimensions(): { width: number; height: number } {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const width = homeMenuButtonWidth(windowWidth, windowHeight);
  const height = Math.round(width / HOME_TILE_ASPECT_RATIO);
  return { width, height };
}

/** @deprecated Use {@link useHomeMenuButtonDimensions} ΓÇö height leg only. */
export function useHomeTileRowHeight(): number {
  return useHomeMenuButtonDimensions().height;
}
