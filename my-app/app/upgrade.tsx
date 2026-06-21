import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FormScrollView } from "@/components/FormScrollView";

import { useSubscription } from "@/context/SubscriptionContext";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { getAccentTints, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { SUBSCRIPTION_SETTINGS_HREF } from "@/lib/subscriptionGating";

export default function UpgradeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { proTrial, aiQuotaCheck } = useSubscription();

  const reason =
    proTrial.aiExhausted
      ? `You've used all ${proTrial.aiLimit} trial AI requests.`
      : proTrial.isExpired
        ? "Your 7-day trial has ended."
        : "Subscribe to unlock premium features.";

  return (
    <FormScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
      <Text style={styles.title}>Upgrade to keep going</Text>
      <Text style={styles.body}>{reason}</Text>
      <Text style={styles.body}>
        Your jobs, photos, and files stay on this device. Nothing is deleted — subscribe to restore full access to
        estimating, AI, crew tools, and more.
      </Text>
      {aiQuotaCheck.source === "trial" ? (
        <Text style={styles.stat}>
          Trial AI: {aiQuotaCheck.used} / {aiQuotaCheck.limit} used
        </Text>
      ) : null}

      <Pressable
        onPress={() => router.push(SUBSCRIPTION_SETTINGS_HREF)}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>View plans & subscribe</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
        <Text style={styles.secondaryText}>Back</Text>
      </Pressable>
    </FormScrollView>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondaryBtn = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 24, gap: 14 },
    title: { fontSize: 24, fontWeight: "800", color: colors.text },
    body: { fontSize: 15, lineHeight: 22, color: colors.text, opacity: 0.9 },
    stat: { fontSize: 14, fontWeight: "600", color: colors.text, opacity: 0.85 },
    primary: { ...secondaryBtn, paddingVertical: 16, borderRadius: 14, marginTop: 12 },
    secondary: { ...secondaryBtn, paddingVertical: 12, borderRadius: 14 },
    pressed: { opacity: 0.88 },
    primaryText: { color: colors.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
    secondaryText: { color: colors.text, fontSize: 15, fontWeight: "700", textAlign: "center" },
  });
}
