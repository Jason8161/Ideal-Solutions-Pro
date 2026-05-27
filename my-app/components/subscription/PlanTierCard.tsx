import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { navCardStyle } from "@/components/themed/screenChrome";
import type { SubscriptionPlan } from "@/lib/subscriptionPlans";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

type PlanTierCardProps = {
  plan: SubscriptionPlan;
  selected: boolean;
  onPress: () => void;
  colors: ColorScheme;
  compact?: boolean;
};

export function PlanTierCard({ plan, selected, onPress, colors, compact = false }: PlanTierCardProps) {
  const highlighted = plan.recommended || plan.mostPopular;
  const borderColor = selected
    ? hexToRgba(colors.text, 0.65)
    : highlighted
      ? hexToRgba(colors.text, 0.45)
      : hexToRgba(colors.text, 0.28);
  const cardPanel = navCardStyle(colors);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.name}, ${plan.priceLabel}`}
      style={({ pressed }) => [
        styles.card,
        cardPanel,
        {
          borderColor,
          borderWidth: selected || highlighted ? 2 : 1,
        },
        highlighted && styles.cardRecommended,
        pressed && styles.pressed,
      ]}
    >
      {plan.mostPopular ? (
        <View
          style={[
            styles.badge,
            {
              borderColor: hexToRgba(colors.text, 0.55),
              backgroundColor: hexToRgba(colors.text, 0.08),
            },
          ]}
        >
          <MaterialCommunityIcons name="star" size={12} color={colors.text} />
          <Text style={[styles.badgeText, { color: colors.text }]}>Most Popular</Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <Text style={[styles.name, { color: colors.text }]}>{plan.name}</Text>
        {selected ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.text} /> : null}
      </View>
      <Text style={[styles.price, { color: colors.text }]}>{plan.priceLabel}</Text>
      {!compact ? <Text style={[styles.tagline, { color: colors.text, opacity: 0.82 }]}>{plan.tagline}</Text> : null}

      <View style={styles.featureList}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <MaterialCommunityIcons name="check" size={14} color={colors.text} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: colors.text, opacity: 0.9 }]}>{feature}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardRecommended: {
    paddingTop: 18,
  },
  pressed: {
    opacity: 0.9,
  },
  badge: {
    position: "absolute",
    top: -11,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
  },
  tagline: {
    fontSize: 13,
    lineHeight: 18,
  },
  featureList: {
    marginTop: 4,
    gap: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
