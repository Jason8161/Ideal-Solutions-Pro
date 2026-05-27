import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  accentPanelStyle,
  getAccentTints,
  inputStyle,
  navCardStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import {
  ACCOUNTING_APP_PRESETS,
  displayAccountingAppSelection,
  loadAccountingAppSelection,
  saveAccountingAppById,
  type AccountingAppId,
  type AccountingAppPreset,
  type AccountingAppSelection,
} from "@/lib/accountingAppStorage";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

function presetMatchesSearch(p: AccountingAppPreset, q: string): boolean {
  if (!q) return true;
  const name = p.name.toLowerCase();
  const idHaystack = p.id.replace(/-/g, " ").toLowerCase();
  if (name.includes(q) || idHaystack.includes(q)) return true;
  const keywords = p.keywords ?? [];
  return keywords.some((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
}

type Props = {
  fromHomePicker: boolean;
};

export function AccountingAppPickerSection({ fromHomePicker }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const searchRef = useRef<TextInput>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selection, setSelection] = useState<AccountingAppSelection | null>(null);
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    let cancelled = false;
    void loadAccountingAppSelection().then((stored) => {
      if (cancelled) return;
      setSelection(stored);
      setCustomName(stored?.customAppName ?? "");
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fromHomePicker || !hydrated) return;
    const t = requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [fromHomePicker, hydrated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACCOUNTING_APP_PRESETS;
    return ACCOUNTING_APP_PRESETS.filter((p) => presetMatchesSearch(p, q));
  }, [query]);

  const selectApp = useCallback(
    async (id: AccountingAppId) => {
      const next = await saveAccountingAppById(id, id === "other" ? customName : undefined);
      setSelection(next);
      if (id === "other") {
        setCustomName(next.customAppName ?? "");
      }
    },
    [customName],
  );

  const saveCustomName = useCallback(async () => {
    if (selection?.selectedAccountingAppId !== "other") return;
    const next = await saveAccountingAppById("other", customName);
    setSelection(next);
  }, [customName, selection?.selectedAccountingAppId]);

  const saveSearchAsCustomApp = useCallback(async () => {
    const name = query.trim();
    if (!name) return;
    const next = await saveAccountingAppById("other", name);
    setSelection(next);
    setCustomName(name);
    setQuery("");
  }, [query]);

  const openWebSearchForAccountingApps = useCallback(() => {
    const q = encodeURIComponent(`${query.trim() || "online"} accounting software app`);
    void Linking.openURL(`https://www.google.com/search?q=${q}`);
  }, [query]);

  if (!hydrated) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Loading accounting preferences…</Text>
      </View>
    );
  }

  const currentLabel = displayAccountingAppSelection(selection);

  return (
    <View>
      <Text style={styles.body}>
        {fromHomePicker
          ? "Search for the online accounting app you use (for example QuickBooks Online or Xero), tap it to select it, or save any name that is not in the list. Your choice is saved as soon as you tap it."
          : "Choose the bookkeeping software you use. Your choice is saved as soon as you tap it. We can use this later when accounting connections are available."}
      </Text>

      {selection && selection.selectedAccountingAppId !== "none" ? (
        <View style={styles.currentBox}>
          <Text style={styles.currentLabel}>Current selection</Text>
          <Text style={styles.currentValue}>{currentLabel}</Text>
        </View>
      ) : null}

      <Text style={styles.section}>Search apps</Text>
      <VoiceTextInput
        ref={searchRef}
        value={query}
        onChangeText={setQuery}
        placeholder="Search: QuickBooks, Xero, NetSuite…"
        placeholderTextColor={placeholderTextColor(colors)}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        autoFocus={fromHomePicker}
      />

      <Pressable
        onPress={() => void openWebSearchForAccountingApps()}
        style={({ pressed }) => [styles.webSearchBtn, pressed && styles.pressed]}
      >
        <Text style={styles.webSearchText}>Search the web for more accounting apps</Text>
      </Pressable>

      <Text style={styles.section}>Accounting software</Text>
      <View style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>No apps in our list match that search.</Text>
            {query.trim() ? (
              <Pressable
                onPress={() => void saveSearchAsCustomApp()}
                style={({ pressed }) => [styles.useCustomBtn, pressed && styles.pressed]}
              >
                <Text style={styles.useCustomBtnText}>Use &quot;{query.trim()}&quot; as my app</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          filtered.map((app) => {
            const selected = selection?.selectedAccountingAppId === app.id;
            return (
              <Pressable
                key={app.id}
                onPress={() => void selectApp(app.id)}
                style={({ pressed }) => [
                  styles.row,
                  selected && styles.rowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowTextCol}>
                  <Text style={styles.rowTitle}>{app.name}</Text>
                  {app.id === "other" ? (
                    <Text style={styles.rowHint}>Type your app name below</Text>
                  ) : app.id === "none" ? (
                    <Text style={styles.rowHint}>I don&apos;t use accounting software yet</Text>
                  ) : null}
                </View>
                {selected ? <Text style={styles.checkmark}>✓</Text> : null}
              </Pressable>
            );
          })
        )}
      </View>

      {selection?.selectedAccountingAppId === "other" ? (
        <View style={styles.customBlock}>
          <Text style={styles.section}>Custom app name</Text>
          <VoiceTextInput
            value={customName}
            onChangeText={setCustomName}
            onBlur={() => void saveCustomName()}
            placeholder="e.g. NetSuite, MYOB"
            placeholderTextColor={placeholderTextColor(colors)}
            style={styles.searchInput}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => void saveCustomName()}
          />
          <Pressable
            onPress={() => void saveCustomName()}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
          >
            <Text style={styles.saveBtnText}>Save custom name</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const cardBase = navCardStyle(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondaryBtn = secondaryButtonStyle(colors, tints);
  const fieldInput = inputStyle(colors, tints);
  const hintText = hexToRgba(colors.text, 0.75);

  return StyleSheet.create({
    placeholder: { paddingVertical: 24, alignItems: "center" },
    placeholderText: { color: hintText, fontWeight: "600" },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      marginBottom: 16,
    },
    currentBox: {
      ...cardBase,
      padding: 14,
      marginBottom: 16,
    },
    currentLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    currentValue: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    section: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
      marginTop: 4,
    },
    searchInput: {
      ...fieldInput,
      marginBottom: 16,
    },
    list: { gap: 8, marginBottom: 8 },
    row: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    rowSelected: {
      backgroundColor: tints.accentTint,
    },
    rowTextCol: { flex: 1, minWidth: 0, gap: 4 },
    rowTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    rowHint: {
      fontSize: 12,
      color: hintText,
      fontWeight: "600",
    },
    checkmark: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    webSearchBtn: {
      ...secondaryBtn,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    webSearchText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    emptyBlock: { gap: 12, paddingVertical: 8 },
    emptyText: {
      fontSize: 14,
      color: hintText,
      fontWeight: "600",
      textAlign: "center",
      paddingVertical: 4,
    },
    useCustomBtn: {
      ...secondaryBtn,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    useCustomBtnText: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    customBlock: { marginTop: 8, marginBottom: 8 },
    saveBtn: {
      ...secondaryBtn,
      marginTop: 10,
      paddingVertical: 12,
    },
    saveBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    pressed: { opacity: 0.88 },
  });
}
