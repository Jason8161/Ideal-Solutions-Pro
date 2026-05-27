import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { navCardStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { formatFreeAccessExpiration } from "@/lib/subscription/freeAccessOverride";
import { getSubscriptionPlan } from "@/lib/subscriptionPlans";

export function FreeAccessStatusCard() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { freeAccessOverride, accessSource, storeTier } = useSubscription();

  if (!freeAccessOverride) return null;

  const plan = getSubscriptionPlan(
    freeAccessOverride.isActive ? freeAccessOverride.tier : "locked",
  );
  const supersededByStore =
    accessSource === "revenuecat" && storeTier !== null && freeAccessOverride.enabled;

  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={styles.title}>Access type</Text>
      <Text style={styles.line}>
        {freeAccessOverride.accessTypeLabel}
        {freeAccessOverride.isActive ? "" : " (expired or disabled)"}
      </Text>
      <Text style={styles.line}>Tier: {plan.name}</Text>
      <Text style={styles.line}>
        Expires: {formatFreeAccessExpiration(freeAccessOverride.expirationDate)}
      </Text>
      {freeAccessOverride.reason ? (
        <Text style={styles.hint}>Note: {freeAccessOverride.reason}</Text>
      ) : null}
      {supersededByStore ? (
        <Text style={styles.hint}>
          Your App Store / Play subscription is active and takes priority over admin access.
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const nav = navCardStyle(colors);
  return StyleSheet.create({
    card: {
      ...nav,
      padding: 16,
      marginTop: 12,
      gap: 6,
    },
    title: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },
    line: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
    },
    hint: {
      color: colors.text,
      opacity: 0.72,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
  });
}
