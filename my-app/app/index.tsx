"use no memo";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useScale } from "@/context/ScaleContext";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { SocialMediaPickerModal } from "@/components/SocialMediaPickerModal";
import {
  ensureHomeTilesTextOnlyReset,
  loadHomeTileImageOverrides,
  type HomeTileImageOverrides,
} from "@/lib/homeButtonImageOverrides";
import { getAccountingAppLaunchUrl } from "@/lib/accountingAppLaunchUrls";
import { loadAccountingAppSelection } from "@/lib/accountingAppStorage";
import { looksLikeOpenableUrl } from "@/lib/bankAppShortcutsStorage";
import { loadHomeAccountingLaunchUrlOverride } from "@/lib/homeAccountingBankLaunchOverrides";
import {
  HOME_MENU_ITEMS,
  HOME_MENU_SHOW_TILE_IMAGES,
  HOME_SOCIAL_MEDIA_TILE,
  homeMenuItemShowsTileImage,
  type HomeMenuItem,
  type HomeTileImageKey,
} from "@/lib/homeMenuItems";
import { useSubscription } from "@/context/SubscriptionContext";
import { ensureHomeBoot, refreshHomeProfile, useHomeBoot } from "@/lib/homeBoot";
import {
  buildHomeGridRows,
  homeMenuItemRoute,
  isMaterialSearchMenuKey,
} from "@/lib/homeNavigation";
import {
  homeJobFolderHrefForTier,
  promptUpgradeForHomeTileWhenReady,
  SUBSCRIPTION_SETTINGS_HREF,
  type HomeMenuTileKey,
} from "@/lib/subscriptionGating";
import type { SubscriptionTierId } from "@/lib/subscriptionPlans";
import { OverdueInvoicesHomePrompt } from "@/components/invoices/OverdueInvoicesHomePrompt";

/** Fallback vector glyph size when no bundled `image`. */
const HOME_MENU_ICON_SIZE = 30;
/** Rounded corners for home grid tiles (no stroke). */
const HOME_MENU_TILE_BORDER_RADIUS = 14;
/** Equal height for every home menu tile row. */
const HOME_TILE_ROW_HEIGHT = 132;

function homeMenuTileShowsImage(item: HomeMenuItem, overrideUri?: string | null): boolean {
  return homeMenuItemShowsTileImage(item) && (item.image != null || !!overrideUri);
}

function homeMenuTileContentFit(item: HomeMenuItem, showsTileImage = false): "contain" | "cover" | "fill" {
  if (item.tileContentFit != null) {
    return item.tileContentFit;
  }
  return showsTileImage || item.image != null ? "fill" : "cover";
}

function homeMenuItemUsesContainAspectTile(item: HomeMenuItem, overrideUri?: string | null): boolean {
  const showsImage = homeMenuTileShowsImage(item, overrideUri);
  return homeMenuTileContentFit(item, showsImage) === "contain" && item.tileAspectRatio != null;
}

function homeMenuButtonStyles(
  item: HomeMenuItem,
  themed: ReturnType<typeof makeStyles>,
  overrideUri?: string | null,
): StyleProp<ViewStyle> {
  const showImage = homeMenuTileShowsImage(item, overrideUri);
  const styles: StyleProp<ViewStyle>[] = [
    themed.menuButton,
    showImage ? themed.menuButtonWithTileImage : null,
  ];
  if (showImage && homeMenuItemUsesContainAspectTile(item, overrideUri)) {
    styles.push(themed.menuButtonContainTile);
  }
  return styles;
}

function openSubscriptionSettings(router: ReturnType<typeof useRouter>) {
  router.push(SUBSCRIPTION_SETTINGS_HREF as Href);
}

