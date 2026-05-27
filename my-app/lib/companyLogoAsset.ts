/** Bundled fallback when no custom `logoUri` is saved in the company profile. */
export const DEFAULT_COMPANY_LOGO_SOURCE = require("../assets/images/icon.png");

/** Let the app wallpaper / metal panel show through logo images (no solid tile behind art). */
export const COMPANY_LOGO_IMAGE_STYLE = {
  backgroundColor: "transparent" as const,
};
