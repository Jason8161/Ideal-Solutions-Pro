import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { VoiceTextInput } from "@/components/VoiceTextInput";
import {
  accentPanelStyle,
  getAccentTints,
  inputStyle,
  navCardStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import {
  emptySimpleCustomerContact,
  mapContactToSimpleFields,
  pickContactFromDevice,
  type SimpleCustomerContact,
} from "@/lib/customerContactPick";
import { addCustomer, listCustomers, type Customer } from "@/lib/customerStorage";

type Step = "choose" | "pick" | "add" | "manual";

type Props = {
  visible: boolean;
  onClose: () => void;
  onRecipientSelected: (recipient: SimpleCustomerContact) => void;
};

function customerToRecipient(customer: Customer): SimpleCustomerContact {
  return {
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
  };
}

export function VirtualCardSendToCustomerModal({
  visible,
  onClose,
  onRecipientSelected,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tints = useMemo(() => getAccentTints(colors), [colors]);
  const themedInput = useMemo(() => inputStyle(colors, tints), [colors, tints]);
  const placeholder = useMemo(() => placeholderTextColor(colors), [colors]);

  const [step, setStep] = useState<Step>("choose");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<SimpleCustomerContact>(emptySimpleCustomerContact());
  const [saveToDirectory, setSaveToDirectory] = useState(true);

  const reset = useCallback(() => {
    setStep("choose");
    setDraft(emptySimpleCustomerContact());
    setSaving(false);
    setDeviceBusy(false);
    setSaveToDirectory(true);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const proceed = useCallback(
    (recipient: SimpleCustomerContact) => {
      reset();
      onRecipientSelected(recipient);
    },
    [onRecipientSelected, reset],
  );

  useEffect(() => {
    if (!visible) return;
    setLoadingCustomers(true);
    void listCustomers()
      .then(setCustomers)
      .finally(() => setLoadingCustomers(false));
  }, [visible, step]);

  const maybeSaveContact = useCallback(
    async (contact: SimpleCustomerContact, source: "contacts" | "manual") => {
      const name = contact.name.trim();
      const phone = contact.phone.trim();
      const email = contact.email.trim();
      if (!saveToDirectory) return;
      if (!name && !phone && !email) return;
      try {
        await addCustomer({
          name: name || phone || email,
          phone,
          email,
          source,
        });
      } catch {
        // Still send SMS even if directory save fails.
      }
    },
    [saveToDirectory],
  );

  const chooseFromDevice = useCallback(async () => {
    setDeviceBusy(true);
    try {
      const picked = await pickContactFromDevice();
      if (!picked) return;
      const mapped = mapContactToSimpleFields(picked);
      if (!mapped.phone.trim()) {
        Alert.alert("Phone required", "That contact has no phone number. Pick another contact or enter a number manually.");
        return;
      }
      try {
        await addCustomer({
          name: mapped.name || mapped.phone || mapped.email,
          phone: mapped.phone,
          email: mapped.email,
          source: "contacts",
        });
      } catch {
        // Proceed even if directory save fails.
      }
      proceed(mapped);
    } catch (e) {
      Alert.alert("Contacts", e instanceof Error ? e.message : "Could not open the contact picker.");
    } finally {
      setDeviceBusy(false);
    }
  }, [maybeSaveContact, proceed]);

  const saveNewCustomer = useCallback(async () => {
    const name = draft.name.trim();
    const phone = draft.phone.trim();
    const email = draft.email.trim();
    if (!phone) {
      Alert.alert("Phone required", "Enter a phone number to text your business card.");
      return;
    }
    if (!name && !email) {
      Alert.alert("Name required", "Enter a customer or company name.");
      return;
    }
    setSaving(true);
    try {
      const displayName = name || phone;
      await addCustomer({
        name: displayName,
        phone,
        email,
        source: "manual",
      });
      proceed({ name: displayName, phone, email });
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }, [draft.email, draft.name, draft.phone, proceed]);

  const sendManual = useCallback(async () => {
    const phone = draft.phone.trim();
    const name = draft.name.trim();
    if (!phone) {
      Alert.alert("Phone required", "Enter a phone number to text your business card.");
      return;
    }
    setSaving(true);
    try {
      await maybeSaveContact({ name, phone, email: "" }, "manual");
      proceed({ name, phone, email: "" });
    } finally {
      setSaving(false);
    }
  }, [draft.name, draft.phone, maybeSaveContact, proceed]);

  const renderChoose = () => (
    <>
      <Text style={styles.subtitle}>
        Text your virtual business card with a link and contact summary.
      </Text>
      <Pressable
        onPress={() => setStep("pick")}
        style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Pick from contacts"
      >
        <Text style={styles.menuButtonText}>Pick from contacts</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setDraft(emptySimpleCustomerContact());
          setStep("add");
        }}
        style={({ pressed }) => [styles.menuButtonSecondary, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Add new customer"
      >
        <Text style={styles.menuButtonSecondaryText}>Add new customer</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setDraft(emptySimpleCustomerContact());
          setSaveToDirectory(false);
          setStep("manual");
        }}
        style={({ pressed }) => [styles.menuButtonSecondary, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Enter number manually"
      >
        <Text style={styles.menuButtonSecondaryText}>Enter number manually</Text>
      </Pressable>
    </>
  );

  const renderPick = () => (
    <>
      <Pressable
        onPress={() => void chooseFromDevice()}
        disabled={deviceBusy}
        style={({ pressed }) => [
          styles.menuButton,
          pressed && styles.pressed,
          deviceBusy && styles.disabled,
        ]}
      >
        <Text style={styles.menuButtonText}>
          {deviceBusy ? "Opening…" : "Choose from phone contacts"}
        </Text>
      </Pressable>
      {Platform.OS === "web" ? (
        <Text style={styles.webHint}>
          Phone contact picker runs on iOS or Android. On web, pick from your saved directory below.
        </Text>
      ) : null}
      <Text style={styles.sectionLabel}>Saved customers</Text>
      {loadingCustomers ? (
        <Text style={styles.emptyText}>Loading…</Text>
      ) : customers.length === 0 ? (
        <Text style={styles.emptyText}>No saved customers yet. Add one or choose from phone contacts.</Text>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {customers.map((customer) => {
            const phone = customer.phone?.trim() ?? "";
            return (
              <Pressable
                key={customer.id}
                onPress={() => {
                  if (!phone) {
                    Alert.alert("No phone", `${customer.name} has no phone number on file.`);
                    return;
                  }
                  proceed(customerToRecipient(customer));
                }}
                style={({ pressed }) => [styles.customerRow, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Send to ${customer.name}`}
              >
                <Text style={styles.customerName}>{customer.name}</Text>
                {phone ? <Text style={styles.customerMeta}>{phone}</Text> : null}
                {customer.email ? <Text style={styles.customerMeta}>{customer.email}</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <Pressable
        onPress={() => setStep("choose")}
        style={({ pressed }) => [styles.menuButtonSecondary, pressed && styles.pressed]}
      >
        <Text style={styles.menuButtonSecondaryText}>Back</Text>
      </Pressable>
    </>
  );

  const renderAdd = () => (
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
      <Text style={styles.label}>Phone</Text>
      <VoiceTextInput
        value={draft.phone}
        onChangeText={(phone) => setDraft((prev) => ({ ...prev, phone }))}
        placeholder="Mobile or main line"
        placeholderTextColor={placeholder}
        style={themedInput}
        keyboardType="phone-pad"
      />
      <Text style={styles.label}>Email (optional)</Text>
      <VoiceTextInput
        value={draft.email}
        onChangeText={(email) => setDraft((prev) => ({ ...prev, email }))}
        placeholder="name@email.com"
        placeholderTextColor={placeholder}
        style={themedInput}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Pressable
        onPress={() => void saveNewCustomer()}
        disabled={saving}
        style={({ pressed }) => [styles.menuButton, pressed && styles.pressed, saving && styles.disabled]}
      >
        <Text style={styles.menuButtonText}>{saving ? "Saving…" : "Save and send text"}</Text>
      </Pressable>
      <Pressable
        onPress={() => setStep("choose")}
        style={({ pressed }) => [styles.menuButtonSecondary, pressed && styles.pressed]}
      >
        <Text style={styles.menuButtonSecondaryText}>Back</Text>
      </Pressable>
    </>
  );

  const renderManual = () => (
    <>
      <Text style={styles.label}>Phone number</Text>
      <VoiceTextInput
        value={draft.phone}
        onChangeText={(phone) => setDraft((prev) => ({ ...prev, phone }))}
        placeholder="Mobile or main line"
        placeholderTextColor={placeholder}
        style={themedInput}
        keyboardType="phone-pad"
      />
      <Text style={styles.label}>Name (optional)</Text>
      <VoiceTextInput
        value={draft.name}
        onChangeText={(name) => setDraft((prev) => ({ ...prev, name }))}
        placeholder="Customer name"
        placeholderTextColor={placeholder}
        style={themedInput}
        autoCapitalize="words"
      />
      <Pressable
        onPress={() => setSaveToDirectory((v) => !v)}
        style={({ pressed }) => [styles.saveToggle, pressed && styles.pressed]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: saveToDirectory }}
      >
        <Text style={styles.saveToggleText}>
          {saveToDirectory ? "✓ Save to customer directory" : "Save to customer directory"}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => void sendManual()}
        disabled={saving}
        style={({ pressed }) => [styles.menuButton, pressed && styles.pressed, saving && styles.disabled]}
      >
        <Text style={styles.menuButtonText}>{saving ? "Opening…" : "Send text"}</Text>
      </Pressable>
      <Pressable
        onPress={() => setStep("choose")}
        style={({ pressed }) => [styles.menuButtonSecondary, pressed && styles.pressed]}
      >
        <Text style={styles.menuButtonSecondaryText}>Back</Text>
      </Pressable>
    </>
  );

  const title =
    step === "choose"
      ? "Send to customer"
      : step === "pick"
        ? "Pick from contacts"
        : step === "add"
          ? "Add new customer"
          : "Enter number";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {step === "choose" ? renderChoose() : null}
          {step === "pick" ? renderPick() : null}
          {step === "add" ? renderAdd() : null}
          {step === "manual" ? renderManual() : null}
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.menuButtonSecondary, pressed && styles.pressed]}
          >
            <Text style={styles.menuButtonSecondaryText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const nav = navCardStyle(colors);
  const secondary = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      ...panel,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
      maxHeight: "88%",
      gap: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: tints.mutedText,
      marginBottom: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginTop: 4,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 8,
    },
    emptyText: {
      fontSize: 14,
      color: tints.mutedText,
      lineHeight: 20,
    },
    webHint: {
      fontSize: 13,
      lineHeight: 18,
      color: tints.mutedText,
    },
    list: { maxHeight: 280 },
    listContent: { paddingBottom: 4, gap: 8 },
    customerRow: { ...panel, padding: 12 },
    customerName: { fontSize: 16, fontWeight: "800", color: colors.text },
    customerMeta: { fontSize: 13, color: tints.mutedText, marginTop: 2 },
    menuButton: { ...nav, paddingVertical: 14, alignItems: "center" },
    menuButtonText: { color: colors.text, fontSize: 16, fontWeight: "800" },
    menuButtonSecondary: { ...secondary, paddingVertical: 14, alignItems: "center", marginTop: 0 },
    menuButtonSecondaryText: { color: colors.text, fontSize: 16, fontWeight: "700" },
    saveToggle: { paddingVertical: 8 },
    saveToggleText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
    pressed: { opacity: 0.88 },
    disabled: { opacity: 0.55 },
  });
}
