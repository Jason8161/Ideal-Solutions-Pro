import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { SOCIAL_MEDIA_MORE_ITEMS, SOCIAL_MEDIA_PRIMARY_ITEMS } from "@/lib/socialMediaCatalog";
import { openSocialAppsStoreSearch } from "@/lib/socialMediaLaunch";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";

const DESCRIPTIONS: Record<string, string> = {
  facebook: "Opens the Facebook app if installed, otherwise the mobile site.",
  "facebook-messenger": "Opens the Messenger app if installed, otherwise messenger.com.",
  tiktok: "Opens the TikTok app if installed, otherwise tiktok.com.",
  instagram: "Opens the Instagram app if installed, otherwise instagram.com.",
  youtube: "Opens the YouTube app if installed, otherwise mobile YouTube.",
  linkedin: "Opens the LinkedIn app if installed, otherwise linkedin.com.",
  x: "Opens the X app if installed, otherwise x.com.",
  pinterest: "Opens the Pinterest app if installed, otherwise pinterest.com.",
};

function channelIcon(key: string, color: string, size: number): ReactNode {
  switch (key) {
    case "facebook":
      return <MaterialCommunityIcons name="facebook" size={size} color={color} />;
    case "facebook-messenger":
      return <MaterialCommunityIcons name="facebook-messenger" size={size} color={color} />;
    case "tiktok":
      return <Ionicons name="logo-tiktok" size={size} color={color} />;
    case "instagram":
      return <MaterialCommunityIcons name="instagram" size={size} color={color} />;
    case "youtube":
      return <MaterialCommunityIcons name="youtube" size={size} color={color} />;
    case "linkedin":
      return <MaterialCommunityIcons name="linkedin" size={size} color={color} />;
    case "x":
      return <MaterialCommunityIcons name="twitter" size={size} color={color} />;
    case "pinterest":
      return <MaterialCommunityIcons name="pinterest" size={size} color={color} />;
    default:
      return <MaterialCommunityIcons name="share-variant" size={size} color={color} />;
  }
}

export default function SocialMediaSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const iconSize = 24;
  const iconColor = colors.text;
  const chevronColor = hexToRgba(colors.text, 0.55);

  const renderPlatformRow = (key: string, label: string, onPress: () => void) => {
    const description = DESCRIPTIONS[key] ?? "";
    return (
      <Pressable key={key} style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
        <View style={styles.rowContent}>
          <View style={styles.labelRow}>
            {channelIcon(key, iconColor, iconSize)}
            <Text style={styles.rowTitle}>{label}</Text>
          </View>
          {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={chevronColor} />
      </Pressable>
    );
  };

  return (
    <StickyScrollScreen
      title="Social media"
      subtitle="Open installed social apps or their mobile sites."
      backHref={settingsBackHref("social-media")}
      backLabel={settingsBackLabel("social-media")}
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.body}>
        Tap a network to open its app on your phone when you have it installed. If the app is not installed, the app opens
        the website instead so you can sign in or browse there.
      </Text>

      <Text style={styles.section}>Main apps</Text>
      <View style={styles.list}>
        {SOCIAL_MEDIA_PRIMARY_ITEMS.map((p) =>
          renderPlatformRow(p.key, p.label, () => {
            void p.open().catch((e) => {
              Alert.alert(`Could not open ${p.label}`, e instanceof Error ? e.message : "Try again.");
            });
          }),
        )}
      </View>

      <Text style={[styles.section, styles.sectionSpaced]}>More networks</Text>
      <View style={styles.list}>
        {SOCIAL_MEDIA_MORE_ITEMS.map((p) =>
          renderPlatformRow(p.key, p.label, () => {
            void p.open().catch((e) => {
              Alert.alert(`Could not open ${p.label}`, e instanceof Error ? e.message : "Try again.");
            });
          }),
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.storeRow, pressed && styles.pressed]}
        onPress={() => openSocialAppsStoreSearch()}
      >
        <View style={styles.rowContent}>
          <View style={styles.labelRow}>
            <MaterialCommunityIcons name="store-search-outline" size={iconSize} color={iconColor} />
            <Text style={styles.rowTitle}>Find more apps</Text>
          </View>
          <Text style={styles.storeDescription}>
            Search the {Platform.OS === "ios" ? "App Store" : "Play Store"} for other social apps (for example LinkedIn,
            Snapchat, or Threads) to install on this device.
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={chevronColor} />
      </Pressable>

    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const accentTint = hexToRgba(colors.accent, 0.22);
  const mutedText = hexToRgba(colors.text, 0.72);
  const chevronColor = hexToRgba(colors.text, 0.55);

  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      padding: 24,
      paddingTop: 8,
      paddingBottom: 40,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: mutedText,
      marginBottom: 16,
    },
    section: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    sectionSpaced: {
      marginTop: 20,
    },
    list: {
      gap: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: accentTint,
      borderWidth: 1,
      borderColor: "transparent",
    },
    pressed: {
      opacity: 0.88,
    },
    rowContent: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    rowTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
      flexShrink: 1,
    },
    rowDescription: {
      fontSize: 13,
      lineHeight: 18,
      color: mutedText,
      paddingLeft: 34,
    },
    storeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 24,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: accentTint,
      borderWidth: 1,
      borderColor: "transparent",
    },
    storeDescription: {
      fontSize: 14,
      lineHeight: 20,
      color: mutedText,
      paddingLeft: 34,
    },
    back: {
      marginTop: 24,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    backText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
  });
}
