import { View } from "react-native";

import { legalDarkOverlayStyle } from "@/components/legal/legalScreenChrome";

/** Full-screen dark scrim over the construction wallpaper on legal flows. */
export function LegalDarkOverlay() {
  return <View style={legalDarkOverlayStyle()} pointerEvents="none" />;
}
