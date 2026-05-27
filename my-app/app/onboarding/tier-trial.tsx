import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PlanTierCard } from "@/components/subscription/PlanTierCard";
import { getAccentTints, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  LOCAL_ONLY_DISCLAIMER,
  PLAN_PICKER_FAIR_USE_NOTE,
  PLAN_PICKER_HEADLINE,
  TRIAL_AI_REQUESTS_TOTAL,
  TRIAL_DAYS,
  authSatisfiesTrialRequirement,
  paidSubscriptionPlans,
  type SubscriptionTierId,
} from "@/lib/subscriptions";
import { startProTrial } from "@/lib/subscriptions/trialStorage";

export default function TierTrialOnboardingScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session, profile } = useAuth();
  const { refresh, isTestingUnlocked } = useSubscription();
  const [selectedId, setSelectedId] = useState<SubscriptionTierId>("boss_man");
  const [busy, setBusy] = useState(false);

  const plans = paidSubscriptionPlans();

  async function onStartTrial() {
    if (isTestingUnlocked) {
      router.replace("/");
      return;
    }

    const authCheck = authSatisfiesTrialRequirement({
      emailVerified: true,
      hasPasswordAccount: Boolean(session?.token),
    });
    if (!authCheck.ok) {
      Alert.alert(
        "Sign in required",
        "Start your trial with Apple Sign In, Google Sign In, or a verified email account.",
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

    await refresh();
    router.replace("/");
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.headline}>{PLAN_PICKER_HEADLINE}</Text>
      <Text style={styles.note}>{PLAN_PICKER_FAIR_USE_NOTE}</Text>
      <Text style={styles.trialBadge}>
        {TRIAL_DAYS}-day trial · {TRIAL_AI_REQUESTS_TOTAL} AI requests total · full access to your chosen tier
      </Text>
      <Text style={styles.localOnly}>{LOCAL_ONLY_DISCLAIMER}</Text>

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
        onPress={() => void onStartTrial()}
        disabled={busy}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.primaryText}>Start free trial</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondaryBtn = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40, gap: 12 },
    headline: { fontSize: 20, lineHeight: 28, fontWeight: "800", color: colors.text },
    note: { fontSize: 13, lineHeight: 19, color: colors.text, opacity: 0.82 },
    trialBadge: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      opacity: 0.9,
    },
    localOnly: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.text,
      opacity: 0.75,
    },
    cards: { gap: 14, marginTop: 8 },
    primary: { ...secondaryBtn, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
    pressed: { opacity: 0.88 },
    primaryText: { color: colors.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
  });
}
