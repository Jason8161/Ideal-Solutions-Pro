import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { CustomerContactPicker } from "@/components/CustomerContactPicker";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import {
  emptySimpleCustomerContact,
  mapContactToSimpleFields,
  type SimpleCustomerContact,
} from "@/lib/customerContactPick";
import { addCustomer, listCustomers, type Customer, type CustomerSource } from "@/lib/customerStorage";

const ROW_TEXT = "#FFFFFF";
const ROW_MUTED = "rgba(255,255,255,0.75)";

function sourceLabel(source: CustomerSource): string {
  return source === "contacts" ? "Contacts" : "Manual";
}

export default function CustomersScreen() {
  const { scStyles, styles: bossStyles } = useBossManChrome();
  const rowStyles = useMemo(() => makeRowStyles(), []);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactDraft, setContactDraft] = useState<SimpleCustomerContact>(emptySimpleCustomerContact());
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    void listCustomers().then(setCustomers);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const persistCustomer = useCallback(
    async (
      fields: { name: string; phone?: string; email?: string; address?: string },
      source: CustomerSource,
    ) => {
      if (!fields.name.trim()) {
        Alert.alert("Missing name", "Enter a customer or company name.");
        return;
      }
      setSaving(true);
      try {
        await addCustomer({
          name: fields.name,
          phone: fields.phone,
          email: fields.email,
          address: fields.address,
          source,
        });
        setContactDraft(emptySimpleCustomerContact());
        refresh();
        Alert.alert("Saved", `${fields.name.trim()} was added to your customer directory.`);
      } catch (e) {
        Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const saveContactDraft = useCallback(() => {
    void persistCustomer(
      {
        name: contactDraft.name,
        phone: contactDraft.phone,
        email: contactDraft.email,
      },
      "manual",
    );
  }, [contactDraft.email, contactDraft.name, contactDraft.phone, persistCustomer]);

  return (
    <ScStickyScroll
      backHref="/job-folder/hub/jobs-estimates"
      title="Customers"
      subtitle="Shared directory — add manually or import from your device contacts."
    >
      <View style={rowStyles.pickerBlock}>
        <Text style={[scStyles.sectionLabel, rowStyles.sectionLabel]}>Add from contacts</Text>
        <CustomerContactPicker
          value={contactDraft}
          onChange={setContactDraft}
          fields={["name", "phone", "email"]}
          onContactPicked={(contact) => {
            const mapped = mapContactToSimpleFields(contact);
            void persistCustomer(
              {
                name: mapped.name,
                phone: mapped.phone,
                email: mapped.email,
              },
              "contacts",
            );
          }}
        />
        {contactDraft.name.trim() ? (
          <Pressable
            style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
            onPress={saveContactDraft}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save customer from form"
          >
            <Text style={scStyles.menuButtonText}>{saving ? "Saving…" : "Save customer"}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[scStyles.sectionLabel, rowStyles.sectionLabel]}>Directory</Text>
      {customers.length === 0 ? (
        <Text style={scStyles.emptyText}>No customers yet. Add one manually or from contacts.</Text>
      ) : (
        customers.map((customer) => (
          <View key={customer.id} style={[bossStyles.navRow, rowStyles.listRow]}>
            <View style={rowStyles.listHeader}>
              <Text style={rowStyles.nameText}>{customer.name}</Text>
              <View
                style={[
                  bossStyles.badge,
                  customer.source === "contacts" && bossStyles.badgeAccent,
                  rowStyles.badge,
                ]}
              >
                <Text style={rowStyles.badgeText}>{sourceLabel(customer.source)}</Text>
              </View>
            </View>
            {customer.phone ? <Text style={rowStyles.metaText}>{customer.phone}</Text> : null}
            {customer.email ? <Text style={rowStyles.metaText}>{customer.email}</Text> : null}
            {customer.address ? <Text style={rowStyles.metaText}>{customer.address}</Text> : null}
          </View>
        ))
      )}
    </ScStickyScroll>
  );
}

function makeRowStyles() {
  return StyleSheet.create({
    pickerBlock: {
      marginBottom: 8,
    },
    sectionLabel: {
      marginBottom: 8,
    },
    listRow: {
      gap: 4,
    },
    listHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    nameText: {
      flex: 1,
      color: ROW_TEXT,
      fontSize: 17,
      fontWeight: "800",
    },
    metaText: {
      color: ROW_MUTED,
      fontSize: 15,
      lineHeight: 21,
    },
    badge: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
    },
    badgeText: {
      color: ROW_TEXT,
      fontSize: 12,
      fontWeight: "800",
    },
  });
}
