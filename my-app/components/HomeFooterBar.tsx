import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/ThemeContext";
import { hexToRgba } from "@/lib/colorSchemeStorage";

const ICON_SIZE = 22;

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

function FooterNavIcon({
  name,
  color,
  size = ICON_SIZE,
}: {
  name: MciName;
  color: string;
  size?: number;
}) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      style={{ color }}
      accessibilityElementsHidden
    />
  );
}

export function HomeFooterBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const onHome = pathname === "/" || pathname === "";
  const onSettings = pathname === "/settings" || pathname.startsWith("/settings/");

  const footerForeground = colors.text;
  const accentTint = hexToRgba(colors.accent, 0.22);
  const accentTintActive = hexToRgba(colors.accent, 0.28);

  const footerButtonStyle = (active: boolean) => ({
    backgroundColor: active ? accentTintActive : accentTint,
    borderWidth: 1,
    borderColor: "transparent" as const,
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: "transparent",
        },
      ]}
    >
      <View style={[styles.barSide, styles.barSideStart]}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            footerButtonStyle(false),
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
        >
          <View style={styles.buttonContent}>
            <FooterNavIcon name="arrow-left" color={footerForeground} />
            <Text style={[styles.buttonText, { color: footerForeground }]}>Back</Text>
          </View>
        </Pressable>
      </View>
      <View style={styles.barCenter}>
        <Link href="/" asChild style={{ color: footerForeground }}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              footerButtonStyle(onHome),
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go to home"
          >
            <View style={styles.buttonContent}>
              <FooterNavIcon name="home-outline" color={footerForeground} />
              <Text style={[styles.buttonText, { color: footerForeground }]}>Home</Text>
            </View>
          </Pressable>
        </Link>
      </View>
      <View style={[styles.barSide, styles.barSideEnd]}>
        <Link href="/settings" asChild style={{ color: footerForeground }}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              footerButtonStyle(onSettings),
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <View style={styles.buttonContent}>
              <FooterNavIcon name="cog-outline" color={footerForeground} />
              <Text style={[styles.buttonText, { color: footerForeground }]}>Settings</Text>
            </View>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  barSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  barSideStart: {
    justifyContent: "flex-start",
  },
  barSideEnd: {
    justifyContent: "flex-end",
  },
  barCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 88,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  },
  buttonContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
