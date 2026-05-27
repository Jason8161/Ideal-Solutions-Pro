import * as Clipboard from "expo-clipboard";
import { Link, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import {
  getAccentTints,
  inputStyle,
  navCardStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { buildInAppBusinessCardUrl } from "@/lib/businessCardPublicLink";
import {
  loadBusinessCardQrSettings,
  saveBusinessCardQrSettings,
  type BusinessCardQrSettings,
} from "@/lib/businessCardQrStorage";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";

const MIN_ENCODE_LEN = 4;

function buildBusinessCardShareText(url: string, companyName: string): string {
  const name = companyName.trim();
  const label = name ? `"${name}"` : "my";
  const lead = name
    ? `Click here to see ${label} business card.`
    : "Click here to see my business card.";
  return `${lead}\n\n${url.trim()}`;
}

function looksLikeUrl(s: string): boolean {
  const t = s.trim().toLowerCase();
  return (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("ideal-solutions://") ||
    t.startsWith("myapp://") ||
    t.startsWith("exp://") ||
    t.startsWith("exps://")
  );
}

export default function BusinessCardQrSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<BusinessCardQrSettings>({ encodedTarget: "" });
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    void Promise.all([loadBusinessCardQrSettings(), loadCompanyProfile()]).then(([settings, profile]) => {
      setSaved(settings);
      setDraft(settings.encodedTarget);
      setCompanyName(companyProfileFromPartial(profile).companyName.trim());
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const trimmed = draft.trim();
  const savedTrim = saved.encodedTarget.trim();
  const displayValue =
    trimmed.length >= MIN_ENCODE_LEN ? trimmed : savedTrim.length >= MIN_ENCODE_LEN ? savedTrim : "";
  const canEncode = displayValue.length >= MIN_ENCODE_LEN;
  const showUrlHint = trimmed.length > 0 && !looksLikeUrl(trimmed);

  const persist = async (next: BusinessCardQrSettings) => {
    setSaving(true);
    try {
      await saveBusinessCardQrSettings(next);
      setSaved(next);
      setDraft(next.encodedTarget);
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    if (trimmed.length > 0 && trimmed.length < MIN_ENCODE_LEN) {
      Alert.alert("Link too short", `Enter at least ${MIN_ENCODE_LEN} characters, or clear the field.`);
      return;
    }
    if (trimmed.length > 0 && showUrlHint) {
      Alert.alert(
        "Unusual link",
        "This does not start with http:// or https://. It will still work if you intend a custom or app link.",
        [
          { text: "Go back", style: "cancel" },
          {
            text: "Save anyway",
            onPress: () => {
              void (async () => {
                await persist({ encodedTarget: trimmed });
                Alert.alert("Saved", "Your QR code now encodes this link.");
              })();
            },
          },
        ],
      );
      return;
    }
    await persist({ encodedTarget: trimmed });
    Alert.alert("Saved", trimmed ? "Your QR code now encodes this link." : "QR code cleared.");
  };

  const useInAppCard = () => {
    const url = buildInAppBusinessCardUrl({ forQrScan: true });
    setDraft(url);
    void (async () => {
      await persist({ encodedTarget: url });
      Alert.alert(
        "In-app card link set",
        "The QR opens your virtual business card inside Ideal Solutions Pro (company info from User info). Share this QR with people who have the app installed. You can still switch to any public website URL instead.",
      );
    })();
  };

  const copyLink = async () => {
    if (!savedTrim) {
      Alert.alert("Nothing to copy", "Save a link first.");
      return;
    }
    const text = buildBusinessCardShareText(savedTrim, companyName);
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "A short message with your company name and the link was copied.");
  };

  const shareLink = async () => {
    if (!savedTrim) {
      Alert.alert("Nothing to share", "Save a link first.");
      return;
    }
    try {
      const message = buildBusinessCardShareText(savedTrim, companyName);
      await Share.share({ message });
    } catch {
      // user dismissed
    }
  };

  return (
    <StickyScrollScreen
      title="Business card QR"
      subtitle="Create a QR code for your virtual business card or public page."
      backHref={settingsBackHref("business-card-qr")}
      backLabel={settingsBackLabel("business-card-qr")}
      contentContainerStyle={styles.content}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Link inside the QR</Text>
        <Text style={styles.cardMeta}>
          Paste an https URL to your online card or website. Anyone who scans the code will open this address.
        </Text>
        <VoiceTextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="https://your-site.com/card"
          placeholderTextColor={placeholderTextColor(colors)}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          multiline
        />
        {showUrlHint ? (
          <Text style={styles.warn}>
            Tip: public virtual cards usually begin with https:// — app deep links are fine too.
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.disabled]}
          onPress={() => void onSave()}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save link"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={useInAppCard} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Use in-app card (Ideal Solutions Pro link)</Text>
        </TouchableOpacity>
        <Link href={"/business-card" as Href} asChild>
          <TouchableOpacity style={styles.tertiaryBtn} activeOpacity={0.85}>
            <Text style={styles.tertiaryBtnText}>Preview in-app card</Text>
          </TouchableOpacity>
        </Link>
        <Link href={"/settings/business-card-display" as Href} asChild>
          <TouchableOpacity style={styles.tertiaryBtn} activeOpacity={0.85}>
            <Text style={styles.tertiaryBtnText}>Choose what shows on the card</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <Text style={styles.sectionLabel}>Your QR code</Text>
      <View style={styles.qrWrap}>
        {canEncode ? (
          <View style={styles.qrInner}>
            <QRCode value={displayValue} size={220} color="#0B1F3A" backgroundColor="#ffffff" />
          </View>
        ) : (
          <Text style={styles.qrPlaceholder}>Save a link above to generate your QR code.</Text>
        )}
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.halfBtn, !savedTrim && styles.disabled]}
          onPress={() => void copyLink()}
          disabled={!savedTrim}
          activeOpacity={0.85}
        >
          <Text style={styles.halfBtnText}>Copy message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.halfBtn, !savedTrim && styles.disabled]}
          onPress={() => void shareLink()}
          disabled={!savedTrim}
          activeOpacity={0.85}
        >
          <Text style={styles.halfBtnText}>Share</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.shareHint}>
        Share and copy send: Click here to see &quot;{companyName.trim() || "your company"}&quot; business card, then
        your link. Add your company name under User info if it&apos;s missing.
      </Text>
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const cardBase = navCardStyle(colors);
  const secondaryButtonBase = secondaryButtonStyle(colors, tints);
  const fieldInput = inputStyle(colors, tints);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      padding: 24,
      paddingBottom: 48,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      marginBottom: 22,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 12,
      marginTop: 8,
    },
    card: {
      ...cardBase,
      padding: 18,
      marginBottom: 20,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 6,
    },
    cardMeta: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.82,
      marginBottom: 14,
    },
    input: {
      ...fieldInput,
      minHeight: 88,
      textAlignVertical: "top",
      marginBottom: 10,
    },
    warn: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.9,
      marginBottom: 12,
    },
    primaryBtn: {
      ...secondaryButtonBase,
      paddingVertical: 14,
      borderRadius: 14,
      marginBottom: 10,
    },
    primaryBtnText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    secondaryBtn: {
      ...secondaryButtonBase,
      paddingVertical: 14,
      borderRadius: 14,
      marginBottom: 10,
    },
    secondaryBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    tertiaryBtn: {
      ...secondaryButtonBase,
      paddingVertical: 12,
      marginBottom: 10,
    },
    tertiaryBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    disabled: {
      opacity: 0.45,
    },
    qrWrap: {
      ...cardBase,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      marginBottom: 16,
      minHeight: 280,
    },
    qrInner: {
      backgroundColor: "#ffffff",
      borderRadius: 12,
      padding: 12,
    },
    qrPlaceholder: {
      textAlign: "center",
      color: colors.text,
      opacity: 0.72,
      fontSize: 15,
      lineHeight: 22,
      paddingHorizontal: 12,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    halfBtn: {
      flex: 1,
      ...secondaryButtonBase,
      paddingVertical: 14,
      borderRadius: 14,
    },
    halfBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    shareHint: {
      marginTop: 14,
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.72,
    },
  });
}
