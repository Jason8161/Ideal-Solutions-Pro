import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useMemo, type ReactNode } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { deferAfterInteractions, deferAfterModalClose } from "@/lib/deferNavigation";
import { SOCIAL_MEDIA_MORE_ITEMS, SOCIAL_MEDIA_PRIMARY_ITEMS, type SocialMediaMenuItem } from "@/lib/socialMediaCatalog";
import { openSocialAppsStoreSearch } from "@/lib/socialMediaLaunch";

type Props = {
  visible: boolean;
  onClose: () => void;
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

function launch(item: SocialMediaMenuItem) {
  void item.open().catch((e) => {
    Alert.alert(`Could not open ${item.label}`, e instanceof Error ? e.message : "Try again.");
  });
}

export function SocialMediaPickerModal({ visible, onClose }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const iconSize = 24;
  const iconColor = colors.text;
  const chevronColor = hexToRgba(colors.text, 0.55);

  const openSettingsList = () => {
    deferAfterModalClose(onClose, () => {
      router.push("/settings/social-media" as Href);
    });
  };

  const openStoreSearch = () => {
    deferAfterModalClose(onClose, () => {
      openSocialAppsStoreSearch();
    });
  };

  const renderPlatformRow = (item: SocialMediaMenuItem) => (
    <Pressable
      key={item.key}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => {
        onClose();
        deferAfterInteractions(() => launch(item));
      }}
    >
      <View style={styles.labelRow}>
        {channelIcon(item.key, iconColor, iconSize)}
        <Text style={styles.rowLabel}>{item.label}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={chevronColor} />
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>
          <Text style={styles.sheetTitle}>Open social media</Text>
          <Text style={styles.sheetSubtitle}>
            Choose a network. We open the app when it is installed, otherwise the website.
          </Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.section}>Main apps</Text>
            <View style={styles.list}>{SOCIAL_MEDIA_PRIMARY_ITEMS.map(renderPlatformRow)}</View>

            <Text style={[styles.section, styles.sectionSpaced]}>More networks</Text>
            <View style={styles.list}>{SOCIAL_MEDIA_MORE_ITEMS.map(renderPlatformRow)}</View>

            <View style={[styles.list, styles.listSpaced]}>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={openSettingsList}
              >
                <View style={styles.labelRow}>
                  <MaterialCommunityIcons name="cog-outline" size={iconSize} color={iconColor} />
                  <Text style={styles.rowLabel}>All networks & details in Settings</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={chevronColor} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={openStoreSearch}
              >
                <View style={styles.rowContent}>
                  <View style={styles.labelRow}>
                    <MaterialCommunityIcons name="store-search-outline" size={iconSize} color={iconColor} />
                    <Text style={styles.rowLabel}>Find more apps</Text>
                  </View>
                  <Text style={styles.rowHint}>
                    Search the {Platform.OS === "ios" ? "App Store" : "Play Store"} for LinkedIn and other social apps to
                    install.
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={chevronColor} />
              </Pressable>
            </View>
          </ScrollView>

          <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ColorScheme) {
  const accentTint = hexToRgba(colors.accent, 0.22);
  const accentTintSheet = hexToRgba(colors.accent, 0.12);
  const mutedText = hexToRgba(colors.text, 0.72);

  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: accentTintSheet,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 20,
      paddingTop: 8,
      maxHeight: "88%",
      borderTopWidth: 1,
      borderColor: "transparent",
    },
    grabberWrap: {
      alignItems: "center",
      paddingVertical: 8,
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: hexToRgba(colors.text, 0.35),
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 6,
    },
    sheetSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: mutedText,
      marginBottom: 12,
    },
    scroll: {
      maxHeight: Platform.OS === "ios" ? 420 : 440,
    },
    section: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
      marginTop: 4,
    },
    sectionSpaced: {
      marginTop: 16,
    },
    list: {
      gap: 12,
    },
    listSpaced: {
      marginTop: 20,
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
    labelRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minWidth: 0,
    },
    rowContent: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    rowLabel: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
      flexShrink: 1,
    },
    rowHint: {
      fontSize: 13,
      lineHeight: 18,
      color: mutedText,
      paddingLeft: 34,
    },
    pressed: {
      opacity: 0.88,
    },
    cancelBtn: {
      marginTop: 12,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
  });
}
