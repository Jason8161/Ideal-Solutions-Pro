import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { EmployeeCard } from "@/components/employees/EmployeeCard";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { EmployeeStatusTabs } from "@/components/employees/EmployeeStatusTabs";
import {
  EMPLOYEE_HINT,
  EMPLOYEE_MUTED,
  EMPLOYEE_TEXT,
  useEmployeeChrome,
} from "@/components/employees/employeeTheme";
import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { pickContactFromDevice } from "@/lib/customerContactPick";
import { mapContactToEmployeeInput } from "@/lib/employees/contactToEmployee";
import {
  employeeDisplayName,
  findEmployeeDuplicate,
  listEmployees,
  searchEmployees,
  sortEmployees,
} from "@/lib/employees/employeeStorage";
import type { Employee, EmployeeInput, EmployeeSortKey, EmployeeStatus } from "@/lib/employees/types";

const SORT_OPTIONS: { key: EmployeeSortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "pay_rate", label: "Pay rate" },
  { key: "start_date", label: "Start date" },
];

export default function EmployeesScreen() {
  const { styles } = useEmployeeChrome();
  const [statusTab, setStatusTab] = useState<EmployeeStatus>("current");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<EmployeeSortKey>("name");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [prefill, setPrefill] = useState<Partial<EmployeeInput> | null>(null);
  const [contactBusy, setContactBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listEmployees(statusTab);
      setEmployees(rows);
    } finally {
      setLoading(false);
    }
  }, [statusTab]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    void refresh();
  }, [statusTab, refresh]);

  const displayed = useMemo(() => {
    const filtered = searchEmployees(employees, search);
    return sortEmployees(filtered, sortKey);
  }, [employees, search, sortKey]);

  const openAddManual = useCallback(() => {
    setEditing(null);
    setPrefill(null);
    setFormOpen(true);
  }, []);

  const openFormWithPrefill = useCallback((partial: Partial<EmployeeInput>) => {
    setEditing(null);
    setPrefill(partial);
    setFormOpen(true);
  }, []);

  const openAddFromContacts = useCallback(async () => {
    setContactBusy(true);
    try {
      const picked = await pickContactFromDevice();
      if (!picked) return;
      const partial = mapContactToEmployeeInput(picked, statusTab);
      const dup = await findEmployeeDuplicate({ phone: partial.phone, email: partial.email });
      if (dup) {
        Alert.alert(
          "Already on file",
          `${employeeDisplayName(dup)} may be the same person (matching phone or email).`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Use anyway", onPress: () => openFormWithPrefill(partial) },
          ],
        );
        return;
      }
      openFormWithPrefill(partial);
    } catch (e) {
      Alert.alert("Contacts", e instanceof Error ? e.message : "Could not open the contact picker.");
    } finally {
      setContactBusy(false);
    }
  }, [openFormWithPrefill, statusTab]);

  const openEdit = useCallback((employee: Employee) => {
    setEditing(employee);
    setFormOpen(true);
  }, []);

  const onFormClose = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setPrefill(null);
  }, []);

  return (
    <StickyScrollScreen
      title="Employees"
      backHref="/settings/my-crew"
      backLabel="← My crew"
      contentContainerStyle={local.content}
    >
      <Text style={local.intro}>
        Track crew members, pay, and employment status on this device.
      </Text>

      <Pressable
        onPress={() => void openAddFromContacts()}
        disabled={contactBusy}
        style={({ pressed }) => [
          styles.navRow,
          local.addRow,
          pressed && styles.pressed,
          contactBusy && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add employee from contacts"
      >
        <Text style={local.addText}>
          {contactBusy ? "Opening contacts…" : "+ Add from contacts"}
        </Text>
      </Pressable>

      <Pressable
        onPress={openAddManual}
        style={({ pressed }) => [styles.navRow, local.manualRow, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Add new employee manually"
      >
        <Text style={local.manualText}>+ Add new manually</Text>
      </Pressable>

      {Platform.OS === "web" ? (
        <Text style={local.webHint}>
          Contact picker runs on iOS or Android. On web, use Add new manually.
        </Text>
      ) : null}

      <EmployeeStatusTabs
        active={statusTab}
        onChange={(next) => {
          setStatusTab(next);
          setSearch("");
        }}
      />

      <VoiceTextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search name or job title"
        placeholderTextColor={EMPLOYEE_HINT}
        style={[styles.input, local.search]}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <Text style={styles.section}>Sort by</Text>
      <View style={local.sortRow}>
        {SORT_OPTIONS.map((opt) => {
          const active = sortKey === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setSortKey(opt.key)}
              style={({ pressed }) => [
                styles.sortChip,
                active && styles.sortChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={local.sortText}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={local.centered}>
          <ActivityIndicator color={EMPLOYEE_TEXT} size="large" />
        </View>
      ) : displayed.length === 0 ? (
        <Text style={local.empty}>
          {search.trim()
            ? "No employees match your search."
            : statusTab === "current"
              ? "No current employees yet. Add from contacts or enter details manually."
              : "No previous employees."}
        </Text>
      ) : (
        displayed.map((employee) => (
          <EmployeeCard key={employee.id} employee={employee} onPress={() => openEdit(employee)} />
        ))
      )}

      <EmployeeForm
        visible={formOpen}
        employee={editing}
        defaultStatus={statusTab}
        prefill={prefill}
        onClose={onFormClose}
        onSaved={() => void refresh()}
      />
    </StickyScrollScreen>
  );
}

const local = StyleSheet.create({
  content: {
    paddingBottom: 40,
    backgroundColor: "transparent",
  },
  intro: {
    color: EMPLOYEE_MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  addRow: {
    marginBottom: 10,
    alignItems: "center",
  },
  addText: {
    color: EMPLOYEE_TEXT,
    fontSize: 18,
    fontWeight: "800",
  },
  manualRow: {
    marginBottom: 10,
    alignItems: "center",
  },
  manualText: {
    color: EMPLOYEE_MUTED,
    fontSize: 16,
    fontWeight: "700",
  },
  webHint: {
    color: EMPLOYEE_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  search: {
    marginBottom: 12,
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  sortText: {
    color: EMPLOYEE_TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  empty: {
    color: EMPLOYEE_MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  centered: {
    paddingVertical: 24,
    alignItems: "center",
  },
});
