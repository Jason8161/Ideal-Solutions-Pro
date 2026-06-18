"use no memo";

import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { SocialMediaPickerModal } from "@/components/SocialMediaPickerModal";
import { HomeMenuButton } from "@/components/home/HomeMenuButton";
import { useFooterScrollInset } from "@/components/FormScrollView";
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
import { shouldSuppressTrialRefresh } from "@/lib/subscriptions/trialGateState";
import {
  homeJobFolderHrefForTier,
  promptUpgradeForHomeTileWhenReady,
  SUBSCRIPTION_SETTINGS_HREF,
  type HomeMenuTileKey,
} from "@/lib/subscriptionGating";
import type { SubscriptionTierId } from "@/lib/subscriptionPlans";
import { OverdueInvoicesHomePrompt } from "@/components/invoices/OverdueInvoicesHomePrompt";
import {
  HOME_MENU_HORIZONTAL_PADDING,
  HOME_MENU_TILE_GAP,
  useHomeContentWidth,
  useHomeMenuButtonDimensions,
} from "@/lib/layout/formContentWidth";

function homeMenuTileShowsImage(item: HomeMenuItem, overrideUri?: string | null): boolean {
  return homeMenuItemShowsTileImage(item) && (item.image != null || !!overrideUri);
}

function homeMenuButtonImage(
  item: HomeMenuItem,
  overrideUri?: string | null,
): HomeMenuItem["image"] | { uri: string } | undefined {
  if (!homeMenuTileShowsImage(item, overrideUri)) return undefined;
  if (overrideUri) return { uri: overrideUri };
  return item.image;
}

function openSubscriptionSettings(router: ReturnType<typeof useRouter>) {
  router.push(SUBSCRIPTION_SETTINGS_HREF as Href);
}

function SocialMediaHomeTile({
  buttonWidth,
  buttonHeight,
  accentColor,
  subscriptionTier,
  testFlightDetectionDone,
  onOpenPicker,
  overrideUri,
}: {
  buttonWidth: number;
  buttonHeight: number;
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
    <HomeMenuButton
      width={buttonWidth}
      height={buttonHeight}
      accessibilityLabel="Social media"
      accessibilityHint="Choose Facebook, TikTok, Instagram, YouTube, or more networks to open."
      image={homeMenuButtonImage(tile, overrideUri)}
      icon={tile.icon}
      iconColor={accentColor}
      imageMonochrome={tile.imageMonochrome}
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
    />
  );
}

