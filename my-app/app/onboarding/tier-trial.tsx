import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  InteractionManager,
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
import { withPromiseTimeout } from "@/lib/async/withPromiseTimeout";
import {
  LOCAL_ONLY_DISCLAIMER,
  PLAN_PICKER_FAIR_USE_NOTE,
  PLAN_PICKER_HEADLINE,
  TRIAL_AI_REQUESTS_TOTAL,
  TRIAL_DAYS,
  paidSubscriptionPlans,
  type SubscriptionTierId,
} from "@/lib/subscriptions";
import { startProTrial, loadProTrialRecord } from "@/lib/subscriptions/trialStorage";
import {
  lockTrialNavigation,
  markTrialHomeNavigationCommitted,
  markTrialJustStarted,
  markTrialStarting,
  primeTrialStorageCache,
  resetTrialOnboardingSession,
  TRIAL_NAVIGATION_UNLOCK_MS,
  unlockTrialNavigation,
} from "@/lib/subscriptions/trialGateState";
import { skipHomeColdSplash } from "@/lib/homeBoot";
import { BUTTON_MIN_HEIGHT } from "@/lib/theme/appTypography";

/** Guest trial interest tier when the user picks Employee Access (not a paid plan). */
const EMPLOYEE_TRIAL_INTEREST_TIER: SubscriptionTierId = "side_hustle";
const TRIAL_START_TIMEOUT_MS = 10_000;

type TrialPickerSelection = SubscriptionTierId | "employee";

export default function TierTrialOnboardingScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const typo = useResponsiveTypography();
  const styles = useMemo(() => makeStyles(colors, typo), [colors, typo.isTablet]);
  const { applyGuestTrialState, isTestingUnlocked, isBetaFullAccess } = useSubscription();
  const [selected, setSelected] = useState<TrialPickerSelection>("boss_man");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const contentWidth = useFormContentWidth();

  const plans = paidSubscriptionPlans();
  const employeeSelected = selected === "employee";

  async function onStartTrial() {
    if (busy) return;
    setActionError(null);

    lockTrialNavigation();
    if (__DEV__) {
      console.warn("[TRIAL_NAV] lockTrialNavigation on Start free trial");
    }

    if (isTestingUnlocked || isBetaFullAccess) {
      skipHomeColdSplash();
      markTrialHomeNavigationCommitted();
      await navigateAfterTrialState("/");
      unlockTrialNavigation(TRIAL_NAVIGATION_UNLOCK_MS);
      return;
    }

    const interestTier = employeeSelected ? EMPLOYEE_TRIAL_INTEREST_TIER : selected;
    const destination = (employeeSelected ? "/employee/join" : "/") as Href;

    setBusy(true);
    markTrialStarting();
    try {
      const result = await withPromiseTimeout(
        startProTrial({ interestTier }),
        TRIAL_START_TIMEOUT_MS,
        "Trial start timed out",
      ).catch(() => ({
        ok: false as const,
        reason: "remote_error" as const,
        message: "Starting your trial took too long. Please try again.",
      }));

      if (!result.ok) {
        resetTrialOnboardingSession();
        setActionError(result.message);
        return;
      }

      const stored = await loadProTrialRecord();
      if (!stored?.trialStartDate) {
        resetTrialOnboardingSession();
        setActionError("Could not save your trial on this device. Please try again.");
        return;
      }

      primeTrialStorageCache(true);
      markTrialJustStarted();
      skipHomeColdSplash();
      applyGuestTrialState(result.state);
      markTrialHomeNavigationCommitted();

      await navigateAfterTrialState(destination);
      unlockTrialNavigation(TRIAL_NAVIGATION_UNLOCK_MS);
      if (__DEV__) {
        console.warn("[TRIAL_NAV] trial started — router.replace once, unlock in 3s");
      }
    } catch {
      resetTrialOnboardingSession();
      setActionError("Could not start your trial. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function navigateAfterTrialState(href: Href) {
    skipHomeColdSplash();
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => resolve());
      });
    });
    if (__DEV__) {
      console.warn(`[TRIAL_NAV] router.replace → ${href}`);
    }
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
        No account needed to start — create one when you subscribe to keep billing and sync across devices.
      </Text>
      <Text style={styles.localOnly}>{LOCAL_ONLY_DISCLAIMER}</Text>

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
          disabled={busy}
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
