import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { pickImageFromLibrary } from "@/lib/companyLogoPicker";
import {
  loadInvoiceCustomization,
  saveInvoiceCustomization,
} from "@/lib/invoices/invoiceCustomizationStorage";
import { DEFAULT_INVOICE_PAYMENT_TERMS, type InvoiceCustomization } from "@/lib/invoices/types";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";

const ACCENT_PRESETS = ["#2563eb", "#0ea5e9", "#1d4ed8", "#0369a1", "#eab308"];

export default function InvoiceCustomizationScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [custom, setCustom] = useState<InvoiceCustomization | null>(null);
  const [savedHint, setSavedHint] = useState("");

  const reload = useCallback(() => {
    void loadInvoiceCustomization().then(setCustom);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const patch = (p: Partial<InvoiceCustomization>) => {
    setCustom((prev) => (prev ? { ...prev, ...p } : prev));
  };

  const save = async () => {
    if (!custom) return;
    await saveInvoiceCustomization(custom);
    setSavedHint("Saved.");
    setTimeout(() => setSavedHint(""), 2000);
  };

  const pickLogo = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) patch({ logoUri: uri });
  };

  if (!custom) {
    return (
      <StickyScrollScreen title="Invoice customization" backHref={settingsBackHref("invoice-customization")} backLabel={settingsBackLabel("invoice-customization")}>
        <Text style={styles.body}>Loading…</Text>
      </StickyScrollScreen>
    );
  }

  return (
    <StickyScrollScreen
      title="Invoice customization"
      subtitle="Company branding, defaults, and invoice numbering for Job Folder invoices."
      backHref={settingsBackHref("invoice-customization")}
      backLabel={settingsBackLabel("invoice-customization")}
      contentContainerStyle={styles.content}
    >
        <Text style={styles.section}>Company on invoice</Text>
        <Label colors={colors}>Company name</Label>
        <VoiceTextInput
          value={custom.companyName}
          onChangeText={(v) => patch({ companyName: v })}
          style={styles.input}
          placeholderTextColor={placeholderTextColor(colors)}
        />
        <Label colors={colors}>Phone</Label>
        <VoiceTextInput
          value={custom.phone}
          onChangeText={(v) => patch({ phone: v })}
          style={styles.input}
          keyboardType="phone-pad"
          placeholderTextColor={placeholderTextColor(colors)}
        />
        <Label colors={colors}>Email</Label>
        <VoiceTextInput
          value={custom.email}
          onChangeText={(v) => patch({ email: v })}
          style={styles.input}
          autoCapitalize="none"
          placeholderTextColor={placeholderTextColor(colors)}
        />
        <Label colors={colors}>Address</Label>
        <VoiceTextInput
          value={custom.address}
          onChangeText={(v) => patch({ address: v })}
          style={[styles.input, styles.textArea]}
          multiline
          placeholderTextColor={placeholderTextColor(colors)}
        />
        <Label colors={colors}>License #</Label>
        <VoiceTextInput
          value={custom.licenseNumber}
          onChangeText={(v) => patch({ licenseNumber: v })}
          style={styles.input}
          placeholderTextColor={placeholderTextColor(colors)}
        />

        <Text style={styles.section}>Logo</Text>
        {custom.logoUri ? (
          <Image source={{ uri: custom.logoUri }} style={styles.logo} resizeMode="contain" />
        ) : null}
        <Pressable style={styles.chip} onPress={() => void pickLogo()}>
          <Text style={styles.chipText}>Choose logo image</Text>
        </Pressable>
        <ToggleRow
          label="Show logo on PDF"
          value={custom.showLogo}
          onValueChange={(v) => patch({ showLogo: v })}
          colors={colors}
        />
        <ToggleRow
          label="Show license on PDF"
          value={custom.showLicense}
          onValueChange={(v) => patch({ showLicense: v })}
          colors={colors}
        />

        <Text style={styles.section}>Theme</Text>
        <View style={styles.colorRow}>
          {ACCENT_PRESETS.map((hex) => (
            <Pressable
              key={hex}
              onPress={() => patch({ accentColor: hex })}
              style={[
                styles.swatch,
                { backgroundColor: hex },
                custom.accentColor === hex && styles.swatchOn,
              ]}
            />
          ))}
        </View>
        <View style={styles.fontRow}>
          <Pressable
            style={[styles.chip, custom.fontFamily === "system" && styles.chipOn]}
            onPress={() => patch({ fontFamily: "system" })}
          >
            <Text style={styles.chipText}>System font</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, custom.fontFamily === "bebas" && styles.chipOn]}
            onPress={() => patch({ fontFamily: "bebas" })}
          >
            <Text style={styles.chipText}>Bebas (rugged)</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Defaults</Text>
        <Label colors={colors}>Numbering prefix (e.g. IES-)</Label>
        <VoiceTextInput
          value={custom.numberingPrefix}
          onChangeText={(v) => patch({ numberingPrefix: v })}
          style={styles.input}
          placeholder="IES-"
          placeholderTextColor={placeholderTextColor(colors)}
        />
        <Label colors={colors}>Default tax %</Label>
        <VoiceTextInput
          value={custom.defaultTaxPercent}
          onChangeText={(v) => patch({ defaultTaxPercent: v })}
          style={styles.input}
          keyboardType="decimal-pad"
          placeholderTextColor={placeholderTextColor(colors)}
        />
        <ToggleRow
          label="Show tax line on PDF"
          value={custom.showTaxLine}
          onValueChange={(v) => patch({ showTaxLine: v })}
          colors={colors}
        />
        <Label colors={colors}>Default payment terms</Label>
        <VoiceTextInput
          value={custom.defaultPaymentTerms}
          onChangeText={(v) => patch({ defaultPaymentTerms: v })}
          style={[styles.input, styles.textArea]}
          multiline
          placeholder={DEFAULT_INVOICE_PAYMENT_TERMS}
          placeholderTextColor={placeholderTextColor(colors)}
        />
        <Label colors={colors}>Default notes</Label>
        <VoiceTextInput
          value={custom.defaultNotes}
          onChangeText={(v) => patch({ defaultNotes: v })}
          style={[styles.input, styles.textArea]}
          multiline
          placeholderTextColor={placeholderTextColor(colors)}
        />
        <Label colors={colors}>Footer</Label>
        <VoiceTextInput
          value={custom.footerText}
          onChangeText={(v) => patch({ footerText: v })}
          style={styles.input}
          placeholderTextColor={placeholderTextColor(colors)}
        />

        <Pressable style={styles.saveBtn} onPress={() => void save()}>
          <Text style={styles.saveBtnText}>Save customization</Text>
        </Pressable>
        {savedHint ? <Text style={styles.savedHint}>{savedHint}</Text> : null}
    </StickyScrollScreen>
  );
}

