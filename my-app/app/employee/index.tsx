"use no memo";

import { Link, useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFooterScrollInset } from "@/components/FormScrollView";
import { HomeMenuButton } from "@/components/home/HomeMenuButton";
import { SocialMediaPickerModal } from "@/components/SocialMediaPickerModal";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { isEmployeeAppVariant } from "@/lib/auth/appVariant";
import { syncEmployeeAssignments } from "@/lib/cloud/jobAssignments";
import { registerEmployeePushTokenIfPossible } from "@/lib/cloud/pushToken";
import { loadAiAssistantToolsEnabled } from "@/lib/aiAssistant";
import {
  EMPLOYEE_HOME_MENU_ITEMS,
  HOME_SOCIAL_MEDIA_TILE,
  homeMenuItemShowsTileImage,
  type HomeMenuItem,
} from "@/lib/homeMenuItems";
import {
  clearEmployeeSession,
  loadEmployeeSession,
  type EmployeeSession,
} from "@/lib/employeeSession";
import { loadPersistedAppRole } from "@/lib/auth/sessionRole";
import {
  HOME_MENU_HORIZONTAL_PADDING,
  HOME_MENU_TILE_GAP,
  useHomeContentWidth,
  useHomeMenuButtonDimensions,
} from "@/lib/layout/formContentWidth";

function homeMenuButtonImage(item: HomeMenuItem): HomeMenuItem["image"] | undefined {
  if (!homeMenuItemShowsTileImage(item) || !item.image) return undefined;
  return item.image;
}

