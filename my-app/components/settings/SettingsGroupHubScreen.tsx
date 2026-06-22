import { Link, type Href } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { navCardStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import {
  settingsItemHref,
  type SettingsGroup,
} from "@/lib/settingsGroups";
import { canAccessCrewTools } from "@/lib/subscriptionGating";

type Props = {
  group: SettingsGroup;
};

export function SettingsGroupHubScreen({ group }: Props) {
  const { colors } = useAppTheme();
  const { activeTier } = useSubscription();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const items = useMemo(
    () =>
      canAccessCrewTools(activeTier)
        ? group.items
        : group.items.filter((item) => item.route !== "my-crew"),
    [activeTier, group.items],
  );

  return (
    <StickyScrollScreen
      title={group.title}
      subtitle={group.subtitle}
      backHref={"/settings" as Href}
      backLabel="← Settings"
      contentContainerStyle={styles.content}
    >
      <View style={styles.list}>
        {items.map((item) => (
          <Link key={item.route} href={settingsItemHref(item.route)} asChild>
            <TouchableOpacity style={styles.navCard} activeOpacity={0.85}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.hint ? <Text style={styles.cardHint}>{item.hint}</Text> : null}
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
    cardHint: {
      color: colors.text,
      opacity: 0.72,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 6,
    },
  });
}
