import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useMemo } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { navCardStyle, cardHintStyle, mutedTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import {
  IAP_HUB_SUBTITLE,
  IAP_HUB_TITLE,
  getIapNavCategories,
  iapCategoryHref,
} from "@/lib/iapSettingsCategories";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";

export default function InAppPurchasesHubScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navCategories = useMemo(() => getIapNavCategories(), []);

  return (
    <StickyScrollScreen
      title={IAP_HUB_TITLE}
      subtitle={IAP_HUB_SUBTITLE}
      backHref={settingsBackHref("in-app-purchases")}
      backLabel={settingsBackLabel("in-app-purchases")}
      contentContainerStyle={styles.content}
    >
      <View style={styles.card} accessibilityRole="text">
        <Text style={styles.cardTitle}>How billing works</Text>
        <Text style={styles.body}>
          Subscription tiers (Side Hustle, Boss Man, and up) renew monthly through your store
          account. Items below are separate one-time or consumable purchases — not part of your plan
          renewal.
        </Text>
        <Text style={styles.body}>
          {Platform.OS === "web"
            ? "Purchases are completed in the iOS or Android app. The store checkout offers cards, Apple Pay, Google Pay, and other methods on your store account."
            : Platform.OS === "ios"
              ? "Checkout is run by Apple (cards, Apple Pay, and other methods on your Apple ID)."
              : "Checkout is run by Google Play (cards, Google Pay, PayPal in some regions)."}
        </Text>
        <Text style={styles.note}>Venmo is not used for in-app purchases — use the store checkout.</Text>
      </View>

      <Text style={styles.sectionLabel}>Categories</Text>
      <View style={styles.list}>
        {navCategories.map((category) => (
          <Link key={category.slug} href={iapCategoryHref(category.slug)} asChild>
            <TouchableOpacity style={styles.navCard} activeOpacity={0.85}>
              <View style={styles.navRow}>
                <View style={styles.navTextCol}>
                  <Text style={styles.cardTitle}>{category.title}</Text>
                  <Text style={styles.cardHint}>{category.hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text} style={styles.chevron} />
              </View>
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription vs add-ons</Text>
        <Text style={styles.bullet}>
          • Plan tiers and renewal: Settings → Billing & payments → Subscriptions and IAP → Subscription.
        </Text>
        <Text style={styles.bullet}>• Restore a subscription from the Subscription screen, not here.</Text>
        <Text style={styles.bullet}>
          • AI usage limits: Settings → Billing & payments → Subscriptions and IAP → AI usage.
        </Text>
      </View>
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const nav = navCardStyle(colors);

  return StyleSheet.create({
    content: {
      padding: 24,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 4,
    },
    card: {
      ...nav,
      padding: 14,
      gap: 8,
      marginBottom: 8,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
    },
    cardHint: cardHintStyle(colors),
    body: {
      fontSize: 16,
      lineHeight: 23,
      fontWeight: "600",
      color: mutedTextColor(colors),
    },
    note: {
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "600",
      color: mutedTextColor(colors),
      fontStyle: "italic",
    },
    sectionLabel: {
      color: mutedTextColor(colors),
      fontSize: 16,
      fontWeight: "700",
      marginTop: 12,
      marginBottom: 12,
    },
    list: {
      gap: 12,
    },
    navCard: {
      ...nav,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    navTextCol: {
      flex: 1,
      minWidth: 0,
    },
    chevron: {
      opacity: 0.55,
    },
    comingSoonBadge: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: "700",
      color: mutedTextColor(colors),
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    bullet: {
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "600",
      color: colors.text,
    },
  });
}