export default function EmployeeHomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const contentWidth = useHomeContentWidth();
  const { width: buttonWidth, height: buttonHeight } = useHomeMenuButtonDimensions();
  const footerScrollInset = useFooterScrollInset();
  const themed = useMemo(() => makeStyles(colors, footerScrollInset), [colors, footerScrollInset]);
  const employeeVariant = isEmployeeAppVariant();

  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [socialPickerOpen, setSocialPickerOpen] = useState(false);
  const [debugAppRole, setDebugAppRole] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sess, aiEnabled, persistedRole] = await Promise.all([
        loadEmployeeSession(),
        loadAiAssistantToolsEnabled(),
        loadPersistedAppRole(),
      ]);
      setSession(sess);
      setAiAssistantEnabled(aiEnabled);
      setDebugAppRole(persistedRole ?? "none");
      if (sess.active && sess.cloudAuthToken) {
        await syncEmployeeAssignments();
        void registerEmployeePushTokenIfPossible();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const companyLabel = session?.companyName?.trim() || "Your company";
  const displayName = session?.displayName?.trim();
  const gridInnerWidth = contentWidth ?? buttonWidth;

  const menuItems = EMPLOYEE_HOME_MENU_ITEMS.filter((item) => {
    if (item.key === "ideal-assistant" && !aiAssistantEnabled) return false;
    return true;
  });

  if (loading) {
    return (
      <View style={themed.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session?.active) {
    return (
      <View style={themed.joinRoot}>
        <Text style={themed.joinTitle}>
          {employeeVariant ? "Ideal Solutions Employee" : "Employee Access"}
        </Text>
        <Text style={themed.joinSubtitle}>
          Join your crew with an invitation code from your employer.
        </Text>
        <Link href={"/employee/join" as Href} asChild>
          <Pressable style={({ pressed }) => [themed.joinCta, pressed && { opacity: 0.9 }]}>
            <Text style={themed.joinCtaText}>Employee Access</Text>
          </Pressable>
        </Link>
        {!employeeVariant ? (
          <Text style={themed.joinHint}>
            Your employer sends a code from Job Folder → Crew → Invite or Settings → My crew.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={themed.root}>
      <View style={themed.header}>
        <Text style={themed.headerTitle}>
          {employeeVariant ? "Ideal Solutions Employee" : "Employee"}
        </Text>
        <Text style={themed.headerSubtitle}>
          {displayName ? `${displayName} · ${companyLabel}` : companyLabel}
        </Text>
        {__DEV__ ? (
          <View style={themed.devBanner}>
            <Text style={themed.devBannerTitle}>EMPLOYEE MODE ACTIVE</Text>
            <Text style={themed.devBannerText}>
              session.active={String(session.active)} session.role={session.role ?? "none"} persistedRole=
              {debugAppRole}
            </Text>
          </View>
        ) : null}
      </View>
      <ScrollView
        style={themed.scroll}
        contentContainerStyle={[themed.gridColumn, themed.gridScrollContent]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <View style={[themed.gridInner, { width: gridInnerWidth }]}>
          {menuItems.map((item) => (
            <View
              key={item.key}
              style={[themed.gridRow, { width: buttonWidth, height: buttonHeight }]}
            >
              {item.key === HOME_SOCIAL_MEDIA_TILE.key || item.key === "social-media" ? (
                <HomeMenuButton
                  width={buttonWidth}
                  height={buttonHeight}
                  accessibilityLabel="Social media"
                  accessibilityHint="Choose a network to open."
                  image={homeMenuButtonImage(item)}
                  icon={item.icon}
                  iconColor={colors.accent}
                  imageMonochrome={item.imageMonochrome}
                  onPress={() => setSocialPickerOpen(true)}
                />
              ) : item.href ? (
                <HomeMenuButton
                  width={buttonWidth}
                  height={buttonHeight}
                  accessibilityLabel={item.label}
                  accessibilityHint={item.subtitle ?? item.label}
                  image={homeMenuButtonImage(item)}
                  icon={item.icon}
                  iconColor={colors.accent}
                  imageMonochrome={item.imageMonochrome}
                  onPress={() => router.push(item.href as Href)}
                />
              ) : (
                <HomeMenuButton
                  width={buttonWidth}
                  height={buttonHeight}
                  accessibilityLabel={item.label}
                  image={homeMenuButtonImage(item)}
                  icon={item.icon}
                  iconColor={colors.accent}
                  imageMonochrome={item.imageMonochrome}
                />
              )}
            </View>
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [themed.signOut, pressed && { opacity: 0.9 }]}
          onPress={() => void clearEmployeeSession().then(refresh)}
        >
          <Text style={themed.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
      <SocialMediaPickerModal visible={socialPickerOpen} onClose={() => setSocialPickerOpen(false)} />
    </View>
  );
}

function makeStyles(colors: ColorScheme, footerScrollInset: number) {
  return StyleSheet.create({
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    root: {
      flex: 1,
      backgroundColor: "transparent",
    },
    header: {
      paddingHorizontal: HOME_MENU_HORIZONTAL_PADDING,
      paddingTop: 12,
      paddingBottom: 4,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
    },
    headerSubtitle: {
      color: colors.textMuted,
      fontSize: 14,
      marginTop: 4,
    },
    devBanner: {
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
      backgroundColor: "rgba(255, 200, 0, 0.25)",
      borderWidth: 1,
      borderColor: "rgba(255, 200, 0, 0.6)",
    },
    devBannerTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    devBannerText: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    scroll: {
      flex: 1,
    },
    gridInner: {
      maxWidth: "100%",
      flexDirection: "column",
      gap: HOME_MENU_TILE_GAP,
    },
    gridColumn: {
      flexDirection: "column",
    },
    gridScrollContent: {
      alignItems: "center",
      paddingHorizontal: HOME_MENU_HORIZONTAL_PADDING,
      paddingBottom: footerScrollInset + HOME_MENU_TILE_GAP,
    },
    gridRow: {
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    signOut: {
      marginTop: 20,
      paddingVertical: 12,
      alignSelf: "center",
    },
    signOutText: {
      color: colors.textMuted,
      fontSize: 16,
    },
    joinRoot: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    joinTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
      textAlign: "center",
    },
    joinSubtitle: {
      color: colors.textMuted,
      fontSize: 15,
      marginTop: 8,
      textAlign: "center",
    },
    joinCta: {
      marginTop: 24,
      backgroundColor: colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 10,
    },
    joinCtaText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    joinHint: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 16,
      textAlign: "center",
    },
  });
}
