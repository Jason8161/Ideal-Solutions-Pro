import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { AuthIntentPressable } from "@/components/auth/AuthIntentLink";
import { FreeAccessStatusCard } from "@/components/subscription/FreeAccessStatusCard";
import { SubscriptionPurchaseDisclosure } from "@/components/subscription/SubscriptionPurchaseDisclosure";
import { PlanTierCard } from "@/components/subscription/PlanTierCard";
import { EmployeeAccessCard } from "@/components/subscription/EmployeeAccessCard";
import { SubscriptionDevControls } from "@/components/subscription/SubscriptionDevControls";
import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import {
  getAccentTints,
  navCardStyle,
  secondaryButtonStyle,
  type ResponsiveTypography,
} from "@/components/themed/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import Constants from "expo-constants";
import { withPromiseTimeout } from "@/lib/async/withPromiseTimeout";
import {
  EXPO_GO_BETA_DEV_HINT,
  getBetaAccessDebugInfo,
  getSubscribeRuntimeNotice,
  readIosTestFlightModuleValue,
  shouldShowExpoGoBetaDevHint,
} from "@/lib/betaAccess";
import { isSubscriptionGatingDisabled } from "@/lib/subscriptionTesting";
import { refreshHomeProfile } from "@/lib/homeBoot";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { useResponsiveTypography } from "@/lib/layout/responsiveTypography";
import { useAuth } from "@/lib/auth/AuthContext";
import { AUTH_SIGNUP_HREF } from "@/lib/auth/authPaths";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import {
  PLAN_PICKER_FAIR_USE_NOTE,
  PLAN_PICKER_HEADLINE,
  getSubscriptionPlan,
  type SubscriptionTierId,
} from "@/lib/subscriptionPlans";
import { PURCHASE_ACTION_TIMEOUT_MS, useOfferingsFilteredPlans } from "@/lib/revenuecat";
import { packageDisclosureFromPackage, type PackageDisclosureInfo } from "@/lib/revenuecat/disclosure";
import { findTierPackage } from "@/lib/revenuecat/purchases";

function storeManageLabel(): string {  if (Platform.OS === "ios") return "Open App Store subscriptions";
  if (Platform.OS === "android") return "Open Play Store subscriptions";
  return "Open store subscriptions";
}

function handleSubscriptionAction(
  title: string,
  result: { ok: boolean; message?: string; cancelled?: boolean },
  successMessage?: string,
) {
  if (result.ok) {
    Alert.alert(title, successMessage ?? "Done.");
    return;
  }
  if (result.cancelled) return;
  if (result.message) {
    Alert.alert(title, result.message);
  }
}

function manageSubscriptionsUrl(): string {
  if (Platform.OS === "ios") return "https://apps.apple.com/account/subscriptions";
  return "https://play.google.com/store/account/subscriptions";
}

