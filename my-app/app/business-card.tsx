import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getAccentTints,
  navCardStyle,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { COMPANY_LOGO_IMAGE_STYLE } from "@/lib/companyLogoAsset";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import {
  buildBusinessCardRows,
  businessCardHasVisibleContent,
  showBusinessCardHeader,
  type BusinessCardRow,
} from "@/lib/businessCardContent";
import type { BusinessCardAudience } from "@/lib/businessCardDisplayPreferences";
import { defaultBusinessCardDisplayPrefs, loadBusinessCardDisplayPrefs } from "@/lib/businessCardDisplayPreferences";
import { companyProfileFromPartial, loadCompanyProfile, type CompanyProfile } from "@/lib/profileStorage";

function digitsForDialer(phone: string): string {
  return phone.replace(/[^\d+]/g, "") || phone.trim();
}

function audienceFromParams(view: string | string[] | undefined): BusinessCardAudience {
  const raw = Array.isArray(view) ? view[0] : view;
  return raw === "public" ? "publicQr" : "inApp";
}

export default function PublicBusinessCardScreen() {
  const router = useRouter();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const audience = audienceFromParams(view);
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [profile, setProfile] = useState<CompanyProfile>(() => companyProfileFromPartial(null));
  const [displayPrefs, setDisplayPrefs] = useState(defaultBusinessCardDisplayPrefs);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    void Promise.all([loadCompanyProfile(), loadBusinessCardDisplayPrefs()]).then(([stored, prefs]) => {
      setProfile(companyProfileFromPartial(stored));
      setDisplayPrefs(prefs);
      setReady(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const header = useMemo(
    () => showBusinessCardHeader(profile, displayPrefs, audience),
    [profile, displayPrefs, audience],
  );
  const rows = useMemo(
    () => buildBusinessCardRows(profile, displayPrefs, audience),
    [profile, displayPrefs, audience],
  );
  const hasContent = useMemo(
    () => businessCardHasVisibleContent(profile, displayPrefs, audience),
    [profile, displayPrefs, audience],
  );

  const goServiceRequest = useCallback(() => {
    router.push({
      pathname: "/service-calls/customer-request",
      params: {
        contractorEmail: profile.supportEmail.trim(),
        contractorPhone: profile.phoneNumber.trim(),
        companyName: profile.companyName.trim(),
      },
    });
  }, [profile.companyName, profile.phoneNumber, profile.supportEmail, router]);

  const canRequestService =
    profile.supportEmail.trim().length > 0 || profile.phoneNumber.trim().length > 0;

  const openPhoneActions = useCallback(
    (display: string) => {
      if (!display) return;
      const d = digitsForDialer(display);
      if (!d) {
        Alert.alert("Phone number", "This number could not be used for calling or texting.");
        return;
      }

      const openUrl = async (url: string) => {
        try {
          const ok = await Linking.canOpenURL(url);
          if (!ok) {
            Alert.alert("Not available", "This action is not supported on this device.");
            return;
          }
          await Linking.openURL(url);
        } catch {
          Alert.alert("Could not open", "Try again or dial the number manually.");
        }
      };

      Alert.alert(
        "Contact this business",
        `What would you like to do with ${display}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Call", onPress: () => void openUrl(`tel:${d}`) },
          { text: "Text", onPress: () => void openUrl(`sms:${d}`) },
          ...(canRequestService
            ? [{ text: "Request a service call", onPress: goServiceRequest }]
            : []),
        ],
      );
    },
    [canRequestService, goServiceRequest],
  );

  const openLink = useCallback(async (href: string) => {
    try {
      const ok = await Linking.canOpenURL(href);
      if (!ok) {
        Alert.alert("Could not open", "This link is not supported on this device.");
        return;
      }
      await Linking.openURL(href);
    } catch {
      Alert.alert("Could not open", "Try again later.");
    }
  }, []);

  const renderRow = (row: BusinessCardRow) => {
    if (row.kind === "phone") {
      return (
        <Pressable
          key={row.key}
          onPress={() => openPhoneActions(row.value)}
          accessibilityRole="button"
          accessibilityLabel={`${row.label}: choose call, text, or request a service call`}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        >
          <Text style={styles.actionLabel}>{row.label}</Text>
          <Text style={styles.actionValue}>{row.value}</Text>
          {row.key === "phone" && canRequestService ? (
            <Text style={styles.actionHint}>Tap to call, text, or request a service call</Text>
          ) : (
            <Text style={styles.actionHint}>Tap to call or text</Text>
          )}
        </Pressable>
      );
    }

    if (row.kind === "link" || row.kind === "email") {
      const linkLabel =
        row.key === "facebook"
          ? "Open Facebook page"
          : row.kind === "email"
            ? "Send email"
            : "Open link";
      return (
        <Pressable
          key={row.key}
          onPress={() => void openLink(row.href ?? row.value)}
          accessibilityRole="link"
          accessibilityLabel={`${row.label}: ${linkLabel}`}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        >
          <Text style={styles.actionLabel}>{row.label}</Text>
          <Text style={styles.actionValue}>{row.value}</Text>
          <Text style={styles.actionHint}>{linkLabel}</Text>
        </Pressable>
      );
    }

    return (
      <View key={row.key} style={styles.staticCard}>
        <Text style={styles.label}>{row.label}</Text>
        <Text style={styles.body}>{row.value}</Text>
      </View>
    );
  };

  if (!ready) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.muted}>Loading…</Text>
      </ScrollView>
    );
  }

  const kicker =
    audience === "publicQr" ? "Business card (shared view)" : "Virtual business card";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>{kicker}</Text>
      {header.showLogo && profile.logoUri ? (
        <Image
          source={{ uri: profile.logoUri }}
          style={[styles.logo, COMPANY_LOGO_IMAGE_STYLE]}
          resizeMode="contain"
        />
      ) : null}
      {header.showLicensedBadge ? (
        <View style={styles.badgeWrap}>
          <Text style={styles.badge}>Licensed & insured</Text>
        </View>
      ) : null}
      {header.showCompanyName ? (
        <Text style={styles.company}>{profile.companyName.trim()}</Text>
      ) : null}
      {header.showBusinessType ? (
        <Text style={styles.businessType}>{profile.businessType.trim()}</Text>
      ) : null}

      {!hasContent ? (
        <View style={styles.staticCard}>
          <Text style={styles.body}>
            Profile details have not been filled in yet, or all fields are hidden in Settings → Business card
            display. Add company info under Settings → User info.
          </Text>
        </View>
      ) : (
        <>
          {rows.map(renderRow)}
          {canRequestService ? (
            <Pressable
              onPress={goServiceRequest}
              accessibilityRole="button"
              accessibilityLabel="Request a service call"
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            >
              <Text style={styles.actionValue}>Request a service call</Text>
              <Text style={styles.actionHint}>Opens the service call request form</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const navCard = navCardStyle(colors);
  const actionBtnBase = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      padding: 24,
      paddingBottom: 40,
      alignItems: "stretch",
    },
    kicker: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.72,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 16,
    },
    logo: {
      width: 120,
      height: 120,
      alignSelf: "center",
      marginBottom: 20,
      backgroundColor: "transparent",
    },
    badgeWrap: {
      alignSelf: "center",
      marginBottom: 12,
    },
    badge: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.background,
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      overflow: "hidden",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    company: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    businessType: {
      fontSize: 16,
      color: tints.mutedText,
      textAlign: "center",
      marginBottom: 24,
    },
    staticCard: {
      ...navCard,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    actionBtn: {
      ...actionBtnBase,
      alignSelf: "stretch",
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    actionBtnPressed: {
      opacity: 0.88,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: tints.mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    actionValue: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "700",
      color: colors.text,
    },
    actionHint: {
      fontSize: 13,
      lineHeight: 18,
      color: tints.mutedText,
      marginTop: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: "800",
      color: tints.mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    body: {
      fontSize: 17,
      lineHeight: 24,
      color: colors.text,
    },
    muted: {
      fontSize: 16,
      color: tints.mutedText,
      marginTop: 24,
    },
  });
}
