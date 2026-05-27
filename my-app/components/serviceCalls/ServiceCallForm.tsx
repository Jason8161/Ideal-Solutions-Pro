import * as Contacts from "expo-contacts";
import { useCallback, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { VoiceTextInput } from "@/components/VoiceTextInput";

import { CustomerContactPicker } from "@/components/CustomerContactPicker";
import { AddressSearchWithMaps } from "@/components/AddressSearchWithMaps";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import {
  buildContactForDeviceSave,
  emptyServiceCallCustomerFields,
  mapExistingContactToFields,
  type ServiceCallCustomerFields,
} from "@/lib/mapPhoneContactToCustomer";

function LabeledField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  multiline,
  minHeight,
  themed,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  minHeight?: number;
  themed: ReturnType<typeof makeFormStyles>;
}) {
  return (
    <View style={themed.fieldBlock}>
      <Text style={themed.label}>{label}</Text>
      <VoiceTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={themed.placeholderColor}
        style={[themed.input, multiline && { minHeight: minHeight ?? 100, textAlignVertical: "top" }]}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </View>
  );
}

type Props = {
  fields: ServiceCallCustomerFields;
  onChangeFields: (next: ServiceCallCustomerFields) => void;
};

export function ServiceCallForm({ fields, onChangeFields }: Props) {
  const { colors } = useAppTheme();
  const themed = useMemo(() => makeFormStyles(colors), [colors]);
  const [busy, setBusy] = useState<"save" | null>(null);

  const patch = useCallback(
    (key: keyof ServiceCallCustomerFields, value: string) => {
      onChangeFields({ ...fields, [key]: value });
    },
    [fields, onChangeFields],
  );

  const saveToPhoneContacts = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Contacts",
        "Saving to your address book runs on the iOS or Android app. On web, use your device to create the contact.",
      );
      return;
    }
    const hasName = fields.customerName.trim().length > 0;
    const hasPhone =
      fields.phoneMobile.trim() || fields.phoneHome.trim() || fields.phoneWork.trim();
    if (!hasName && !hasPhone) {
      Alert.alert("Add details", "Enter at least a customer name or one phone number before saving to contacts.");
      return;
    }
    setBusy("save");
    try {
      const perm = await Contacts.requestPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission needed", "Allow contact access to save this person to your address book.");
        return;
      }
      await Contacts.addContactAsync(buildContactForDeviceSave(fields));
      Alert.alert("Saved", "Contact was added to your address book.");
    } catch (e) {
      Alert.alert("Contacts", e instanceof Error ? e.message : "Could not save the contact.");
    } finally {
      setBusy(null);
    }
  }, [fields]);

  const clearForm = useCallback(() => {
    Alert.alert("Clear form?", "This removes all customer fields and service notes on this screen.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => onChangeFields(emptyServiceCallCustomerFields()) },
    ]);
  }, [onChangeFields]);

  return (
    <>
      {Platform.OS === "web" ? (
        <Text style={themed.webHint}>
          Contact import and “save to phone” use your device address book — use the iOS or Android build for those
          actions.
        </Text>
      ) : null}

      <CustomerContactPicker
        value={{
          name: fields.customerName,
          phone: fields.phoneMobile || fields.phoneHome || fields.phoneWork,
          email: fields.email || fields.emailAlt,
        }}
        onChange={(next) => {
          onChangeFields({
            ...fields,
            customerName: next.name || fields.customerName,
            phoneMobile: next.phone || fields.phoneMobile,
            email: next.email || fields.email,
          });
        }}
        onContactPicked={(picked) => {
          onChangeFields({
            ...mapExistingContactToFields(picked),
            workOrderNotes: fields.workOrderNotes,
          });
        }}
      />

      <Pressable
        onPress={() => void saveToPhoneContacts()}
        style={({ pressed }) => [themed.actionSecondary, pressed && themed.pressed, busy && themed.disabled]}
        disabled={busy !== null}
      >
        <Text style={themed.actionSecondaryText}>{busy === "save" ? "Saving…" : "Save to phone contacts"}</Text>
      </Pressable>

      <Pressable onPress={clearForm} style={({ pressed }) => [themed.clearBtn, pressed && themed.pressed]}>
        <Text style={themed.clearBtnText}>Clear form</Text>
      </Pressable>

      <Text style={themed.sectionTitle}>Customer</Text>
      <LabeledField
        themed={themed}
        label="Customer name"
        value={fields.customerName}
        onChangeText={(t) => patch("customerName", t)}
        placeholder="e.g. Jane Smith"
      />
      <LabeledField
        themed={themed}
        label="Company / property name (optional)"
        value={fields.companyName}
        onChangeText={(t) => patch("companyName", t)}
        placeholder="Commercial account or site name"
        autoCapitalize="words"
      />

      <Text style={themed.sectionTitle}>Service location</Text>
      <AddressSearchWithMaps
        address={{ street: fields.street, city: fields.city, state: fields.state, zip: fields.zip }}
        onApplyAddress={(next) =>
          onChangeFields({
            ...fields,
            street: next.street,
            city: next.city,
            state: next.state,
            zip: next.zip,
          })
        }
      />
      <LabeledField
        themed={themed}
        label="Street address"
        value={fields.street}
        onChangeText={(t) => patch("street", t)}
        placeholder="123 Main St, Suite 4"
      />
      <LabeledField themed={themed} label="City" value={fields.city} onChangeText={(t) => patch("city", t)} placeholder="City" />
      <LabeledField
        themed={themed}
        label="State"
        value={fields.state}
        onChangeText={(t) => patch("state", t)}
        placeholder="ST"
        autoCapitalize="characters"
      />
      <LabeledField
        themed={themed}
        label="ZIP code"
        value={fields.zip}
        onChangeText={(t) => patch("zip", t)}
        placeholder="ZIP / postal code"
        autoCapitalize="characters"
      />

      <Text style={themed.sectionTitle}>How to reach them</Text>
      <LabeledField
        themed={themed}
        label="Email"
        value={fields.email}
        onChangeText={(t) => patch("email", t)}
        placeholder="name@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <LabeledField
        themed={themed}
        label="Alternate email (optional)"
        value={fields.emailAlt}
        onChangeText={(t) => patch("emailAlt", t)}
        placeholder="Second email if they use one"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <LabeledField
        themed={themed}
        label="Mobile phone"
        value={fields.phoneMobile}
        onChangeText={(t) => patch("phoneMobile", t)}
        placeholder="Cell"
        keyboardType="phone-pad"
      />
      <LabeledField
        themed={themed}
        label="Home phone (optional)"
        value={fields.phoneHome}
        onChangeText={(t) => patch("phoneHome", t)}
        placeholder="Home"
        keyboardType="phone-pad"
      />
      <LabeledField
        themed={themed}
        label="Work phone (optional)"
        value={fields.phoneWork}
        onChangeText={(t) => patch("phoneWork", t)}
        placeholder="Office / dispatch line"
        keyboardType="phone-pad"
      />

      <Text style={themed.sectionTitle}>Work to perform</Text>
      <LabeledField
        themed={themed}
        label="Service call notes"
        value={fields.workOrderNotes}
        onChangeText={(t) => patch("workOrderNotes", t)}
        placeholder="What needs to be done, access notes, gate codes, materials to bring, etc."
        multiline
        minHeight={140}
      />
    </>
  );
}

function makeFormStyles(colors: ColorScheme) {
  const fieldInput = inputStyle(colors);
  const sheet = StyleSheet.create({
    webHint: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      marginBottom: 14,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.button,
      borderWidth: 0,
      opacity: 0.95,
    },
    actionsRow: {
      gap: 10,
      marginBottom: 10,
    },
    actionPrimary: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      borderWidth: 0,
    },
    actionPrimaryText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "800",
    },
    actionSecondary: {
      backgroundColor: colors.button,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      borderWidth: 0,
    },
    actionSecondaryText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    clearBtn: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      marginBottom: 8,
    },
    clearBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      opacity: 0.75,
    },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.55,
    },
    sectionTitle: {
      marginTop: 20,
      marginBottom: 10,
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      opacity: 0.9,
    },
    fieldBlock: {
      marginBottom: 14,
    },
    label: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
    },
    input: fieldInput,
  });
  return { ...sheet, placeholderColor: placeholderTextColor(colors) };
}
