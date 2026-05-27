import type { ImageSourcePropType } from "react-native";

import { DEFAULT_COMPANY_LOGO_SOURCE } from "@/lib/companyLogoAsset";

/** App logo — phase 1 of `HomeColdSplashOverlay` only. */
export const COLD_SPLASH_APP_LOGO: ImageSourcePropType = DEFAULT_COMPANY_LOGO_SOURCE;

/** Hands + sparking wire — phase 2 of `HomeColdSplashOverlay` during cold start only. */
export const COLD_SPLASH_HERO_IMAGE: ImageSourcePropType = require("../assets/images/hot wire.png");