/** Same footprint as image-based {@link HomeMenuTile}; opens social picker; tile art matches other home buttons. */
function SocialMediaHomeTile({
  themed,
  accentColor,
  subscriptionTier,
  testFlightDetectionDone,
  onOpenPicker,
  overrideUri,
}: {
  themed: ReturnType<typeof makeStyles>;
  accentColor: string;
  subscriptionTier: SubscriptionTierId;
  testFlightDetectionDone: boolean;
  onOpenPicker: () => void;
  overrideUri?: string | null;
}) {
  const router = useRouter();
  const { featureAccessContext } = useSubscription();
  const tile = HOME_SOCIAL_MEDIA_TILE;

  return (
    <TouchableOpacity
      style={homeMenuButtonStyles(tile, themed, overrideUri)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Social media"
      accessibilityHint="Choose Facebook, TikTok, Instagram, YouTube, or more networks to open."
      onPress={() =>
        promptUpgradeForHomeTileWhenReady(
          testFlightDetectionDone,
          "social-media",
          subscriptionTier,
          () => openSubscriptionSettings(router),
          onOpenPicker,
          featureAccessContext,
        )
      }
    >
      <HomeMenuGlyph item={tile} themed={themed} accentColor={accentColor} overrideUri={overrideUri} />
    </TouchableOpacity>
  );
}

export default function Page() {
  const { widthScale, heightScale } = useScale();
  const { colors } = useAppTheme();
  const themed = useMemo(() => makeStyles(colors), [colors]);
  const [socialPickerOpen, setSocialPickerOpen] = useState(false);
  const [tileOverrides, setTileOverrides] = useState<HomeTileImageOverrides>({});
  const { coldSplashDone, profileHydrated, profileCompleted } = useHomeBoot();
  const {
    activeTier: subscriptionTier,
    testFlightDetectionDone,
    refresh: refreshSubscription,
  } = useSubscription();

  const reloadTileOverrides = useCallback(() => {
    void (async () => {
      try {
        const all = await loadHomeTileImageOverrides();
        if (HOME_MENU_SHOW_TILE_IMAGES) {
          setTileOverrides(all);
          return;
        }
        const alwaysKeys = new Set<HomeTileImageKey>(
          HOME_MENU_ITEMS.filter((item) => item.alwaysShowTileImage).map((item) => item.key as HomeTileImageKey),
        );
        const scoped: HomeTileImageOverrides = {};
        for (const [key, uri] of Object.entries(all)) {
          const tileKey = key as HomeTileImageKey;
          if (alwaysKeys.has(tileKey) && uri) scoped[tileKey] = uri;
        }
        setTileOverrides(scoped);
      } catch {
        setTileOverrides({});
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!profileHydrated) return;
      let cancelled = false;
      void (async () => {
        await refreshSubscription({ silent: true });
        if (cancelled) return;
        await refreshHomeProfile();
        if (cancelled) return;
        reloadTileOverrides();
      })();
      return () => {
        cancelled = true;
      };
    }, [profileHydrated, reloadTileOverrides, refreshSubscription]),
  );

  useEffect(() => {
    void (async () => {
      await ensureHomeTilesTextOnlyReset();
      reloadTileOverrides();
    })();
  }, [reloadTileOverrides]);

  useEffect(() => {
    void ensureHomeBoot();
  }, []);

  if (!coldSplashDone) {
    return <View style={themed.splashPlaceholder} />;
  }

  const homeGridRows = buildHomeGridRows();

  return (
    <View style={themed.root}>
      <View
        style={[themed.homeMenuSection, { transform: [{ scaleX: widthScale }, { scaleY: heightScale }] }]}
      >
        <ScrollView
          style={themed.homeMenuScroll}
          contentContainerStyle={[themed.homeGridColumn, themed.homeGridScrollContent]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {!profileCompleted ? (
            <Link href="/settings/user-info" asChild>
              <TouchableOpacity style={themed.profileBanner} activeOpacity={0.85}>
                <Text style={themed.profileBannerText}>Complete User info for full features</Text>
              </TouchableOpacity>
            </Link>
          ) : null}
          <OverdueInvoicesHomePrompt ready={profileHydrated && coldSplashDone} />
          {homeGridRows.map((item) => (
            <View key={item.key} style={themed.homeGridRow}>
              <View style={themed.menuButtonCell}>
                {item.key === HOME_SOCIAL_MEDIA_TILE.key ? (
                  <SocialMediaHomeTile
                    themed={themed}
                    accentColor={colors.accent}
                    subscriptionTier={subscriptionTier}
                    testFlightDetectionDone={testFlightDetectionDone}
                    onOpenPicker={() => setSocialPickerOpen(true)}
                    overrideUri={tileOverrides[HOME_SOCIAL_MEDIA_TILE.key] ?? null}
                  />
                ) : (
                  <HomeMenuTile
                    item={item}
                    themed={themed}
                    accentColor={colors.accent}
                    subscriptionTier={subscriptionTier}
                    testFlightDetectionDone={testFlightDetectionDone}
                    overrideUri={tileOverrides[item.key] ?? null}
                  />
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
      <SocialMediaPickerModal visible={socialPickerOpen} onClose={() => setSocialPickerOpen(false)} />
    </View>
  );
}

async function openExternalUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Could not open link", "Check the URL or try opening it from your browser.");
  }
}

async function handleOpenAccountingFromHome(router: ReturnType<typeof useRouter>) {
  const [accOverride, selection] = await Promise.all([
    loadHomeAccountingLaunchUrlOverride(),
    loadAccountingAppSelection(),
  ]);
  const trimmedOverride = accOverride?.trim();
  if (trimmedOverride && looksLikeOpenableUrl(trimmedOverride)) {
    await openExternalUrl(trimmedOverride);
    return;
  }
  const url = getAccountingAppLaunchUrl(selection);
  if (!url) {
    Alert.alert(
      "Accountant / Billing",
      "Set your accounting software under Settings → Accounting & billing.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Settings", onPress: () => router.push("/settings/accounting-billing" as Href) },
      ],
    );
    return;
  }
  await openExternalUrl(url);
}

function HomeMenuGlyph({
  item,
  themed,
  accentColor,
  overrideUri,
}: {
  item: HomeMenuItem;
  themed: ReturnType<typeof makeStyles>;
  accentColor: string;
  overrideUri?: string | null;
}) {
  if (homeMenuTileShowsImage(item, overrideUri)) {
    const source = overrideUri ? { uri: overrideUri } : item.image;
    if (source == null) {
      return (
        <View style={themed.menuButtonIconSlot}>
          <MaterialCommunityIcons
            name={item.icon}
            size={HOME_MENU_ICON_SIZE}
            color={accentColor}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>
      );
    }

    return (
      <View style={themed.menuButtonTileImageSlot}>
        <Image
          source={source}
          style={[
            themed.menuButtonTileImageFill,
            item.imageMonochrome === true ? { tintColor: accentColor } : null,
          ]}
          contentFit={homeMenuTileContentFit(item, true)}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    );
  }

  return (
    <View style={themed.menuButtonIconSlot}>
      <MaterialCommunityIcons
        name={item.icon}
        size={HOME_MENU_ICON_SIZE}
        color={accentColor}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
}

function AccountingBillingHomeMenuTile({
  item,
  themed,
  accentColor,
  subscriptionTier,
  testFlightDetectionDone,
  overrideUri,
}: {
  item: HomeMenuItem;
  themed: ReturnType<typeof makeStyles>;
  accentColor: string;
  subscriptionTier: SubscriptionTierId;
  testFlightDetectionDone: boolean;
  overrideUri?: string | null;
}) {
  const router = useRouter();
  const { featureAccessContext } = useSubscription();
  return (
    <TouchableOpacity
      style={homeMenuButtonStyles(item, themed, overrideUri)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityHint="Opens your accounting app from Settings."
      onPress={() =>
        promptUpgradeForHomeTileWhenReady(
          testFlightDetectionDone,
          "todo",
          subscriptionTier,
          () => openSubscriptionSettings(router),
          () => void handleOpenAccountingFromHome(router),
          featureAccessContext,
        )
      }
    >
      <HomeMenuGlyph item={item} themed={themed} accentColor={accentColor} overrideUri={overrideUri} />
    </TouchableOpacity>
  );
}

function JobFolderHomeMenuTile({
  item,
  themed,
  accentColor,
  subscriptionTier,
  testFlightDetectionDone,
  overrideUri,
}: {
  item: HomeMenuItem;
  themed: ReturnType<typeof makeStyles>;
  accentColor: string;
  subscriptionTier: SubscriptionTierId;
  testFlightDetectionDone: boolean;
  overrideUri?: string | null;
}) {
  const router = useRouter();
  const { featureAccessContext } = useSubscription();
  return (
    <TouchableOpacity
      style={homeMenuButtonStyles(item, themed, overrideUri)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityHint="Opens Job Folder."
      onPress={() =>
        promptUpgradeForHomeTileWhenReady(
          testFlightDetectionDone,
          "job-folder",
          subscriptionTier,
          () => openSubscriptionSettings(router),
          () => router.push(homeJobFolderHrefForTier(subscriptionTier)),
          featureAccessContext,
        )
      }
    >
      <HomeMenuGlyph item={item} themed={themed} accentColor={accentColor} overrideUri={overrideUri} />
    </TouchableOpacity>
  );
}

function isHomeMenuTileKey(key: string): key is HomeMenuTileKey {
  return (
    key === "ai-assistance" ||
    key === "job-folder" ||
    key === "todo" ||
    key === "calendar" ||
    key === "getting-paid" ||
    key === "social-media"
  );
}

function HomeMenuTile({
  item,
  themed,
  accentColor,
  subscriptionTier,
  testFlightDetectionDone,
  overrideUri,
}: {
  item: HomeMenuItem;
  themed: ReturnType<typeof makeStyles>;
  accentColor: string;
  subscriptionTier: SubscriptionTierId;
  testFlightDetectionDone: boolean;
  overrideUri?: string | null;
}) {
  const router = useRouter();
  const { featureAccessContext } = useSubscription();

  if (isMaterialSearchMenuKey(item.key)) {
    return (
      <TouchableOpacity
        style={homeMenuButtonStyles(item, themed, overrideUri)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityHint="Open Supplier Hub"
        onPress={() => router.push("/materials-search" as Href)}
      >
        <HomeMenuGlyph item={item} themed={themed} accentColor={accentColor} overrideUri={overrideUri} />
      </TouchableOpacity>
    );
  }

  if (item.key === "job-folder") {
    return (
      <JobFolderHomeMenuTile
        item={item}
        themed={themed}
        accentColor={accentColor}
        subscriptionTier={subscriptionTier}
        testFlightDetectionDone={testFlightDetectionDone}
        overrideUri={overrideUri}
      />
    );
  }

  if (item.key === "todo") {
    return (
      <AccountingBillingHomeMenuTile
        item={item}
        themed={themed}
        accentColor={accentColor}
        subscriptionTier={subscriptionTier}
        testFlightDetectionDone={testFlightDetectionDone}
        overrideUri={overrideUri}
      />
    );
  }

  const route = homeMenuItemRoute(item);
  if (!route) {
    return (
      <View style={homeMenuButtonStyles(item, themed, overrideUri)} accessibilityRole="button" accessibilityLabel={item.label}>
        <HomeMenuGlyph item={item} themed={themed} accentColor={accentColor} overrideUri={overrideUri} />
      </View>
    );
  }

  const tileKey = isHomeMenuTileKey(item.key) ? item.key : null;

  return (
    <TouchableOpacity
      style={homeMenuButtonStyles(item, themed, overrideUri)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}, opens screen`}
      onPress={() => {
        const navigate = () => router.push(route);
        if (tileKey === null) {
          navigate();
          return;
        }
        promptUpgradeForHomeTileWhenReady(
          testFlightDetectionDone,
          tileKey,
          subscriptionTier,
          () => openSubscriptionSettings(router),
          navigate,
          featureAccessContext,
        );
      }}
    >
      <HomeMenuGlyph item={item} themed={themed} accentColor={accentColor} overrideUri={overrideUri} />
    </TouchableOpacity>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    homeMenuSection: {
      flex: 1,
      minHeight: 0,
      paddingTop: 12,
    },
    homeMenuScroll: {
      flex: 1,
    },
    profileBanner: {
      backgroundColor: colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      marginBottom: 10,
    },
    profileBannerText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
    },
    homeGridColumn: {
      flexDirection: "column",
      gap: 10,
    },
    homeGridScrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    homeGridRow: {
      width: "100%",
      minHeight: HOME_TILE_ROW_HEIGHT,
    },
    menuButtonCell: {
      width: "100%",
      height: HOME_TILE_ROW_HEIGHT,
    },
    menuButton: {
      flex: 1,
      height: "100%",
      alignSelf: "stretch",
      backgroundColor: colors.background,
      overflow: "hidden",
      borderRadius: HOME_MENU_TILE_BORDER_RADIUS,
      borderWidth: 0,
      alignItems: "stretch",
      justifyContent: "flex-start",
      width: "100%",
    },
    menuButtonWithTileImage: {
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    menuButtonContainTile: {
      flex: 1,
      width: "100%",
    },
    menuButtonImage: {
      width: HOME_MENU_ICON_SIZE,
      height: HOME_MENU_ICON_SIZE,
    },
    menuButtonTileImageSlot: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden",
      borderRadius: HOME_MENU_TILE_BORDER_RADIUS,
      backgroundColor: colors.background,
    },
    menuButtonTileImageFill: {
      width: "100%",
      height: "100%",
    },
    menuButtonIconSlot: {
      flex: 1,
      alignSelf: "stretch",
      minHeight: 0,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    splashPlaceholder: {
      flex: 1,
      backgroundColor: "transparent",
    },
  });
}
