import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { HOME_FALLBACK_HREF, StickyPageHeader, useScStyles } from "@/components/serviceCalls/screenChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import {
  accentPanelStyle,
  getAccentTints,
  inputStyle,
  onAccentTextColor,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { SUPPLY_HOUSE_SUGGESTIONS, type SupplyHousePresetId, type SupplyHouseSuggestion } from "@/lib/supplierPresets";
import { getDistributorPortalUrl, setDistributorPortalUrl } from "@/lib/storage";

/** Public https entry pages — user can navigate to sign-in or replace URL with the exact link from their rep. */
const SUGGESTED_PORTAL_ENTRY_BY_PRESET: Record<SupplyHousePresetId, string> = {
  homedepot: "https://www.homedepot.com/",
  lowes: "https://www.lowes.com/",
  grainger: "https://www.grainger.com/",
  graybar: "https://www.graybar.com/",
  rexel: "https://www.rexelusa.com/",
  johnstone: "https://www.johnstonesupply.com/",
  platt: "https://www.platt.com/",
  wesco: "https://www.wesco.com/",
  cityelectric: "https://www.cityelectricsupply.com/",
  ferguson: "https://www.ferguson.com/",
  hajoca: "https://www.hajoca.com/",
  abc_supply: "https://www.abcsupply.com/",
  beacon: "https://www.becn.com/",
  ced: "https://www.cedltd.com/",
  gexpro: "https://www.gexpro.com/",
  winsupply: "https://www.winsupplyinc.com/",
  baker: "https://www.bakerdist.com/",
  standard_electric: "https://www.standardelectricsupply.com/",
  fastenal: "https://www.fastenal.com/",
  elliott_electric: "https://www.elliottelectric.com/",
  border_states: "https://www.borderstates.com/",
};

