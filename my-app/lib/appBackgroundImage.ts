import type { ImageSourcePropType } from "react-native";

/**
 * Full-bleed app wallpaper (industrial metal texture, no decorative frame).
 * Replace `assets/images/app-background.png` to change the look app-wide.
 */
export const APP_BACKGROUND_IMAGE: ImageSourcePropType = require("../assets/images/app-background.png");

/** Optional neutral dark scrim over the texture (0 = none; use ≤0.15 if text needs contrast). */
export const APP_BACKGROUND_SCRIM_ALPHA = 0.1;
