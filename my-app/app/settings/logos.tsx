import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { COMPANY_LOGO_IMAGE_STYLE } from "@/lib/companyLogoAsset";
import { pickCompanyLogoFromFiles, pickCompanyLogoFromLibrary } from "@/lib/companyLogoPicker";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { refreshHomeProfile } from "@/lib/homeBoot";
import { loadCompanyProfile, updateCompanyLogo } from "@/lib/profileStorage";
import { settingsBackHref, settingsBackLabel, settingsItemHref } from "@/lib/settingsGroups";

export default function LogosSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [hydrated, setHydrated] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadCompanyProfile();
      if (cancelled) return;
      const nextLogo = stored?.logoUri;
      if (nextLogo === null || typeof nextLogo === "string") setLogoUri(nextLogo ?? null);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyLogo = useCallback(async (uri: string | null) => {
    setSaving(true);
    try {
      const persisted = await updateCompanyLogo(uri);
      setLogoUri(persisted);
      await refreshHomeProfile();
    } catch {
      Alert.alert("Could not save logo", "Try another image or check free space on this device.");
    } finally {
      setSaving(false);
    }
  }, []);

  const handlePickFromLibrary = async () => {
    const uri = await pickCompanyLogoFromLibrary();
    if (uri) await applyLogo(uri);
  };

  const handlePickFromFiles = async () => {
    const uri = await pickCompanyLogoFromFiles();
    if (uri) await applyLogo(uri);
  };

  const handleRemoveLogo = async () => {
    await applyLogo(null);
  };

  if (!hydrated) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingHint}>Loading logos…</Text>
      </View>
    );
  }

  return (
    <StickyScrollScreen
      title="Logos"
      subtitle="Company logo for splash screen and documents — saved on this device."
      backHref={settingsBackHref("logos")}
      backLabel={settingsBackLabel("logos")}
      scrollViewProps={{ keyboardShouldPersistTaps: "handled" }}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.lede}>
        Your company logo is saved on this device and used on the splash screen and in documents. Pick a new image
        anytime — changes save immediately.
      </Text>

      <Text style={styles.fieldLabel}>Add or change logo</Text>
      <View style={styles.logoPickRow}>
        <TouchableOpacity
          style={[styles.logoButton, styles.logoButtonHalf]}
          onPress={() => void handlePickFromLibrary()}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.logoButtonText}>Photo library</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.logoButton, styles.logoButtonHalf]}
          onPress={() => void handlePickFromFiles()}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.logoButtonText}>Files & OneDrive</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.logoHint}>
        Use Photo library for quick picks, or Files & OneDrive for Downloads, iCloud, OneDrive, Google Drive, and more.
      </Text>

      {saving ? <Text style={styles.savingHint}>Saving…</Text> : null}

      {logoUri ? (
        <>
          <Image
            source={{ uri: logoUri }}
            style={[styles.logoPreview, COMPANY_LOGO_IMAGE_STYLE]}
            resizeMode="contain"
            accessibilityLabel="Company logo preview"
          />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => void handleRemoveLogo()}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.removeButtonText}>Remove logo</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.emptyHint}>No logo saved yet. Use the buttons above to add one.</Text>
      )}

      <Link href={settingsItemHref("user-info")} asChild>
        <TouchableOpacity style={styles.secondaryNav} activeOpacity={0.85}>
          <Text style={styles.secondaryNavText}>Full company profile (User info)</Text>
        </TouchableOpacity>
      </Link>

    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondaryBtn = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    loadingWrap: {
      flex: 1,
      backgroundColor: "transparent",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    loadingHint: {
      marginTop: 12,
      color: colors.text,
      opacity: 0.75,
      fontSize: 16,
    },
    lede: {
      color: colors.text,
      opacity: 0.85,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    fieldLabel: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 10,
    },
    logoPickRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 8,
    },
    logoButton: {
      ...secondaryBtn,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 16,
    },
    logoButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    logoButtonHalf: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    logoHint: {
      color: colors.text,
      opacity: 0.7,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
    },
    savingHint: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    logoPreview: {
      width: 160,
      height: 160,
      marginBottom: 12,
      alignSelf: "center",
      backgroundColor: "transparent",
    },
    emptyHint: {
      color: colors.text,
      opacity: 0.65,
      fontSize: 14,
      fontStyle: "italic",
      marginBottom: 8,
    },
    removeButton: {
      ...secondaryBtn,
      alignSelf: "center",
      paddingVertical: 12,
      paddingHorizontal: 18,
      marginBottom: 8,
    },
    removeButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    secondaryNav: {
      marginTop: 20,
      paddingVertical: 14,
      alignItems: "center",
    },
    secondaryNavText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