function googleSupplierLoginSearchUrl(supplierLabel: string): string {
  const q = `${supplierLabel} distributor login`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export default function DistributorScreen() {
  const { colors } = useAppTheme();
  const scStyles = useScStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [portalUrl, setPortalUrlState] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [sessionKey, setSessionKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return [...SUPPLY_HOUSE_SUGGESTIONS];
    return SUPPLY_HOUSE_SUGGESTIONS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.hint.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    );
  }, [supplierSearch]);

  const reloadPortalSettings = useCallback(async () => {
    const saved = await getDistributorPortalUrl();
    setPortalUrlState(saved);
    setDraftUrl(saved);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadPortalSettings();
    }, [reloadPortalSettings]),
  );

  const onSave = async () => {
    setSaving(true);
    try {
      await setDistributorPortalUrl(draftUrl);
      setPortalUrlState(draftUrl.trim());
      setSessionKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  };

  const applyPortalUrlAndReload = useCallback(async (next: string) => {
    const trimmed = next.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      Alert.alert("Invalid URL", "The portal address must start with https://");
      return;
    }
    setSaving(true);
    try {
      await setDistributorPortalUrl(trimmed);
      setPortalUrlState(trimmed);
      setDraftUrl(trimmed);
      setSessionKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  }, []);

  const promptSupplierPortal = useCallback(
    (s: SupplyHouseSuggestion) => {
      const suggested = SUGGESTED_PORTAL_ENTRY_BY_PRESET[s.id];
      Alert.alert(
        `Load ${s.label} in the portal?`,
        `Save this website as your portal address and open it here?\n\n${suggested}\n\nYou can edit the address afterward if your sign-in page is different.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Search web for login",
            onPress: () => void Linking.openURL(googleSupplierLoginSearchUrl(s.label)),
          },
          {
            text: "Load in portal",
            onPress: () => void applyPortalUrlAndReload(suggested),
          },
        ],
      );
    },
    [applyPortalUrlAndReload],
  );

  const onEndSession = () => {
    setSessionKey((k) => k + 1);
  };

  const normalized = portalUrl.trim();
  const canShowWeb = normalized.length > 0 && /^https?:\/\//i.test(normalized);

  const [activeUri, setActiveUri] = useState("");

  useEffect(() => {
    if (!canShowWeb) {
      setActiveUri("");
      return;
    }
    setActiveUri(normalized);
  }, [canShowWeb, normalized, sessionKey]);

  const onOpenWindow = useCallback((e: { nativeEvent: { targetUrl: string } }) => {
    const url = e.nativeEvent.targetUrl?.trim() ?? "";
    if (!/^https?:\/\//i.test(url)) return;
    setActiveUri(url);
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={scStyles.screen}>
        <StickyPageHeader
          title="Supplier login"
          subtitle="Save your distributor https sign-in page and open it in your browser."
          fallbackHref={HOME_FALLBACK_HREF}
        />
        <ScrollView style={scStyles.scrollBody} contentContainerStyle={[styles.pad, styles.padBottom]}>
        <View style={[styles.centerBlock, wide && styles.centerWide]}>
          <Text style={styles.body}>
            Save the <Text style={styles.bodyEm}>https</Text> address your distributor uses for sign-in (often ends in
            /login or /signin). On web, the embedded portal is not available — open the same URL in your normal browser
            and log in there; your password is never stored in Ideal Solutions Pro.
          </Text>
          <Text style={styles.searchSectionLabel}>Search for a supplier</Text>
          <VoiceTextInput
            value={supplierSearch}
            onChangeText={setSupplierSearch}
            placeholder="Type a supplier name…"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholderTextColor={placeholderTextColor(colors)}
            accessibilityLabel="Search suppliers by name"
          />
          <View style={styles.suggestionList}>
            {filteredSuppliers.length === 0 ? (
              <Text style={styles.noSupplierMatches}>No suppliers match that text. Clear the search to see the full list.</Text>
            ) : (
              filteredSuppliers.map((s) => (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionRowPressed]}
                  onPress={() => promptSupplierPortal(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose how to open ${s.label}`}
                >
                  <Text style={styles.suggestionTitle}>{s.label}</Text>
                  <Text style={styles.suggestionHint}>{s.hint}</Text>
                  <Text style={styles.suggestionAction}>Tap to load in portal or search the web →</Text>
                </Pressable>
              ))
            )}
          </View>
          <Text style={styles.searchSectionLabel}>Your portal address</Text>
          <VoiceTextInput
            value={draftUrl}
            onChangeText={setDraftUrl}
            placeholder="https://your-distributor-portal.example/login"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholderTextColor={placeholderTextColor(colors)}
          />
          <Pressable onPress={() => void onSave()} style={styles.primary} disabled={saving}>
            <Text style={styles.primaryText}>{saving ? "Saving…" : "Save portal URL"}</Text>
          </Pressable>
          {canShowWeb ? (
            <Pressable onPress={() => void Linking.openURL(normalized)} style={styles.secondary}>
              <Text style={styles.secondaryText}>Open in browser</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      </View>
    );
  }

  return (
    <View style={scStyles.screen}>
      <StickyPageHeader
        title="Supplier login"
        subtitle="Open your distributor portal — credentials stay on their site."
        fallbackHref={HOME_FALLBACK_HREF}
      />
      <View style={styles.flex}>
      <View style={[styles.shell, wide && styles.shellWide]}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>Supplier portal URL</Text>
          <Text style={styles.toolbarSub}>
            Paste the exact sign-in page your supply house gave you. You will enter your real username and password on
            their site only — this app does not save them.
          </Text>
          <Text style={styles.toolbarSearchLabel}>Search for a supplier</Text>
          <VoiceTextInput
            value={supplierSearch}
            onChangeText={setSupplierSearch}
            placeholder="Type a supplier name…"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.toolbarInput}
            placeholderTextColor={placeholderTextColor(colors)}
            accessibilityLabel="Search suppliers by name"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionStrip}
            contentContainerStyle={styles.suggestionStripContent}
          >
            {filteredSuppliers.length === 0 ? (
              <Text style={styles.noSupplierMatchesInline}>No matches</Text>
            ) : (
              filteredSuppliers.map((s) => (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [styles.suggestionChip, pressed && styles.suggestionChipPressed]}
                  onPress={() => promptSupplierPortal(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose how to open ${s.label}`}
                >
                  <Text style={styles.suggestionChipTitle}>{s.label}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
          <Text style={styles.toolbarUrlLabel}>Portal address</Text>
          <VoiceTextInput
            value={draftUrl}
            onChangeText={setDraftUrl}
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.toolbarInput}
            placeholderTextColor={placeholderTextColor(colors)}
          />
          <View style={styles.toolbarRow}>
            <Pressable onPress={() => void onSave()} style={styles.primarySm} disabled={saving}>
              <Text style={styles.primaryText}>{saving ? "Saving…" : "Save"}</Text>
            </Pressable>
            <Pressable onPress={onEndSession} style={styles.secondarySm}>
              <Text style={styles.secondaryText}>End session</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            End session reloads this view. For a full logout, use your distributor&apos;s sign-out on their site.
            Pop-up and new-tab sign-in flows are opened inside this browser when possible.{"\n\n"}
            Logging in here does not import Home Depot, Lowe&apos;s, or other prices into Materials — you browse on their
            site only. For live big-box prices, use Materials → Live prices on retailer sites.
          </Text>
        </View>

        {!canShowWeb ? (
          <View style={styles.center}>
            <Text style={styles.body}>
              Add an <Text style={styles.bodyEm}>https://</Text> portal URL above, then save. The next screen is your
              supplier&apos;s real login — not a copy or a fake form.
            </Text>
          </View>
        ) : (
          <WebView
            key={sessionKey}
            source={{ uri: activeUri || normalized }}
            startInLoadingState
            setSupportMultipleWindows
            onOpenWindow={onOpenWindow}
            javaScriptEnabled
            domStorageEnabled
            allowsBackForwardNavigationGestures
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            )}
            style={styles.web}
          />
        )}
      </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondaryButtonBase = secondaryButtonStyle(colors, tints);
  const fieldInput = inputStyle(colors, tints);

  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: "transparent" },
  pad: { padding: 16 },
  padBottom: { paddingBottom: 24 },
  shell: {
    flex: 1,
  },
  shellWide: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 1100,
  },
  web: { flex: 1, backgroundColor: "#ffffff" },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  toolbar: {
    ...panel,
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  toolbarTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    opacity: 0.85,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  toolbarSub: {
    fontSize: 12,
    lineHeight: 17,
    color: tints.mutedText,
  },
  toolbarSearchLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    opacity: 0.85,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  toolbarUrlLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    opacity: 0.85,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
  },
  suggestionStrip: {
    maxHeight: 44,
    marginTop: 2,
    marginBottom: 2,
  },
  suggestionStripContent: {
    gap: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  suggestionChip: {
    ...secondaryButtonBase,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    maxWidth: 200,
  },
  suggestionChipPressed: {
    opacity: 0.88,
  },
  suggestionChipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  toolbarInput: {
    ...fieldInput,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
  },
  toolbarRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  primarySm: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  secondarySm: {
    ...secondaryButtonBase,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    color: tints.mutedText,
  },
  center: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  centerBlock: {
    gap: 12,
    paddingVertical: 24,
  },
  centerWide: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 980,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: tints.mutedText,
  },
  bodyEm: {
    fontWeight: "800",
    color: colors.text,
  },
  input: {
    ...fieldInput,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondary: {
    ...secondaryButtonBase,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryText: {
    color: onAccentTextColor(colors),
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  searchSectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },
  suggestionList: {
    gap: 10,
  },
  suggestionRow: {
    ...panel,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  suggestionRowPressed: {
    opacity: 0.9,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  suggestionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: tints.mutedText,
  },
  suggestionAction: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
    marginTop: 4,
  },
  noSupplierMatches: {
    fontSize: 14,
    lineHeight: 20,
    color: "#94a8d6",
    paddingVertical: 8,
  },
  noSupplierMatchesInline: {
    fontSize: 13,
    color: "#94a8d6",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  });
}