function Label({ children, colors }: { children: string; colors: ColorScheme }) {
  return <Text style={{ fontWeight: "700", color: colors.text, marginBottom: 6, marginTop: 8 }}>{children}</Text>;
}

function ToggleRow({
  label,
  value,
  onValueChange,
  colors,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: ColorScheme;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 10 }}>
      <Text style={{ color: colors.text, fontWeight: "600" }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.accent }} />
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    content: { paddingBottom: 32 },
    body: { color: colors.text },
    section: { fontSize: 16, fontWeight: "800", color: colors.accent, marginTop: 16, marginBottom: 8 },
    input: { ...inputStyle(colors), marginBottom: 4 },
    textArea: { minHeight: 88, textAlignVertical: "top" },
    logo: { width: "100%", height: 80, marginBottom: 8 },
    chip: {
      alignSelf: "flex-start",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.accent,
      marginBottom: 8,
    },
    chipOn: { backgroundColor: colors.accent },
    chipText: { color: colors.accent, fontWeight: "700" },
    colorRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    swatch: { width: 36, height: 36, borderRadius: 8 },
    swatchOn: { borderWidth: 3, borderColor: colors.text },
    fontRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    saveBtn: {
      marginTop: 20,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    saveBtnText: { color: colors.background, fontWeight: "800", fontSize: 16 },
    savedHint: { textAlign: "center", marginTop: 8, color: colors.accent, fontWeight: "700" },
  });
}
