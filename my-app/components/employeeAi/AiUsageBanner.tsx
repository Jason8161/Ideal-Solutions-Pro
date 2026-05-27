import { Link, type Href } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import { ownerSubscriptionIncludesOwnerAi } from "@/lib/employeeAi/companyAiIncluded";
import type { AiLimitCheckResult } from "@/lib/employeeAi/types";
import type { SubscriptionTierId } from "@/lib/subscriptionPlans";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";

type Props = {
  check: AiLimitCheckResult;
  isEmployee: boolean;
  ownerSubscriptionTier: SubscriptionTierId;
  crewAiIncluded?: boolean;
  /** When true, never show upgrade CTA (e.g. sponsored crew). */
  hideUpgrade?: boolean;
};

function formatLimit(used: number, limit: number | null): string {
  if (limit === null) return `${used} today (fair use)`;
  return `${used} / ${limit} today`;
}

function shouldShowPlanCta(
  check: AiLimitCheckResult,
  isEmployee: boolean,
  ownerSubscriptionTier: SubscriptionTierId,
  crewAiIncluded: boolean,
  hideUpgrade: boolean,
): boolean {
  if (hideUpgrade) return false;
  if (!check.atLimit && !check.nearingLimit) return false;
  if (isEmployee) {
    return !crewAiIncluded && check.atLimit;
  }
  return !ownerSubscriptionIncludesOwnerAi(ownerSubscriptionTier) && check.atLimit;
}

export function AiUsageBanner({
  check,
  isEmployee,
  ownerSubscriptionTier,
  crewAiIncluded = false,
  hideUpgrade = false,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!check.nearingLimit && !check.atLimit) return null;

  const tone = check.atLimit ? styles.bannerDanger : styles.bannerWarn;
  const title = check.atLimit ? "AI limit reached" : "Almost at your AI limit";
  const body =
    check.blockReason ??
    (check.dailyLimit !== null
      ? `You've used ${formatLimit(check.dailyUsed, check.dailyLimit)}.`
      : "You're approaching fair-use limits included with your plan.");

  const showCta = shouldShowPlanCta(
    check,
    isEmployee,
    ownerSubscriptionTier,
    crewAiIncluded,
    hideUpgrade,
  );
  const upgradeHref = "/settings/subscribe" as Href;
  const ctaLabel = isEmployee ? "About company plans" : "View plans — AI included";

  return (
    <View style={[styles.banner, tone]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {crewAiIncluded && isEmployee ? (
        <Text style={styles.includedNote}>Included with your company subscription</Text>
      ) : null}
      {showCta ? (
        <Link href={upgradeHref} asChild>
          <Pressable style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const warnBg = hexToRgba(colors.accent, 0.2);
  const dangerBg = hexToRgba("#e85d4a", 0.22);
  return StyleSheet.create({
    banner: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 4,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    bannerWarn: {
      backgroundColor: warnBg,
      borderColor: hexToRgba(colors.accent, 0.35),
    },
    bannerDanger: {
      backgroundColor: dangerBg,
      borderColor: hexToRgba("#e85d4a", 0.45),
    },
    title: { fontSize: 15, fontWeight: "800", color: colors.text },
    body: { fontSize: 13, lineHeight: 18, color: colors.text, opacity: 0.88 },
    includedNote: { fontSize: 12, fontWeight: "700", color: colors.accent, opacity: 0.95 },
    cta: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: hexToRgba(colors.accent, 0.35),
    },
    ctaText: { fontSize: 14, fontWeight: "800", color: colors.text },
    pressed: { opacity: 0.88 },
  });
}
