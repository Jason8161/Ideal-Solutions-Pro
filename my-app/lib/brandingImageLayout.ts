import { useWindowDimensions } from "react-native";

/** Display scale for logos and splash art (~35% smaller than prior full-bleed sizing). */
export const BRANDING_IMAGE_DISPLAY_SCALE = 0.65;

/** Prior home brand logo cap (300├ù80) scaled to {@link BRANDING_IMAGE_DISPLAY_SCALE}. */
export const HOME_BRAND_LOGO_MAX_WIDTH = Math.round(300 * BRANDING_IMAGE_DISPLAY_SCALE);
export const HOME_BRAND_LOGO_HEIGHT = Math.round(80 * BRANDING_IMAGE_DISPLAY_SCALE);

/** `expo-splash-screen` plugin `imageWidth` ΓÇö keep in sync with app.json splash plugin. */
export const NATIVE_SPLASH_IMAGE_WIDTH = HOME_BRAND_LOGO_MAX_WIDTH;

/** Centered stage for cold-splash logo and hero (65% of window, aspect preserved via contain). */
export function useBrandingImageStageDimensions(): { width: number; height: number } {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  return {
    width: Math.round(windowWidth * BRANDING_IMAGE_DISPLAY_SCALE),
    height: Math.round(windowHeight * BRANDING_IMAGE_DISPLAY_SCALE),
  };
}
