import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Link, type Href } from "expo-router";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { navCardStyle } from "@/components/themed/screenChrome";
import { LEGAL_LAST_UPDATED, LEGAL_POLICY_VERSION, LEGAL_STUFF_DOCUMENTS } from "@/constants/legal";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

export function LegalStuffScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <StickyScrollScreen
      title="Legal Stuff"
      subtitle="Policies and agreements for Ideal Solutions Pro."
      backHref={"/settings" as Href}
      backLabel="← Settings"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.lede}>
        Policy version {LEGAL_POLICY_VERSION} · Last updated {LEGAL_LAST_UPDATED}
      </Text>

      <View style={styles.list}>
        {LEGAL_STUFF_DOCUMENTS.map((doc, index) => (
          <Link key={doc.id} href={`/settings/legal/${doc.id}` as Href} asChild>
            <TouchableOpacity
              style={[styles.navCard, index > 0 && styles.navCardSpaced]}
              activeOpacity={0.85}
            >
              <Text style={styles.cardTitle}>{doc.title}</Text>
              <Text style={styles.cardHint}>
                Version {doc.version} · Updated {doc.lastUpdated}
              </Text>
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
    lede: {
      color: hexToRgba(colors.text, 0.8),
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    list: {},
    navCard: {
      ...nav,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    navCardSpaced: {
      marginTop: 12,
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
