import { Image, type ImageSource } from "expo-image";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useWidgetPanelStyles } from "@/components/home/useWidgetPanelStyles";

export { useWidgetPanelStyles };

export type WidgetPanelProps = ViewProps & {
  /** Optional skeuomorphic bezel art (bundled SVG/raster); drawn behind children. */
  frameSource?: number | ImageSource;
  frameContentFit?: "cover" | "contain" | "fill";
};

/** Shared chrome for home dashboard widgets (matches main menu tile panels). */
export function WidgetPanel({
  style,
  children,
  frameSource,
  frameContentFit = "cover",
  ...rest
}: WidgetPanelProps) {
  const { surface } = useWidgetPanelStyles();
  return (
    <View style={[surface, chromeStyles.root, style]} {...rest}>
      {frameSource != null ? (
        <Image
          source={frameSource}
          style={[chromeStyles.frame, chromeStyles.nonInteractive]}
          contentFit={frameContentFit}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      <View style={[chromeStyles.content, chromeStyles.passThrough]}>
        {children}
      </View>
    </View>
  );
}

const chromeStyles = StyleSheet.create({
  root: {
    position: "relative",
    overflow: "hidden",
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
  nonInteractive: {
    pointerEvents: "none",
  },
  passThrough: {
    pointerEvents: "box-none",
  },
});
