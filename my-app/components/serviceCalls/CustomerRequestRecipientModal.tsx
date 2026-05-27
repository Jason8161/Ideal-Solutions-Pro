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

import { useScStyles } from "@/components/serviceCalls/screenChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { getAccentTints, inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  emptySimpleCustomerContact,
  mapContactToSimpleFields,
  pickContactFromDevice,
  type SimpleCustomerContact,
} from "@/lib/customerContactPick";
import { addCustomer, listCustomers, type Customer } from "@/lib/customerStorage";

type Step = "choose" | "pick" | "add";

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

export function CustomerRequestRecipientModal({ visible, onClose, onRecipientSelected }: Props) {
  const scStyles = useScStyles();
  const { colors } = useAppTheme();
  const tints = useMemo(() => getAccentTints(colors), [colors]);
  const themedInput = useMemo(() => inputStyle(colors, tints), [colors, tints]);
  const placeholder = useMemo(() => placeholderTextColor(colors), [colors]);
  const sheetStyles = useMemo(() => makeSheetStyles(colors), [colors]);

  const [step, setStep] = useState<Step>("choose");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<SimpleCustomerContact>(emptySimpleCustomerContact());

  const reset = useCallback(() => {
    setStep("choose");
    setDraft(emptySimpleCustomerContact());
    setSaving(false);
    setDeviceBusy(false);
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

  const chooseFromDevice = useCallback(async () => {
    setDeviceBusy(true);
    try {
      const picked = await pickContactFromDevice();
      if (!picked) return;
      const mapped = mapContactToSimpleFields(picked);
      if (!mapped.name.trim() && !mapped.phone.trim() && !mapped.email.trim()) {
        Alert.alert("Missing details", "That contact has no name, phone, or email.");
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
        // Proceed even if directory save fails — user still needs to send the link.
      }
      proceed(mapped);
    } catch (e) {
      Alert.alert("Contacts", e instanceof Error ? e.message : "Could not open the contact picker.");
    } finally {
      setDeviceBusy(false);
    }
  }, [proceed]);

  const saveNewCustomer = useCallback(async () => {
    const name = draft.name.trim();
    const phone = draft.phone.trim();
    const email = draft.email.trim();
    if (!name && !phone && !email) {
      Alert.alert("Missing details", "Enter at least a name, phone, or email.");
      return;
    }
    setSaving(true);
    try {
      const displayName = name || phone || email;
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

  const renderChoose = () => (
    <>
      <Text style={sheetStyles.subtitle}>
        Choose who should receive the Request Service link by text or email.
      </Text>
      <Pressable
        onPress={() => setStep("pick")}
        style={({ pressed }) => [scStyles.menuButton, pressed && { opacity: 0.9 }]}
        accessibilityRole="button"
        accessibilityLabel="Pick from contacts"
      >
        <Text style={scStyles.menuButtonText}>Pick from contacts</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setDraft(emptySimpleCustomerContact());
          setStep("add");
        }}
        style={({ pressed }) => [
          scStyles.menuButton,
          scStyles.menuButtonSecondary,
          { marginTop: 12 },
          pressed && { opacity: 0.9 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add new customer"
      >
        <Text style={scStyles.menuButtonSecondaryText}>Add new customer</Text>
      </Pressable>
    </>
  );

  const renderPick = () => (
    <>
      <Pressable
        onPress={() => void chooseFromDevice()}
        disabled={deviceBusy}
        style={({ pressed }) => [
          scStyles.menuButton,
          pressed && { opacity: 0.9 },
          deviceBusy && { opacity: 0.6 },
        ]}
      >
        <Text style={scStyles.menuButtonText}>
          {deviceBusy ? "Opening…" : "Choose from phone contacts"}
        </Text>
      </Pressable>
      {Platform.OS === "web" ? (
        <Text style={[scStyles.subtitle, { marginTop: 8, marginBottom: 8 }]}>
          Phone contact picker runs on iOS or Android. On web, pick from your saved directory below.
        </Text>
      ) : null}
      <Text style={[scStyles.sectionLabel, { marginTop: 12, marginBottom: 8 }]}>Saved customers</Text>
      {loadingCustomers ? (
        <Text style={scStyles.emptyText}>Loading…</Text>
      ) : customers.length === 0 ? (
        <Text style={scStyles.emptyText}>No saved customers yet. Add one or choose from phone contacts.</Text>
      ) : (
        <ScrollView style={sheetStyles.list} contentContainerStyle={sheetStyles.listContent}>
          {customers.map((customer) => (
            <Pressable
              key={customer.id}
              onPress={() => proceed(customerToRecipient(customer))}
              style={({ pressed }) => [scStyles.card, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel={`Send to ${customer.name}`}
            >
              <Text style={scStyles.cardTitle}>{customer.name}</Text>
              {customer.phone ? <Text style={scStyles.cardMeta}>{customer.phone}</Text> : null}
              {customer.email ? <Text style={scStyles.cardMeta}>{customer.email}</Text> : null}
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Pressable
        onPress={() => setStep("choose")}
        style={({ pressed }) => [
          scStyles.menuButton,
          scStyles.menuButtonSecondary,
          { marginTop: 12 },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Text style={scStyles.menuButtonSecondaryText}>Back</Text>
      </Pressable>
    </>
  );

  const renderAdd = () => (
    <>
      <Text style={sheetStyles.label}>Name</Text>
      <VoiceTextInput
        value={draft.name}
        onChangeText={(name) => setDraft((prev) => ({ ...prev, name }))}
        placeholder="Customer or company"
        placeholderTextColor={placeholder}
        style={themedInput}
        autoCapitalize="words"
      />
      <Text style={sheetStyles.label}>Phone</Text>
      <VoiceTextInput
        value={draft.phone}
        onChangeText={(phone) => setDraft((prev) => ({ ...prev, phone }))}
        placeholder="Mobile or main line"
        placeholderTextColor={placeholder}
        style={themedInput}
        keyboardType="phone-pad"
      />
      <Text style={sheetStyles.label}>Email</Text>
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
        style={({ pressed }) => [scStyles.menuButton, { marginTop: 12 }, pressed && { opacity: 0.9 }, saving && { opacity: 0.6 }]}
      >
        <Text style={scStyles.menuButtonText}>{saving ? "Saving…" : "Save and send link"}</Text>
      </Pressable>
      <Pressable
        onPress={() => setStep("choose")}
        style={({ pressed }) => [
          scStyles.menuButton,
          scStyles.menuButtonSecondary,
          { marginTop: 12 },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Text style={scStyles.menuButtonSecondaryText}>Back</Text>
      </Pressable>
    </>
  );

  const title =
    step === "choose" ? "Send to customer" : step === "pick" ? "Pick from contacts" : "Add new customer";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={sheetStyles.backdrop}>
        <View style={sheetStyles.sheet}>
          <Text style={sheetStyles.title}>{title}</Text>
          {step === "choose" ? renderChoose() : null}
          {step === "pick" ? renderPick() : null}
          {step === "add" ? renderAdd() : null}
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              scStyles.menuButton,
              scStyles.menuButtonSecondary,
              { marginTop: 12 },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={scStyles.menuButtonSecondaryText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeSheetStyles(colors: { background: string; text: string }) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
      maxHeight: "88%",
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      opacity: 0.75,
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginTop: 8,
      marginBottom: 4,
    },
    list: {
      maxHeight: 280,
    },
    listContent: {
      paddingBottom: 4,
    },
  });
}
