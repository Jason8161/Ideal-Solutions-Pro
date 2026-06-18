import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PlanTierCard } from "@/components/subscription/PlanTierCard";
import { EmployeeAccessCard } from "@/components/subscription/EmployeeAccessCard";
import { mutedTextColor, primaryCtaStyle, primaryCtaTextStyle, COLORS, type ResponsiveTypography } from "@/components/themed/screenChrome";
import { useResponsiveTypography } from "@/lib/layout/responsiveTypography";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { useFormContentWidth } from "@/lib/layout/formContentWidth";
import { useSubscription } from "@/context/SubscriptionContext";
import { skipHomeColdSplash } from "@/lib/homeBoot";
import { configurePurchases, useOfferingsFilteredPlans } from "@/lib/revenuecat";
import {
  LOCAL_ONLY_DISCLAIMER,
  PLAN_PICKER_FAIR_USE_NOTE,
  PLAN_PICKER_HEADLINE,
  TRIAL_AI_REQUESTS_TOTAL,
  TRIAL_DAYS,
  paidSubscriptionPlans,
  type SubscriptionTierId,
} from "@/lib/subscriptions";
import { startProTrial } from "@/lib/subscriptions/trialStorage";
import {
  lockTrialNavigation,
  markTrialJustStarted,
  markTrialStarting,
  primeTrialStorageCache,
  resetTrialOnboardingSession,
  TRIAL_NAVIGATION_UNLOCK_MS,
  unlockTrialNavigation,
} from "@/lib/subscriptions/trialGateState";
import { BUTTON_MIN_HEIGHT } from "@/lib/theme/appTypography";

/** Guest trial interest tier when the user picks Employee Access (not a paid plan). */
const EMPLOYEE_TRIAL_INTEREST_TIER: SubscriptionTierId = "side_hustle";

type TrialPickerSelection = SubscriptionTierId | "employee";

