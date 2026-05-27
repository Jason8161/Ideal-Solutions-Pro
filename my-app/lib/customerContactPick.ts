import * as Contacts from "expo-contacts";
import type { ExistingContact } from "expo-contacts";
import { Alert, Platform } from "react-native";

import { mapExistingContactToFields } from "@/lib/mapPhoneContactToCustomer";
import { composeFullAddress } from "@/lib/profileStorage";

export type SimpleCustomerContact = {
  name: string;
  phone: string;
  email: string;
};

export function emptySimpleCustomerContact(): SimpleCustomerContact {
  return { name: "", phone: "", email: "" };
}

export function mapContactToSimpleFields(contact: ExistingContact): SimpleCustomerContact {
  const mapped = mapExistingContactToFields(contact);
  const phone =
    mapped.phoneMobile.trim() || mapped.phoneHome.trim() || mapped.phoneWork.trim();
  const email = mapped.email.trim() || mapped.emailAlt.trim();
  return {
    name: mapped.customerName.trim(),
    phone,
    email,
  };
}

/** Name, phone, email, and one-line address for job / invoice forms. */
export type JobContactPasteFields = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type JobContactPasteFieldKey = keyof JobContactPasteFields;

export function emptyJobContactPasteFields(): JobContactPasteFields {
  return { name: "", phone: "", email: "", address: "" };
}

export function mapContactToJobPasteFields(contact: ExistingContact): JobContactPasteFields {
  const mapped = mapExistingContactToFields(contact);
  const simple = mapContactToSimpleFields(contact);
  const address = composeFullAddress(mapped.street, mapped.city, mapped.state, mapped.zip);
  return {
    name: simple.name,
    phone: simple.phone,
    email: simple.email,
    address,
  };
}

export function availableJobContactPasteFields(
  mapped: JobContactPasteFields,
): JobContactPasteFieldKey[] {
  return (["name", "phone", "email", "address"] as const).filter((key) => !!mapped[key].trim());
}

export function pickJobContactPasteFields(
  mapped: JobContactPasteFields,
  keys: JobContactPasteFieldKey[],
): JobContactPasteFields {
  const out = emptyJobContactPasteFields();
  for (const key of keys) {
    if (mapped[key].trim()) out[key] = mapped[key].trim();
  }
  return out;
}

/** Minimal paste when user declines full import (name only when present). */
export function minimalJobContactPasteKeys(
  mapped: JobContactPasteFields,
): JobContactPasteFieldKey[] {
  return mapped.name.trim() ? ["name"] : [];
}

/** After picking from the device address book on a job-style form. */
export function alertPasteContactIntoJob(
  contact: ExistingContact,
  handlers: {
    onYes: (mapped: JobContactPasteFields) => void;
    onNo: (mapped: JobContactPasteFields) => void;
    onChooseFields: (mapped: JobContactPasteFields) => void;
  },
): void {
  const mapped = mapContactToJobPasteFields(contact);
  const available = availableJobContactPasteFields(mapped);
  if (available.length === 0) {
    Alert.alert("No details", "That contact has no name, phone, email, or address to paste.");
    return;
  }
  Alert.alert(
    "Paste contact info?",
    "Paste all contact info into this job?",
    [
      { text: "No", style: "cancel", onPress: () => handlers.onNo(mapped) },
      { text: "Choose fields", onPress: () => handlers.onChooseFields(mapped) },
      { text: "Yes", onPress: () => handlers.onYes(mapped) },
    ],
  );
}

export async function requestContactsPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const perm = await Contacts.requestPermissionsAsync();
  return perm.status === "granted";
}

export async function pickContactFromDevice(): Promise<ExistingContact | null> {
  if (Platform.OS === "web") {
    Alert.alert(
      "Contacts",
      "Choosing from your address book works in the iOS or Android app. On web, enter customer details manually.",
    );
    return null;
  }
  if (Platform.OS === "android") {
    const granted = await requestContactsPermission();
    if (!granted) {
      Alert.alert("Permission needed", "Allow contact access to pick someone from your address book.");
      return null;
    }
  }
  return Contacts.presentContactPickerAsync();
}
