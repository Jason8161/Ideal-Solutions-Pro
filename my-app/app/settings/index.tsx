import Constants from "expo-constants";
import { Link } from "expo-router";
import { useMemo } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/lib/auth/AuthContext";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { navCardStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { SETTINGS_GROUPS, settingsGroupHref, settingsItemHref } from "@/lib/settingsGroups";
import { openSupportEmail } from "@/lib/supportContact";

export default function SettingsIndexPage() {
  const { colors } = useAppTheme();
  const { signOut, profile } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  function onLogout() {
    Alert.alert("Sign out", "You will need to sign in again to use Ideal Solutions Pro.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  return (
    <StickyScrollScreen showBack={false} title="Settings" contentContainerStyle={styles.content}>
      <Text style={styles.lede}>Choose a category. Related options are grouped on the next screen.</Text>

      <View style={styles.list}>
        {SETTINGS_GROUPS.map((group) => (
          <Link key={group.id} href={settingsGroupHref(group.id)} asChild>
            <TouchableOpacity style={styles.navCard} activeOpacity={0.85}>
              <Text style={styles.cardTitle}>{group.title}</Text>
              <Text style={styles.cardHint}>{group.subtitle}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Help & legal</Text>
      <Link href={settingsItemHref("legal-stuff")} asChild>
        <TouchableOpacity style={styles.navCard} activeOpacity={0.85}>
          <Text style={styles.cardTitle}>Legal Stuff</Text>
          <Text style={styles.cardHint}>
            Privacy, terms, AI disclaimer, GPS consent, deletion policy, and EULA.
          </Text>
        </TouchableOpacity>
      </Link>
      <Link href={settingsItemHref("services-description")} asChild>
        <TouchableOpacity style={[styles.navCard, styles.navCardSpaced]} activeOpacity={0.85}>
          <Text style={styles.cardTitle}>Services Description</Text>
          <Text style={styles.cardHint}>What Ideal Solutions Pro provides — read-only.</Text>
        </TouchableOpacity>
      </Link>
      <TouchableOpacity
        style={[styles.navCard, styles.navCardSpaced]}
        activeOpacity={0.85}
        onPress={() => void openSupportEmail(appVersion)}
      >
        <Text style={styles.cardTitle}>Support</Text>
        <Text style={styles.cardHint}>Email Ideal Solutions Pro with your app version.</Text>
      </TouchableOpacity>

      {profile?.email ? (
        <Text style={styles.accountLine}>Signed in as {profile.email}</Text>
      ) : null}

      <TouchableOpacity style={[styles.navCard, styles.logoutCard]} activeOpacity={0.85} onPress={onLogout}>
        <Text style={styles.logoutTitle}>Sign out</Text>
        <Text style={styles.cardHint}>End your session on this device.</Text>
      </TouchableOpacity>

      <View style={styles.versionRow}>
        <Text style={styles.versionText}>Ideal Solutions Pro v{appVersion}</Text>
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
      color: colors.text,
      opacity: 0.8,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 16,
    },
    list: {
      gap: 12,
    },
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
      fontSize: 20,
      fontWeight: "800",
    },
    cardHint: {
      color: colors.text,
      opacity: 0.72,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 6,
    },
    sectionLabel: {
      color: colors.text,
      opacity: 0.85,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 12,
      marginTop: 20,
    },
    accountLine: {
      color: colors.text,
      opacity: 0.65,
      fontSize: 13,
      marginTop: 20,
      marginBottom: 8,
    },
    logoutCard: {
      marginTop: 4,
    },
    logoutTitle: {
      color: colors.accent,
      fontSize: 20,
      fontWeight: "800",
    },
    versionRow: {
      marginTop: 28,
      paddingVertical: 12,
      alignItems: "center",
    },
    versionText: {
      color: colors.text,
      opacity: 0.45,
      fontSize: 13,
    },
  });
}
