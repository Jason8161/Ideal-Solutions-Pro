import type { ImageSourcePropType } from "react-native";

/** Bundled supplier marks (favicons) — see assets/images/suppliers/README.md */
export const SUPPLIER_LOGO_SOURCES: Partial<Record<string, ImageSourcePropType>> = {
  homedepot: require("@/assets/images/suppliers/homedepot.png"),
  lowes: require("@/assets/images/suppliers/lowes.png"),
  grainger: require("@/assets/images/suppliers/grainger.png"),
  graybar: require("@/assets/images/suppliers/graybar.png"),
  rexel: require("@/assets/images/suppliers/rexel.png"),
  cityelectric: require("@/assets/images/suppliers/cityelectric.png"),
  ferguson: require("@/assets/images/suppliers/ferguson.png"),
  platt: require("@/assets/images/suppliers/platt.png"),
  amazon: require("@/assets/images/suppliers/amazon.png"),
  fastenal: require("@/assets/images/suppliers/fastenal.png"),
  menards: require("@/assets/images/suppliers/menards.png"),
  ace: require("@/assets/images/suppliers/ace.png"),
  truevalue: require("@/assets/images/suppliers/truevalue.png"),
  harbor_freight: require("@/assets/images/suppliers/harbor_freight.png"),
};

export function getSupplierLogoSource(supplierId: string): ImageSourcePropType | undefined {
  return SUPPLIER_LOGO_SOURCES[supplierId];
}

export function hasSupplierLogo(supplierId: string): boolean {
  return getSupplierLogoSource(supplierId) != null;
}
