import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import type { ExistingContact } from "expo-contacts";
import {
  emptySimpleCustomerContact,
  mapContactToSimpleFields,
  pickContactFromDevice,
  type SimpleCustomerContact,
} from "@/lib/customerContactPick";
import {
  getAccentTints,
  inputStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";

export type CustomerContactPickerProps = {
  value: SimpleCustomerContact;
  onChange: (next: SimpleCustomerContact) => void;
  /** When set, only these fields are shown in the add-new modal. */
  fields?: (keyof SimpleCustomerContact)[];
  /** Optional hook when a device contact is picked (e.g. fill address fields). */
  onContactPicked?: (contact: ExistingContact) => void;
  /** When true, device pick only calls onContactPicked (no automatic onChange). */
  deferAutoFillOnDevicePick?: boolean;
};

export function CustomerContactPicker({
  value,
  onChange,
  fields = ["name", "phone", "email"],
  onContactPicked,
  deferAutoFillOnDevicePick = false,
}: CustomerContactPickerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tints = useMemo(() => getAccentTints(colors), [colors]);
  const themedInput = useMemo(() => inputStyle(colors, tints), [colors, tints]);
  const placeholder = useMemo(() => placeholderTextColor(colors), [colors]);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<SimpleCustomerContact>(emptySimpleCustomerContact());

  const chooseFromContacts = useCallback(async () => {
    setBusy(true);
    try {
      const picked = await pickContactFromDevice();
      if (!picked) return;
      if (!deferAutoFillOnDevicePick) {
        const mapped = mapContactToSimpleFields(picked);
        onChange({
          name: mapped.name || value.name,
          phone: mapped.phone || value.phone,
          email: mapped.email || value.email,
        });
      }
      onContactPicked?.(picked);
    } catch (e) {
      Alert.alert("Contacts", e instanceof Error ? e.message : "Could not open the contact picker.");
    } finally {
      setBusy(false);
    }
  }, [deferAutoFillOnDevicePick, onChange, onContactPicked, value.email, value.name, value.phone]);

  const openAddNew = useCallback(() => {
    setDraft({ ...value });
    setAddOpen(true);
  }, [value]);

  const applyAddNew = useCallback(() => {
    onChange({
      name: draft.name.trim() || value.name,
      phone: draft.phone.trim() || value.phone,
      email: draft.email.trim() || value.email,
    });
    setAddOpen(false);
  }, [draft.email, draft.name, draft.phone, onChange, value.email, value.name, value.phone]);

  return (
    <>
      <View style={styles.row}>
        <Pressable
          onPress={() => void chooseFromContacts()}
          disabled={busy}
          style={({ pressed }) => [
            styles.primaryBtn,
            secondaryButtonStyle(colors, tints),
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Choose from contacts"
        >
          <Text style={[styles.primaryBtnText, { color: colors.text }]}>
            {busy ? "Opening…" : "Choose from contacts"}
          </Text>
        </Pressable>
        <Pressable
          onPress={openAddNew}
          disabled={busy}
          style={({ pressed }) => [styles.secondaryBtn, secondaryButtonStyle(colors, tints), pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add new contact"
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Add new contact</Text>
        </Pressable>
      </View>

      {Platform.OS === "web" ? (
        <Text style={styles.webHint}>
          Contact picker runs on iOS or Android. On web, use Add new contact or type fields below.
        </Text>
      ) : null}

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>New contact</Text>
            {fields.includes("name") ? (
              <>
                <Text style={styles.label}>Name</Text>
                <VoiceTextInput
                  value={draft.name}
                  onChangeText={(name) => setDraft((prev) => ({ ...prev, name }))}
                  placeholder="Customer or company"
                  placeholderTextColor={placeholder}
                  style={themedInput}
                  autoCapitalize="words"
                />
              </>
            ) : null}
            {fields.includes("phone") ? (
              <>
                <Text style={styles.label}>Phone</Text>
                <VoiceTextInput
                  value={draft.phone}
                  onChangeText={(phone) => setDraft((prev) => ({ ...prev, phone }))}
                  placeholder="Mobile or main line"
                  placeholderTextColor={placeholder}
                  style={themedInput}
                  keyboardType="phone-pad"
                />
              </>
            ) : null}
            {fields.includes("email") ? (
              <>
                <Text style={styles.label}>Email</Text>
                <VoiceTextInput
                  value={draft.email}
                  onChangeText={(email) => setDraft((prev) => ({ ...prev, email }))}
                  placeholder="name@email.com"
                  placeholderTextColor={placeholder}
                  style={themedInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setAddOpen(false)}
                style={({ pressed }) => [styles.secondaryBtn, secondaryButtonStyle(colors, tints), pressed && styles.pressed]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={applyAddNew}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  secondaryButtonStyle(colors, tints),
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.text }]}>Use contact</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(colors: ColorScheme) {
  const muted = getAccentTints(colors).mutedText;
  return StyleSheet.create({
    row: {
      gap: 10,
      marginBottom: 12,
    },
    primaryBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    primaryBtnText: {
      fontSize: 16,
      fontWeight: "800",
    },
    secondaryBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: "700",
    },
    webHint: {
      fontSize: 13,
      lineHeight: 18,
      color: muted,
      marginBottom: 10,
    },
    pressed: { opacity: 0.88 },
    disabled: { opacity: 0.55 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      padding: 24,
    },
    modalCard: {
      borderRadius: 16,
      padding: 18,
      gap: 10,
      backgroundColor: colors.background,
      maxWidth: 420,
      width: "100%",
      alignSelf: "center",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    label: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginTop: 4,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
  });
}
