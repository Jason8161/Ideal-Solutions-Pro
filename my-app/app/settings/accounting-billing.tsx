import { Link, useLocalSearchParams, type Href } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AccountingAppPickerSection } from "@/components/AccountingAppPickerSection";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { StickyPageHeader, useScStyles } from "@/components/serviceCalls/screenChrome";
import {
  getAccentTints,
  inputStyle,
  navCardStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  addBankAppShortcut,
  loadBankAppShortcuts,
  loadPreferredBankId,
  looksLikeOpenableUrl,
  removeBankAppShortcut,
  savePreferredBankId,
  type BankAppShortcut,
} from "@/lib/bankAppShortcutsStorage";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  loadHomeAccountingLaunchUrlOverride,
  loadHomeBankLaunchUrlOverride,
  saveHomeAccountingLaunchUrlOverride,
  saveHomeBankLaunchUrlOverride,
} from "@/lib/homeAccountingBankLaunchOverrides";
import { bestOpenUrlForItunesApp, searchItunesApps, type ItunesAppSearchResult } from "@/lib/itunesAppSearch";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";

export default function AccountingBillingSettingsScreen() {
  const { colors } = useAppTheme();
  const scStyles = useScStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const fromHomePicker = pick === "1";

  const [banksHydrated, setBanksHydrated] = useState(false);
  const [banks, setBanks] = useState<BankAppShortcut[]>([]);
  const [preferredBankId, setPreferredBankId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [bankPickModalVisible, setBankPickModalVisible] = useState(false);
  const [bankSearchLoading, setBankSearchLoading] = useState(false);
  const [bankSearchResults, setBankSearchResults] = useState<ItunesAppSearchResult[]>([]);
  const [homeAccountingUrl, setHomeAccountingUrl] = useState("");
  const [homeBankUrl, setHomeBankUrl] = useState("");

  const refreshBanks = useCallback(() => {
    void (async () => {
      const [list, pref, accHome, bankHome] = await Promise.all([
        loadBankAppShortcuts(),
        loadPreferredBankId(),
        loadHomeAccountingLaunchUrlOverride(),
        loadHomeBankLaunchUrlOverride(),
      ]);
      setBanks(list);
      setPreferredBankId(pref);
      setHomeAccountingUrl(accHome ?? "");
      setHomeBankUrl(bankHome ?? "");
      setBanksHydrated(true);
    })();
  }, []);

  useEffect(() => {
    refreshBanks();
  }, [refreshBanks]);

  const addBank = useCallback(async () => {
    const label = newLabel.trim();
    const url = newUrl.trim();
    if (!label) {
      Alert.alert("Bank name", "Enter a short name for this bank (for example Chase).");
      return;
    }
    if (!looksLikeOpenableUrl(url)) {
      Alert.alert(
        "Open link",
        "Enter a link your phone can open: usually https://… from the bank, or a custom scheme like somebank:// if your bank documents one.",
      );
      return;
    }
    const shortcut = await addBankAppShortcut(label, url);
    setNewLabel("");
    setNewUrl("");
    refreshBanks();
    Alert.alert(
      "Use this bank on the home screen?",
      `Save "${shortcut.label}" as the bank you can open from the Accountant/Billing button (alongside your accounting app)?`,
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Yes",
          onPress: () => {
            void savePreferredBankId(shortcut.id).then(() => {
              setPreferredBankId(shortcut.id);
            });
          },
        },
      ],
    );
  }, [newLabel, newUrl, refreshBanks]);

  const removeBank = useCallback(
    async (id: string) => {
      await removeBankAppShortcut(id);
      refreshBanks();
    },
    [refreshBanks],
  );

  const confirmPickItunesApp = useCallback(
    (r: ItunesAppSearchResult) => {
      const primaryUrl = bestOpenUrlForItunesApp(r);
      const openUrl = looksLikeOpenableUrl(primaryUrl) ? primaryUrl : r.trackViewUrl;
      const label = r.trackName.trim() || "Bank app";
      Alert.alert(
        "Add this bank",
        `Add “${label}”${r.artistName ? ` by ${r.artistName}` : ""} as a shortcut? You can set it as your home-screen bank next.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add",
            onPress: () =>
              void (async () => {
                if (!looksLikeOpenableUrl(openUrl)) {
                  Alert.alert(
                    "Could not use this link",
                    "Pick another app from the list or add your bank manually with a https link below.",
                  );
                  return;
                }
                const shortcut = await addBankAppShortcut(label, openUrl);
                setBankPickModalVisible(false);
                setBankSearchQuery("");
                setBankSearchResults([]);
                refreshBanks();
                Alert.alert(
                  "Use on home screen?",
                  `Use “${label}” as your bank when you tap Accountant/Billing and choose Open bank?`,
                  [
                    { text: "Not now", style: "cancel" },
                    {
                      text: "Yes",
                      onPress: () => void savePreferredBankId(shortcut.id).then(() => setPreferredBankId(shortcut.id)),
                    },
                  ],
                );
              })(),
          },
        ],
      );
    },
    [refreshBanks],
  );

  const runBankSearch = useCallback(async () => {
    const q = bankSearchQuery.trim();
    if (!q) {
      Alert.alert("Bank search", "Type your bank’s name, then tap Search.");
      return;
    }
    setBankSearchLoading(true);
    try {
      const list = await searchItunesApps(`${q} bank`);
      if (list.length === 0) {
        Alert.alert(
          "No matches",
          "No apps matched that search. Try different words or add your bank with a link in the form below.",
        );
        return;
      }
      setBankSearchResults(list);
      setBankPickModalVisible(true);
    } catch {
      Alert.alert("Search failed", "Could not load app results. Check your connection and try again.");
    } finally {
      setBankSearchLoading(false);
    }
  }, [bankSearchQuery]);

  const saveHomeAccountingLaunch = useCallback(async () => {
    const v = homeAccountingUrl.trim();
    if (v && !looksLikeOpenableUrl(v)) {
      Alert.alert(
        "Invalid link",
        "Use https://… or your app’s custom URL scheme (for example intuitqb:// or chase://) if the bank documents one.",
      );
      return;
    }
    await saveHomeAccountingLaunchUrlOverride(v || null);
    Alert.alert(
      "Saved",
      v ? "The home Accountant/Billing tile will open this link for accounting." : "Cleared. The tile will use your accounting selection above.",
    );
  }, [homeAccountingUrl]);

  const clearHomeAccountingLaunch = useCallback(async () => {
    setHomeAccountingUrl("");
    await saveHomeAccountingLaunchUrlOverride(null);
    Alert.alert("Cleared", "The home tile will use your accounting selection again.");
  }, []);

  const saveHomeBankLaunch = useCallback(async () => {
    const v = homeBankUrl.trim();
    if (v && !looksLikeOpenableUrl(v)) {
      Alert.alert(
        "Invalid link",
        "Use https://… or your bank app’s URL scheme (for example chase://) so the phone opens the app instead of only the website.",
      );
      return;
    }
    await saveHomeBankLaunchUrlOverride(v || null);
    Alert.alert(
      "Saved",
      v ? "The home tile will open this link for your bank." : "Cleared. The tile will use your preferred bank shortcut again.",
    );
  }, [homeBankUrl]);

  const clearHomeBankLaunch = useCallback(async () => {
    setHomeBankUrl("");
    await saveHomeBankLaunchUrlOverride(null);
    Alert.alert("Cleared", "The home tile will use your preferred bank shortcut again.");
  }, []);

  if (!banksHydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <StickyPageHeader
          title="Accounting & billing"
          subtitle="Choose your accounting app, bank shortcut, and home Accountant/Billing tile behavior."
          backHref={settingsBackHref("accounting-billing")}
          backLabel={settingsBackLabel("accounting-billing")}
        />
        <ScrollView
          style={scStyles.scrollBody}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        <AccountingAppPickerSection fromHomePicker={fromHomePicker} />

        <Text style={styles.section}>Home Accountant/Billing tile</Text>
        <Text style={styles.bankHint}>
          Optional: set the exact links used when you tap the home Accountant/Billing button. Leave blank to use your
          accounting choice above and your preferred bank shortcut below. For the bank app, paste a URL scheme (often
          in the bank&apos;s “open in app” help) or a mobile sign-in https link.
        </Text>
        <Text style={styles.subSection}>Accounting button (optional override)</Text>
        <VoiceTextInput
          value={homeAccountingUrl}
          onChangeText={setHomeAccountingUrl}
          placeholder="e.g. https://app.qbo.intuit.com/… or intuitqb://…"
          placeholderTextColor={placeholderTextColor(colors)}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.homeLaunchBtnRow}>
          <Pressable
            style={({ pressed }) => [styles.homeLaunchPrimary, pressed && styles.pressed]}
            onPress={() => void saveHomeAccountingLaunch()}
          >
            <Text style={styles.homeLaunchPrimaryText}>Save accounting link</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.homeLaunchSecondary, pressed && styles.pressed]}
            onPress={() => void clearHomeAccountingLaunch()}
          >
            <Text style={styles.homeLaunchSecondaryText}>Clear</Text>
          </Pressable>
        </View>

        <Text style={styles.subSection}>Bank button (optional override)</Text>
        <VoiceTextInput
          value={homeBankUrl}
          onChangeText={setHomeBankUrl}
          placeholder="e.g. chase:// or https://secure.…/login…"
          placeholderTextColor={placeholderTextColor(colors)}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.homeLaunchBtnRow}>
          <Pressable
            style={({ pressed }) => [styles.homeLaunchPrimary, pressed && styles.pressed]}
            onPress={() => void saveHomeBankLaunch()}
          >
            <Text style={styles.homeLaunchPrimaryText}>Save bank link</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.homeLaunchSecondary, pressed && styles.pressed]}
            onPress={() => void clearHomeBankLaunch()}
          >
            <Text style={styles.homeLaunchSecondaryText}>Clear</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Bank app shortcuts</Text>
        <Text style={styles.bankHint}>
          Use the sign-in or mobile banking URL from your bank&apos;s website or app. On many phones an https link opens
          in the bank app when it is installed.
        </Text>

        <Text style={styles.subSection}>Find your bank&apos;s app</Text>
        <Text style={styles.bankSearchHint}>
          Search shows apps from the public app catalog (best match first). Tap one to add it; then you can set it as
          your primary bank for the home Accountant/Billing button. You can still add a custom link manually below.
        </Text>
        <VoiceTextInput
          value={bankSearchQuery}
          onChangeText={setBankSearchQuery}
          placeholder="Bank name (e.g. Chase, Navy Federal)"
          placeholderTextColor={placeholderTextColor(colors)}
          style={styles.input}
          autoCapitalize="words"
          returnKeyType="search"
          onSubmitEditing={() => void runBankSearch()}
        />
        <Pressable
          onPress={() => void runBankSearch()}
          disabled={bankSearchLoading}
          style={({ pressed }) => [
            styles.searchBankBtn,
            (pressed || bankSearchLoading) && styles.searchBankBtnPressed,
            bankSearchLoading && styles.searchBankBtnDisabled,
          ]}
        >
          {bankSearchLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.searchBankBtnText}>Search bank apps</Text>
          )}
        </Pressable>

        {banks.length === 0 ? (
          <Text style={styles.emptyBanks}>No bank shortcuts yet. Add one below.</Text>
        ) : (
          <View style={styles.bankList}>
            {banks.map((b) => (
              <View key={b.id} style={styles.bankRow}>
                <View style={styles.bankRowText}>
                  <View style={styles.bankTitleRow}>
                    <Text style={styles.bankRowTitle}>{b.label}</Text>
                    {preferredBankId === b.id ? (
                      <View style={styles.homeBadge}>
                        <Text style={styles.homeBadgeText}>Home</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.bankRowUrl} numberOfLines={2} selectable>
                    {b.openUrl}
                  </Text>
                </View>
                <View style={styles.bankRowActions}>
                  {preferredBankId !== b.id ? (
                    <Pressable
                      onPress={() => void savePreferredBankId(b.id).then(() => setPreferredBankId(b.id))}
                      style={({ pressed }) => [styles.useForHomeBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.useForHomeBtnText}>Use for home</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => void removeBank(b.id)}
                    style={({ pressed }) => [styles.removeBankBtn, pressed && styles.pressed]}
                    accessibilityLabel={`Remove ${b.label}`}
                  >
                    <Text style={styles.removeBankBtnText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.subSection}>Add bank</Text>
        <VoiceTextInput
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="Bank name (e.g. Chase)"
          placeholderTextColor={placeholderTextColor(colors)}
          style={styles.input}
          autoCapitalize="words"
        />
        <VoiceTextInput
          value={newUrl}
          onChangeText={setNewUrl}
          placeholder="https://… or your bank app link"
          placeholderTextColor={placeholderTextColor(colors)}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable onPress={() => void addBank()} style={({ pressed }) => [styles.addBankBtn, pressed && styles.pressed]}>
          <Text style={styles.addBankBtnText}>Save bank shortcut</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>

    <Modal
      visible={bankPickModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        setBankPickModalVisible(false);
        setBankSearchResults([]);
      }}
    >
      <View style={styles.bankPickBackdrop}>
        <View style={styles.bankPickSheet}>
          <Text style={styles.bankPickTitle}>Choose your bank app</Text>
          <Text style={styles.bankPickSubtitle}>Tap an app to add it as a shortcut.</Text>
          {bankSearchResults.length === 0 ? (
            <Text style={styles.bankPickEmpty}>No apps matched. Try different words or add a link manually below.</Text>
          ) : (
            <FlatList
              data={bankSearchResults}
              keyExtractor={(item) => String(item.trackId)}
              style={styles.bankPickList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.bankPickRow, pressed && styles.pressed]}
                  onPress={() => confirmPickItunesApp(item)}
                >
                  {item.artworkUrl100 ? (
                    <Image source={{ uri: item.artworkUrl100 }} style={styles.bankPickIcon} contentFit="cover" />
                  ) : (
                    <View style={styles.bankPickIconPlaceholder} />
                  )}
                  <View style={styles.bankPickRowText}>
                    <Text style={styles.bankPickName} numberOfLines={2}>
                      {item.trackName}
                    </Text>
                    <Text style={styles.bankPickArtist} numberOfLines={2}>
                      {item.artistName}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
          <Pressable
            style={({ pressed }) => [styles.bankPickClose, pressed && styles.pressed]}
            onPress={() => {
              setBankPickModalVisible(false);
              setBankSearchResults([]);
            }}
          >
            <Text style={styles.bankPickCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    </>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const cardBase = navCardStyle(colors);
  const secondaryBtn = secondaryButtonStyle(colors, tints);
  const fieldInput = inputStyle(colors, tints);
  const hintText = hexToRgba(colors.text, 0.75);

  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: "transparent" },
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40, backgroundColor: "transparent" },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    pageTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
    },
    pageIntro: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      marginBottom: 20,
    },
    homeLaunchBtnRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 20,
    },
    homeLaunchPrimary: {
      flex: 1,
      ...secondaryBtn,
      paddingVertical: 12,
      borderRadius: 12,
    },
    homeLaunchPrimaryText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    homeLaunchSecondary: {
      flex: 1,
      ...secondaryBtn,
      paddingVertical: 12,
      borderRadius: 12,
    },
    homeLaunchSecondaryText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    section: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
      marginTop: 20,
    },
    subSection: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 10,
      marginTop: 8,
    },
    bankHint: {
      fontSize: 14,
      lineHeight: 20,
      color: hintText,
      fontWeight: "600",
      marginBottom: 12,
    },
    bankSearchHint: {
      fontSize: 13,
      lineHeight: 19,
      color: hintText,
      fontWeight: "600",
      marginBottom: 10,
    },
    searchBankBtn: {
      ...secondaryBtn,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 16,
    },
    searchBankBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    searchBankBtnPressed: { opacity: 0.88 },
    searchBankBtnDisabled: { opacity: 0.55 },
    bankPickBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    bankPickSheet: {
      maxHeight: "88%",
      ...cardBase,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },
    bankPickTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 6,
    },
    bankPickSubtitle: {
      fontSize: 13,
      color: hintText,
      fontWeight: "600",
      marginBottom: 12,
    },
    bankPickEmpty: {
      fontSize: 15,
      color: hintText,
      fontWeight: "600",
      paddingVertical: 20,
      textAlign: "center",
    },
    bankPickList: { flexGrow: 0, maxHeight: 420 },
    bankPickRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hexToRgba(colors.text, 0.12),
    },
    bankPickIcon: { width: 52, height: 52, borderRadius: 12, backgroundColor: tints.accentTintLight },
    bankPickIconPlaceholder: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: tints.accentTintLight,
    },
    bankPickRowText: { flex: 1, minWidth: 0, gap: 4 },
    bankPickName: { fontSize: 16, fontWeight: "700", color: colors.text },
    bankPickArtist: { fontSize: 13, color: hintText, fontWeight: "600" },
    bankPickClose: {
      ...secondaryBtn,
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 12,
    },
    bankPickCloseText: { fontSize: 16, fontWeight: "800", color: colors.text },
    emptyBanks: {
      fontSize: 14,
      color: hintText,
      fontWeight: "600",
      fontStyle: "italic",
      marginBottom: 12,
    },
    bankList: { gap: 10, marginBottom: 16 },
    bankRow: {
      ...cardBase,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    bankRowText: { flex: 1, minWidth: 0, gap: 4 },
    bankTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    bankRowTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    homeBadge: {
      backgroundColor: tints.accentTint,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "transparent",
    },
    homeBadgeText: { fontSize: 11, fontWeight: "800", color: colors.text },
    bankRowUrl: { fontSize: 12, color: hintText, fontWeight: "600" },
    bankRowActions: { gap: 8, alignItems: "flex-end" },
    useForHomeBtn: {
      ...secondaryBtn,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    useForHomeBtnText: { fontSize: 12, fontWeight: "800", color: colors.text },
    removeBankBtn: {
      ...secondaryBtn,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    removeBankBtnText: { fontSize: 13, fontWeight: "700", color: colors.text },
    input: {
      ...fieldInput,
      marginBottom: 12,
    },
    addBankBtn: {
      ...secondaryBtn,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 8,
    },
    addBankBtnText: { color: colors.text, fontSize: 15, fontWeight: "800" },
    back: { marginTop: 20, paddingVertical: 10 },
    backText: { color: colors.text, fontSize: 16, fontWeight: "700", opacity: 0.9 },
    pressed: { opacity: 0.88 },
  });
}
