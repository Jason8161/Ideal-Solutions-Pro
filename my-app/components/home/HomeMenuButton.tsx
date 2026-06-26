import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, type ImageSource } from "expo-image";
import type { ComponentProps } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Rounded corners for home grid tiles (no stroke). */
export const HOME_MENU_TILE_BORDER_RADIUS = 14;

/** Bump when home tile sizing logic changes (cache verification). */
export const HOME_MENU_TILE_SIZING_VERSION = "v3-fill-frame";

/** Fallback vector glyph size when no tile image is shown. */
export const HOME_MENU_ICON_SIZE = 30;

export type HomeMenuButtonProps = {
  width: number;
  height: number;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress?: () => void;
  /** Bundled tile art or override URI object. */
  image?: number | ImageSource | { uri: string };
  icon?: MciName;
  iconColor?: string;
  imageMonochrome?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Uniform home menu tile: transparent chrome, artwork fills the AI Assistance frame. */
export function HomeMenuButton({
  width,
  height,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  image,
  icon,
  iconColor,
  imageMonochrome = false,
  style,
}: HomeMenuButtonProps) {
  const buttonStyle = [
    styles.button,
    { width, height, minWidth: width, minHeight: height, maxWidth: width, maxHeight: height },
    style,
  ];
  const showsImage = image != null;

  const content = showsImage ? (
    <Image
      source={image}
      style={{ width, height }}
      contentFit="fill"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...(imageMonochrome && iconColor ? { tintColor: iconColor } : null)}
    />
  ) : icon != null ? (
    <MaterialCommunityIcons
      name={icon}
      size={HOME_MENU_ICON_SIZE}
      color={iconColor}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  ) : null;

  if (onPress == null) {
    return (
      <View
        style={buttonStyle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={buttonStyle}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "transparent",
    overflow: "hidden",
    borderRadius: HOME_MENU_TILE_BORDER_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  },
});
