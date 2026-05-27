import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { PAYMENT_APP_BRAND_GLYPHS } from "@/lib/paymentAppBrandGlyphs";
import type { PaymentApp, PaymentAppPresetId } from "@/lib/paymentAppsPreferences";
import { hexToRgba } from "@/lib/colorSchemeStorage";

export function paymentAppBrandHex(preset: Exclude<PaymentAppPresetId, "custom">): string {
  return PAYMENT_APP_BRAND_GLYPHS[preset].hex;
}

/** Subtle brand-tinted tile background for Getting Paid grid. */
export function paymentAppTileBackground(
  preset: PaymentAppPresetId,
  accentFallback: string,
  opacity = 0.22,
): string {
  if (preset === "custom") {
    return hexToRgba(accentFallback, opacity);
  }
  return hexToRgba(paymentAppBrandHex(preset), opacity);
}

function PaymentAppBrandIcon({
  preset,
  size,
}: {
  preset: Exclude<PaymentAppPresetId, "custom">;
  size: number;
}) {
  const { hex, path } = PAYMENT_APP_BRAND_GLYPHS[preset];
  const pad = Math.max(2, Math.round(size * 0.16));
  const inner = size - pad * 2;
  const radius = Math.round(size * 0.22);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Svg width={inner} height={inner} viewBox="0 0 24 24" accessibilityRole="image">
        <Path d={path} fill={hex} />
      </Svg>
    </View>
  );
}

export function paymentAppIcon(app: PaymentApp, fallbackColor: string, size: number): ReactNode {
  if (app.preset === "custom") {
    return <MaterialCommunityIcons name="link-variant" size={size} color={fallbackColor} />;
  }
  return <PaymentAppBrandIcon preset={app.preset} size={size} />;
}
