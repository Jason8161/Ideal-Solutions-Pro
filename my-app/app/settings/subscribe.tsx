import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AdminFreeAccessLink } from "@/components/subscription/AdminFreeAccessLink";
import { FreeAccessStatusCard } from "@/components/subscription/FreeAccessStatusCard";
import { PlanTierCard } from "@/components/subscription/PlanTierCard";
import { SubscriptionDevControls } from "@/components/subscription/SubscriptionDevControls";
import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import {
  getAccentTints,
  navCardStyle,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import Constants from "expo-constants";
import {
  EXPO_GO_BETA_DEV_HINT,
  getBetaAccessDebugInfo,
  readIosTestFlightModuleValue,
  shouldShowExpoGoBetaDevHint,
} from "@/lib/betaAccess";
import { isSubscriptionGatingDisabled } from "@/lib/subscriptionTesting";
import { refreshHomeProfile } from "@/lib/homeBoot";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import {
  PLAN_PICKER_FAIR_USE_NOTE,
  PLAN_PICKER_HEADLINE,
  getSubscriptionPlan,
  type SubscriptionTierId,
} from "@/lib/subscriptionPlans";

function manageSubscriptionsUrl(): string {
  if (Platform.OS === "ios") return "https://apps.apple.com/account/subscriptions";
  return "https://play.google.com/store/account/subscriptions";
}

function PaymentOptionRow({
  icon,
  title,
  children,
  iconColor,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
  iconColor: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.payRow}>
      <View style={styles.payIconWrap} accessibilityElementsHidden>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.payTextCol}>
        <Text style={styles.payTitle}>{title}</Text>
        <Text style={styles.paySub}>{children}</Text>
      </View>
    </View>
  );
}

