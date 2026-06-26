import { Link } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { navCardStyle, cardHintStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { settingsBackHref, settingsBackLabel, settingsItemHref } from "@/lib/settingsGroups";
import {
  SUBSCRIPTIONS_IAP_HUB_SUBTITLE,
  SUBSCRIPTIONS_IAP_HUB_TITLE,
  SUBSCRIPTIONS_IAP_NAV_ITEMS,
} from "@/lib/subscriptionsIapSettings";

export function SubscriptionsIapHubScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <StickyScrollScreen
      title={SUBSCRIPTIONS_IAP_HUB_TITLE}
      subtitle={SUBSCRIPTIONS_IAP_HUB_SUBTITLE}
      backHref={settingsBackHref("subscriptions-iap")}
      backLabel={settingsBackLabel("subscriptions-iap")}
      contentContainerStyle={styles.content}
    >
      <View style={styles.list}>
        {SUBSCRIPTIONS_IAP_NAV_ITEMS.map((item) => (
          <Link key={item.route} href={settingsItemHref(item.route)} asChild>
            <TouchableOpacity style={styles.navCard} activeOpacity={0.85}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardHint}>{item.hint}</Text>
            </TouchableOpacity>
          </Link>
        ))}
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
    },
    list: {
      gap: 12,
    },
    navCard: {
      ...nav,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
    },
    cardHint: cardHintStyle(colors),
  });
}
