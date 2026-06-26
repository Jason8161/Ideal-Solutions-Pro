import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, mutedTextColor, navCardStyle, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAppTheme } from "@/context/ThemeContext";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";
import { iapCategoryBackHref, iapCategoryBackLabel } from "@/lib/iapSettingsCategories";
import { purchaseAiAddon } from "@/lib/subscription/aiAddonPurchases";
import { AI_ADDON_TIERS, type AiAddonTierId } from "@/lib/subscription/aiAddons";
import { loadAiQuotaSnapshot, type AiQuotaSnapshot } from "@/lib/subscription/aiQuota";
import {
  getSubscriptionsTestingNotice,
  isSubscriptionGatingDisabled,
} from "@/lib/subscriptionTesting";

export default function AiAddonsSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeTier, dailyUsage, dailyAiCheck, refresh, isConfigured, loading: subLoading } =
    useSubscription();

  const [quota, setQuota] = useState<AiQuotaSnapshot | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [purchasingId, setPurchasingId] = useState<AiAddonTierId | null>(null);

  const testingNotice = getSubscriptionsTestingNotice();
  const purchasesDisabled = isSubscriptionGatingDisabled();

  const reloadQuota = useCallback(async () => {
    setLoadingQuota(true);
    try {
      const snapshot = await loadAiQuotaSnapshot(activeTier);
      setQuota(snapshot);
    } finally {
      setLoadingQuota(false);
    }
  }, [activeTier]);

  useFocusEffect(
    useCallback(() => {
      void reloadQuota();
      void refresh();
    }, [reloadQuota, refresh]),
  );

  const onPurchase = (tierId: AiAddonTierId) => {
    const tier = AI_ADDON_TIERS.find((t) => t.id === tierId);
    if (!tier) return;

    void (async () => {
      setPurchasingId(tierId);
      try {
        const result = await purchaseAiAddon(tierId);
        if (result.ok) {
          Alert.alert(
            "AI add-on purchased",
            `+${result.creditsAdded.toLocaleString()} questions were added to your add-on bank.`,
          );
          await reloadQuota();
          await refresh();
        } else if (result.message && !result.message.toLowerCase().includes("cancel")) {
          Alert.alert("Purchase", result.message);
        }
      } finally {
        setPurchasingId(null);
      }
    })();
  };

  const dailyLimitLabel =
    dailyAiCheck.limit === null
      ? `${dailyUsage.aiQuestions} used today (unlimited on your plan)`
      : `${dailyUsage.aiQuestions} / ${dailyAiCheck.limit} used today on your plan`;

  return (
    <StickyScrollScreen
      title="AI add-ons"
      subtitle="Extra questions when you need more jobsite help"
      backHref={iapCategoryBackHref()}
      backLabel={iapCategoryBackLabel()}
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.root}
    >
      <Text style={styles.intro}>
        AI add-ons are one-time packs of extra questions for Ideal Solutions AI Assistance and
        photo-to-estimate. They sit on top of your subscription&apos;s daily allowance ΓÇö handy during
        busy bid weeks or when your crew is leaning on AI in the field.
      </Text>

      {purchasesDisabled && testingNotice ? (
        <View style={styles.banner} accessibilityRole="text">
          <Text style={styles.bannerText}>{testingNotice}</Text>
          <Text style={styles.bannerSub}>
            Add-on purchases are turned off in this build. Your add-on bank and usage still display
            below.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your usage</Text>
        {loadingQuota || subLoading ? (
          <View style={styles.row}>
            <ActivityIndicator color={colors.text} />
            <Text style={styles.body}>Loading usageΓÇª</Text>
          </View>
        ) : (
          <>
            <Text style={styles.stat}>{dailyLimitLabel}</Text>
            {quota ? (
              <>
                <Text style={styles.stat}>
                  This month: {quota.ownerMonthlyQuestions.toLocaleString()} AI questions
                </Text>
                <Text style={styles.stat}>
                  Add-on bank: {quota.addonCreditsRemaining.toLocaleString()} questions remaining
                </Text>
                {quota.addonCreditsLifetimePurchased > 0 ? (
                  <Text style={styles.note}>
                    Lifetime add-on credits purchased on this device:{" "}
                    {quota.addonCreditsLifetimePurchased.toLocaleString()}
                  </Text>
                ) : null}
              </>
            ) : null}
            <Text style={styles.note}>
              Plan limits reset each day. Add-on credits stay in your bank until you use them.
            </Text>
          </>
        )}
        {!purchasesDisabled && isConfigured ? (
          <Text style={styles.ok}>RevenueCat is ready for add-on purchases on this build.</Text>
        ) : !purchasesDisabled && Platform.OS !== "web" ? (
          <Text style={styles.note}>RevenueCat is not configured ΓÇö rebuild with store keys to buy add-ons.</Text>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>Choose a pack</Text>

      {Platform.OS === "ios" ? (
        <Text style={styles.note}>Purchases are billed through your Apple ID.</Text>
      ) : null}

      {AI_ADDON_TIERS.map((tier) => {
        const busy = purchasingId === tier.id;
        return (
          <View key={tier.id} style={styles.tierCard}>
            <Text style={styles.tierTitle}>{tier.headline}</Text>
            <Text style={styles.tierPrice}>{tier.priceLabel}</Text>
            <Text style={styles.tierHint}>{tier.hint}</Text>
            <Pressable
              onPress={() => onPurchase(tier.id)}
              disabled={busy || purchasesDisabled || Platform.OS === "web"}
              style={({ pressed }) => [
                styles.primary,
                (busy || purchasesDisabled || Platform.OS === "web") && styles.primaryDisabled,
                pressed && !busy && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.primaryText}>
                  {purchasesDisabled
                    ? "Purchases disabled (testing)"
                    : Platform.OS === "web"
                      ? "Buy in the mobile app"
                      : `Buy ${tier.headline} ΓÇö ${tier.priceLabel}`}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How it works</Text>
        <Text style={styles.bullet}>ΓÇó Add-ons are consumable packs ΓÇö not a subscription.</Text>
        <Text style={styles.bullet}>ΓÇó Credits apply after your plan&apos;s daily AI allowance is used.</Text>
        <Text style={styles.bullet}>
          ΓÇó{" "}
          {Platform.OS === "ios"
            ? "Purchases are billed through your Apple ID."
            : Platform.OS === "android"
              ? "Purchases are billed through Google Play on your store account."
              : "Purchases are billed through Apple or Google on your store account."}
        </Text>
        <Text style={styles.bullet}>
          ΓÇó Restore your main subscription under Settings ΓåÆ Subscriptions and IAP ΓåÆ Subscription.
        </Text>
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
    },
    intro: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text},
    banner: {
      ...cardBase,
      padding: 14,
      gap: 6,
      backgroundColor: hexToRgba(colors.accent, 0.12),
      borderColor: hexToRgba(colors.accent, 0.35),
    },
    bannerText: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    bannerSub: {
      fontSize: 13,
      lineHeight: 19,
      color: mutedTextColor(colors), textAlign: "center",
    },
    card: {
      ...cardBase,
      padding: 14,
      gap: 8,
    },
    tierCard: {
      ...cardBase,
      padding: 14,
      gap: 8,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: mutedTextColor(colors), textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: mutedTextColor(colors), textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text},
    stat: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 22,
    },
    note: {
      fontSize: 13,
      lineHeight: 19,
      color: mutedTextColor(colors), fontStyle: "italic",
    },
    ok: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text},
    tierTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    tierPrice: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    tierHint: {
      fontSize: 14,
      lineHeight: 20,
      color: mutedTextColor(colors)},
    primary: {
      ...secondaryBtn,
      paddingVertical: 12,
      marginTop: 4,
    },
    primaryDisabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.88,
    },
    primaryText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 15,
      textAlign: "center",
    },
    bullet: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.text},
  });
}
