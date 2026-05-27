import type { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";

import { getSupplierLogoSource } from "@/lib/supplierLogos";
import { supplierIntegrationFallbackIcon } from "@/lib/supplierIntegration/supplierFallbackIcon";
import type { SupplierIconKind } from "@/lib/supplierIntegration/types";

type Props = {
  supplierId: string;
  icon: SupplierIconKind;
  color: string;
  size: number;
};

/** Brand image when bundled; otherwise Ionicons / MCI (same as legacy supplierIntegrationIcon). */
export function supplierLogo({ supplierId, icon, color, size }: Props): ReactNode {
  const source = getSupplierLogoSource(supplierId);
  if (!source) {
    return supplierIntegrationFallbackIcon({ id: supplierId, icon }, color, size);
  }

  const radius = Math.round(size * 0.2);
  const pad = Math.max(2, Math.round(size * 0.08));

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: radius,
          padding: pad,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${supplierId} logo`}
    >
      <Image source={source} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