export default function TierTrialOnboardingScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const typo = useResponsiveTypography();
  const styles = useMemo(() => makeStyles(colors, typo), [colors, typo.isTablet]);
  const {
    applyGuestTrialState,
    isTestingUnlocked,
    isBetaFullAccess,
    isConfigured,
    purchaseTier,
    refresh,
  } = useSubscription();
  const [selected, setSelected] = useState<TrialPickerSelection>("boss_man");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const contentWidth = useFormContentWidth();

  const allPlans = paidSubscriptionPlans();
  const filterByOfferings =
    !isTestingUnlocked && !isBetaFullAccess && Platform.OS !== "web";
  const { offeringsLoading, offeringsLoaded, availablePlans, offeringsError } =
    useOfferingsFilteredPlans(allPlans, { enabled: filterByOfferings, isConfigured });
  const plans = filterByOfferings ? availablePlans : allPlans;
  const employeeSelected = selected === "employee";

  useEffect(() => {
    if (!filterByOfferings || !offeringsLoaded || offeringsLoading) return;
    if (selected === "employee") return;
    if (!plans.some((plan) => plan.id === selected)) {
      const fallback = plans[0]?.id ?? "employee";
      setSelected(fallback);
    }
  }, [filterByOfferings, offeringsLoaded, offeringsLoading, plans, selected]);

  async function onStartEmployeePath() {
    setBusy(true);
    markTrialStarting();
    try {
      const result = await startProTrial({ interestTier: EMPLOYEE_TRIAL_INTEREST_TIER });

      if (!result.ok) {
        resetTrialOnboardingSession();
        setActionError(result.message);
        return;
      }

      primeTrialStorageCache(true);
      markTrialJustStarted();
      skipHomeColdSplash();
      applyGuestTrialState(result.state);
      await navigateAfterTrialState("/employee/join");
      unlockTrialNavigation(TRIAL_NAVIGATION_UNLOCK_MS);
    } catch {
      resetTrialOnboardingSession();
      setActionError("Could not continue to employee access. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onStartRevenueCatTrial(tierId: SubscriptionTierId) {
    if (Platform.OS === "web") {
      setActionError("Free trial purchases run on iOS and Android builds with native billing.");
      return;
    }

    setBusy(true);
    markTrialStarting();
    try {
      if (!isConfigured) {
        const configured = await configurePurchases();
        if (!configured.ok) {
          resetTrialOnboardingSession();
          setActionError(configured.message);
          console.warn("[RevenueCat] tier-trial: configure failed", configured.message);
          return;
        }
        console.warn("[RevenueCat] configured", { source: "tier-trial" });
      }

      console.warn("[RevenueCat] tier-trial: purchase started", tierId);
      const result = await purchaseTier(tierId);

      if (result.cancelled) {
        resetTrialOnboardingSession();
        console.warn("[RevenueCat] tier-trial: purchase cancelled", tierId);
        return;
      }

      if (!result.ok) {
        resetTrialOnboardingSession();
        setActionError(result.message ?? "Could not start your free trial. Please try again.");
        console.warn("[RevenueCat] tier-trial: purchase failed", result.message);
        return;
      }

      console.warn("[RevenueCat] tier-trial: purchase success", tierId);
      markTrialJustStarted();
      primeTrialStorageCache(true);
      skipHomeColdSplash();
      await refresh({ silent: true });
      await navigateAfterTrialState("/");
      unlockTrialNavigation(TRIAL_NAVIGATION_UNLOCK_MS);
      console.warn("[NAV] tier-trial: trial started — router.replace once");
    } catch {
      resetTrialOnboardingSession();
      setActionError("Could not start your free trial. Please try again.");
      console.warn("[RevenueCat] tier-trial: purchase threw unexpectedly");
    } finally {
      setBusy(false);
    }
  }

  async function onStartTrial() {
    if (busy) return;
    setActionError(null);

    lockTrialNavigation();
    console.warn("[NAV] tier-trial: lockTrialNavigation on Start free trial");

    if (isTestingUnlocked || isBetaFullAccess) {
      skipHomeColdSplash();
      await navigateAfterTrialState("/");
      unlockTrialNavigation(TRIAL_NAVIGATION_UNLOCK_MS);
      return;
    }

    if (employeeSelected) {
      await onStartEmployeePath();
      return;
    }

    await onStartRevenueCatTrial(selected);
  }

  async function navigateAfterTrialState(href: Href) {
    skipHomeColdSplash();
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => resolve());
      });
    });
    console.warn(`[NAV] tier-trial: router.replace → ${href}`);
    router.replace(href);
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentWidth ? styles.contentTablet : null]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.inner, contentWidth ? { width: contentWidth, maxWidth: "100%" } : null]}>
      <Text style={styles.headline}>{PLAN_PICKER_HEADLINE}</Text>
      <Text style={styles.note}>{PLAN_PICKER_FAIR_USE_NOTE}</Text>
      <Text style={styles.trialBadge}>
        {TRIAL_DAYS}-day trial · {TRIAL_AI_REQUESTS_TOTAL} AI requests total · full access to your chosen tier
      </Text>
      <Text style={styles.guestNote}>
        No app account needed to start — confirm the free trial in the App Store, then create an account later to sync billing across devices.
      </Text>
      <Text style={styles.localOnly}>{LOCAL_ONLY_DISCLAIMER}</Text>

      {filterByOfferings && offeringsLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.textPrimary} />
          <Text style={styles.note}>Loading subscription plans…</Text>
        </View>
      ) : null}

      {filterByOfferings && offeringsLoaded && plans.length === 0 ? (
        <Text style={styles.actionError}>
          {offeringsError ?? "No subscription plans are available right now. Try employee access or try again later."}
        </Text>
      ) : null}

      <View style={styles.cards}>
        {plans.map((plan) => (
          <PlanTierCard
            key={plan.id}
            plan={plan}
            selected={selected === plan.id}
            onPress={() => setSelected(plan.id)}
            colors={colors}
          />
        ))}
        <EmployeeAccessCard
          selected={employeeSelected}
          onPress={() => setSelected("employee")}
          colors={colors}
        />
      </View>

      {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

      <View style={styles.ctaWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={employeeSelected ? "Continue to invite code" : "Start free trial"}
          accessibilityState={{ disabled: busy, busy }}
          onPress={() => void onStartTrial()}
          disabled={busy || (filterByOfferings && offeringsLoading) || (filterByOfferings && offeringsLoaded && plans.length === 0 && !employeeSelected)}
          hitSlop={
            typo.isTablet
              ? { top: 12, bottom: 12, left: 12, right: 12 }
              : { top: 8, bottom: 8, left: 8, right: 8 }
          }
          style={({ pressed }) => [
            styles.primary,
            busy && styles.primaryDisabled,
            pressed && !busy && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.buttonText} />
          ) : (
            <Text style={styles.primaryText}>
              {employeeSelected ? "Continue to invite code" : "Start free trial"}
            </Text>
          )}
        </Pressable>
      </View>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ColorScheme, typo: ResponsiveTypography) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: typo.scaleSpacing(20), paddingBottom: typo.scaleSpacing(40), gap: typo.scaleSpacing(12) },
    contentTablet: { alignItems: "center" },
    inner: { width: "100%", gap: typo.scaleSpacing(12) },
    headline: {
      fontSize: typo.mainTitleFontSize,
      lineHeight: typo.scaleLineHeight(Math.round(typo.mainTitleFontSize * 1.2)),
      fontWeight: "800",
      color: COLORS.textPrimary,
    },
    note: {
      fontSize: typo.bodyFontSize,
      lineHeight: typo.bodyLineHeight,
      color: mutedTextColor(colors),
      fontWeight: typo.bodyFontWeight,
    },
    trialBadge: {
      fontSize: typo.bodyFontSize,
      fontWeight: "700",
      color: COLORS.textPrimary,
      lineHeight: typo.bodyLineHeight,
    },
    guestNote: {
      fontSize: typo.bodyFontSize,
      lineHeight: typo.bodyLineHeight,
      color: mutedTextColor(colors),
      fontWeight: typo.bodyFontWeight,
    },
    localOnly: {
      fontSize: typo.hintFontSize,
      lineHeight: typo.hintLineHeight,
      color: mutedTextColor(colors),
      fontWeight: typo.hintFontWeight,
    },
    cards: { gap: typo.scaleSpacing(14), marginTop: typo.scaleSpacing(8) },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: typo.scaleSpacing(10),
      marginTop: typo.scaleSpacing(4),
    },
    actionError: {
      fontSize: typo.hintFontSize,
      lineHeight: typo.hintLineHeight,
      color: COLORS.textPrimary,
      textAlign: "center",
      fontWeight: typo.hintFontWeight,
    },
    ctaWrap: {
      zIndex: 2,
      elevation: 2,
      marginTop: typo.scaleSpacing(8),
    },
    primary: {
      ...primaryCtaStyle(typo.isTablet),
      minHeight: typo.isTablet ? BUTTON_MIN_HEIGHT.tablet : BUTTON_MIN_HEIGHT.phone,
      width: "100%",
    },
    primaryDisabled: {
      opacity: 0.92,
    },
    pressed: { opacity: 0.88 },
    primaryText: {
      ...primaryCtaTextStyle(typo.isTablet),
      textAlign: "center",
    },
  });
}
