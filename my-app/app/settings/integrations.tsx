import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { MiscIntegrationsSettings } from "@/components/integrations/MiscIntegrationsSettings";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { SupplierCatalogSettings } from "@/components/supplierHub/SupplierCatalogSettings";
import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import {
  accentPanelStyle,
  getAccentTints,
  inputStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import {
  clearSupplierAccount,
  loadSupplierAccount,
  saveSupplierAccount,
} from "@/lib/supplierIntegration/accountSecureStorage";
import {
  loadSupplierFavorites,
  loadSupplierIntegrationPrefs,
  saveSupplierIntegrationPrefs,
} from "@/lib/supplierIntegration/preferencesStorage";
import { displayNameForSupplierId } from "@/lib/supplierIntegration/supplierRegistry";
import type { SupplierIntegrationPrefs } from "@/lib/supplierIntegration/types";
import { useDeferredFocusReload } from "@/lib/useDeferredFocusReload";

export default function SupportedIntegrationsSettingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [prefs, setPrefs] = useState<SupplierIntegrationPrefs | null>(null);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [accountSupplierId, setAccountSupplierId] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [taxExemptId, setTaxExemptId] = useState("");
  const [preferredBranch, setPreferredBranch] = useState("");

  const reloadPrefs = useCallback(async () => {
    const [p, favorites] = await Promise.all([
      loadSupplierIntegrationPrefs(),
      loadSupplierFavorites(),
    ]);
    setPrefs(p);
    setSupplierIds(favorites.favoriteIds.slice(0, 12));
  }, []);

  useDeferredFocusReload(reloadPrefs);

  const onFavoritesChanged = useCallback(() => {
    void loadSupplierFavorites().then((f) => setSupplierIds(f.favoriteIds.slice(0, 12)));
  }, []);

  const updatePref = useCallback(
    <K extends keyof SupplierIntegrationPrefs>(key: K, value: SupplierIntegrationPrefs[K]) => {
      setPrefs((prev) => {
        if (!prev) return prev;
        const next = { ...prev, [key]: value };
        void saveSupplierIntegrationPrefs(next);
        return next;
      });
    },
    [],
  );

  const loadAccountFor = useCallback(async (id: string) => {
    setAccountSupplierId(id);
    const acct = await loadSupplierAccount(id);
    setAccountNumber(acct?.accountNumber ?? "");
    setBranchCode(acct?.branchCode ?? "");
    setTaxExemptId(acct?.taxExemptId ?? "");
    setPreferredBranch(acct?.preferredBranchName ?? "");
  }, []);

  const saveAccount = useCallback(async () => {
    if (!accountSupplierId) return;
    await saveSupplierAccount(accountSupplierId, {
      accountNumber,
      branchCode,
      taxExemptId,
      preferredBranchName: preferredBranch,
    });
    setAccountSupplierId(null);
  }, [accountNumber, accountSupplierId, branchCode, preferredBranch, taxExemptId]);

  if (!prefs) {
    return (
      <StickyScrollScreen
        title="Supported Integrations"
        subtitle="Loading…"
        backHref={settingsBackHref("integrations")}
        backLabel={settingsBackLabel("integrations")}
      />
    );
  }

  return (
    <StickyScrollScreen
      title="Supported Integrations"
      subtitle="Curated suppliers and app shortcuts. Enable toggles and favorites — no scanning your phone for apps."
      backHref={settingsBackHref("integrations")}
      backLabel={settingsBackLabel("integrations")}
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <SupplierCatalogSettings
        onFavoritesChanged={onFavoritesChanged}
        footer={
          <>
            <Text style={[styles.section, styles.sectionSpaced]}>Launch behavior</Text>
            <ToggleRow
              label="Enable supplier apps"
              hint="When off, always open the supplier website."
              value={prefs.enableSupplierApps}
              onValueChange={(v) => updatePref("enableSupplierApps", v)}
              styles={styles}
            />
            <ToggleRow
              label="Auto-open installed apps"
              hint="Try the native app before showing the website fallback."
              value={prefs.autoOpenInstalled}
              onValueChange={(v) => updatePref("autoOpenInstalled", v)}
              styles={styles}
            />
            <ToggleRow
              label="Ask before launching"
              hint="Confirm each time before opening a supplier."
              value={prefs.askBeforeLaunch}
              onValueChange={(v) => updatePref("askBeforeLaunch", v)}
              styles={styles}
            />
            <ToggleRow
              label="Website fallback"
              hint="Offer download or website when the app is not installed."
              value={prefs.websiteFallback}
              onValueChange={(v) => updatePref("websiteFallback", v)}
              styles={styles}
            />

            <Text style={[styles.section, styles.sectionSpaced]}>Supplier accounts</Text>
            <Text style={styles.hint}>Optional — stored with expo-secure-store on this device.</Text>
            <View style={styles.list}>
              {supplierIds.length === 0 ? (
                <Text style={styles.hint}>Star a supplier above to manage account details here.</Text>
              ) : (
                supplierIds.map((id) => (
                  <Pressable
                    key={id}
                    onPress={() => void loadAccountFor(id)}
                    style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}
                  >
                    <Text style={styles.accountRowTitle}>{displayNameForSupplierId(id)}</Text>
                    <Text style={styles.accountRowAction}>
                      {accountSupplierId === id ? "Editing" : "Account"}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            {accountSupplierId ? (
              <View style={styles.accountForm}>
                <Text style={styles.accountFormTitle}>{displayNameForSupplierId(accountSupplierId)}</Text>
                <Field
                  label="Account #"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  styles={styles}
                  colors={colors}
                />
                <Field
                  label="Branch / store #"
                  value={branchCode}
                  onChangeText={setBranchCode}
                  styles={styles}
                  colors={colors}
                />
                <Field
                  label="Tax exempt ID"
                  value={taxExemptId}
                  onChangeText={setTaxExemptId}
                  styles={styles}
                  colors={colors}
                />
                <Field
                  label="Preferred branch name"
                  value={preferredBranch}
                  onChangeText={setPreferredBranch}
                  styles={styles}
                  colors={colors}
                />
                <View style={styles.accountActions}>
                  <Pressable
                    onPress={() => void saveAccount()}
                    style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.saveBtnText}>Save</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void clearSupplierAccount(accountSupplierId).then(() => setAccountSupplierId(null));
                    }}
                    style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() => router.push("/settings/suppliers" as Href)}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            >
              <Text style={styles.linkBtnText}>My supply houses</Text>
            </Pressable>

            <MiscIntegrationsSettings />
          </>
        }
      />
    </StickyScrollScreen>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  styles,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  styles,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ColorScheme;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <VoiceTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={placeholderTextColor(colors)}
        style={styles.fieldInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondary = secondaryButtonStyle(colors, tints);
  const themedInput = inputStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40, gap: 4 },
    section: {
      marginTop: 12,
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    sectionSpaced: { marginTop: 20 },
    hint: { fontSize: 13, lineHeight: 18, color: tints.mutedText, marginBottom: 8 },
    list: { gap: 10 },
    toggleRow: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginTop: 8,
    },
    toggleText: { flex: 1, gap: 4 },
    toggleLabel: { fontSize: 15, fontWeight: "800", color: colors.text },
    toggleHint: { fontSize: 12, lineHeight: 16, color: tints.mutedText },
    accountRow: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: tints.accentTintActive,
    },
    accountRowTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
    accountRowAction: { fontSize: 13, fontWeight: "800", color: colors.text },
    accountForm: { ...panel, padding: 14, marginTop: 12, gap: 10 },
    accountFormTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    field: { gap: 6 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: tints.mutedText,
      textTransform: "uppercase",
    },
    fieldInput: {
      ...themedInput,
      color: colors.text,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    accountActions: { flexDirection: "row", gap: 10, marginTop: 4 },
    saveBtn: {
      ...secondary,
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: tints.accentTintActive,
    },
    saveBtnText: { fontSize: 15, fontWeight: "800", color: colors.text },
    clearBtn: { ...secondary, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
    clearBtnText: { fontSize: 14, fontWeight: "700", color: colors.text },
    linkBtn: {
      marginTop: 16,
      ...secondary,
      paddingVertical: 12,
      alignItems: "center",
    },
    linkBtnText: { fontSize: 14, fontWeight: "700", color: colors.text },
    pressed: { opacity: 0.88 },
  });
}