export default function SubscribeScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const {
    loading,
    isConfigured,
    activeTier,
    profileTier,
    proTrial,
    dailyUsage,
    dailyAiCheck,
    dailyImageCheck,
    isDevSimulating,
    isBetaFullAccess,
    isTestingUnlocked,
    subscriptionsTestingNotice,
    testFlightDetectionDone,
    runtimeTestFlight,
    pickerPlans,
    errorMessage,
    refresh,
    purchaseTier,
    restore,
  } = useSubscription();
  const manageUrl = useMemo(() => manageSubscriptionsUrl(), []);
  const [selectedId, setSelectedId] = useState<SubscriptionTierId>(
    activeTier === "locked" ? "boss_man" : activeTier,
  );
  const selectedPlan = getSubscriptionPlan(selectedId);
  const activePlan = getSubscriptionPlan(activeTier);
  const betaDebug = getBetaAccessDebugInfo();
  const testFlightModuleValue = readIosTestFlightModuleValue();

  if (__DEV__) {
    const extraBeta = (Constants.expoConfig?.extra as { betaFullAccess?: boolean } | undefined)
      ?.betaFullAccess;
    console.log("[Subscribe] Constants.expoConfig.extra.betaFullAccess", extraBeta);
  }

  return (
    <StickyScrollScreen
      title="Subscription"
      subtitle="Plans for every stage of your business"
      backHref={settingsBackHref("subscribe")}
      backLabel={settingsBackLabel("subscribe")}
      scrollStyle={styles.scroll}
      contentContainerStyle={[styles.root, wide && styles.rootWide]}
    >
      <Text style={styles.intro}>{PLAN_PICKER_HEADLINE}</Text>
      <Text style={styles.fairUseNote}>{PLAN_PICKER_FAIR_USE_NOTE}</Text>

      {isTestingUnlocked ? (
        <View style={styles.betaBanner} accessibilityRole="text">
          <Text style={styles.betaBannerText}>
            {subscriptionsTestingNotice ?? "Subscriptions disabled for testing"}
          </Text>
          <Text style={styles.devNote}>All features unlocked (Enterprise Boss Man). Store purchases are off.</Text>
        </View>
      ) : isBetaFullAccess ? (
        <View style={styles.betaBanner} accessibilityRole="text">
          <Text style={styles.betaBannerText}>Beta — Full access (Enterprise Boss Man)</Text>
        </View>
      ) : null}

      {shouldShowExpoGoBetaDevHint() ? (
        <View style={styles.card} accessibilityRole="text">
          <Text style={styles.warn}>{EXPO_GO_BETA_DEV_HINT}</Text>
        </View>
      ) : null}

      {__DEV__ ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Beta debug (__DEV__)</Text>
          <Text style={styles.devNote}>buildBetaEnv (EXPO_PUBLIC_BETA_FULL_ACCESS): {String(betaDebug.betaEnv)}</Text>
          <Text style={styles.devNote}>buildBetaExtra (app.config betaFullAccess): {String(betaDebug.betaExtra)}</Text>
          <Text style={styles.devNote}>buildFlag (beta gate): {String(betaDebug.buildFlag)}</Text>
          <Text style={styles.devNote}>
            subscriptionsDisabled (testing): {String(isSubscriptionGatingDisabled())}
          </Text>
          <Text style={styles.devNote}>isBetaFullAccess (context): {String(isBetaFullAccess)}</Text>
          <Text style={styles.devNote}>testFlightDetectionDone: {String(testFlightDetectionDone)}</Text>
          <Text style={styles.devNote}>runtimeTestFlight (context): {String(runtimeTestFlight)}</Text>
          <Text style={styles.devNote}>
            runtime TestFlight module:{" "}
            {testFlightModuleValue === "unavailable"
              ? "disabled (use preview EAS profile or .env flag)"
              : String(testFlightModuleValue)}
          </Text>
          <Text style={styles.devNote}>activeTier: {activeTier}</Text>
          <Text style={styles.devNote}>profileTier: {profileTier}</Text>
        </View>
      ) : null}

      <View style={styles.tierList}>
        {pickerPlans.map((plan) => (
          <PlanTierCard
            key={plan.id}
            plan={plan}
            selected={selectedId === plan.id}
            onPress={() => setSelectedId(plan.id)}
            colors={colors}
            compact={!wide}
          />
        ))}
      </View>

      {__DEV__ ? (
        <SubscriptionDevControls
          onChanged={() => {
            void refreshHomeProfile();
          }}
        />
      ) : null}

      <FreeAccessStatusCard />
      <AdminFreeAccessLink />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        {loading ? (
          <View style={styles.row}>
            <ActivityIndicator color={colors.text} />
            <Text style={styles.body}>Checking entitlements…</Text>
          </View>
        ) : (
          <>
            <Text style={styles.status}>
              Current: {activePlan.name} ({activePlan.priceLabel})
            </Text>
            {proTrial.interestTier && !isBetaFullAccess && !isTestingUnlocked ? (
              <Text style={styles.devNote}>
                Trial ({getSubscriptionPlan(proTrial.interestTier).name}):{" "}
                {proTrial.isExpired
                  ? "ended — subscribe to continue"
                  : `${proTrial.daysRemaining} day${proTrial.daysRemaining === 1 ? "" : "s"} left · AI ${proTrial.aiRequestsUsed}/${proTrial.aiLimit}`}
              </Text>
            ) : null}
            <Text style={styles.devNote}>
              AI this period: {dailyAiCheck.used} / {dailyAiCheck.limit}
              {dailyAiCheck.nearingLimit ? " (approaching limit)" : ""}
              {" · "}
              Photos: stored on device only
            </Text>
          </>
        )}
        {isTestingUnlocked ? (
          <Text style={styles.devNote}>
            Testing mode — Enterprise Boss Man tier on device; RevenueCat purchases are disabled until launch.
          </Text>
        ) : isBetaFullAccess ? (
          <Text style={styles.devNote}>
            TestFlight or preview build — all features unlocked for beta testing (Super Bossman tier).
          </Text>
        ) : null}
        {isDevSimulating ? (
          <Text style={styles.devNote}>Developer simulation is active — entitlements are overridden for testing.</Text>
        ) : null}
        {errorMessage ? <Text style={styles.warn}>{errorMessage}</Text> : null}
        {isTestingUnlocked ? (
          <Text style={styles.devNote}>RevenueCat is not initialized while subscriptions are disabled.</Text>
        ) : isConfigured ? (
          <Text style={styles.ok}>RevenueCat is configured for this build.</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscribe</Text>
        {selectedPlan.isPaid ? (
          <Pressable
            onPress={() =>
              void purchaseTier(selectedId).then((r) => {
                if (r.ok) Alert.alert("Subscribe", `${selectedPlan.name} is active.`);
                else if (r.message) Alert.alert("Subscribe", r.message);
              })
            }
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            disabled={loading || Platform.OS === "web" || isTestingUnlocked}
          >
            <Text style={styles.primaryText}>
              {isTestingUnlocked ? "Purchases disabled (testing)" : `Subscribe — ${selectedPlan.priceLabel}`}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.body}>
            Helper Mode includes a 7-day trial without a store purchase. Pick a paid plan above when you are ready.
          </Text>
        )}
        <Pressable
          onPress={() =>
            void restore().then((r) => {
              if (r.ok) Alert.alert("Restore", "Restore completed.");
              else if (r.message) Alert.alert("Restore", r.message);
            })
          }
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          disabled={loading || Platform.OS === "web" || isTestingUnlocked}
        >
          <Text style={styles.secondaryText}>
            {isTestingUnlocked ? "Restore disabled (testing)" : "Restore purchases"}
          </Text>
        </Pressable>
        <Pressable onPress={() => void refresh()} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>Refresh status</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(manageUrl)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>Manage subscriptions (store)</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment options</Text>
        <Text style={styles.payIntro}>
          {Platform.OS === "web"
            ? "Subscriptions are purchased in the iOS or Android app. The store’s own checkout chooses which payment methods you can use."
            : Platform.OS === "ios"
              ? "Checkout is run by Apple (cards, Apple Pay, and other methods on your Apple ID)."
              : "Checkout is run by Google Play (cards, Google Pay, PayPal in some regions)."}
        </Text>
        <PaymentOptionRow icon="card-outline" title="Credit & debit cards" iconColor={colors.text} styles={styles}>
          Billed through your Apple or Google account at the price shown in the purchase sheet for your region.
        </PaymentOptionRow>
        <View style={styles.payDivider} />
        <PaymentOptionRow icon="wallet-outline" title="Venmo" iconColor={colors.text} styles={styles}>
          Venmo is not used for in-app subscriptions. Use the payment methods offered in the store checkout.
        </PaymentOptionRow>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Store review checklist</Text>
        <Text style={styles.bullet}>• Plan names and prices are visible before purchase.</Text>
        <Text style={styles.bullet}>• Restore purchases is easy to find.</Text>
        <Text style={styles.bullet}>• Fair-use AI access is described; no unlimited claims.</Text>
      </View>
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const cardBase = navCardStyle(colors);
  const secondaryBtn = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: "transparent",
    },
    root: {
      padding: 16,
      paddingBottom: 32,
      gap: 14,
      backgroundColor: "transparent",
    },
    rootWide: {
      alignSelf: "center",
      width: "100%",
      maxWidth: 980,
    },
    intro: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "700",
      color: colors.text,
    },
    fairUseNote: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
      opacity: 0.82,
    },
    betaBanner: {
      ...cardBase,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: hexToRgba(colors.accent, 0.12),
      borderColor: hexToRgba(colors.accent, 0.35),
    },
    betaBannerText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    tierList: {
      gap: 14,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      opacity: 0.9,
    },
    card: {
      ...cardBase,
      padding: 14,
      gap: 10,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    status: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    devNote: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.9,
      fontStyle: "italic",
    },
    warn: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.9,
    },
    ok: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.9,
    },
    bullet: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.9,
    },
    primary: {
      ...secondaryBtn,
      paddingVertical: 12,
    },
    secondary: {
      ...secondaryBtn,
      paddingVertical: 12,
    },
    pressed: {
      opacity: 0.88,
    },
    primaryText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 15,
    },
    secondaryText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 15,
      opacity: 0.95,
    },
    payIntro: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
      opacity: 0.82,
      marginBottom: 4,
    },
    payRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 4,
    },
    payIconWrap: {
      width: 36,
      alignItems: "center",
      paddingTop: 2,
    },
    payTextCol: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    payTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    paySub: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.82,
    },
    payDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexToRgba(colors.text, 0.18),
      marginVertical: 6,
      marginLeft: 48,
    },
  });
}