export default function SubscribeScreen() {  const router = useRouter();
  const { colors } = useAppTheme();
  const typo = useResponsiveTypography();
  const styles = useMemo(() => makeStyles(colors, typo), [colors, typo.isTablet]);
  const { session } = useAuth();
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
    showPaywall,
    showCustomerCenter,
    hasIdealSolutionsProEntitlement,
    isPaywallAvailable,
  } = useSubscription();
  const manageUrl = useMemo(() => manageSubscriptionsUrl(), []);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<SubscriptionTierId>(
    activeTier === "locked" ? "boss_man" : activeTier,
  );
  const selectedPlan = getSubscriptionPlan(selectedId);
  const activePlan = getSubscriptionPlan(activeTier);
  const purchaseDisabled = loading || actionBusy || Platform.OS === "web" || isTestingUnlocked;
  const betaDebug = getBetaAccessDebugInfo();
  const testFlightModuleValue = readIosTestFlightModuleValue();
  const subscribeRuntimeNotice = getSubscribeRuntimeNotice();
  const subscriptionsEnabled = !isSubscriptionGatingDisabled();
  const showBetaDebugPanel =
    __DEV__ &&
    (isTestingUnlocked || isBetaFullAccess || betaDebug.buildFlag || !subscriptionsEnabled);
  const [betaDebugExpanded, setBetaDebugExpanded] = useState(showBetaDebugPanel);
  const [employeeAccessSelected, setEmployeeAccessSelected] = useState(false);
  const [rcDisclosure, setRcDisclosure] = useState<PackageDisclosureInfo | null>(null);
  const filterByOfferings = !isTestingUnlocked && Platform.OS !== "web";
  const { offeringsLoading, offeringsLoaded, availablePlans, offeringsError } =
    useOfferingsFilteredPlans(pickerPlans, { enabled: filterByOfferings, isConfigured });
  const visiblePlans = filterByOfferings ? availablePlans : pickerPlans;

  useEffect(() => {
    if (!filterByOfferings || !offeringsLoaded || offeringsLoading || employeeAccessSelected) return;
    if (!visiblePlans.some((plan) => plan.id === selectedId)) {
      const fallback = visiblePlans[0]?.id;
      if (fallback) setSelectedId(fallback);
    }
  }, [
    employeeAccessSelected,
    filterByOfferings,
    offeringsLoaded,
    offeringsLoading,
    selectedId,
    visiblePlans,
  ]);
  const manageDisabled = loading || actionBusy || Platform.OS === "web";
  const buttonHitSlop = typo.isTablet
    ? { top: 12, bottom: 12, left: 12, right: 12 }
    : { top: 8, bottom: 8, left: 8, right: 8 };

  useEffect(() => {
    if (
      employeeAccessSelected ||
      !selectedPlan.isPaid ||
      isTestingUnlocked ||
      Platform.OS === "web" ||
      !isConfigured
    ) {
      setRcDisclosure(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const pkg = await findTierPackage(selectedId);
      if (cancelled) return;
      setRcDisclosure(pkg ? packageDisclosureFromPackage(pkg) : null);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    employeeAccessSelected,
    isConfigured,
    isTestingUnlocked,
    selectedId,
    selectedPlan.isPaid,
  ]);

  function runPurchaseAction() {
    if (purchaseDisabled || actionBusy) return;
    setActionBusy(true);
    const purchase = purchaseTier(selectedId);
    void withPromiseTimeout(purchase, PURCHASE_ACTION_TIMEOUT_MS, "Purchase timed out")
      .then((r) => {
        handleSubscriptionAction("Subscribe", r, `${selectedPlan.name} is active.`);
      })
      .catch(() => {
        Alert.alert("Subscribe", "Purchase timed out. Check your connection and try again.");
      })
      .finally(() => setActionBusy(false));
  }

  function openManageSubscriptions() {
    setActionBusy(true);
    void showCustomerCenter()
      .then((r) => handleSubscriptionAction("Manage subscription", r))
      .finally(() => setActionBusy(false));
  }

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
      {!session ? (
        <View style={styles.card} accessibilityRole="text">
          <Text style={styles.body}>
            You can use the full 7-day trial without an account. When you are ready to subscribe, create an account
            so billing, restore, and sync are tied to you — your guest trial on this device links automatically.
          </Text>
          <AuthIntentPressable
            href={AUTH_SIGNUP_HREF as Href}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Create account</Text>
          </AuthIntentPressable>
        </View>
      ) : null}

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

      {subscribeRuntimeNotice ? (
        <View style={styles.card} accessibilityRole="text">
          <Text style={styles.warn}>{subscribeRuntimeNotice}</Text>
        </View>
      ) : null}

      {shouldShowExpoGoBetaDevHint() ? (
        <View style={styles.card} accessibilityRole="text">
          <Text style={styles.warn}>{EXPO_GO_BETA_DEV_HINT}</Text>
        </View>
      ) : null}

      <View style={styles.tierList}>
        {filterByOfferings && offeringsLoading ? (
          <View style={styles.row}>
            <ActivityIndicator color={colors.text} />
            <Text style={styles.body}>Loading subscription plans…</Text>
          </View>
        ) : null}
        {filterByOfferings && offeringsLoaded && visiblePlans.length === 0 ? (
          <Text style={styles.warn}>
            {offeringsError ?? "No monthly subscription plans are available from the store right now."}
          </Text>
        ) : null}
        {visiblePlans.map((plan) => (
          <PlanTierCard
            key={plan.id}
            plan={plan}
            selected={!employeeAccessSelected && selectedId === plan.id}
            onPress={() => {
              setEmployeeAccessSelected(false);
              setSelectedId(plan.id);
            }}
            colors={colors}
            compact={!wide}
          />
        ))}
        <EmployeeAccessCard
          selected={employeeAccessSelected}
          onPress={() => setEmployeeAccessSelected(true)}
          colors={colors}
          compact={!wide}
        />
      </View>

      {employeeAccessSelected ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Employee Access</Text>
          <Text style={styles.body}>
            Enter the invitation code sent by your employer. No purchase or account is required until your code is
            verified.
          </Text>
          <Pressable
            onPress={() => router.push("/employee/join" as Href)}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Enter invitation code</Text>
          </Pressable>
        </View>
      ) : null}

      {__DEV__ ? (
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: betaDebugExpanded }}
            onPress={() => setBetaDebugExpanded((open) => !open)}
            style={({ pressed }) => [styles.betaDebugHeader, pressed && styles.pressed]}
          >
            <Text style={styles.cardTitle}>
              Beta debug (__DEV__){showBetaDebugPanel ? "" : " — tap to expand"}
            </Text>
            <Ionicons
              name={betaDebugExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.text}
            />
          </Pressable>
          {betaDebugExpanded ? (
            <>
              <Text style={styles.devNote}>
                buildBetaEnv (EXPO_PUBLIC_BETA_FULL_ACCESS): {String(betaDebug.betaEnv)}
              </Text>
              <Text style={styles.devNote}>
                buildBetaExtra (app.config betaFullAccess): {String(betaDebug.betaExtra)}
              </Text>
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
              {subscriptionsEnabled ? (
                <Text style={styles.devNote}>
                  Subscriptions are on — use Subscribe / RevenueCat Paywall below (dev client), not
                  EXPO_PUBLIC_BETA_FULL_ACCESS.
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

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
            {hasIdealSolutionsProEntitlement && !isTestingUnlocked ? (
              <Text style={styles.ok}>Ideal Solutions Pro entitlement active.</Text>
            ) : null}
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
        {errorMessage && !proTrial.isActive ? <Text style={styles.warn}>{errorMessage}</Text> : null}
        {isTestingUnlocked ? (
          <Text style={styles.devNote}>RevenueCat is not initialized while subscriptions are disabled.</Text>
        ) : isConfigured ? (
          <Text style={styles.ok}>RevenueCat is configured for this build.</Text>
        ) : null}
      </View>

      {employeeAccessSelected ? null : (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscribe</Text>
        {selectedPlan.isPaid ? (
          <>
            <SubscriptionPurchaseDisclosure
              plan={selectedPlan}
              rcPackageInfo={rcDisclosure}
            />
            <Pressable
              onPress={runPurchaseAction}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              disabled={purchaseDisabled || actionBusy}
              accessibilityRole="button"
              accessibilityLabel={`Subscribe to ${selectedPlan.name}`}
              hitSlop={buttonHitSlop}
            >
              {actionBusy ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.primaryText}>
                  {isTestingUnlocked ? "Purchases disabled (testing)" : `Subscribe — ${selectedPlan.priceLabel}`}
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <Text style={styles.body}>
            Your 7-day guest trial runs without a store purchase. Pick a paid plan above when you are ready — an
            account is required to complete checkout.
          </Text>
        )}
        {isPaywallAvailable && !isTestingUnlocked ? (
          <Pressable
            onPress={() => {
              if (purchaseDisabled || actionBusy) return;
              setActionBusy(true);
              void withPromiseTimeout(showPaywall(), PURCHASE_ACTION_TIMEOUT_MS, "Paywall timed out")
                .then((r) => handleSubscriptionAction("Paywall", r, "Subscription updated."))
                .catch(() => Alert.alert("Paywall", "Timed out opening plans. Try again."))
                .finally(() => setActionBusy(false));
            }}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            disabled={purchaseDisabled || actionBusy}
          >
            <Text style={styles.secondaryText}>View plans (RevenueCat Paywall)</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            if (purchaseDisabled || actionBusy) return;
            setActionBusy(true);
            void withPromiseTimeout(restore(), PURCHASE_ACTION_TIMEOUT_MS, "Restore timed out")
              .then((r) => handleSubscriptionAction("Restore", r, "Restore completed."))
              .catch(() => Alert.alert("Restore", "Restore timed out. Check your connection and try again."))
              .finally(() => setActionBusy(false));
          }}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          disabled={purchaseDisabled || actionBusy}
          hitSlop={buttonHitSlop}
        >
          <Text style={styles.secondaryText}>
            {isTestingUnlocked ? "Restore disabled (testing)" : "Restore purchases"}
          </Text>
        </Pressable>
        <Pressable onPress={() => void refresh()} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>Refresh status</Text>
        </Pressable>
      </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manage subscription</Text>
        <Text style={styles.body}>
          Change plan, cancel renewal, or update billing through RevenueCat Customer Center or your{" "}
          {Platform.OS === "ios" ? "Apple ID" : Platform.OS === "android" ? "Google Play" : "store"} account.
          Unsubscribing here does not delete your app account.
        </Text>
        {isPaywallAvailable && !isTestingUnlocked ? (
          <Pressable
            onPress={openManageSubscriptions}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            disabled={manageDisabled}
          >
            <Text style={styles.secondaryText}>Manage subscription (Customer Center)</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => void Linking.openURL(manageUrl)}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          disabled={manageDisabled}
        >
          <Text style={styles.secondaryText}>{storeManageLabel()}</Text>
        </Pressable>
      </View>
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme, typo: ResponsiveTypography) {
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
      fontSize: typo.scaleFont(17),
      lineHeight: typo.scaleLineHeight(24),
      fontWeight: "700",
      color: colors.text,
    },
    fairUseNote: {
      fontSize: typo.hintFontSize,
      lineHeight: typo.hintLineHeight,
      color: colors.text,
      opacity: 0.92,
    },
    betaBanner: {
      ...cardBase,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: hexToRgba(colors.accent, 0.12),
      borderColor: hexToRgba(colors.accent, 0.35),
    },
    betaBannerText: {
      fontSize: typo.hintFontSize,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    tierList: {
      gap: 14,
    },
    body: {
      fontSize: typo.bodyFontSize,
      lineHeight: typo.bodyLineHeight,
      color: colors.text,
      opacity: 0.92,
    },
    card: {
      ...cardBase,
      padding: 14,
      gap: 10,
    },
    cardTitle: {
      fontSize: typo.hintFontSize,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.9,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    betaDebugHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    status: {
      fontSize: typo.bodyFontSize,
      fontWeight: "700",
      color: colors.text,
    },
    devNote: {
      fontSize: typo.hintFontSize,
      lineHeight: typo.hintLineHeight,
      color: colors.text,
      opacity: 0.92,
      fontStyle: "italic",
    },
    warn: {
      fontSize: typo.hintFontSize,
      lineHeight: typo.hintLineHeight,
      color: colors.text,
      opacity: 0.92,
    },
    ok: {
      fontSize: typo.hintFontSize,
      lineHeight: typo.hintLineHeight,
      color: colors.text,
      opacity: 0.92,
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
      fontSize: typo.buttonFontSize,
    },
    secondaryText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: typo.buttonFontSize,
      opacity: 0.95,
    },
    dismissLink: {
      marginTop: 4,
      textAlign: "center",
      fontSize: typo.hintFontSize,
      fontWeight: "600",
      color: colors.text,
      opacity: 0.8,
    },
    legalNote: {
      fontSize: typo.hintFontSize,
      lineHeight: typo.scaleLineHeight(21),
      color: colors.text,
      opacity: 0.92,
      textAlign: "center",
    },
    legalLink: {
      fontWeight: "700",
      textDecorationLine: "underline",
      color: colors.accent,
    },
  });
}
