import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PlanTierCard } from "@/components/subscription/PlanTierCard";
import { getAccentTints, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { refreshHomeProfile } from "@/lib/homeBoot";
import { savePlanPickerChoice } from "@/lib/profileStorage";
import {
  PLAN_PICKER_FAIR_USE_NOTE,
  PLAN_PICKER_HEADLINE,
  authSatisfiesTrialRequirement,
  getSubscriptionPlan,
  paidSubscriptionPlans,
  type SubscriptionTierId,
} from "@/lib/subscriptions";
import { startProTrial } from "@/lib/subscriptions/trialStorage";

type PlanPickerScreenProps = {
  onComplete?: () => void;
};

export function PlanPickerScreen({ onComplete }: PlanPickerScreenProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session, profile } = useAuth();
  const { loading, purchaseTier, refresh, isTestingUnlocked, subscriptionsTestingNotice } =
    useSubscription();
  const [selectedId, setSelectedId] = useState<SubscriptionTierId>("boss_man");
  const [busy, setBusy] = useState(false);

  const selectedPlan = getSubscriptionPlan(selectedId);
  const plans = paidSubscriptionPlans();

  async function finishWithTier(tier: SubscriptionTierId) {
    await savePlanPickerChoice(tier);
    await refresh();
    await refreshHomeProfile();
    onComplete?.();
  }

  async function onSubscribe() {
    if (isTestingUnlocked) {
      await finishWithTier("enterprise_boss_man");
      return;
    }
    if (Platform.OS === "web") {
      Alert.alert("Subscribe on mobile", "Purchases run in the iOS or Android app.");
      return;
    }
    setBusy(true);
    const result = await purchaseTier(selectedId);
    setBusy(false);
    if (result.ok) {
      await finishWithTier(selectedId);
      return;
    }
    if (result.message) Alert.alert("Subscription", result.message);
  }

  async function onStartTrial() {
    const authCheck = authSatisfiesTrialRequirement({
      emailVerified: true,
      hasPasswordAccount: Boolean(session?.token),
    });
    if (!authCheck.ok) {
      Alert.alert(
        "Sign in required",
        "Use Apple Sign In, Google Sign In, or a verified email before starting your trial.",
      );
      router.push("/(auth)/login");
      return;
    }
    if (!session?.userId) {
      router.push("/(auth)/login");
      return;
    }
    setBusy(true);
    const result = await startProTrial({
      interestTier: selectedId,
      userId: session.userId,
      email: profile?.email,
    });
    setBusy(false);
    if (!result.ok) {
      Alert.alert("Trial unavailable", result.message);
      return;
    }
    await finishWithTier(selectedId);
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.headline}>{PLAN_PICKER_HEADLINE}</Text>
      <Text style={styles.fairUseNote}>{PLAN_PICKER_FAIR_USE_NOTE}</Text>
      {isTestingUnlocked ? (
        <Text style={styles.testingNote}>
          {subscriptionsTestingNotice ?? "Subscriptions disabled for testing"} — full access, no purchase required.
        </Text>
      ) : null}

      <View style={styles.cards}>
        {plans.map((plan) => (
          <PlanTierCard
            key={plan.id}
            plan={plan}
            selected={selectedId === plan.id}
            onPress={() => setSelectedId(plan.id)}
            colors={colors}
          />
        ))}
      </View>

      <Pressable
        onPress={() => void onSubscribe()}
        disabled={busy || loading}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        {busy || loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.primaryText}>
            {isTestingUnlocked
              ? "Continue with full access (testing)"
              : `Subscribe — ${selectedPlan.priceLabel}`}
          </Text>
        )}
      </Pressable>

      {!isTestingUnlocked ? (
        <Pressable
          onPress={() => void onStartTrial()}
          disabled={busy}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>Start 7-day trial on {selectedPlan.name}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondaryBtn = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40, gap: 14 },
    headline: { fontSize: 20, lineHeight: 28, fontWeight: "800", color: colors.text },
    fairUseNote: { fontSize: 13, lineHeight: 19, color: colors.text, opacity: 0.82 },
    testingNote: { fontSize: 13, lineHeight: 19, color: colors.text, opacity: 0.9, fontWeight: "600" },
    cards: { gap: 16, marginTop: 4 },
    primary: { ...secondaryBtn, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
    secondary: { ...secondaryBtn, paddingVertical: 12, borderRadius: 14 },
    pressed: { opacity: 0.88 },
    primaryText: { color: colors.text, fontSize: 16, fontWeight: "800" },
    secondaryText: { color: colors.text, fontSize: 15, fontWeight: "700", textAlign: "center" },
  });
}