export default function Page() {
  const { colors } = useAppTheme();
  const contentWidth = useHomeContentWidth();
  const { width: buttonWidth, height: buttonHeight } = useHomeMenuButtonDimensions();
  const footerScrollInset = useFooterScrollInset();
  const themed = useMemo(() => makeStyles(colors, footerScrollInset), [colors, footerScrollInset]);
  const [socialPickerOpen, setSocialPickerOpen] = useState(false);
  const [tileOverrides, setTileOverrides] = useState<HomeTileImageOverrides>({});
  const { coldSplashDone, profileHydrated } = useHomeBoot();
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
      if (shouldSuppressTrialRefresh()) return;
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

  const homeGridRows = buildHomeGridRows();
  const gridInnerWidth = contentWidth ?? buttonWidth;

  if (!coldSplashDone) {
    return <View style={themed.splashPlaceholder} />;
  }

  return (
    <View style={themed.root}>
      <View style={themed.homeMenuSection}>
        <ScrollView
          style={themed.homeMenuScroll}
          contentContainerStyle={[themed.homeGridColumn, themed.homeGridScrollContent]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <View style={[themed.homeGridInner, { width: gridInnerWidth }]}>
            <OverdueInvoicesHomePrompt ready={profileHydrated && coldSplashDone} />
            {homeGridRows.map((item) => (
              <View
                key={item.key}
                style={[themed.homeGridRow, { width: buttonWidth, height: buttonHeight }]}
              >
                {/* HOME_MENU_TILE_SIZING_VERSION: v3-fill-frame */}
                {item.key === HOME_SOCIAL_MEDIA_TILE.key ? (
                  <SocialMediaHomeTile
                    buttonWidth={buttonWidth}
                    buttonHeight={buttonHeight}
                    accentColor={colors.accent}
                    subscriptionTier={subscriptionTier}
                    testFlightDetectionDone={testFlightDetectionDone}
                    onOpenPicker={() => setSocialPickerOpen(true)}
                    overrideUri={tileOverrides[HOME_SOCIAL_MEDIA_TILE.key] ?? null}
                  />
                ) : (
                  <HomeMenuTile
                    item={item}
                    buttonWidth={buttonWidth}
                    buttonHeight={buttonHeight}
                    accentColor={colors.accent}
                    subscriptionTier={subscriptionTier}
                    testFlightDetectionDone={testFlightDetectionDone}
                    overrideUri={tileOverrides[item.key] ?? null}
                  />
                )}
              </View>
            ))}
          </View>
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

function AccountingBillingHomeMenuTile({
  item,
  buttonWidth,
  buttonHeight,
  accentColor,
  subscriptionTier,
  testFlightDetectionDone,
  overrideUri,
}: {
  item: HomeMenuItem;
  buttonWidth: number;
  buttonHeight: number;
  accentColor: string;
  subscriptionTier: SubscriptionTierId;
  testFlightDetectionDone: boolean;
  overrideUri?: string | null;
}) {
  const router = useRouter();
  const { featureAccessContext } = useSubscription();
  return (
    <HomeMenuButton
      width={buttonWidth}
      height={buttonHeight}
      accessibilityLabel={item.label}
      accessibilityHint="Opens your accounting app from Settings."
      image={homeMenuButtonImage(item, overrideUri)}
      icon={item.icon}
      iconColor={accentColor}
      imageMonochrome={item.imageMonochrome}
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
    />
  );
}

function JobFolderHomeMenuTile({
  item,
  buttonWidth,
  buttonHeight,
  accentColor,
  subscriptionTier,
  testFlightDetectionDone,
  overrideUri,
}: {
  item: HomeMenuItem;
  buttonWidth: number;
  buttonHeight: number;
  accentColor: string;
  subscriptionTier: SubscriptionTierId;
  testFlightDetectionDone: boolean;
  overrideUri?: string | null;
}) {
  const router = useRouter();
  const { featureAccessContext } = useSubscription();
  return (
    <HomeMenuButton
      width={buttonWidth}
      height={buttonHeight}
      accessibilityLabel={item.label}
      accessibilityHint="Opens Job Folder."
      image={homeMenuButtonImage(item, overrideUri)}
      icon={item.icon}
      iconColor={accentColor}
      imageMonochrome={item.imageMonochrome}
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
    />
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
  buttonWidth,
  buttonHeight,
  accentColor,
  subscriptionTier,
  testFlightDetectionDone,
  overrideUri,
}: {
  item: HomeMenuItem;
  buttonWidth: number;
  buttonHeight: number;
  accentColor: string;
  subscriptionTier: SubscriptionTierId;
  testFlightDetectionDone: boolean;
  overrideUri?: string | null;
}) {
  const router = useRouter();
  const { featureAccessContext } = useSubscription();

  if (isMaterialSearchMenuKey(item.key)) {
    return (
      <HomeMenuButton
        width={buttonWidth}
        height={buttonHeight}
        accessibilityLabel={item.label}
        accessibilityHint="Open Supplier Hub"
        image={homeMenuButtonImage(item, overrideUri)}
        icon={item.icon}
        iconColor={accentColor}
        imageMonochrome={item.imageMonochrome}
        onPress={() => router.push("/materials-search" as Href)}
      />
    );
  }

  if (item.key === "job-folder") {
    return (
      <JobFolderHomeMenuTile
        item={item}
        buttonWidth={buttonWidth}
        buttonHeight={buttonHeight}
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
        buttonWidth={buttonWidth}
        buttonHeight={buttonHeight}
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
      <HomeMenuButton
        width={buttonWidth}
        height={buttonHeight}
        accessibilityLabel={item.label}
        image={homeMenuButtonImage(item, overrideUri)}
        icon={item.icon}
        iconColor={accentColor}
        imageMonochrome={item.imageMonochrome}
      />
    );
  }

  const tileKey = isHomeMenuTileKey(item.key) ? item.key : null;

  return (
    <HomeMenuButton
      width={buttonWidth}
      height={buttonHeight}
      accessibilityLabel={`${item.label}, opens screen`}
      image={homeMenuButtonImage(item, overrideUri)}
      icon={item.icon}
      iconColor={accentColor}
      imageMonochrome={item.imageMonochrome}
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
    />
  );
}

function makeStyles(colors: ColorScheme, footerScrollInset: number) {
  return StyleSheet.create({
    splashPlaceholder: {
      flex: 1,
      backgroundColor: "transparent",
    },
    root: {
      flex: 1,
      backgroundColor: "transparent",
    },
    homeMenuSection: {
      flex: 1,
      minHeight: 0,
      paddingTop: 12,
      backgroundColor: "transparent",
    },
    homeMenuScroll: {
      flex: 1,
      backgroundColor: "transparent",
    },
    homeGridInner: {
      maxWidth: "100%",
      flexDirection: "column",
      gap: HOME_MENU_TILE_GAP,
      backgroundColor: "transparent",
    },
    homeGridColumn: {
      flexDirection: "column",
      backgroundColor: "transparent",
    },
    homeGridScrollContent: {
      alignItems: "center",
      paddingHorizontal: HOME_MENU_HORIZONTAL_PADDING,
      paddingBottom: footerScrollInset + HOME_MENU_TILE_GAP,
      backgroundColor: "transparent",
    },
    homeGridRow: {
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      overflow: "hidden",
    },
  });
}
