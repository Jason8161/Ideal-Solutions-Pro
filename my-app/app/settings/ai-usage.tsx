import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import { AI_WARN_UTILIZATION } from "@/lib/subscriptions/aiQuota";
import { getSubscriptionPlan } from "@/lib/subscriptionPlans";

function utilizationPct(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default function AiUsageSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeTier, aiQuotaCheck, proTrial, monthlyAiUsage, isTestingUnlocked } = useSubscription();
  const plan = getSubscriptionPlan(activeTier);
  const pct = utilizationPct(aiQuotaCheck.used, aiQuotaCheck.limit);

  return (
    <StickyScrollScreen
      title="AI usage"
      subtitle="Monthly limits reset on your billing date"
      backHref={settingsBackHref("ai-usage")}
      backLabel={settingsBackLabel("ai-usage")}
    >
      {isTestingUnlocked ? (
        <Text style={styles.note}>Subscriptions disabled for testing — AI limits are not enforced.</Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Plan</Text>
        <Text style={styles.value}>{plan.name}</Text>
        <Text style={styles.hint}>
          Included: {plan.monthlyAiLimit} AI requests / month
          {aiQuotaCheck.source === "trial"
            ? ` · Trial: ${proTrial.aiRequestsUsed} / ${proTrial.aiLimit} total (no monthly reset)`
            : null}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>This period</Text>
        <Text style={styles.value}>
          {aiQuotaCheck.used} / {aiQuotaCheck.limit} used ({pct}%)
        </Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${pct}%`,
                backgroundColor: colors.accent,
                opacity: aiQuotaCheck.atLimit ? 1 : aiQuotaCheck.nearingLimit ? 0.85 : 0.65,
              },
            ]}
          />
        </View>
        <Text style={styles.hint}>
          Resets {monthlyAiUsage.resetDate || aiQuotaCheck.resetDate || "monthly"}
          {aiQuotaCheck.nearingLimit && !aiQuotaCheck.atLimit
            ? ` · Warning at ${Math.round(AI_WARN_UTILIZATION * 100)}%`
            : ""}
        </Text>
        {aiQuotaCheck.atLimit ? (
          <Text style={[styles.warn, { color: colors.accent }]}>
            Limit reached — upgrade or add an AI pack under AI add-ons.
          </Text>
        ) : null}
      </View>
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    note: { fontSize: 13, color: colors.text, opacity: 0.85, marginBottom: 8 },
    card: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      backgroundColor: colors.card,
      gap: 6,
    },
    label: { fontSize: 12, fontWeight: "700", color: colors.text, opacity: 0.7, textTransform: "uppercase" },
    value: { fontSize: 17, fontWeight: "700", color: colors.text },
    hint: { fontSize: 13, lineHeight: 18, color: colors.text, opacity: 0.8 },
    warn: { fontSize: 13, fontWeight: "600", marginTop: 4 },
    barTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      marginTop: 8,
      overflow: "hidden",
    },
    barFill: { height: "100%", borderRadius: 4 },
  });
}
