import { Link, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, navCardStyle, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  BUSINESS_CARD_FIELD_META,
  type BusinessCardAudience,
  defaultBusinessCardDisplayPrefs,
  type BusinessCardDisplayPrefs,
  type BusinessCardFieldKey,
  fieldToggleVisible,
  loadBusinessCardDisplayPrefs,
  saveBusinessCardDisplayPrefs,
} from "@/lib/businessCardDisplayPreferences";
import { companyProfileFromPartial, loadCompanyProfile, type CompanyProfile } from "@/lib/profileStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";

function AudienceSection({
  title,
  subtitle,
  audience,
  prefs,
  profile,
  onToggle,
  styles,
  colors,
}: {
  title: string;
  subtitle: string;
  audience: BusinessCardAudience;
  prefs: BusinessCardDisplayPrefs;
  profile: CompanyProfile;
  onToggle: (audience: BusinessCardAudience, key: BusinessCardFieldKey, value: boolean) => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ColorScheme;
}) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      {BUSINESS_CARD_FIELD_META.map((meta) => {
        if (!fieldToggleVisible(meta, profile)) return null;
        return (
          <View key={`${audience}-${meta.key}`} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.label}>{meta.label}</Text>
              <Text style={styles.hint}>{meta.description}</Text>
            </View>
            <Switch
              value={prefs[audience][meta.key]}
              onValueChange={(value) => onToggle(audience, meta.key, value)}
              thumbColor={colors.accent}
              trackColor={{
                false: hexToRgba(colors.text, 0.22),
                true: hexToRgba(colors.accent, 0.55),
              }}
              accessibilityLabel={`${meta.label} on ${title}`}
            />
          </View>
        );
      })}
    </View>
  );
}

export default function BusinessCardDisplaySettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [hydrated, setHydrated] = useState(false);
  const [prefs, setPrefs] = useState(defaultBusinessCardDisplayPrefs);
  const [profile, setProfile] = useState<CompanyProfile>(() => companyProfileFromPartial(null));

  const refresh = useCallback(() => {
    void Promise.all([loadBusinessCardDisplayPrefs(), loadCompanyProfile()]).then(([nextPrefs, stored]) => {
      setPrefs(nextPrefs);
      setProfile(companyProfileFromPartial(stored));
      setHydrated(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    let cancelled = false;
    void loadBusinessCardDisplayPrefs().then((p) => {
      if (!cancelled) setPrefs(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onToggle = useCallback(
    (audience: BusinessCardAudience, key: BusinessCardFieldKey, value: boolean) => {
      setPrefs((prev) => {
        const next: BusinessCardDisplayPrefs = {
          ...prev,
          [audience]: { ...prev[audience], [key]: value },
        };
        void saveBusinessCardDisplayPrefs(next);
        return next;
      });
    },
    [],
  );

  if (!hydrated) {
    return (
      <StickyScrollScreen
        title="Business card display"
        subtitle="Choose what appears on your card."
        backHref={settingsBackHref("business-card-display")}
        backLabel={settingsBackLabel("business-card-display")}
        scrollStyle={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.loading}>
          <ActivityIndicator color={colors.text} />
        </View>
      </StickyScrollScreen>
    );
  }

  return (
    <StickyScrollScreen
      title="Business card display"
      subtitle="Control your in-app card and what scanners see on the public view."
      backHref={settingsBackHref("business-card-display")}
      backLabel={settingsBackLabel("business-card-display")}
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.body}>
        Turn fields on or off for each view. Values come from Settings → User info (and optional profile fields).
        Visibility for QR deep links is stored on this device and in your profile backup.
      </Text>

      <Link href={"/business-card" as Href} asChild>
        <TouchableOpacity style={styles.previewBtn} activeOpacity={0.85}>
          <Text style={styles.previewBtnText}>Preview in-app card</Text>
        </TouchableOpacity>
      </Link>
      <Link href={"/business-card?view=public" as Href} asChild>
        <TouchableOpacity style={styles.previewBtnSecondary} activeOpacity={0.85}>
          <Text style={styles.previewBtnSecondaryText}>Preview QR / public view</Text>
        </TouchableOpacity>
      </Link>

      <AudienceSection
        title="In-app card"
        subtitle="Shown when you open the virtual business card inside Ideal Solutions Pro."
        audience="inApp"
        prefs={prefs}
        profile={profile}
        onToggle={onToggle}
        styles={styles}
        colors={colors}
      />

      <AudienceSection
        title="QR & public view"
        subtitle="Used when someone opens your in-app card link from a QR scan (?view=public). External https URLs use that site’s own layout."
        audience="publicQr"
        prefs={prefs}
        profile={profile}
        onToggle={onToggle}
        styles={styles}
        colors={colors}
      />
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const cardBase = navCardStyle(colors);
  const secondaryButtonBase = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40 },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      opacity: 0.9,
      marginBottom: 16,
    },
    previewBtn: {
      ...secondaryButtonBase,
      paddingVertical: 14,
      borderRadius: 14,
      marginBottom: 10,
    },
    previewBtnText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    previewBtnSecondary: {
      ...secondaryButtonBase,
      paddingVertical: 12,
      marginBottom: 20,
    },
    previewBtnSecondaryText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    sectionBlock: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 6,
    },
    sectionSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.7,
      marginBottom: 14,
    },
    row: {
      ...cardBase,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 12,
      gap: 12,
    },
    rowText: { flex: 1 },
    label: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },
    hint: {
      color: colors.text,
      opacity: 0.65,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    loading: {
      paddingVertical: 32,
      alignItems: "center",
    },
  });
}
